// Offline test of worker.js (run: node worker/test.mjs). No network: fake Telegram, fake Turnstile siteverify, fake rate limiter.
import worker from "./worker.js";

const calls = [];
let verify = { success: true, hostname: "zerofill.tech" };
let verifyThrows = false;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  calls.push({ url, init });
  if (url.includes("siteverify")) {
    if (verifyThrows) throw new Error("network down");
    return new Response(JSON.stringify(verify), { headers: { "content-type": "application/json" } });
  }
  if (url.includes("api.telegram.org")) return new Response('{"ok":true}', { status: 200 });
  throw new Error("unexpected fetch " + url);
};

const counts = new Map();
const RL = { async limit({ key }) { const n = (counts.get(key) || 0) + 1; counts.set(key, n); return { success: n <= 5 }; } };
const baseEnv = { BOT_TOKEN: "TEST:TOKEN", CHAT_ID: "1", ALLOWED_ORIGIN: "https://zerofill.tech", BOOKING_RL: RL };

const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 2, 3])], { type: "image/jpeg" });
const png = () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])], { type: "image/png" });
const webp = () => new Blob([new TextEncoder().encode("RIFF\x10\x00\x00\x00WEBPVP8 ")], { type: "image/webp" });
const fake = () => new Blob([new TextEncoder().encode("<?php system($_GET[c]); ?>")], { type: "image/jpeg" });

let ipN = 0;
function post({ origin = "https://zerofill.tech", text = "NEW PICKUP — zerofill.tech\nTEST", photos = [], token, ip, headers = {} } = {}) {
  const fd = new FormData();
  fd.append("text", text);
  photos.forEach((p, i) => fd.append("photo", p, `photo-${i + 1}.jpg`));
  if (token !== undefined) fd.append("cf-turnstile-response", token);
  const h = { "CF-Connecting-IP": ip || `10.0.0.${++ipN}`, ...headers };
  if (origin) h.Origin = origin;
  return new Request("https://relay.test/", { method: "POST", headers: h, body: fd });
}

let fails = 0;
async function t(name, req, env, expectStatus, extra) {
  calls.length = 0;
  const r = await worker.fetch(req, env);
  let ok = r.status === expectStatus;
  let note = "";
  if (ok && extra) { const res = await extra(r); ok = res === true; if (res !== true) note = String(res); }
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${r.status}${ok ? "" : ` (want ${expectStatus}) ${note}`}`);
}
const tg = (m) => calls.filter((c) => c.url.includes(`/${m}`));

await t("OPTIONS preflight", new Request("https://relay.test/", { method: "OPTIONS", headers: { Origin: "https://zerofill.tech" } }), baseEnv, 204);
await t("GET refused", new Request("https://relay.test/"), baseEnv, 405);
await t("no Origin (script) refused", post({ origin: null }), baseEnv, 403, async () => calls.length === 0 || "fetched something");
await t("evil Origin refused", post({ origin: "https://evil.example" }), baseEnv, 403);
await t("*.github.io refused", post({ origin: "https://anyone.github.io" }), baseEnv, 403);
await t("look-alike origin refused", post({ origin: "https://zerofill.tech.evil.example" }), baseEnv, 403);
await t("http:// origin refused", post({ origin: "http://zerofill.tech" }), baseEnv, 403);
await t("site origin, no NEW PICKUP", post({ text: "hello" }), baseEnv, 400, async () => tg("sendMessage").length === 0 || "sent anyway");
await t("www origin allowed", post({ origin: "https://www.zerofill.tech" }), baseEnv, 200, async (r) => r.headers.get("Access-Control-Allow-Origin") === "https://www.zerofill.tech" || "bad ACAO " + r.headers.get("Access-Control-Allow-Origin"));
await t("oversize body refused", post({ headers: { "Content-Length": String(30 * 1024 * 1024) } }), baseEnv, 413);

await t("booking, no secret yet: 2 real photos + 1 fake", post({ photos: [jpeg(), fake(), png()] }), baseEnv, 200, async () => {
  const msg = JSON.parse(tg("sendMessage")[0]?.init.body || "{}").text || "";
  const group = tg("sendMediaGroup")[0];
  if (!msg.includes("(1 attachment not forwarded")) return "no dropped note in: " + msg.slice(-120);
  if (!group) return "no sendMediaGroup";
  const media = JSON.parse(group.init.body.get("media"));
  return media.length === 2 || `media group has ${media.length}`;
});
await t("one WebP photo -> sendPhoto", post({ photos: [webp()] }), baseEnv, 200, async () => tg("sendPhoto").length === 1 || "no sendPhoto");
await t("7 photos -> 5 forwarded, note says 2", post({ photos: [jpeg(), jpeg(), jpeg(), jpeg(), jpeg(), jpeg(), jpeg()] }), baseEnv, 200, async () => {
  const msg = JSON.parse(tg("sendMessage")[0].init.body).text;
  const media = JSON.parse(tg("sendMediaGroup")[0].init.body.get("media"));
  return (media.length === 5 && msg.includes("(2 attachments not forwarded")) || `media=${media.length}`;
});

const env2 = { ...baseEnv, TURNSTILE_SECRET: "secret" };
await t("secret set: no token -> refused", post(), env2, 403, async () => (tg("sendMessage").length === 0 && !calls.some((c) => c.url.includes("siteverify"))) || "called out");
await t("secret set: good token -> sent", post({ token: "tok" }), env2, 200, async () => {
  const v = calls.find((c) => c.url.includes("siteverify"));
  const body = JSON.parse(v.init.body);
  return (body.secret === "secret" && body.response === "tok" && body.remoteip && tg("sendMessage").length === 1) || "bad siteverify call";
});
verify = { success: false, "error-codes": ["invalid-input-response"] };
await t("secret set: rejected token -> refused", post({ token: "bad" }), env2, 403, async () => tg("sendMessage").length === 0 || "sent anyway");
verify = { success: true, hostname: "evil.example" };
await t("secret set: token from another site -> refused", post({ token: "tok" }), env2, 403);
verify = { success: true, hostname: "www.zerofill.tech" };
await t("secret set: token from www -> sent", post({ token: "tok" }), env2, 200);
verifyThrows = true;
await t("secret set: siteverify down -> refused (fail closed)", post({ token: "tok" }), env2, 403);
verifyThrows = false;
await t("secret set: 3000-char token refused", post({ token: "x".repeat(3000) }), env2, 403);

for (let i = 1; i <= 5; i++) await worker.fetch(post({ ip: "203.0.113.9", text: "x" }), baseEnv);
await t("6th post in a minute from one IP -> 429", post({ ip: "203.0.113.9" }), baseEnv, 429, async () => tg("sendMessage").length === 0 || "sent anyway");
await t("other IP unaffected", post({ ip: "203.0.113.10" }), baseEnv, 200);
await t("no rate-limit binding -> still works", post(), { ...baseEnv, BOOKING_RL: undefined }, 200);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
