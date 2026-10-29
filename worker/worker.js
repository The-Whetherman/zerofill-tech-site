/**
 * ZeroFill booking relay — Cloudflare Worker
 * Receives the multipart POST from zerofill.tech and forwards it to Telegram
 * (text as a message, photos as a media group). No storage, no third parties.
 *
 * Secrets (set in the Cloudflare dashboard → Worker → Settings → Variables):
 *   BOT_TOKEN  — Telegram bot token (from @BotFather)
 *   CHAT_ID    — chat id to post into (your Telegram user id or a group id)
 * Optional vars:
 *   ALLOWED_ORIGIN — default "https://zerofill.tech"
 */
export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || "https://zerofill.tech";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

    // Basic origin check (browsers always send Origin on cross-site POST)
    const reqOrigin = req.headers.get("Origin") || "";
    if (reqOrigin && reqOrigin !== origin && !reqOrigin.endsWith(".github.io")) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    let form;
    try { form = await req.formData(); }
    catch { return new Response("Bad request", { status: 400, headers: cors }); }

    const text = String(form.get("text") || "").slice(0, 3500);
    if (!text.includes("NEW PICKUP")) return new Response("Bad request", { status: 400, headers: cors });
    const photos = form.getAll("photo").filter(p => p && typeof p === "object" && p.size > 0).slice(0, 5);

    const api = (m) => `https://api.telegram.org/bot${env.BOT_TOKEN}/${m}`;

    // 1) text message
    const r1 = await fetch(api("sendMessage"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!r1.ok) return new Response("Telegram error", { status: 502, headers: cors });

    // 2) photos (single -> sendPhoto, multiple -> sendMediaGroup)
    if (photos.length === 1) {
      const fd = new FormData();
      fd.append("chat_id", env.CHAT_ID);
      fd.append("photo", photos[0], "photo.jpg");
      fd.append("caption", "📷 pickup photo");
      await fetch(api("sendPhoto"), { method: "POST", body: fd });
    } else if (photos.length > 1) {
      const fd = new FormData();
      fd.append("chat_id", env.CHAT_ID);
      const media = photos.map((p, i) => { fd.append(`p${i}`, p, `photo-${i + 1}.jpg`); return { type: "photo", media: `attach://p${i}` }; });
      media[0].caption = `📷 ${photos.length} pickup photos`;
      fd.append("media", JSON.stringify(media));
      await fetch(api("sendMediaGroup"), { method: "POST", body: fd });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  },
};
