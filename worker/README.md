# Booking relay (Cloudflare Worker → Telegram)

**Live:** https://zerofill-relay.zerofill.workers.dev (account details: private business repo NOTES.md).
Settings live in `wrangler.toml` (CHAT_ID, ALLOWED_ORIGIN, the BOOKING_RL rate limit). Redeploy after
editing `worker.js`: `cd worker && npx wrangler deploy` (done from Tank, where wrangler is logged in).
The site falls back to a pre-filled email if the relay refuses or fails, so a booking is never lost.

## Secrets (never committed; this repo is public on GitHub Pages)
Worker → **Settings** → **Variables and Secrets** → **Add** → Type **Secret** (or `npx wrangler secret put NAME`):

| Name | Value |
|---|---|
| `BOT_TOKEN` | Zerofill Leads bot token from @BotFather |
| `TURNSTILE_SECRET` | secret key of the zerofill.tech Turnstile widget (Cloudflare → Turnstile) |

## What the relay accepts (hardened 2026-11-22)
- Only POSTs whose `Origin` is exactly `https://zerofill.tech` (or `www.`). No Origin = a script = 403.
- Once `TURNSTILE_SECRET` is set: a valid Cloudflare Turnstile token in `cf-turnstile-response`, issued on
  zerofill.tech, or 403. The page sends it when `CONFIG.TURNSTILE_SITEKEY` is set (site key is public).
- At most ~5 posts per minute per IP (429 after that; approximate, counted per Cloudflare location).
- Text must contain `NEW PICKUP`. Photos: up to 5 real JPEG/PNG/WebP files (checked by their first bytes),
  10 MB each, 25 MB per request; anything else is dropped and the Telegram message says how many.
- The browser shrinks photos to ≤1280px JPEG before upload. No data is stored anywhere except the Telegram chat.

## Test
- Logic, offline: `node worker/test.mjs` (Node 20+) runs every rule above against fake Telegram/Turnstile
  (25 cases, no network). Run it before each deploy.
- Live, harmless (nothing reaches Telegram): `curl -s -o /dev/null -w '%{http_code}' -X POST -F text=x <relay>`
  → 403 (no Origin). With `-H 'Origin: https://zerofill.tech'` → 400, then 429 after ~6 quick tries.
- Real delivery: make a booking on zerofill.tech (Turnstile needs a real browser). Label it TEST.

Free tier is plenty (100k requests/day).
