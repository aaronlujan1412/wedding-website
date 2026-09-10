# wedding-photo-receiver

Takes full-resolution originals straight from guests' browsers and writes them
to disk here.

The wedding site stores a 2048px copy of every photo in Supabase — that is what
the gallery serves — and sends the untouched file here instead. Supabase's 1 GB
tier therefore never becomes the limit on keeping full-resolution photographs of
a day that happens once.

If this box does not answer, the site parks the original in a Supabase bucket
instead and `scripts/pull-originals.mjs` in the website repo drains it later.
Nothing is lost when the machine is paused for a gaming session; it just takes
the long way round.

## How it is reached

A Tailscale Funnel node of its own, exactly like `stacks/secondbrain-rag`:

```
guest's phone ──> weddingphotos.<tailnet>.ts.net:443  (Funnel, own tailnet node)
                        └─> wedding-photo-receiver:8080
```

**Do not run `tailscale funnel` on cachy.** It takes cachy's tailnet 443, which
is NPM's, and that took the whole homelab down on 2026-08-20 — see
`stacks/secondbrain-rag/README.md`. Funnel is declared here in
`tailscale-serve.json` and applied by the sidecar via `TS_SERVE_CONFIG`, so it
lives in the repo rather than in a shell command someone has to remember.

The receiver publishes no ports. The sidecar is the only way in, so nothing is
listening on the LAN or on any of cachy's interfaces.

## Deploying

This directory lives in the **wedding-website** repo, which is not the repo
cachy deploys from. Getting it onto the server is three moves, and none of them
have happened yet.

**1. Put it in the homelab repo** (on your laptop):

```bash
cp -r ~/Projects/wedding-website/homelab/wedding-photo-receiver \
      ~/homelab/stacks/
cd ~/homelab
git add stacks/wedding-photo-receiver
git commit -m "feat: add the wedding photo original receiver"
git push
```

**2. Deploy it on cachy:**

```bash
ssh aaron@cachy            # or 192.168.2.229
cd ~/homelab && git pull

cd stacks/wedding-photo-receiver
cp .env.example .env && $EDITOR .env
mkdir -p /mnt/media/wedding-originals
docker compose up -d --build
```

The auth key must be a **pre-auth key and must not be tagged** — a tagged node
leaves `autogroup:member`, which is what grants `funnel` in the policy file, so
a tagged key joins fine and is then refused Funnel. Same trap as secondbrain.

**3. Point the site at it.** 

| variable | value |
| --- | --- |
| `ORIGINALS_UPLOAD_SECRET` | the same value as in `.env` here |
| `NEXT_PUBLIC_ORIGINALS_ENDPOINT` | `https://weddingphotos.<tailnet>.ts.net` |

`ORIGINALS_UPLOAD_SECRET` is shared with this container and nothing else.
`ADMIN_SESSION_SECRET` — which signs host sessions — deliberately never leaves
Vercel, which is why these are two separate secrets rather than one.

## Checking it works

```bash
# From anywhere on the internet, not just the tailnet:
curl https://weddingphotos.<tailnet>.ts.net/health
# {"ok":true}

# An unsigned upload must be refused:
curl -X POST https://weddingphotos.<tailnet>.ts.net/upload \
  -H 'content-type: image/jpeg' --data-binary @some.jpg
# {"ok":false,"error":"bad ticket"}
```

Then upload a photo through the site and watch `docker logs -f
wedding-photo-receiver` for a `stored <uuid>.jpg (<n> bytes)` line. The file
lands at `$ORIGINALS_DIR/<photo-id>.<ext>`, where the id matches
`guest_photos.id` in Supabase, so a web copy and its original can always be
paired back up.

If nothing arrives, the site falls back silently by design — check
`original_at_home` and `original_path` on the row to see which path a photo
took.

## Notes

- **This directory is a copy.** It is authored in the wedding-website repo and
  deployed from the homelab repo, so an edit in one is invisible to the other.
  The homelab repo is the source of truth for what actually runs; treat the
  copy in wedding-website as the thing that has to be re-synced when this
  changes.
- `server.mjs` has no dependencies, only `node:` builtins. Nothing to install
  and nothing to keep patched beyond the base image.
- The ticket check must stay byte-identical to `lib/upload-ticket.ts` in the
  website repo. If that format changes, both sides change together or uploads
  start failing with nothing useful in either log.
- Uploads are idempotent per photo id: a retry that already succeeded returns
  200 rather than overwriting.
- Files are streamed to `<name>.part` and renamed on completion, so an
  interrupted upload never leaves a truncated file where a whole one belongs.
