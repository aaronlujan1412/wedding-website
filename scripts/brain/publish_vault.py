#!/usr/bin/env python3
"""Publish the SecondBrain vault to the website's mirror.

This runs ON THE HOMELAB BOX, not on Vercel. The RAG service is bound to the
tailnet on purpose, so the website cannot reach in; the box pushes out. Same
shape as the lodging finder, and for the same reason -- the token here can only
write notes, which is a far smaller thing to lose than the database key.

The vault stays canonical. Nothing in this script writes to it; it reads files
and posts their contents.

What it does, in one run:

    publish_vault.py                  apply any decisions waiting on the site,
                                      then reconcile. This is what the timer
                                      runs, and the order matters -- applying
                                      first means the reconcile in the same run
                                      reports the moved files.

    publish_vault.py --reconcile      compare every path against the mirror,
                                      send what differs, delete what is gone.

    publish_vault.py --decisions      carry out approvals and rejections only.

    publish_vault.py --watch          block, wait for the vault to change, and
                                      send just the notes that changed. This is
                                      the steady state.

    publish_vault.py --paths a.md b.md   send exactly these (mostly for testing)

Environment:
    BRAIN_SYNC_URL      https://<site>/api/brain/sync
    BRAIN_SYNC_SECRET   the bearer token, matching the site's env var
    VAULT_ROOT          defaults to the usual vault path

The decisions endpoint is derived from BRAIN_SYNC_URL, so there is one URL to
get wrong instead of two.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

VAULT = Path(os.environ.get("VAULT_ROOT", "/home/aaron/data/xarvon1412/files/SecondBrain"))
URL = os.environ.get("BRAIN_SYNC_URL", "")
SECRET = os.environ.get("BRAIN_SYNC_SECRET", "")

# Mirrored: the three buckets, the vault root, any folder Obsidian grows, and
# _inbox -- the review queue is the point of putting this on a website. NOT
# mirrored: the machinery directories, which hold proposals and raw source
# material rather than notes.
SKIP_DIRS = {
    ".git", ".obsidian", ".trash", "_revisions", "_sources", "_inbox_work",
    # Turned-away notes. Kept on disk rather than deleted, but they are not the
    # brain and they are not the queue, so they are not mirrored either -- the
    # decision log on the site records what was rejected and why.
    "_rejected",
}

# Where an approved note may be filed. Checked here as well as in the database,
# because a destination arriving over the network is never trusted twice: this
# is the process that can actually write to the vault.
BUCKETS = {"Reference", "Personal", "Work"}

# Matches the endpoint's cap, so a batch is never rejected for being too big.
BATCH = 200

# Cloudflare fronts the site and blocks urllib's default `Python-urllib/3.x`
# agent outright -- 403 with Cloudflare error 1010, which reads as an auth
# failure and is not one. The same request with any ordinary agent string is
# fine. Naming the tool also means these requests are identifiable in a log
# rather than being indistinguishable from a scraper.
USER_AGENT = "secondbrain-publisher/1.0 (+homelab)"

FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.S)
TAGS_LINE = re.compile(r"^tags:\s*\[(.*?)\]\s*$", re.M)
FIELD = re.compile(r"^(source|confidence|vault):\s*(.*?)\s*$", re.M)
H1 = re.compile(r"^#\s+(.+?)\s*$", re.M)


def notes() -> list[Path]:
    """Every markdown file the mirror should hold."""
    found = []
    for path in VAULT.rglob("*.md"):
        parts = path.relative_to(VAULT).parts
        if any(p in SKIP_DIRS for p in parts[:-1]):
            continue
        found.append(path)
    return sorted(found)


def parse(path: Path) -> dict | None:
    """One note, as the endpoint wants it.

    Deliberately forgiving: a note with no frontmatter, no title or no tags is
    still a note and still gets mirrored. Three notes in the vault are exactly
    that today, and dropping them would be a silent hole in search.
    """
    try:
        # BYTES, then decode — not read_text(). read_text() applies universal
        # newline translation, so a CRLF file decodes to something whose sha256
        # differs from the manifest's hash of the same file, and every such note
        # then looks changed on every single sync. That bug resent 2,430 of
        # 3,430 notes per tick until it was found.
        data = path.read_bytes()
        raw = data.decode("utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        print(f"  skipped {path.name}: {exc}", file=sys.stderr)
        return None

    fm = FRONTMATTER.match(raw)
    head = fm.group(1) if fm else ""
    rest = raw[fm.end():] if fm else raw

    tags: list[str] = []
    if m := TAGS_LINE.search(head):
        tags = [t.strip().strip('"\'') for t in m.group(1).split(",")]
        tags = [t for t in tags if t][:32]

    fields = {k: v for k, v in FIELD.findall(head)}

    title = None
    if m := H1.search(rest):
        title = m.group(1)
        # Drop the title line from the body: it is stored as `title` and would
        # otherwise be counted twice by the search ranking.
        rest = rest[: m.start()] + rest[m.end():]

    return {
        "path": str(path.relative_to(VAULT)),
        "title": title,
        "body": rest.strip(),
        "tags": tags,
        "source": fields.get("source") or None,
        "confidence": fields.get("confidence") or None,
        # Over the raw BYTES, so it is the same value manifest_of() computes
        # for this file. The two must agree or the reconcile never converges.
        "content_hash": hashlib.sha256(data).hexdigest(),
        "file_mtime": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(path.stat().st_mtime)
        ),
    }


def post(payload: dict) -> dict:
    if not URL or not SECRET:
        sys.exit("BRAIN_SYNC_URL and BRAIN_SYNC_SECRET must both be set.")

    request = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SECRET}",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:400]
        sys.exit(f"sync failed: HTTP {exc.code} {body}")
    except urllib.error.URLError as exc:
        sys.exit(f"sync failed: {exc.reason}")


def send(paths: list[Path]) -> int:
    """Push these notes, in batches the endpoint will accept."""
    sent = 0
    batch: list[dict] = []
    for path in paths:
        note = parse(path)
        if note:
            batch.append(note)
        if len(batch) >= BATCH:
            sent += post({"mode": "upsert", "notes": batch})["upserted"]
            print(f"  sent {sent}/{len(paths)}")
            batch = []
    if batch:
        sent += post({"mode": "upsert", "notes": batch})["upserted"]
    return sent


def manifest_of(found: list[Path]) -> tuple[list[dict], dict[str, Path]]:
    """Every note's path and content hash, plus a lookup back to the file."""
    manifest = []
    by_path = {}
    for path in found:
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        rel = str(path.relative_to(VAULT))
        manifest.append({"path": rel, "hash": hashlib.sha256(raw).hexdigest()})
        by_path[rel] = path
    return manifest, by_path


def fingerprint(manifest: list[dict]) -> str:
    """One value standing for the whole vault.

    Must be built exactly as `brain_fingerprint()` builds it on the other side:
    md5 over 'path:hash' lines, sorted by path, newline separated. Change one
    end without the other and the two never agree, which shows up as a resync
    on every single tick rather than as an error.
    """
    if not manifest:
        return "empty"
    lines = "\n".join(
        f"{m['path']}:{m['hash']}" for m in sorted(manifest, key=lambda m: m["path"])
    )
    return hashlib.md5(lines.encode("utf-8")).hexdigest()


def reconcile(quiet: bool = False) -> None:
    """Send what differs, delete what is gone.

    Starts with the cheap question. A vault that has not changed costs two small
    JSON objects rather than a 300KB manifest, which is what makes running this
    on a short timer reasonable.
    """
    found = notes()
    manifest, by_path = manifest_of(found)

    answer = post({"mode": "check", "fingerprint": fingerprint(manifest)})
    if answer.get("match"):
        if not quiet:
            print(f"vault: {len(found)} notes — mirror already matches")
        return

    print(f"vault: {len(found)} notes")
    answer = post({"mode": "reconcile", "manifest": manifest})
    want = answer.get("want", [])
    print(f"mirror held {answer.get('held', 0)}, wants {len(want)}, removed {answer.get('removed', 0)}")

    if want:
        sent = send([by_path[p] for p in want if p in by_path])
        print(f"sent {sent}")
    print("up to date")


def watch() -> None:
    """Block until the vault changes, then send just what changed.

    inotify via inotify_simple if it is installed, and a polling fallback if it
    is not, because this should not be the thing that needs a virtualenv on a
    box whose whole job is running containers.
    """
    try:
        from inotify_simple import INotify, flags  # type: ignore
    except ImportError:
        print("inotify_simple not installed — polling every 30s instead")
        return poll()

    inotify = INotify()
    watch_flags = flags.CLOSE_WRITE | flags.MOVED_TO | flags.DELETE | flags.MOVED_FROM
    watched = 0
    for directory in [VAULT, *(d for d in VAULT.rglob("*") if d.is_dir())]:
        if any(p in SKIP_DIRS for p in directory.relative_to(VAULT).parts):
            continue
        inotify.add_watch(str(directory), watch_flags)
        watched += 1
    print(f"watching {watched} directories under {VAULT}")

    while True:
        events = inotify.read(timeout=None)
        # Settle: an editor writing a file produces several events, and
        # Nextcloud syncing a batch produces hundreds. Wait for quiet rather
        # than sending one request per event.
        time.sleep(2)
        inotify.read(timeout=0)

        changed = {e.name for e in events if e.name.endswith(".md")}
        if not changed:
            continue
        print(f"{len(changed)} changed — reconciling")
        # Reconcile rather than sending the named files: it is one extra round
        # trip and it catches the deletes and renames that an event name alone
        # cannot describe.
        reconcile()


def poll(seconds: int = 60) -> None:
    """Check on a timer. Cheap, because of the fingerprint exchange above."""
    while True:
        apply_decisions()
        reconcile(quiet=True)
        time.sleep(seconds)


def decisions_url() -> str:
    """Derived from the sync URL so there is only one address to configure."""
    return URL.rsplit("/", 1)[0] + "/decisions"


def get_decisions() -> list[dict]:
    if not URL or not SECRET:
        sys.exit("BRAIN_SYNC_URL and BRAIN_SYNC_SECRET must both be set.")

    request = urllib.request.Request(
        decisions_url(),
        headers={
            "Authorization": f"Bearer {SECRET}",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read()).get("decisions", [])
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:300]
        sys.exit(f"could not read decisions: HTTP {exc.code} {body}")
    except urllib.error.URLError as exc:
        sys.exit(f"could not read decisions: {exc.reason}")


def carry_out(decision: dict) -> str | None:
    """Move one file. Returns None on success, or a sentence saying why not.

    EVERY path here is re-derived rather than trusted. The site got these from
    this box in the first place, but this is the one process in the loop that
    can write to the vault, so a value that arrived over a network does not get
    to name a destination: the basename is taken, the directory is chosen from a
    fixed set, and the result is proved to be inside the vault before anything
    moves.
    """
    raw_path = str(decision.get("path", ""))
    if not raw_path.startswith("_inbox/") or ".." in raw_path:
        return "not a staged note"

    source = (VAULT / raw_path).resolve()
    inbox = (VAULT / "_inbox").resolve()
    if not source.is_relative_to(inbox):
        return "path escapes the inbox"
    if not source.is_file():
        return "the file is no longer there"

    verdict = decision.get("decision")
    if verdict == "approve":
        bucket = str(decision.get("destination", ""))
        if bucket not in BUCKETS:
            return f"unknown destination {bucket!r}"
        target_dir = (VAULT / bucket).resolve()
    elif verdict == "reject":
        target_dir = (VAULT / "_rejected").resolve()
    else:
        return f"unknown decision {verdict!r}"

    if not target_dir.is_relative_to(VAULT.resolve()):
        return "destination escapes the vault"
    target_dir.mkdir(parents=True, exist_ok=True)

    # Never overwrite. A name collision means two different notes, and the
    # second one silently replacing the first is the one outcome worth more
    # than a suffix.
    target = target_dir / source.name
    if target.exists():
        stem, suffix = source.stem, source.suffix
        for n in range(2, 100):
            candidate = target_dir / f"{stem}-{n}{suffix}"
            if not candidate.exists():
                target = candidate
                break
        else:
            return "a hundred files already have that name"

    try:
        source.rename(target)
    except OSError as exc:
        return str(exc)
    return None


def apply_decisions() -> int:
    """Carry out everything waiting, and report each result back."""
    pending = get_decisions()
    if not pending:
        return 0

    results = []
    for decision in pending:
        problem = carry_out(decision)
        results.append(
            {"id": decision["id"], "ok": problem is None, "error": problem}
        )
        name = decision.get("path", "?")
        print(f"  {'ok  ' if problem is None else 'FAIL'} {name}"
              + (f" — {problem}" if problem else ""))

    request = urllib.request.Request(
        decisions_url(),
        data=json.dumps({"results": results}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SECRET}",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            json.loads(response.read())
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        # The moves already happened. Saying so matters more than exiting: the
        # next run reconciles the files either way, and these rows stay queued
        # until a report gets through.
        print(f"  moves done, but reporting back failed: {exc}", file=sys.stderr)

    return len(results)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reconcile", action="store_true", help="full compare and catch-up")
    parser.add_argument("--decisions", action="store_true", help="apply approvals and rejections")
    parser.add_argument("--watch", action="store_true", help="block and push on change")
    parser.add_argument("--poll", type=int, metavar="SECONDS", help="reconcile on a timer")
    parser.add_argument("--paths", nargs="+", metavar="PATH", help="send these vault-relative paths")
    args = parser.parse_args()

    if not VAULT.is_dir():
        sys.exit(f"{VAULT} is not a directory — is the vault mounted?")

    if args.paths:
        print(f"sent {send([VAULT / p for p in args.paths])}")
    elif args.decisions:
        print(f"applied {apply_decisions()}")
    elif args.watch:
        watch()
    elif args.poll:
        poll(args.poll)
    else:
        # Decisions first: the files move, and the reconcile in the same run
        # then reports them at their new paths instead of leaving the mirror a
        # tick behind.
        applied = apply_decisions()
        if applied:
            print(f"applied {applied}")
        reconcile()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
