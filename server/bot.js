import crypto from "crypto";

// Telegram bot side: answers /start with a short hello and a button that opens
// the Mini App. Updates arrive on POST /api/tg-webhook; the webhook registers
// itself on cold start, so no manual setWebhook call is needed.
const APP_LINK = process.env.APP_LINK || "https://t.me/wishpool_bot/app";

const TEXT = {
  uk: { hi: (n) => `Привіт${n ? ", " + n : ""}! 🎁\n\nWishpool: список бажань для друзів, пари та сім'ї. Додай, що хочеш отримати, поділись у кімнаті, а друзі тихенько заберуть подарунок, щоб не було двох однакових.\n\nА ще можна просто надіслати мені посилання на товар, фото чи назву, і я додам це у твій вішлист.`, open: "Відкрити Wishpool", openHint: "Твій вішлист і кімнати тут 👇", room: "Тебе запросили в кімнату. Відкривай 👇" },
  ru: { hi: (n) => `Привет${n ? ", " + n : ""}! 🎁\n\nWishpool: вишлист для друзей, пары и семьи. Добавь, что хочешь получить, поделись в комнате, а друзья тихонько заберут подарок, чтобы не было двух одинаковых.\n\nА ещё можно просто прислать мне ссылку на товар, фото или название, и я добавлю это в твой вишлист.`, open: "Открыть Wishpool", openHint: "Твой вишлист и комнаты тут 👇", room: "Тебя пригласили в комнату. Открывай 👇" },
  en: { hi: (n) => `Hi${n ? ", " + n : ""}! 🎁\n\nWishpool is a wishlist for friends, couples and family. Add what you'd love to get, share it in a room, and friends quietly claim gifts so nobody doubles up.\n\nYou can also just send me a product link, a photo or a name, and I'll add it to your wishlist.`, open: "Open Wishpool", openHint: "Your wishlist and rooms are here 👇", room: "You've been invited to a room. Tap below 👇" },
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
    const upd = (info && info.result && info.result.allowed_updates) || [];
    if (info && info.result && info.result.url === url && upd.includes("callback_query")) return;
    const r = await tg(token, "setWebhook", { url, secret_token: webhookSecret(token), allowed_updates: ["message", "callback_query"] });
    console.log("setWebhook", url, r && r.ok);
  } catch (e) { console.error("setWebhook failed", e.message); }
}

// Replies for wishes added by messaging the bot.
const ADD = {
  uk: { done: (t, p) => `Додав у вішлист ✨\n${t}${p ? " · " + p : ""}\n\nПоки його бачиш тільки ти. Відкрий застосунок, щоб показати в кімнаті.`, guess: "Магазин не пустив, тому назву взяв із посилання. Підправ її в застосунку.", noTitle: "Нове бажання", undo: "Скасувати", undone: "Прибрав це бажання.", open: "Відкрити вішлист", fail: "Не вийшло додати, спробуй ще раз трохи пізніше.", help: "Надішли посилання на товар, фото з підписом або просто назву, і я додам це у твій вішлист." },
  ru: { done: (t, p) => `Добавил в вишлист ✨\n${t}${p ? " · " + p : ""}\n\nПока его видишь только ты. Открой приложение, чтобы показать в комнате.`, guess: "Магазин не пустил, поэтому название взял из ссылки. Поправь его в приложении.", noTitle: "Новое желание", undo: "Отменить", undone: "Убрал это желание.", open: "Открыть вишлист", fail: "Не получилось добавить, попробуй ещё раз чуть позже.", help: "Пришли ссылку на товар, фото с подписью или просто название, и я добавлю это в твой вишлист." },
  en: { done: (t, p) => `Added to your wishlist ✨\n${t}${p ? " · " + p : ""}\n\nOnly you can see it for now. Open the app to share it in a room.`, guess: "The shop blocked me, so the name comes from the link. Fix it in the app.", noTitle: "New wish", undo: "Undo", undone: "Removed that wish.", open: "Open wishlist", fail: "Couldn't add it, please try again a bit later.", help: "Send me a product link, a photo with a caption or just a name, and I'll add it to your wishlist." },
};
const URL_RE = /https?:\/\/[^\s<>"]+/i;
// Biggest photo size that is still reasonable for a wish card.
const pickPhoto = (sizes) => (sizes || []).filter(p => p.width <= 1280 && p.height <= 1280).pop() || (sizes || [])[0];
async function tgFileDataUrl(token, fileId) {
  const f = await tg(token, "getFile", { file_id: fileId });
  if (!f || !f.ok || !f.result || !f.result.file_path) throw new Error("no_file");
  const r = await fetch(`https://api.telegram.org/file/bot${token}/${f.result.file_path}`, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error("file_" + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 4_000_000) throw new Error("too_big");
  const ext = (f.result.file_path.split(".").pop() || "").toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${type};base64,${buf.toString("base64")}`;
}

// hooks.addWish(from, { text, url, image }) -> { id, title, price, guess }; hooks.undoWish(userId, wishId)
// Bot menu: the button left of the input opens the Mini App; typing "/" lists
// the commands below (in the user's Telegram language).
const COMMANDS = {
  uk: [["app", "Відкрити вішлист"], ["add", "Як додати бажання"], ["help", "Що вміє бот"]],
  ru: [["app", "Открыть вишлист"], ["add", "Как добавить желание"], ["help", "Что умеет бот"]],
  en: [["app", "Open my wishlist"], ["add", "How to add a wish"], ["help", "What the bot can do"]],
};
const BOT_ABOUT = {
  uk: "Wishpool: вішлисти для друзів, пари та днів народження ⭐\n\n🎁 Додавай бажання: надішли посилання, фото або просто текст\n👥 Ділись у кімнатах: друзі бачать тільки те, що ти обрав\n🤫 Друзі домовляються, хто що дарує, а ти не знаєш, що саме обрали\n🎂 Нагадаємо про дні народження\n\nВідкрий Wishpool кнопкою внизу 👇",
  ru: "Wishpool: вишлисты для друзей, пары и дней рождения ⭐\n\n🎁 Добавляй желания: пришли ссылку, фото или просто текст\n👥 Делись в комнатах: друзья видят только то, что ты выбрал\n🤫 Друзья договариваются, кто что дарит, а ты не знаешь, что именно выбрали\n🎂 Напомним о днях рождения\n\nОткрой Wishpool кнопкой внизу 👇",
  en: "Wishpool: wishlists for friends, couples and birthdays ⭐\n\n🎁 Add wishes: send a link, a photo or just text\n👥 Share in rooms: friends see only what you choose\n🤫 Friends agree on who gives what, and you never know which gift was picked\n🎂 We'll remind you about birthdays\n\nOpen Wishpool with the button below 👇",
};
export async function ensureBotMenu(token) {
  const base = publicUrl();
  if (!token || !base) return;
  try {
    // only when something differs, so a cold start normally costs two quick reads
    const [mine, btn, about] = await Promise.all([tg(token, "getMyCommands", {}), tg(token, "getChatMenuButton", {}), tg(token, "getMyDescription", {})]);
    const same = mine && mine.ok && JSON.stringify((mine.result || []).map(c => [c.command, c.description])) === JSON.stringify(COMMANDS.en)
      && btn && btn.result && btn.result.type === "web_app" && btn.result.web_app && btn.result.web_app.url === base
      && about && about.result && about.result.description === BOT_ABOUT.uk;
    if (same) return;
    const cmds = (l) => COMMANDS[l].map(([command, description]) => ({ command, description }));
    await Promise.all([
      tg(token, "setMyCommands", { commands: cmds("en") }),
      tg(token, "setMyCommands", { commands: cmds("uk"), language_code: "uk" }),
      tg(token, "setMyCommands", { commands: cmds("ru"), language_code: "ru" }),
      tg(token, "setChatMenuButton", { menu_button: { type: "web_app", text: "Wishpool", web_app: { url: base } } }),
      tg(token, "setMyShortDescription", { short_description: "Wishpool · wishlists for friends, couples and birthdays" }),
      tg(token, "setMyShortDescription", { short_description: "Wishpool · вішлисти для друзів, пари та днів народження", language_code: "uk" }),
      tg(token, "setMyShortDescription", { short_description: "Wishpool · вишлисты для друзей, пары и дней рождения", language_code: "ru" }),
      // "What can this bot do?" above the Start button, in the person's Telegram language
      // (Ukrainian for everyone else, like the rest of the app)
      ...Object.entries(BOT_ABOUT).flatMap(([l, text]) => [
        tg(token, "setMyDescription", { description: text, language_code: l }),
        ...(l === "uk" ? [tg(token, "setMyDescription", { description: text })] : []),
      ]),
    ]);
    console.log("bot menu set");
  } catch (e) { console.error("bot menu failed", e.message); }
}

export function botRoute(token, hooks = {}) {
  return async (req, res) => {
    if (!token || req.get("X-Telegram-Bot-Api-Secret-Token") !== webhookSecret(token)) return res.status(401).end();
    // Reply before acking: on serverless hosting work after the response may be frozen.
    const cb = req.body && req.body.callback_query;
    if (cb) {
      const L = ADD[pickLang(cb.from && cb.from.language_code)];
      const m = typeof cb.data === "string" && cb.data.match(/^undo:([\w-]{1,40})$/);
      try {
        if (m && hooks.undoWish && await hooks.undoWish(String(cb.from.id), m[1])) {
          await tg(token, "editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: L.undone });
        }
        await tg(token, "answerCallbackQuery", { callback_query_id: cb.id });
      } catch (e) { console.error("callback failed", e.message); }
      return res.json({ ok: true });
    }
    const msg = req.body && req.body.message;
    if (!msg || !msg.chat || !msg.from || msg.chat.type !== "private") return res.json({ ok: true });
    const L = ADD[pickLang(msg.from.language_code)];
    const text = (msg.text || msg.caption || "").trim();
    if (text.startsWith("/start")) {
      const H = TEXT[pickLang(msg.from.language_code)];
      const param = text.split(/\s+/)[1] || "";
      const link = param && /^[\w-]{1,64}$/.test(param) ? `${APP_LINK}?startapp=${param}` : APP_LINK;
      try {
        await tg(token, "sendMessage", {
          chat_id: msg.chat.id,
          text: param ? H.room : H.hi(msg.from.first_name),
          reply_markup: { inline_keyboard: [[{ text: H.open, url: link }]] },
        });
      } catch (e) { console.error("sendMessage failed", e.message); }
      return res.json({ ok: true });
    }
    const cmd = (text.match(/^\/(\w+)/) || [])[1];
    if (cmd === "app" || cmd === "add" || cmd === "help") {
      const H = TEXT[pickLang(msg.from.language_code)];
      try {
        await tg(token, "sendMessage", {
          chat_id: msg.chat.id, text: cmd === "app" ? H.openHint : L.help,
          reply_markup: { inline_keyboard: [[{ text: H.open, url: APP_LINK }]] },
        });
      } catch (e) {}
      return res.json({ ok: true });
    }
    // Anything else is a wish: a link, a photo (caption = name) or a plain name.
    const url = (text.match(URL_RE) || [])[0] || null;
    const photo = pickPhoto(msg.photo);
    if ((!text && !photo) || text.startsWith("/") || !hooks.addWish) {
      try { await tg(token, "sendMessage", { chat_id: msg.chat.id, text: L.help }); } catch (e) {}
      return res.json({ ok: true });
    }
    try {
      await tg(token, "sendChatAction", { chat_id: msg.chat.id, action: "typing" });
      const image = photo ? await tgFileDataUrl(token, photo.file_id).catch(() => null) : null;
      const name = url ? text.replace(url, "").trim() : text;
      const w = await hooks.addWish(msg.from, { text: name.slice(0, 120), url, image, fallbackTitle: L.noTitle });
      await tg(token, "sendMessage", {
        chat_id: msg.chat.id, reply_to_message_id: msg.message_id,
        text: L.done(w.title, w.price) + (w.guess ? "\n\n" + L.guess : ""),
        reply_markup: { inline_keyboard: [[{ text: L.open, url: APP_LINK }, { text: L.undo, callback_data: "undo:" + w.id }]] },
      });
    } catch (e) {
      console.error("bot add failed", e.message);
      try { await tg(token, "sendMessage", { chat_id: msg.chat.id, text: L.fail }); } catch (x) {}
    }
    res.json({ ok: true });
  };
}

// ---- Event reminders (Vercel cron hits GET /api/cron/remind once a day) ----
const REMIND = {
  uk: { week: (e, r) => `Через тиждень: ${e} у кімнаті «${r}» 🎁\nЗазирни у вішлисти й обери подарунок, поки все не розібрали.`, day: (e, r) => `Вже завтра: ${e} у кімнаті «${r}» 🎉\nПодарунок ще не обрано? Саме час.`, ev: "подія", bday: "день народження", open: "Відкрити кімнату" },
  ru: { week: (e, r) => `Через неделю: ${e} в комнате «${r}» 🎁\nЗагляни в вишлисты и выбери подарок, пока всё не разобрали.`, day: (e, r) => `Уже завтра: ${e} в комнате «${r}» 🎉\nПодарок ещё не выбран? Самое время.`, ev: "событие", bday: "день рождения", open: "Открыть комнату" },
  en: { week: (e, r) => `In a week: ${e} in «${r}» 🎁\nPeek at the wishlists and pick a gift before they're all claimed.`, day: (e, r) => `Tomorrow: ${e} in «${r}» 🎉\nNo gift yet? Now's the time.`, ev: "the event", bday: "the birthday", open: "Open the room" },
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
          if (r.celebrantId && u.id === r.celebrantId) continue; // not "pick a gift" for their own birthday
          const L = REMIND[pickLang(await store.userLang(u.id))];
          try {
            const out = await tg(token, "sendMessage", {
              chat_id: u.id, text: L[kind](r.eventTitle || (r.type === "birthday" ? L.bday : L.ev), r.name),
              reply_markup: { inline_keyboard: [[{ text: L.open, url: `${APP_LINK}?startapp=${r.id}` }]] },
            });
            if (out && out.ok) sent++;
          } catch (e) { /* user never started the bot, or blocked it */ }
        }
      }
    }
    sent += await remindBirthdays(token, store, kyivDay);
    res.json({ ok: true, sent });
  };
}

// Birthday from the user's Telegram profile, if they set one and it's visible
// to bots (Bot API getChat -> ChatFullInfo.birthdate). Null when unavailable.
export async function telegramBirthdate(token, userId) {
  if (!token) return null;
  try {
    const r = await tg(token, "getChat", { chat_id: userId });
    const b = r && r.ok && r.result && r.result.birthdate;
    return b && b.day && b.month ? { day: b.day, month: b.month, year: b.year || null } : null;
  } catch (e) { return null; }
}

// ---- Notifications about what happens in rooms ----
// Never says which wish was claimed or by whom: the owner only learns that
// somebody picked something, so the surprise stays a surprise.
const NOTE = {
  uk: {
    added: (n, r, w) => `${n} додає нове бажання в кімнату «${r}»: ${w} ✨`,
    picked: (r) => `Хтось із кімнати «${r}» уже обрав тобі подарунок 🤫\nЩо саме і хто, не скажемо.`,
    bdayWeek: (n) => `${n} святкує день народження через тиждень 🎂\nЗазирни у вішлист і обери подарунок.`,
    bdayDay: (n) => `${n} святкує день народження вже завтра 🎉\nПодарунок уже є?`,
    open: "Відкрити Wishpool",
  },
  ru: {
    added: (n, r, w) => `${n} добавляет новое желание в комнату «${r}»: ${w} ✨`,
    picked: (r) => `Кто-то из комнаты «${r}» уже выбрал тебе подарок 🤫\nЧто именно и кто, не скажем.`,
    bdayWeek: (n) => `${n} празднует день рождения через неделю 🎂\nЗагляни в вишлист и выбери подарок.`,
    bdayDay: (n) => `${n} празднует день рождения уже завтра 🎉\nПодарок уже есть?`,
    open: "Открыть Wishpool",
  },
  en: {
    added: (n, r, w) => `${n} added a new wish to «${r}»: ${w} ✨`,
    picked: (r) => `Someone in «${r}» has already picked a gift for you 🤫\nWhat and who stays a secret.`,
    bdayWeek: (n) => `${n}'s birthday is in a week 🎂\nPeek at the wishlist and pick a gift.`,
    bdayDay: (n) => `${n}'s birthday is tomorrow 🎉\nGot a gift yet?`,
    open: "Open Wishpool",
  },
};
async function sendNote(token, store, userId, make, startapp) {
  if (!token) return false;
  try {
    const L = NOTE[pickLang(await store.userLang(userId))];
    const out = await tg(token, "sendMessage", {
      chat_id: userId, text: make(L),
      reply_markup: { inline_keyboard: [[{ text: L.open, url: startapp ? `${APP_LINK}?startapp=${startapp}` : APP_LINK }]] },
    });
    return !!(out && out.ok);
  } catch (e) { return false; } // never started the bot, or blocked it
}
// Bounded wait so a slow Telegram never holds up the API response.
const within = (p, ms = 2500) => Promise.race([p.catch(() => {}), new Promise(r => setTimeout(r, ms))]);

// A wish was shared into a room: tell the others (once per owner and room per 3 hours).
export function notifyWishShared(token, store, owner, wish, roomId) {
  return within((async () => {
    if (!(await store.noticeOnce(`add:${owner.id}:${roomId}`, 3 * 3600e3))) return;
    const r = await store.getRoom(roomId); if (!r) return;
    const members = (await store.roomMembers(roomId)).filter(u => u.id !== owner.id);
    await Promise.all(members.map(u => sendNote(token, store, u.id, L => L.added(owner.name, r.name, wish.title), roomId)));
  })());
}
// Someone claimed or chipped in on a wish: tell its owner, without saying which.
export function notifyGiftPicked(token, store, wish, gifterId) {
  return within((async () => {
    if (wish.roomOnly) return; // room gift ideas belong to a guest, not the celebrant
    const rooms = await store.wishRoomIds(wish.id);
    let room = null;
    for (const rid of rooms) if (await store.isMember(rid, gifterId)) { room = await store.getRoom(rid); break; }
    if (!room) return;
    if (!(await store.noticeOnce(`pick:${wish.ownerId}:${room.id}`, 6 * 3600e3))) return;
    await sendNote(token, store, wish.ownerId, L => L.picked(room.name), room.id);
  })());
}
// Birthdays from profiles: remind everyone who shares a room with the person,
// except where a birthday room for them already sends its own reminders.
export async function remindBirthdays(token, store, kyivDayFn) {
  let sent = 0;
  for (const [kind, plus] of [["bdayWeek", 7], ["bdayDay", 1]]) {
    const day = kyivDayFn(plus);
    for (const u of await store.usersWithBirthday(day.slice(5))) {
      if (!(await store.markReminder("u:" + u.id, day, kind))) continue;
      const to = new Set();
      for (const rid of await store.userRoomIds(u.id)) {
        const r = await store.getRoom(rid);
        if (!r || (r.type === "birthday" && r.celebrantId === u.id)) continue;
        for (const m of await store.roomMembers(rid)) if (m.id !== u.id) to.add(m.id);
      }
      for (const id of to) if (await sendNote(token, store, id, L => L[kind](u.name))) sent++;
    }
  }
  return sent;
}
