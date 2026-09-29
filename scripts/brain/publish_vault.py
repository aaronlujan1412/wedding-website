#!/usr/bin/env python3
"""Publish the SecondBrain vault to the website's mirror.

This runs ON THE HOMELAB BOX, not on Vercel. The RAG service is bound to the
tailnet on purpose, so the website cannot reach in; the box pushes out. Same
shape as the lodging finder, and for the same reason -- the token here can only
write notes, which is a far smaller thing to lose than the database key.

The vault stays canonical. Nothing in this script writes to it; it reads files
and posts their contents.

Two ways to run it:

    publish_vault.py --reconcile      compare every path against the mirror,
                                      send what differs, delete what is gone.
                                      This is the first load and the periodic
                                      catch-up.

    publish_vault.py --watch          block, wait for the vault to change, and
                                      send just the notes that changed. This is
                                      the steady state.

    publish_vault.py --paths a.md b.md   send exactly these (mostly for testing)

Environment:
    BRAIN_SYNC_URL      https://<site>/api/brain/sync
    BRAIN_SYNC_SECRET   the bearer token, matching the site's env var
    VAULT_ROOT          defaults to the usual vault path
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
SKIP_DIRS = {".git", ".obsidian", ".trash", "_revisions", "_sources", "_inbox_work"}

# Matches the endpoint's cap, so a batch is never rejected for being too big.
BATCH = 200

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
        reconcile(quiet=True)
        time.sleep(seconds)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reconcile", action="store_true", help="full compare and catch-up")
    parser.add_argument("--watch", action="store_true", help="block and push on change")
    parser.add_argument("--poll", type=int, metavar="SECONDS", help="reconcile on a timer")
    parser.add_argument("--paths", nargs="+", metavar="PATH", help="send these vault-relative paths")
    args = parser.parse_args()

    if not VAULT.is_dir():
        sys.exit(f"{VAULT} is not a directory — is the vault mounted?")

    if args.paths:
        print(f"sent {send([VAULT / p for p in args.paths])}")
    elif args.watch:
        watch()
    elif args.poll:
        poll(args.poll)
    else:
        reconcile()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
