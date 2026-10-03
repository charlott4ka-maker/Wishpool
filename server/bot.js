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

// ---- Event reminders (Vercel cron hits GET /api/cron/remind once a day) ----
const REMIND = {
  uk: { week: (e, r) => `Через тиждень: ${e} у кімнаті «${r}» 🎁\nЗазирни у вішлисти й обери подарунок, поки все не розібрали.`, day: (e, r) => `Вже завтра: ${e} у кімнаті «${r}» 🎉\nПодарунок ще не обрано? Саме час.`, ev: "подія", open: "Відкрити кімнату" },
  ru: { week: (e, r) => `Через неделю: ${e} в комнате «${r}» 🎁\nЗагляни в вишлисты и выбери подарок, пока всё не разобрали.`, day: (e, r) => `Уже завтра: ${e} в комнате «${r}» 🎉\nПодарок ещё не выбран? Самое время.`, ev: "событие", open: "Открыть комнату" },
  en: { week: (e, r) => `In a week: ${e} in «${r}» 🎁\nPeek at the wishlists and pick a gift before they're all claimed.`, day: (e, r) => `Tomorrow: ${e} in «${r}» 🎉\nNo gift yet? Now's the time.`, ev: "the event", open: "Open the room" },
};
// Calendar day (YYYY-MM-DD) in Kyiv time, `plus` days from now.
function kyivDay(plus = 0) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date());
  const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + plus);
  return d.toISOString().slice(0, 10);
}
export function remindRoute(token, store) {
  return async (req, res) => {
    // Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
    const secret = process.env.CRON_SECRET;
    const okAuth = secret ? req.get("authorization") === `Bearer ${secret}` : /vercel-cron/i.test(req.get("user-agent") || "");
    if (!okAuth) return res.status(401).end();
    if (!token) return res.json({ ok: false, error: "no_token" });
    let sent = 0;
    for (const [kind, plus] of [["week", 7], ["day", 1]]) {
      const day = kyivDay(plus);
      for (const r of await store.roomsWithEventOn(day)) {
        if (!(await store.markReminder(r.id, day, kind))) continue; // already sent
        for (const u of await store.roomMembers(r.id)) {
          const L = REMIND[pickLang(await store.userLang(u.id))];
          try {
            const out = await tg(token, "sendMessage", {
              chat_id: u.id, text: L[kind](r.eventTitle || L.ev, r.name),
              reply_markup: { inline_keyboard: [[{ text: L.open, url: `${APP_LINK}?startapp=${r.id}` }]] },
            });
            if (out && out.ok) sent++;
          } catch (e) { /* user never started the bot, or blocked it */ }
        }
      }
    }
    res.json({ ok: true, sent });
  };
}
