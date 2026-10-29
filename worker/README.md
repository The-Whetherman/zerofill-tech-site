# Booking relay (Cloudflare Worker → Telegram)

Free tier is plenty (100k requests/day). ~5 minutes.

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
