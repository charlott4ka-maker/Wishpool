import crypto from "crypto";

// Telegram bot side: answers /start with a short hello and a button that opens
// the Mini App. Updates arrive on POST /api/tg-webhook; the webhook registers
// itself on cold start, so no manual setWebhook call is needed.
const APP_LINK = process.env.APP_LINK || "https://t.me/wishpool_bot/app";

const TEXT = {
  uk: { hi: (n) => `Привіт${n ? ", " + n : ""}! 🎁\n\nWishpool: список бажань для друзів, пари та сім'ї. Додай, що хочеш отримати, поділись у кімнаті, а друзі тихенько заберуть подарунок, щоб не було двох однакових.`, open: "Відкрити Wishpool", room: "Тебе запросили в кімнату. Відкривай 👇" },
  ru: { hi: (n) => `Привет${n ? ", " + n : ""}! 🎁\n\nWishpool: вишлист для друзей, пары и семьи. Добавь, что хочешь получить, поделись в комнате, а друзья тихонько заберут подарок, чтобы не было двух одинаковых.`, open: "Открыть Wishpool", room: "Тебя пригласили в комнату. Открывай 👇" },
  en: { hi: (n) => `Hi${n ? ", " + n : ""}! 🎁\n\nWishpool is a wishlist for friends, couples and family. Add what you'd love to get, share it in a room, and friends quietly claim gifts so nobody doubles up.`, open: "Open Wishpool", room: "You've been invited to a room. Tap below 👇" },
};
const pickLang = (code) => (code || "").startsWith("uk") ? "uk" : (code || "").startsWith("ru") ? "ru" : "en";

export const webhookSecret = (token) => crypto.createHash("sha256").update("wp-webhook:" + token).digest("hex").slice(0, 48);

async function tg(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
  return r.json().catch(() => ({}));
}

// Public URL of this deployment: explicit PUBLIC_URL, else Vercel's production domain.
function publicUrl() {
  const u = process.env.PUBLIC_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "");
  return u.replace(/\/+$/, "");
}

export async function ensureWebhook(token) {
  const base = publicUrl();
  if (!token || !base) return;
  const url = base + "/api/tg-webhook";
  try {
    const info = await tg(token, "getWebhookInfo", {});
    if (info && info.result && info.result.url === url) return;
    const r = await tg(token, "setWebhook", { url, secret_token: webhookSecret(token), allowed_updates: ["message"] });
    console.log("setWebhook", url, r && r.ok);
  } catch (e) { console.error("setWebhook failed", e.message); }
}

export function botRoute(token) {
  return async (req, res) => {
    if (!token || req.get("X-Telegram-Bot-Api-Secret-Token") !== webhookSecret(token)) return res.status(401).end();
    // Reply before acking: on serverless hosting work after the response may be frozen.
    const msg = req.body && req.body.message;
    if (!msg || !msg.chat || typeof msg.text !== "string" || !msg.text.startsWith("/start")) return res.json({ ok: true });
    const L = TEXT[pickLang(msg.from && msg.from.language_code)];
    const param = msg.text.split(/\s+/)[1] || "";
    const link = param && /^[\w-]{1,64}$/.test(param) ? `${APP_LINK}?startapp=${param}` : APP_LINK;
    try {
      await tg(token, "sendMessage", {
        chat_id: msg.chat.id,
        text: param ? L.room : L.hi(msg.from && msg.from.first_name),
        reply_markup: { inline_keyboard: [[{ text: L.open, url: link }]] },
      });
    } catch (e) { console.error("sendMessage failed", e.message); }
    res.json({ ok: true });
  };
}
