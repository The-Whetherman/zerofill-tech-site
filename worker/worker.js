/**
 * ZeroFill booking relay — Cloudflare Worker
 * Receives the multipart POST from zerofill.tech and forwards it to Telegram
 * (text as a message, photos as a media group). No storage, no third parties.
 *
 * Abuse controls (2026-11-22, after a Wapiti scan + manual review):
 *   - Origin must be exactly ALLOWED_ORIGIN (or its www. twin). No Origin header = a script = refused.
 *   - Cloudflare Turnstile token required as soon as the TURNSTILE_SECRET secret is set (fails closed;
 *     the site then falls back to a pre-filled email, so a real booking is never lost).
 *   - Per-IP rate limit through the BOOKING_RL binding in wrangler.toml.
 *   - Photos: at most 5, real JPEG/PNG/WebP only (checked by file signature), 10 MB each, 25 MB per request.
 *
 * Secrets (dashboard → Worker → Settings → Variables and Secrets, or `npx wrangler secret put NAME`):
 *   BOT_TOKEN         — Telegram bot token (Zerofill Leads bot)
 *   TURNSTILE_SECRET  — secret key of the zerofill.tech Turnstile widget
 * Vars (wrangler.toml): CHAT_ID, ALLOWED_ORIGIN
 */
const MAX_BODY = 25 * 1024 * 1024;
const MAX_PHOTO = 10 * 1024 * 1024; // Telegram's sendPhoto limit; the site sends ~200 KB JPEGs
const MAX_PHOTOS = 5;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default {
  async fetch(req, env) {
    const primary = env.ALLOWED_ORIGIN || "https://zerofill.tech";
    const allowed = new Set([primary, primary.replace("https://", "https://www.")]);
    const reqOrigin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.has(reqOrigin) ? reqOrigin : primary,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const reply = (status, body) => new Response(body, { status, headers: cors });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return reply(405, "Method not allowed");

    // Browsers always send Origin on a cross-site POST, so a missing one means a script.
    if (!allowed.has(reqOrigin)) return reply(403, "Forbidden");

    const ip = req.headers.get("CF-Connecting-IP") || "unknown";
    if (env.BOOKING_RL) {
      const { success } = await env.BOOKING_RL.limit({ key: ip });
      if (!success) return reply(429, "Too many requests");
    }

    if (Number(req.headers.get("Content-Length") || 0) > MAX_BODY) return reply(413, "Too large");

    let form;
    try { form = await req.formData(); }
    catch { return reply(400, "Bad request"); }

    if (env.TURNSTILE_SECRET) {
      const check = await verifyTurnstile(env.TURNSTILE_SECRET, String(form.get("cf-turnstile-response") || ""), ip, allowed);
      if (!check.ok) {
        console.log("turnstile rejected:", check.why);
        return reply(403, "Verification failed");
      }
    }

    let text = String(form.get("text") || "").slice(0, 3500);
    if (!text.includes("NEW PICKUP")) return reply(400, "Bad request");

    const photos = [];
    let dropped = 0;
    for (const p of form.getAll("photo")) {
      if (!p || typeof p !== "object") continue;
      if (photos.length < MAX_PHOTOS && p.size > 0 && p.size <= MAX_PHOTO && (await isPhoto(p))) photos.push(p);
      else dropped++;
    }
    if (dropped) text += `\n\n(${dropped} attachment${dropped > 1 ? "s" : ""} not forwarded: not a JPEG/PNG/WebP photo, too big, or more than ${MAX_PHOTOS})`;

    const token = String(env.BOT_TOKEN || "").trim().replace(/^["']|["']$/g, "");
    const api = (m) => `https://api.telegram.org/bot${token}/${m}`;

    // 1) text message (plain text: no parse_mode, so nothing in it is interpreted)
    const r1 = await fetch(api("sendMessage"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!r1.ok) {
      // Log Telegram's reason (never the token) so `wrangler tail` shows why delivery failed.
      const why = await r1.text().catch(() => "");
      console.log("telegram sendMessage failed", r1.status, why.slice(0, 300));
      return reply(502, "Telegram error");
    }

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

// A real photo, judged by its first bytes (the declared MIME type is whatever the sender says).
async function isPhoto(file) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && ascii(1, 4) === "PNG";
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return jpeg || png || webp;
}

// Cloudflare Turnstile server-side check. Tokens are single-use, live 5 minutes,
// and must have been issued on one of our own pages.
async function verifyTurnstile(secret, token, ip, allowed) {
  if (!token || token.length > 2048) return { ok: false, why: "missing token" };
  try {
    const r = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip === "unknown" ? undefined : ip }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    if (j.success !== true) return { ok: false, why: (j["error-codes"] || []).join(",") || "not successful" };
    if (j.hostname && !allowed.has(`https://${j.hostname}`)) return { ok: false, why: `hostname ${j.hostname}` };
    return { ok: true };
  } catch {
    return { ok: false, why: "siteverify unreachable" };
  }
}
