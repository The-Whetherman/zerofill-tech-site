# Booking relay (Cloudflare Worker → Telegram)

**Live:** https://zerofill-relay.zerofill.workers.dev (account details: private business repo NOTES.md).
Settings live in `wrangler.toml` (CHAT_ID, ALLOWED_ORIGIN). Redeploy after editing `worker.js`:
`cd worker && npx wrangler deploy`. The only secret is BOT_TOKEN: set it with
`npx wrangler secret put BOT_TOKEN` or in the dashboard. It's never committed.
The site falls back to a pre-filled email if the relay fails, so a booking is never lost.

Free tier is plenty (100k requests/day). Original manual setup, kept for reference:

## 1. Create the worker
1. https://dash.cloudflare.com → sign up / log in → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it `zerofill-relay` → **Deploy** (the hello-world is fine for now).
3. Click **Edit code**, select all, paste the contents of `worker.js`, **Deploy**.

## 2. Add the secrets
Worker → **Settings** → **Variables and Secrets** → **Add**:

| Name | Type | Value |
|---|---|---|
| `BOT_TOKEN` | Secret | your bot token from @BotFather (the Zerofill Leads bot, or a new one) |
| `CHAT_ID` | Secret | the chat to post into — your Telegram user id (`8274483328`) or a group id |
| `ALLOWED_ORIGIN` | Text | `https://zerofill.tech` |

Save and **Deploy** again.

## 3. Point the site at it
Copy the worker URL (looks like `https://zerofill-relay.<you>.workers.dev`), then in `index.html`
set `CONFIG.WORKER_URL` to it and push. Done — bookings arrive in Telegram with photos.

## Test
`curl -X POST https://zerofill-relay.<you>.workers.dev -F 'text=NEW PICKUP — test'` → should land in Telegram.

## Notes
- The worker only accepts POSTs whose text contains `NEW PICKUP` and whose Origin is the site, so random hits bounce.
- Photos are already shrunk to ≤1280px by the browser before upload.
- No data is stored anywhere except the Telegram chat.
