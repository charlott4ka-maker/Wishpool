import React, { useState, useEffect, useLayoutEffect, useRef, useContext, createContext } from "react";
import { createPortal } from "react-dom";
import {
  Gift, Users, User, Plus, Check, ChevronLeft, ChevronRight, X,
  Share2, Lock, Dices, Sparkles, Clock, MoreHorizontal, Link2, Heart, Image as ImageIcon, Trash2, Globe, Send, Pencil, RefreshCw, CalendarDays, PartyPopper, Undo2,
} from "lucide-react";

/* ---------- design tokens ---------- */
const C = {
  bg: "#000000",
  card: "#161618",
  card2: "#232326",
  line: "rgba(255,255,255,0.08)",
  t1: "#FFFFFF",
  t2: "#8A8A8E",
  t3: "#5A5A5E",
  blue: "#2E7DF6",
  blueSoft: "rgba(46,125,246,0.16)",
  blueLine: "rgba(46,125,246,0.45)",
  green: "#34C759",
  greenSoft: "rgba(52,199,89,0.16)",
};
// Every button / control is one of exactly two heights.
const H = { lg: 52, sm: 40 };
// Corner radii in Telegram's iOS style: grouped cards 26, tiles 18, sheets 32,
// everything control-like is a full pill.
const R = { card: 26, tile: 18, sheet: 32, pill: 999 };
const font =
  '"Montserrat",-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,sans-serif';

// Safe persistence: uses localStorage when available (real deploy),
// silently falls back to in-memory in sandboxes that block it (artifact preview).
const store = {
  get(key, fallback) {
    try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  },
  set(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  },
};

/* ---------- API client (multiplayer backend) ---------- */
function tgInitData() { try { return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || ""; } catch (e) { return ""; } }
function tgStartParam() { try { return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || null; } catch (e) { return null; } }
async function apiReq(method, path, body, opts = {}) {
  const h = { "Content-Type": "application/json" };
  const d = tgInitData(); if (d) h["X-Init-Data"] = d;
  // Without a timeout a request made in airplane mode can hang forever (endless loading).
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), opts.timeout || (method === "GET" ? 10000 : 30000));
  let res;
  try { res = await fetch("/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: ctl ? ctl.signal : undefined }); }
  catch (x) { if (!opts.quiet) try { window.dispatchEvent(new Event("wp-net-fail")); } catch (y) {} const e = new Error("network"); e.net = true; throw e; }
  finally { if (timer) clearTimeout(timer); }
  if (!res.ok) { let e = {}; try { e = await res.json(); } catch (x) {} throw new Error(e.error || ("http_" + res.status)); }
  return res.json();
}
const api = {
  online: () => !!tgInitData(),          // true inside Telegram → real multiplayer
  startRoomId: tgStartParam,             // room id from an invite deep-link
  state: () => apiReq("GET", "/state"),
  createWish: (w) => apiReq("POST", "/wishes", w),
  deleteWish: (id) => apiReq("DELETE", "/wishes/" + id),
  updateWish: (id, w) => apiReq("PATCH", "/wishes/" + id, w),
  setGifted: (id, gifted) => apiReq("POST", "/wishes/" + id + "/gifted", { gifted }),
  toggleWishRoom: (id, roomId) => apiReq("POST", "/wishes/" + id + "/room", { roomId }),
  createRoom: (r) => apiReq("POST", "/rooms", r),
  updateRoom: (id, data) => apiReq("PATCH", "/rooms/" + id, data),
  joinRoom: (id, inviterId, asCelebrant) => apiReq("POST", "/rooms/" + id + "/join", { ...(inviterId ? { inviterId } : {}), ...(asCelebrant ? { asCelebrant: true } : {}) }),
  peekRoom: (id) => apiReq("GET", "/rooms/" + id + "/peek"),
  setCelebrant: (id, userId) => apiReq("POST", "/rooms/" + id + "/celebrant", { userId: userId || null }),
  addIdea: (id, w) => apiReq("POST", "/rooms/" + id + "/ideas", w),
  deleteIdea: (id, wid) => apiReq("DELETE", "/rooms/" + id + "/ideas/" + wid),
  myBirthday: () => apiReq("GET", "/me/birthday"),
  setBirthday: (birthday) => apiReq("PUT", "/me/birthday", { birthday }),
  leaveRoom: (id) => apiReq("POST", "/rooms/" + id + "/leave"),
  deleteRoom: (id) => apiReq("DELETE", "/rooms/" + id),
  invites: () => apiReq("GET", "/invites"),
  room: (id) => apiReq("GET", "/rooms/" + id),
  reserve: (id) => apiReq("POST", "/wishes/" + id + "/reserve"),
  unreserve: (id) => apiReq("DELETE", "/wishes/" + id + "/reserve"),
  chip: (id) => apiReq("POST", "/wishes/" + id + "/chip"),
  unchip: (id) => apiReq("DELETE", "/wishes/" + id + "/chip"),
  // slow shops + fallback services: give it longer, and a timeout here is not "offline"
  preview: (url) => apiReq("GET", "/preview?url=" + encodeURIComponent(url), null, { timeout: 25000, quiet: true }),
  runDraw: (id, budget) => apiReq("POST", "/rooms/" + id + "/draw", { budget }),
  draw: (id) => apiReq("GET", "/rooms/" + id + "/draw"),
  gifts: () => apiReq("GET", "/gifts"),
};

/* ---------- i18n ---------- */
const LANGS = ["uk", "ru", "en"];
const LANG_SHORT = { uk: "Укр", ru: "Рус", en: "Eng" };

function tgWebApp() { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } }
function detectLang() {
  try {
    const w = tgWebApp();
    const code = (w && w.initDataUnsafe && w.initDataUnsafe.user && w.initDataUnsafe.user.language_code)
      || (typeof navigator !== "undefined" && navigator.language) || "en";
    const c = String(code).toLowerCase();
    if (c.indexOf("uk") === 0) return "uk";
    if (c.indexOf("ru") === 0) return "ru";
    return "en";
  } catch (e) { return "en"; }
}
function tgUserPhoto() {
  try { const w = tgWebApp(); const url = w && w.initDataUnsafe && w.initDataUnsafe.user && w.initDataUnsafe.user.photo_url; return url && /^https:\/\//.test(url) ? url : null; }
  catch (e) { return null; }
}
function tgUserName() {
  try { const w = tgWebApp(); return (w && w.initDataUnsafe && w.initDataUnsafe.user && w.initDataUnsafe.user.first_name) || null; }
  catch (e) { return null; }
}
function openTgLink(url) {
  const w = tgWebApp();
  if (w && w.openTelegramLink) w.openTelegramLink(url);
  else { try { window.open(url, "_blank"); } catch (e) {} }
}
// Telegram haptics: "light"/"medium" taps, "select" for pickers,
// "success"/"warning"/"error" for outcomes. No-op outside Telegram.
function haptic(kind = "light") {
  try {
    const h = tgWebApp() && tgWebApp().HapticFeedback; if (!h) return;
    if (kind === "select") h.selectionChanged();
    else if (kind === "success" || kind === "warning" || kind === "error") h.notificationOccurred(kind);
    else h.impactOccurred(kind);
  } catch (e) {}
}
// Whole days from today (local time) to a YYYY-MM-DD date; null if no date.
function daysUntil(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const now = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
function plural(lang, n, forms) { // forms: [one, few, many] for uk/ru, [one, other] for en
  if (lang === "en") return n === 1 ? forms[0] : forms[1];
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? forms[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? forms[1] : forms[2];
}
// "через 9 дней" / "Завтра" / "Сегодня"; null when there is no upcoming date.
function countdownLabel(lang, t, date) {
  const n = daysUntil(date);
  if (n == null || n < 0) return null;
  if (n === 0) return t("evToday");
  if (n === 1) return t("evTomorrow");
  const unit = plural(lang, n, lang === "uk" ? ["день", "дні", "днів"] : lang === "ru" ? ["день", "дня", "дней"] : ["day", "days"]);
  return t("evIn", { n, unit });
}
function tgConfirm(message, onYes) {
  const w = tgWebApp();
  haptic("warning");
  if (w && w.showConfirm) w.showConfirm(message, (ok) => { if (ok) onYes(); });
  else if (typeof window !== "undefined" && window.confirm) { if (window.confirm(message)) onYes(); }
  else onYes();
}

const STR = {
  tabWishes: { uk: "Бажання", ru: "Желания", en: "Wishes" },
  tabRooms: { uk: "Кімнати", ru: "Комнаты", en: "Rooms" },
  tabProfile: { uk: "Профіль", ru: "Профиль", en: "Profile" },
  back: { uk: "Назад", ru: "Назад", en: "Back" },
  you: { uk: "Ти", ru: "Вы", en: "You" },
  guest: { uk: "Гість", ru: "Гость", en: "Guest" },

  poolTitle: { uk: "Мої бажання", ru: "Мои желания", en: "My wishes" },
  poolSub: { uk: "Спільний пул. Звідси шериш у кімнати.", ru: "Общий пул. Отсюда шеришь в комнаты.", en: "Your pool. Share items into rooms from here." },
  poolEmptyTitle: { uk: "Пул поки порожній", ru: "Пул пока пустой", en: "Your pool is empty" },
  poolEmptySub: { uk: "Додай перше бажання, а потім вирішиш, кому його показати.", ru: "Добавь первое желание, а потом решишь, кому его показать.", en: "Add your first wish. Decide who sees it later." },
  privateNote: { uk: "Приватне, не бачить ніхто", ru: "Приватное, не видит никто", en: "Private, nobody sees it" },
  showInRooms: { uk: "Показати в кімнатах", ru: "Показать в комнатах", en: "Show in rooms" },
  noRoomsHint: { uk: "Поки немає кімнат. Створи на вкладці «Кімнати».", ru: "Пока нет комнат. Создай на вкладке «Комнаты».", en: "No rooms yet. Create one on the Rooms tab." },
  deleteWish: { uk: "Видалити бажання", ru: "Удалить желание", en: "Delete wish" },
  addWish: { uk: "Додати бажання", ru: "Добавить желание", en: "Add a wish" },
  editWish: { uk: "Редагувати бажання", ru: "Изменить желание", en: "Edit wish" },
  editShort: { uk: "Змінити", ru: "Изменить", en: "Edit" },
  wishUpdated: { uk: "Бажання оновлено", ru: "Желание обновлено", en: "Wish updated" },
  noteLabel: { uk: "Коментар для дарувальників", ru: "Комментарий для дарителей", en: "Note for gifters" },
  notePh: { uk: "Розмір M, будь-який колір, крім білого", ru: "Размер M, любой цвет, кроме белого", en: "Size M, any colour but white" },
  priceOne: { uk: "Ціна", ru: "Цена", en: "Price" },
  priceRangeTab: { uk: "Від і до", ru: "От и до", en: "Range" },
  priceFrom: { uk: "від", ru: "от", en: "from" },
  priceTo: { uk: "до", ru: "до", en: "to" },
  priceRange: { uk: "від {a} до {b}", ru: "от {a} до {b}", en: "{a} to {b}" },
  gotIt: { uk: "Мені подарували", ru: "Мне подарили", en: "I got it" },
  ungift: { uk: "Повернути в список", ru: "Вернуть в список", en: "Back to the list" },
  giftedOn: { uk: "Подаровано {date}", ru: "Подарено {date}", en: "Gifted on {date}" },
  giftedBadge: { uk: "Подаровано", ru: "Подарено", en: "Gifted" },
  giftedHint: { uk: "Бажання зникне з кімнат і перейде в архів «Подарували».", ru: "Желание пропадёт из комнат и уйдёт в архив «Подарили».", en: "The wish leaves your rooms and moves to the Gifted archive." },
  wishGiftedToast: { uk: "Вітаємо! Бажання в архіві", ru: "Поздравляем! Желание в архиве", en: "Congrats! Moved to the archive" },
  wishBackToast: { uk: "Бажання знову в списку", ru: "Желание снова в списке", en: "The wish is back on the list" },
  filterAll: { uk: "Усі", ru: "Все", en: "All" },
  filterGifted: { uk: "Подарували", ru: "Подарили", en: "Gifted" },
  filterEmpty: { uk: "Тут поки нічого", ru: "Здесь пока ничего", en: "Nothing here yet" },
  filterEmptySub: { uk: "Відкрий бажання і обери, в яких кімнатах його показувати.", ru: "Открой желание и выбери, в каких комнатах его показывать.", en: "Open a wish and choose which rooms can see it." },
  giftedEmptySub: { uk: "Коли отримаєш подарунок, відкрий бажання і натисни «Мені подарували».", ru: "Когда получишь подарок, открой желание и нажми «Мне подарили».", en: "When you get a gift, open the wish and tap \"I got it\"." },
  myBday: { uk: "День народження", ru: "День рождения", en: "Birthday" },
  myBdayEmpty: { uk: "Вкажи дату", ru: "Укажи дату", en: "Add your date" },
  myBdayHint: { uk: "Друзі з твоїх кімнат отримають нагадування за тиждень і за день.", ru: "Друзья из твоих комнат получат напоминание за неделю и за день.", en: "Friends from your rooms get a reminder a week and a day before." },
  myBdayToday: { uk: "Сьогодні твій день!", ru: "Сегодня твой день!", en: "It's your day!" },
  myBdayFromTg: { uk: "Взяли дату з твого профілю Telegram", ru: "Взяли дату из твоего профиля Telegram", en: "Taken from your Telegram profile" },
  myBdaySaved: { uk: "День народження збережено", ru: "День рождения сохранён", en: "Birthday saved" },
  myBdayClear: { uk: "Прибрати дату", ru: "Убрать дату", en: "Remove date" },
  bdayDate: { uk: "Дата народження", ru: "Дата рождения", en: "Date of birth" },
  obLine1: { uk: "Збирай усе, що хочеш, в одному місці", ru: "Собирай всё, что хочешь, в одном месте", en: "Everything you wish for, in one place" },
  obLine2: { uk: "Ділись із друзями й даруйте потай", ru: "Делись с друзьями и дарите втайне", en: "Share with friends and gift in secret" },
  obStart: { uk: "Почати", ru: "Начать", en: "Let's go" },
  newWishHere: { uk: "Нове бажання", ru: "Новое желание", en: "New wish" },
  wishAddedRoom: { uk: "Додано в кімнату і у твій вішлист", ru: "Добавлено в комнату и в твой вишлист", en: "Added to the room and your wishlist" },
  cancelGiftTitle: { uk: "Скасувати подарунок?", ru: "Отменить подарок?", en: "Cancel this gift?" },
  cancelGiftText: { uk: "«{name}» знову стане вільним, і позначку буде знято.", ru: "«{name}» снова станет свободным, отметка снимется.", en: "«{name}» becomes free again and your mark is removed." },
  cancelGiftYes: { uk: "Так, скасувати", ru: "Да, отменить", en: "Yes, cancel" },
  cancelChipTitle: { uk: "Вийти зі збору?", ru: "Выйти из сбора?", en: "Leave the group gift?" },
  cancelChipText: { uk: "На «{name}» скидаються інші, вони залишаться у зборі.", ru: "На «{name}» скидываются другие, они останутся в сборе.", en: "Others chipping in on «{name}» stay in." },
  cancelChipYes: { uk: "Так, вийти", ru: "Да, выйти", en: "Yes, leave" },
  keepChip: { uk: "Ні, скидаюся", ru: "Нет, скидываюсь", en: "No, I'm in" },
  keepIt: { uk: "Ні, дарую", ru: "Нет, дарю", en: "No, I'm giving it" },
  wishAdded: { uk: "Бажання додано", ru: "Желание добавлено", en: "Wish added" },
  wishDeleted: { uk: "Бажання видалено", ru: "Желание удалено", en: "Wish deleted" },
  roomBirthday: { uk: "День народження", ru: "День рождения", en: "Birthday" },
  birthdayRoomHint: { uk: "Подарунки для одного іменинника. Для себе або сюрпризом для друга.", ru: "Подарки для одного именинника. Для себя или сюрпризом для друга.", en: "Gifts for one birthday person. For yourself or as a surprise." },
  bdayWhose: { uk: "Чий день народження?", ru: "Чей день рождения?", en: "Whose birthday?" },
  bdayMine: { uk: "Мій", ru: "Мой", en: "Mine" },
  bdayOther: { uk: "Іншої людини", ru: "Другого человека", en: "Someone else's" },
  bdayMineNote: { uk: "Ти іменинник: бачиш лише свої бажання, а хто що дарує, лишається сюрпризом.", ru: "Ты именинник: видишь только свои желания, а кто что дарит, остаётся сюрпризом.", en: "You're the birthday person: you see only your wishes, who gifts what stays a surprise." },
  bdayOtherNote: { uk: "Сюрприз: іменинник не побачить ідеї подарунків і хто що дарує. Посилання йому краще не надсилати.", ru: "Сюрприз: именинник не увидит идеи подарков и кто что дарит. Ссылку ему лучше не отправлять.", en: "A surprise: the birthday person won't see gift ideas or who gifts what. Better not send them the link." },
  bdayNameLabel: { uk: "Ім'я іменинника", ru: "Имя именинника", en: "Birthday person's name" },
  bdayNamePh: { uk: "Напр., Оля", ru: "Например, Оля", en: "e.g. Anna" },
  bdayDateLabel: { uk: "Дата свята", ru: "Дата праздника", en: "Party date" },
  bdayFromTg: { uk: "Взяли з твого профілю Telegram", ru: "Взяли из твоего профиля Telegram", en: "Taken from your Telegram profile" },
  bdayRoomNameOf: { uk: "ДР: {name}", ru: "ДР: {name}", en: "{name}'s birthday" },
  bdayRoomNameMine: { uk: "Мій день народження", ru: "Мой день рождения", en: "My birthday" },
  bdayWishesOf: { uk: "Бажання: {name}", ru: "Желания: {name}", en: "{name}'s wishes" },
  bdayIdeas: { uk: "Ідеї подарунків", ru: "Идеи подарков", en: "Gift ideas" },
  bdayIdeasHidden: { uk: "{name} цього не бачить", ru: "{name} этого не видит", en: "{name} can't see this" },
  bdayAddIdea: { uk: "Додати ідею", ru: "Добавить идею", en: "Add an idea" },
  bdayNoIdeasTitle: { uk: "Поки немає ідей", ru: "Пока нет идей", en: "No ideas yet" },
  bdayNoIdeasSub: { uk: "Додайте, що можна подарувати. Посилання на товар теж підійде.", ru: "Добавьте, что можно подарить. Ссылка на товар тоже подойдёт.", en: "Add what could be gifted. A product link works too." },
  bdayNewIdea: { uk: "Ідея подарунку", ru: "Идея подарка", en: "Gift idea" },
  bdayIdeaAdded: { uk: "Ідею додано", ru: "Идея добавлена", en: "Idea added" },
  bdayIdeaBy: { uk: "від {name}", ru: "от {name}", en: "from {name}" },
  bdayCelebrantTitle: { uk: "Тут готують тобі сюрприз", ru: "Тут готовят тебе сюрприз", en: "A surprise is being planned for you" },
  bdayCelebrantSub: { uk: "Додай свої бажання з пулу. Хто що дарує, ти не побачиш.", ru: "Добавь свои желания из пула. Кто что дарит, ты не увидишь.", en: "Add your wishes from the pool. You won't see who gifts what." },
  bdayCelJoined: { uk: "{name} тут як іменинник", ru: "{name} здесь как именинник", en: "{name} is here as the birthday person" },
  bdayNotCel: { uk: "Це не іменинник", ru: "Это не именинник", en: "Not the birthday person" },
  bdayGateTitle: { uk: "Тут готують сюрприз. Іменинник: {name}", ru: "Тут готовят сюрприз. Именинник: {name}", en: "A surprise is being planned for {name}" },
  bdayGateSub: { uk: "Друзі обирають подарунок. Якщо ти і є іменинник, зайди як іменинник: побачиш лише свої бажання, а сюрприз не зіпсуєш.", ru: "Друзья выбирают подарок. Если ты и есть именинник, зайди как именинник: увидишь только свои желания, а сюрприз не испортишь.", en: "Friends are picking a gift. If it's your birthday, join as the birthday person: you'll only see your own wishes and won't spoil the surprise." },
  bdayGateIn: { uk: "Я в ділі", ru: "Я в деле", en: "I'm in" },
  bdayGateMe: { uk: "Це мій день народження", ru: "Это мой день рождения", en: "It's my birthday" },
  privateShort: { uk: "Лише я", ru: "Только я", en: "Only me" },
  pickDate: { uk: "Обрати дату", ru: "Выбрать дату", en: "Pick a date" },
  evToday: { uk: "Сьогодні!", ru: "Сегодня!", en: "Today!" },
  evTomorrow: { uk: "Завтра", ru: "Завтра", en: "Tomorrow" },
  evIn: { uk: "через {n} {unit}", ru: "через {n} {unit}", en: "in {n} {unit}" },
  evHint: { uk: "Бот нагадає всім за тиждень і за день", ru: "Бот напомнит всем за неделю и за день", en: "The bot reminds everyone a week and a day before" },
  giveHow: { uk: "Як даруємо «{name}»?", ru: "Как дарим «{name}»?", en: "How do we gift «{name}»?" },
  giveSolo: { uk: "Подарую від себе", ru: "Подарю от себя", en: "I'll gift it myself" },
  giveSoloSub: { uk: "Позначу за собою, ніхто інший не візьме", ru: "Отмечу за собой, никто другой не возьмёт", en: "Mark it as mine so nobody doubles up" },
  giveGroup: { uk: "Скинемося разом", ru: "Скинемся вместе", en: "Chip in together" },
  giveGroupSub: { uk: "Відкрию збір, інші зможуть приєднатись", ru: "Открою сбор, остальные смогут присоединиться", en: "Start a group gift others can join" },
  chipJoin: { uk: "Скинутись", ru: "Скинуться", en: "Chip in" },
  chipIn: { uk: "В долі", ru: "В доле", en: "In" },
  chipJoined: { uk: "Ти в долі! Інші побачать, що збір відкрито", ru: "Ты в доле! Остальные увидят, что сбор открыт", en: "You're in! Others will see the group gift" },
  chipLeft: { uk: "Ти більше не у зборі", ru: "Ты больше не в сборе", en: "You left the group gift" },
  chipNote: { uk: "Скидаються {n} з {total}", ru: "Скидываются {n} из {total}", en: "{n} of {total} chipping in" },
  linkLabel: { uk: "Посилання на товар", ru: "Ссылка на товар", en: "Product link" },
  linkHint: { uk: "Встав посилання, і ми підтягнемо назву, ціну та фото", ru: "Вставь ссылку, и мы подтянем название, цену и фото", en: "Paste a link and we'll fill in the name, price and photo" },
  linkLoading: { uk: "Шукаю товар…", ru: "Ищу товар…", en: "Looking it up…" },
  linkDone: { uk: "Готово, перевір дані", ru: "Готово, проверь данные", en: "Done, double-check the details" },
  linkGuess: { uk: "Магазин не пускає, назву взяли з посилання. Фото і ціну додай сам", ru: "Магазин не пускает, название взяли из ссылки. Фото и цену добавь сам", en: "The shop blocks previews, so the name comes from the link. Add the photo and price yourself" },
  linkFail: { uk: "Не вдалося підтягнути, заповни вручну", ru: "Не получилось подтянуть, заполни вручную", en: "Couldn't fetch it, fill it in by hand" },
  roomLoadFailTitle: { uk: "Кімната не завантажилась", ru: "Комната не загрузилась", en: "Couldn't load the room" },
  roomLoadFailSub: { uk: "Щось пішло не так. Спробуй ще раз за мить.", ru: "Что-то пошло не так. Попробуй ещё раз через минутку.", en: "Something went wrong. Give it another try in a moment." },
  roomGone: { uk: "Цієї кімнати вже немає", ru: "Этой комнаты уже нет", en: "This room doesn't exist anymore" },
  crashTitle: { uk: "Ой, щось зламалось", ru: "Ой, что-то сломалось", en: "Oops, something broke" },
  crashSub: { uk: "Ми вже знаємо, що так не має бути. Перезапусти, і все повернеться.", ru: "Так быть не должно. Перезапусти, и всё вернётся на место.", en: "That shouldn't happen. Restart and everything will be back in place." },
  crashRestart: { uk: "Перезапустити", ru: "Перезапустить", en: "Restart" },
  offlineTitle: { uk: "Упс, немає інтернету", ru: "Упс, нет интернета", en: "Oops, no internet" },
  offlineSub: { uk: "Перевір підключення, а ми почекаємо тут", ru: "Проверь подключение, а мы подождём тут", en: "Check your connection, we'll wait right here" },
  offlineRetry: { uk: "Спробувати ще раз", ru: "Попробовать снова", en: "Try again" },
  noConnection: { uk: "Немає зв'язку. Перевір інтернет і спробуй ще раз", ru: "Нет связи с сервером. Проверь интернет и попробуй ещё раз", en: "Can't reach the server. Check your connection and try again" },

  roomsTitle: { uk: "Кімнати", ru: "Комнаты", en: "Rooms" },
  roomsSub: { uk: "Запроси друзів і обмінюйтесь бажаннями.", ru: "Пригласи друзей и обменивайтесь желаниями.", en: "Invite friends and swap wishlists." },
  roomsEmptyTitle: { uk: "Поки немає кімнат", ru: "Пока нет комнат", en: "No rooms yet" },
  roomsEmptySub: { uk: "Створи кімнату й поклич друзів. Тут з’являться їхні вішлисти.", ru: "Создай комнату и позови друзей. Здесь появятся их вишлисты.", en: "Create a room and invite friends. Their wishlists show up here." },
  createRoom: { uk: "Створити кімнату", ru: "Создать комнату", en: "Create a room" },
  membersColon: { uk: "Учасники: {n}", ru: "Участники: {n}", en: "{n} members" },
  yourWishesColon: { uk: "твоїх бажань: {n}", ru: "твоих желаний: {n}", en: "{n} of your wishes" },

  roomFriends: { uk: "Друзі", ru: "Друзья", en: "Friends" },
  roomCouple: { uk: "Пара", ru: "Пара", en: "Couple" },
  newRoom: { uk: "Нова кімната", ru: "Новая комната", en: "New room" },
  roomType: { uk: "Тип кімнати", ru: "Тип комнаты", en: "Room type" },
  roomSticker: { uk: "Стікер", ru: "Стикер", en: "Sticker" },
  roomColor: { uk: "Колір", ru: "Цвет", en: "Color" },
  name: { uk: "Назва", ru: "Название", en: "Name" },

  invite: { uk: "Запросити", ru: "Пригласить", en: "Invite" },
  draw: { uk: "Жеребкування", ru: "Жеребьёвка", en: "Draw" },
  segLists: { uk: "Списки друзів", ru: "Списки друзей", en: "Friends' lists" },
  segMine: { uk: "Моє в кімнаті", ru: "Моё в комнате", en: "My items here" },
  onlyYouTitle: { uk: "Тут поки лише ти", ru: "Здесь пока только ты", en: "It's just you so far" },
  onlyYouSub: { uk: "Запроси друзів. Їхні вішлисти з’являться тут, і можна буде дарувати.", ru: "Пригласи друзей. Их вишлисты появятся тут, и можно будет дарить.", en: "Invite friends. Their wishlists appear here and you can start gifting." },
  inviteFriends: { uk: "Запросити друзів", ru: "Пригласить друзей", en: "Invite friends" },
  youGift: { uk: "Ви даруєте", ru: "Вы дарите", en: "You're gifting" },
  taken: { uk: "Зайнято", ru: "Занято", en: "Taken" },
  take: { uk: "Беру", ru: "Беру", en: "I'll get it" },
  giftTakenTitle: { uk: "Ти даруєш «{name}»", ru: "Ты даришь «{name}»", en: "You're gifting «{name}»" },
  giftTakenBody: { uk: "Тсс, ніхто не дізнається, хто що взяв, а іменинник побачить сюрприз лише на святі", ru: "Тсс, никто не узнает, кто что взял, а виновник торжества увидит сюрприз только на празднике", en: "Shh, nobody will know who took what, and the lucky one only sees the surprise on the big day" },
  giftTakenOk: { uk: "Беру на себе", ru: "Беру на себя", en: "On it" },
  photosHint: { uk: "До 3 фото", ru: "До 3 фото", en: "Up to 3 photos" },
  noWishesYet: { uk: "Поки не додав бажань", ru: "Пока не добавил желаний", en: "No wishes yet" },
  reserveNote: { uk: "Резерв бачать дарувальники, але не власник бажання", ru: "Резерв виден дарителям, но скрыт от владельца желания", en: "Reservations show to gifters but are hidden from the wish owner" },
  nothingSharedTitle: { uk: "Ти ще нічим сюди не поділився", ru: "Ты ещё ничем сюда не поделился", en: "You haven't shared anything here" },
  nothingSharedSub: { uk: "Створи нове бажання прямо тут або обери зі своїх.", ru: "Создай новое желание прямо тут или выбери из своих.", en: "Make a new wish right here or pick one of yours." },
  visibleToAll: { uk: "видно всім", ru: "видно всем", en: "visible to all" },
  addFromPool: { uk: "З моїх бажань", ru: "Из моих желаний", en: "From my wishes" },
  editRoomWishes: { uk: "Змінити бажання", ru: "Изменить желания", en: "Edit wishes" },
  roomWishesTitle: { uk: "Бажання в кімнаті", ru: "Желания в комнате", en: "Wishes in this room" },
  poolEmptyInRoom: { uk: "У пулі поки немає бажань. Додай їх на вкладці «Бажання», потім відзначиш тут.", ru: "В пуле пока нет желаний. Добавь их на вкладке «Желания», потом отметишь здесь.", en: "Your pool is empty. Add wishes on the Wishes tab, then check them here." },

  secretExchange: { uk: "Таємний обмін", ru: "Тайный обмен", en: "Secret exchange" },
  drawIntro: { uk: "Кожному випадково випаде один учасник. Ти побачиш лише свого та його бажання.", ru: "Каждому случайно выпадет один участник. Ты увидишь только своего и его желания.", en: "Everyone is randomly assigned one person. You'll see only yours and their wishes." },
  needThree: { uk: "Для жеребкування потрібно щонайменше 3 учасники. Зараз у кімнаті {n}.", ru: "Для жеребьёвки нужно минимум 3 участника. Сейчас в комнате {n}.", en: "A draw needs at least 3 people. The room has {n} now." },
  giftBudget: { uk: "Бюджет подарунка", ru: "Бюджет подарка", en: "Gift budget" },
  participants: { uk: "Учасники ({n})", ru: "Участники ({n})", en: "Participants ({n})" },
  runDraw: { uk: "Провести жеребкування", ru: "Провести жеребьёвку", en: "Run the draw" },
  shuffling: { uk: "Перемішуємо…", ru: "Перемешиваем…", en: "Shuffling…" },
  dealing: { uk: "Роздаємо кожному підопічного", ru: "Раздаём каждому подопечного", en: "Assigning everyone a match" },
  youGot: { uk: "Тобі випав(-ла)", ru: "Тебе выпал", en: "You got" },
  budgetSecret: { uk: "Бюджет {b} · тримаємо в секреті", ru: "Бюджет {b} · держим в секрете", en: "Budget {b} · keep it secret" },
  wishesOf: { uk: "Бажання: {name}", ru: "Желания: {name}", en: "{name}'s wishes" },
  emptyLater: { uk: "Список поки порожній. Зазирни пізніше", ru: "Список пока пуст. Загляни позже", en: "The list is empty. Check back later" },
  gotItTake: { uk: "Зрозуміло, беру подарунок", ru: "Понятно, беру подарок", en: "Got it, I'll get the gift" },

  newWish: { uk: "Нове бажання", ru: "Новое желание", en: "New wish" },
  photo: { uk: "Фото", ru: "Фото", en: "Photo" },
  emojiTab: { uk: "Емодзі", ru: "Эмодзи", en: "Emoji" },
  uploadPhoto: { uk: "Завантажити фото з телефона", ru: "Загрузить фото с телефона", en: "Upload a photo from your phone" },
  replace: { uk: "Замінити", ru: "Заменить", en: "Replace" },
  remove: { uk: "Прибрати", ru: "Убрать", en: "Remove" },
  whatYouWant: { uk: "Що хочеш", ru: "Что хочешь", en: "What you want" },
  whatYouWantPh: { uk: "Напр., бездротові навушники", ru: "Например, беспроводные наушники", en: "e.g. wireless headphones" },
  priceOpt: { uk: "Ціна (необов’язково)", ru: "Цена (необязательно)", en: "Price (optional)" },
  linkOpt: { uk: "Посилання на товар (необов’язково)", ru: "Ссылка на товар (необязательно)", en: "Product link (optional)" },
  nothingSelectedPrivate: { uk: "Без кімнат бажання залишиться приватним", ru: "Без комнат желание останется приватным", en: "With no rooms picked, it stays private" },
  saveWish: { uk: "Зберегти бажання", ru: "Сохранить желание", en: "Save wish" },

  statsLine: { uk: "бажань: {w} · кімнат: {r}", ru: "желаний: {w} · комнат: {r}", en: "{w} wishes · {r} rooms" },
  sharedStat: { uk: "поділився", ru: "поделился", en: "shared" },
  giftingStat: { uk: "дарую друзям", ru: "дарю друзьям", en: "gifting" },
  history: { uk: "Історія подарунків", ru: "История подарков", en: "Gift history" },
  myInvites: { uk: "Мої запрошення", ru: "Мои приглашения", en: "My invites" },
  invitedByYou: { uk: "запрошений тобою", ru: "приглашён тобой", en: "invited by you" },
  invitedNobody: { uk: "Ти ще нікого не запросила", ru: "Ты пока никого не пригласила", en: "You haven't invited anyone yet" },
  invitedNobodySub: { uk: "Поділись кімнатою, і люди зʼявляться тут", ru: "Поделись комнатой, и люди появятся здесь", en: "Share a room and people will show up here" },
  loadingInv: { uk: "Завантаження…", ru: "Загрузка…", en: "Loading…" },
  creating: { uk: "Створюємо…", ru: "Создаём…", en: "Creating…" },
  savingWish: { uk: "Зберігаємо…", ru: "Сохраняем…", en: "Saving…" },
  leaveRoom: { uk: "Вийти з кімнати", ru: "Выйти из комнаты", en: "Leave room" },
  deleteRoom: { uk: "Видалити кімнату", ru: "Удалить комнату", en: "Delete room" },
  confirmLeave: { uk: "Вийти з цієї кімнати?", ru: "Выйти из этой комнаты?", en: "Leave this room?" },
  confirmDelete: { uk: "Видалити кімнату для всіх учасників? Це не можна скасувати.", ru: "Удалить комнату для всех участников? Это нельзя отменить.", en: "Delete this room for everyone? This can't be undone." },
  confirmDeleteWish: { uk: "Видалити це бажання? Це не можна скасувати.", ru: "Удалить это желание? Это нельзя отменить.", en: "Delete this wish? This can't be undone." },
  leftRoom: { uk: "Ти вийшла з кімнати", ru: "Ты вышла из комнаты", en: "You left the room" },
  roomDeleted: { uk: "Кімнату видалено", ru: "Комната удалена", en: "Room deleted" },
  historyEmptyTitle: { uk: "Поки порожньо", ru: "Пока пусто", en: "Nothing yet" },
  historyEmptySub: { uk: "Тут з’являться подарунки, які ти подарував і отримав.", ru: "Здесь появятся подарки, которые ты подарил и получил.", en: "Gifts you've given and received will show up here." },
  giftingFor: { uk: "даруєш {name}", ru: "даришь {name}", en: "gifting {name}" },
  giftCancelled: { uk: "Скасовано", ru: "Отменено", en: "Cancelled" },
  roomFull: { uk: "У цій кімнаті вже двоє, місць більше немає", ru: "В этой комнате уже двое, мест больше нет", en: "This room already has two people, no room left" },
  editRoom: { uk: "Редагувати кімнату", ru: "Редактировать комнату", en: "Edit room" },
  saveChanges: { uk: "Зберегти", ru: "Сохранить", en: "Save changes" },
  coupleRoomHint: { uk: "Тільки для двох. Бачите вішлисти одне одного й обираєте потай.", ru: "Только для двоих. Видите вишлисты друг друга и выбираете втайне.", en: "Just the two of you. See each other's wishlists and pick in secret." },
  friendsRoomHint: { uk: "Для компанії. Обирайте подарунки одне одному, скидайтеся разом або влаштуйте жеребкування, хто кому дарує.", ru: "Для компании. Выбирайте подарки друг другу, скидывайтесь вместе или устройте жеребьёвку, кто кому дарит.", en: "For a group. Pick gifts for each other, chip in together or draw names for who gives to whom." },
  shareBtn: { uk: "Поділитися", ru: "Поделиться", en: "Share" },
  language: { uk: "Мова", ru: "Язык", en: "Language" },
  channel: { uk: "Телеграм-канал творця", ru: "Телеграм-канал создателя", en: "Creator's Telegram channel" },

  linkCopied: { uk: "Посилання скопійовано", ru: "Ссылка скопирована", en: "Link copied" },
  inviteText: { uk: "Залітай у кімнату «{name}» у Wishpool, зберемо вішлисти й обміняємось подарунками 🎁", ru: "Залетай в комнату «{name}» в Wishpool, соберём вишлисты и обменяемся подарками 🎁", en: "Join the «{name}» room in Wishpool, let's build wishlists and swap gifts 🎁" },
};

function tr(lang, id, params) {
  const row = STR[id];
  let s = row ? (row[lang] || row.en || id) : id;
  if (params) for (const k in params) s = s.split("{" + k + "}").join(String(params[k]));
  return s;
}
const LangCtx = createContext({ lang: "en", setLang: () => {}, t: (id) => id });
const useT = () => useContext(LangCtx);

// Wish icons are image stickers (web/public/stickers/<name>.webp), stored in
// the wish's `emoji` field as "stk:<name>" and drawn by <Sticker> with the
// same white outline as emoji. Older wishes keep their plain emoji.
const STICKERS = ["candle", "ghost", "coconut", "shell", "uno", "orange", "matcha", "flower", "bear", "plumbob", "bag", "qblock", "cake", "gift", "piggy", "headphones", "book", "sneakers", "lipstick", "plane", "kitty", "ring", "picture", "gamepad"];
const WISH_EMOJI = STICKERS.map(n => "stk:" + n);

/* ---------- little ui atoms ---------- */
// Emoji drawn as a die-cut sticker with a crisp, evenly rounded white outline.
// An SVG filter blurs the silhouette and thresholds it back to a hard edge, so
// the rim is the same width all round. <StickerDefs/> mounts the filters once.
const STICKER_WIDTHS = [1.5, 2, 2.5, 3, 3.5, 4, 5];
function StickerDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      {STICKER_WIDTHS.map(w => (
        <filter key={w} id={`stk-${w * 10}`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={w / 1.64} result="b" />
          <feComponentTransfer in="b" result="m"><feFuncA type="linear" slope="30" intercept="-1" /></feComponentTransfer>
          <feFlood floodColor="#fff" />
          <feComposite in2="m" operator="in" result="rim" />
          <feMerge><feMergeNode in="rim" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      ))}
    </svg>
  );
}
function stickerFilter(size) {
  const want = size * 0.07;
  const w = STICKER_WIDTHS.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a);
  return `url(#stk-${w * 10}) drop-shadow(0 ${(size * 0.05).toFixed(1)}px ${(size * 0.16).toFixed(1)}px rgba(0,0,0,0.24))`;
}
// Image stickers (web/public/stickers/<name>.webp) are stored as "stk:<name>".
// Their white rim is baked into the file (an SVG filter rim drifted and broke up
// on iOS at large sizes), so they only get the soft shadow here. The box is a
// bit bigger than before because the rim now sits inside the image. The soft
// shadow is baked in too (a CSS drop-shadow got cut into a box on iOS), with a
// 20% transparent margin around the sticker that the negative margin cancels.
// Utya, the Telegram duck, alive (Lottie): "utya:<mood>" anywhere a sticker goes.
// The player is loaded only when a duck is on screen. The JSON comes from our
// server (which fetches it once from Telegram); it's also kept in localStorage
// so the offline and error screens still have their duck.
const utyaMem = {};
function loadUtya(name) {
  if (!utyaMem[name]) {
    utyaMem[name] = (async () => {
      const key = "wp_utya_" + name;
      try { const c = window.localStorage.getItem(key); if (c) return JSON.parse(c); } catch (e) {}
      const r = await fetch("/api/utya/" + name);
      if (!r.ok) throw new Error("utya_" + r.status);
      const txt = await r.text();
      try { if (txt.length < 150000) window.localStorage.setItem(key, txt); } catch (e) {}
      return JSON.parse(txt);
    })();
    utyaMem[name].catch(() => { delete utyaMem[name]; });
  }
  return utyaMem[name];
}
const UTYA_FALLBACK = { scared: "stk:orange", boom: "stk:matcha" };
function Utya({ name, size, style }) {
  const box = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let anim = null, live = true;
    Promise.all([loadUtya(name), import("lottie-web/build/player/lottie_light")]).then(([data, mod]) => {
      if (!live || !box.current) return;
      const lottie = mod.default || mod;
      anim = lottie.loadAnimation({ container: box.current, renderer: "svg", loop: true, autoplay: true, animationData: data });
    }).catch(() => live && setFailed(true));
    return () => { live = false; if (anim) anim.destroy(); };
  }, [name]);
  const px = size * 1.6;
  if (failed) return UTYA_FALLBACK[name] ? <Sticker emoji={UTYA_FALLBACK[name]} size={size} style={style} /> : <div style={{ width: px, height: px, ...style }} />;
  return <div ref={box} style={{ width: px, height: px, display: "inline-block", verticalAlign: "middle", ...style }} />;
}
// Utya goes in empty states and system screens; object stickers stay for rooms and wishes.
function warmUtya() { ["scared", "boom"].forEach(n => loadUtya(n).catch(() => {})); }
function Sticker({ emoji, size, style }) {
  if (typeof emoji === "string" && emoji.startsWith("utya:")) return <Utya name={emoji.slice(5)} size={size} style={style} />;
  if (typeof emoji === "string" && emoji.startsWith("stk:")) {
    return <img src={`/stickers/${emoji.slice(4)}.webp`} alt="" draggable={false}
      style={{ height: size * 1.24 * 1.4, width: size * 1.24 * 1.4, margin: -size * 1.24 * 0.2, objectFit: "contain", display: "inline-block", verticalAlign: "middle", ...style }} />;
  }
  return <span style={{ fontSize: size, lineHeight: 1, display: "inline-block", filter: stickerFilter(size), ...style }}>{emoji}</span>;
}
const wishImages = (w) => (w && w.images && w.images.length ? w.images : (w && w.image ? [w.image] : []));
// Full-screen photo viewer, rendered into <body> so no ancestor can trap it.
// With several photos: swipe or arrows to flip, counter at the top.
function ImageLightbox({ src, images, start = 0, onClose }) {
  const list = images && images.length ? images : [src];
  const [i, setI] = useState(Math.min(start, list.length - 1));
  const touch = useRef(null);
  const go = (d) => setI(x => (x + d + list.length) % list.length);
  const stop = (e) => e.stopPropagation();
  const roundBtn = { background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: H.sm, height: H.sm, borderRadius: H.sm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  const arrow = (d) => list.length > 1 && (
    <button onClick={(e) => { stop(e); go(d); }} aria-label={d < 0 ? "Previous" : "Next"}
      style={{ ...roundBtn, position: "absolute", top: "50%", [d < 0 ? "left" : "right"]: 12, transform: "translateY(-50%)" }}>
      {d < 0 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
  return createPortal(
    <div onClick={(e) => { stop(e); onClose(); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }}
      style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp .2s ease", fontFamily: font }}>
      {list.length > 1 && <div style={{ position: "absolute", top: 26, left: 0, right: 0, textAlign: "center", color: C.t2, fontSize: 14, fontWeight: 600 }}>{i + 1} / {list.length}</div>}
      <button onClick={(e) => { stop(e); onClose(); }} aria-label="Close" style={{ ...roundBtn, position: "absolute", top: 16, right: 16 }}><X size={18} /></button>
      <img src={list[i]} alt="" onClick={stop} style={{ maxWidth: "92%", maxHeight: "80vh", borderRadius: 16, objectFit: "contain" }} />
      {arrow(-1)}{arrow(1)}
    </div>,
    document.body
  );
}
// Wish photos across the top of a card, one at a time: swipe in the card,
// dots + "1/3" badge show there are more, tap opens the full viewer.
function PhotoHeader({ images, height = 200, inset = 16 }) {
  const [open, setOpen] = useState(null);
  const [cur, setCur] = useState(0);
  const n = images.length;
  const onScroll = (e) => { const el = e.currentTarget; setCur(Math.round(el.scrollLeft / el.clientWidth)); };
  return (
    <>
      <div style={{ position: "relative", height, margin: `0 -${inset}px 4px`, borderRadius: `${R.card}px ${R.card}px 0 0`, overflow: "hidden" }}>
        <div onScroll={onScroll} style={{ display: "flex", height: "100%", overflowX: n > 1 ? "auto" : "hidden", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
          {images.map((src, idx) => (
            <div key={idx} onClick={(e) => { e.stopPropagation(); setOpen(idx); }}
              style={{ flex: "0 0 100%", height: "100%", scrollSnapAlign: "start", cursor: "zoom-in", background: `${C.card2} center / cover no-repeat url("${src}")` }} />
          ))}
        </div>
        {n > 1 && (
          <>
            <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 12.5, fontWeight: 600, pointerEvents: "none" }}>{cur + 1}/{n}</div>
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
              {images.map((_, idx) => (
                <span key={idx} style={{ width: idx === cur ? 18 : 6, height: 6, borderRadius: 6, background: idx === cur ? "#fff" : "rgba(255,255,255,0.5)", transition: "width .25s, background .25s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              ))}
            </div>
          </>
        )}
      </div>
      {open != null && <ImageLightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
function GlossTile({ emoji, image, images, size = 92, tint = "#2E7DF6", bare = false }) {
  const [open, setOpen] = useState(false);
  // bare: an emoji as a free-standing sticker, no tile behind it
  if (bare && !image) {
    return (
      <div style={{ width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sticker emoji={emoji} size={size <= 36 ? size * 0.82 : size * 0.56} />
      </div>
    );
  }
  return (
    <>
    <div
      onClick={image ? (e) => { e.stopPropagation(); setOpen(true); } : undefined}
      style={{
        width: size, height: size, borderRadius: size * 0.26,
        background: image ? C.card2 : `radial-gradient(120% 90% at 30% 20%, ${hex(tint,0.22)} 0%, ${C.card2} 55%, ${C.card} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        flexShrink: 0, overflow: "hidden", position: "relative",
        cursor: image ? "zoom-in" : "default",
      }}
    >
      {image ? (
        <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Sticker emoji={emoji} size={size * 0.5} />
      )}
    </div>
    {open && <ImageLightbox src={image} images={images} onClose={() => setOpen(false)} />}
    </>
  );
}
function hex(h, a) {
  const n = h.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function linkHost(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "link"; } }
// Downscale + re-encode a picked photo before it's stored as base64, so a multi-MB
// camera photo doesn't blow past the request body limit or bloat the DB row.
function compressImage(file, maxDim = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale) || 1;
      const h = Math.round(img.height * scale) || 1;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image_load_failed")); };
    img.src = url;
  });
}
// Telegram profile photo when we have one; coloured initial otherwise (no photo,
// hidden by the user's privacy settings, or the image failed to load).
// `cut` = how much the next avatar in a stack overlaps this one: a crescent is
// masked out of this avatar's right side (a gap, not a painted ring), so the
// stack reads cleanly on any background.
function Avatar({ m, size = 34, cut = 0 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [m.photo]);
  const gap = Math.max(2, size * 0.07);
  const mask = cut ? `radial-gradient(circle at ${size * 1.5 - cut}px 50%, transparent ${size / 2 + gap}px, #000 ${size / 2 + gap + 0.5}px)` : undefined;
  return (
    <div style={{
      width: size, height: size, borderRadius: size, background: m.color, overflow: "hidden",
      ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : null),
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
    }}>
      {m.photo && !failed
        ? <img src={m.photo} alt="" onError={() => setFailed(true)} referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : m.name.slice(0, 1)}
    </div>
  );
}
function Pill({ children, onClick, kind = "primary", icon, disabled, full, size = "lg" }) {
  const styles = {
    primary: { background: C.blue, color: "#fff", border: "none" },
    glass: { background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" },
    ghost: { background: "rgba(255,255,255,0.10)", color: C.t1, border: "none", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" },
    soft: { background: C.blueSoft, color: "#7FB0FF", border: `1px solid ${C.blueLine}` },
    green: { background: C.greenSoft, color: "#7EE29A", border: `1px solid rgba(52,199,89,0.4)` },
  }[kind];
  return (
    <button
      onClick={disabled ? undefined : (e) => { haptic("light"); onClick && onClick(e); }}
      style={{
        ...styles, opacity: disabled ? 0.45 : 1, width: full ? "100%" : "auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        height: H[size], padding: size === "lg" && !full ? "0 24px" : "0 16px", minWidth: 0, borderRadius: 999, fontSize: size === "lg" ? 16 : 14.5, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
        fontFamily: font, cursor: disabled ? "default" : "pointer",
      }}
    >
      {icon}{children}
    </button>
  );
}
function Chip({ children, active, onClick, color }) {
  return (
    <button onClick={(e) => { haptic("select"); onClick && onClick(e); }} style={{
      height: H.sm, padding: "0 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: font, flexShrink: 0,
      cursor: "pointer", whiteSpace: "nowrap",
      background: active ? C.blueSoft : "transparent",
      color: active ? "#7FB0FF" : C.t2,
      border: `1px solid ${active ? C.blueLine : C.line}`,
      display: "inline-flex", alignItems: "center", gap: 8,
    }}>
      {color && <span style={{ width: 7, height: 7, borderRadius: 7, background: color }} />}
      {children}
    </button>
  );
}
// neutral: the selected segment is a lighter dark grey instead of accent blue.
function Segmented({ options, value, onChange, style, neutral }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.card, height: H.lg, padding: (H.lg - H.sm) / 2, borderRadius: 999, ...style }}>
      {options.map(([k, l]) => {
        const on = value === k;
        return (
          <button key={k} onClick={() => { if (!on) haptic("select"); onChange(k); }} style={{
            flex: 1, padding: "0 10px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: font,
            fontSize: 14, fontWeight: 600, background: on ? (neutral ? "#3A3A3E" : C.blue) : "transparent", color: on ? "#fff" : C.t2,
          }}>{l}</button>
        );
      })}
    </div>
  );
}
function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: C.card, borderRadius: R.card, ...style }}>{children}</div>;
}
function Sheet({ title, onClose, children }) {
  // title may be omitted (just a close button), e.g. the "gift taken" sheet
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: C.card, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "10px 16px 32px", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)", maxWidth: 440, width: "100%", marginInline: "auto", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.card2, margin: "6px auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ color: C.t1, fontSize: 20, fontWeight: 800 }}>{title || ""}</div>
          <button onClick={onClose} style={{ background: C.card2, border: "none", color: C.t2, width: H.sm, height: H.sm, borderRadius: H.sm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
// Placeholder for empty lists and errors: a tilted sticker, a title, a line of
// text and an optional action. `compact` is the smaller version for sheets.
function Empty({ emoji, title, sub, action, compact, tilt = -8 }) {
  return (
    <div style={{ padding: compact ? "8px 8px" : "48px 24px", animation: "fadeUp .4s ease", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ transform: `rotate(${tilt}deg)` }}><Sticker emoji={emoji} size={compact ? 56 : 88} /></div>
      <div style={{ color: C.t1, fontSize: compact ? 16 : 18, fontWeight: 700, marginTop: 16 }}>{title}</div>
      {sub && <div style={{ color: C.t2, fontSize: 14.5, marginTop: 8, maxWidth: 280, lineHeight: 1.4 }}>{sub}</div>}
      {action && <div style={{ marginTop: compact ? 16 : 24 }}>{action}</div>}
    </div>
  );
}

/* ---------- crash screen ---------- */
// Last line of defence: a render error shows a friendly screen instead of a black page.
export class CrashGuard extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    const lang = store.get("wp_lang", null) || detectLang();
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>
        <StickerDefs />
        <Sticker emoji="utya:boom" size={110} />
        <div style={{ color: C.t1, fontSize: 24, fontWeight: 800, marginTop: 24 }}>{tr(lang, "crashTitle")}</div>
        <div style={{ color: C.t2, fontSize: 15, fontWeight: 500, marginTop: 8, maxWidth: 280, lineHeight: 1.4 }}>{tr(lang, "crashSub")}</div>
        <div style={{ marginTop: 32, width: "100%", maxWidth: 320 }}>
          <Pill full kind="primary" icon={<RefreshCw size={18} />} onClick={() => window.location.reload()}>{tr(lang, "crashRestart")}</Pill>
        </div>
      </div>
    );
  }
}

/* ---------- no internet ---------- */
function OfflineScreen({ busy, onRetry }) {
  const { t } = useT();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center", animation: "fadeUp .3s ease" }}>
      <Sticker emoji="utya:scared" size={110} />
      <div style={{ color: C.t1, fontSize: 24, fontWeight: 800, marginTop: 24 }}>{t("offlineTitle")}</div>
      <div style={{ color: C.t2, fontSize: 15, marginTop: 8, maxWidth: 280, lineHeight: 1.4 }}>{t("offlineSub")}</div>
      <div style={{ marginTop: 32, width: "100%", maxWidth: 320 }}>
        <Pill full kind="primary" icon={<RefreshCw size={18} style={busy ? { animation: "spin 1s linear infinite" } : null} />} disabled={busy} onClick={onRetry}>{t("offlineRetry")}</Pill>
      </div>
    </div>
  );
}

/* ---------- loading skeleton ---------- */
function Bone({ w, h, r = 8, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(90deg, ${C.card2} 25%, rgba(255,255,255,0.07) 37%, ${C.card2} 63%)`,
      backgroundSize: "400% 100%", animation: "shimmer 1.4s ease infinite", ...style,
    }} />
  );
}
function SkeletonScreen({ tab }) {
  const { t } = useT();
  const header = tab === "rooms" ? { title: t("roomsTitle"), sub: t("roomsSub") }
    : tab === "pool" ? { title: t("poolTitle"), sub: t("poolSub") } : null;
  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      {header && (
        <div style={{ padding: "6px 4px 24px" }}>
          <div style={{ color: C.t1, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{header.title}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>{header.sub}</div>
        </div>
      )}
      {[0, 1, 2].map(i => (
        <Card key={i} style={{ padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <Bone w={56} h={56} r={16} />
          <div style={{ flex: 1 }}>
            <Bone w="70%" h={16} r={6} style={{ marginBottom: 8 }} />
            <Bone w="40%" h={12} r={6} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- wish card ---------- */
// Telegram-style list rows: 16px side padding, 30px icon, 16px to the text,
// separators start at the text and stop at the right padding.
const LIST = { pad: 16, icon: 30, gap: 16 };
const sepBelow = (show, inset = LIST.icon + LIST.gap) => show ? {
  backgroundImage: `linear-gradient(${C.line}, ${C.line})`, backgroundRepeat: "no-repeat",
  backgroundPosition: "right bottom", backgroundSize: `calc(100% - ${inset}px) 1px`,
} : null;
// The owner's note for gifters, as a soft quote block.
function WishNote({ text, style, compact }) {
  return (
    <div style={{ background: C.card2, borderRadius: compact ? 12 : 16, padding: compact ? "8px 12px" : "12px 16px", color: C.t1, fontSize: compact ? 13 : 14.5, lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "flex", gap: compact ? 8 : 12, alignItems: "flex-start", ...style }}>
      <Sticker emoji="stk:note" size={compact ? 14 : 18} style={{ margin: compact ? -5 : -6, flexShrink: 0 }} /><span style={{ minWidth: 0 }}>{text}</span>
    </div>
  );
}
function WishRow({ w, right, noPhoto }) {
  const imgs = wishImages(w);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: LIST.gap, padding: "16px 0", minHeight: 64 }}>
      <GlossTile emoji={w.emoji} image={noPhoto ? null : imgs[0]} images={imgs} size={LIST.icon} bare />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.t1, fontSize: 16, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</div>
        {w.price && <div style={{ color: C.t2, fontSize: 13.5, marginTop: 4 }}>{w.price}</div>}
        {w.note && <WishNote compact text={w.note} style={{ marginTop: 8 }} />}
        {w.link && (
          <button onClick={(e) => { e.stopPropagation(); window.open(w.link, "_blank"); }}
            style={{ marginTop: 4, background: "none", border: "none", padding: 0, cursor: "pointer", color: "#7FB0FF", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: font, maxWidth: "100%" }}>
            <Link2 size={12} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkHost(w.link)}</span>
          </button>
        )}
      </div>
      {right}
    </div>
  );
}

/* =======================================================================
   APP
======================================================================= */
// Per Telegram account, so two accounts on one phone never see each other's cache.
const CACHE_KEY = () => {
  let id = "";
  try { const u = window.Telegram.WebApp.initDataUnsafe.user; id = u && u.id ? String(u.id) : ""; } catch (e) {}
  return "wp_cache_" + id;
};
export default function App() {
  const [lang, setLang] = useState(() => store.get("wp_lang", null) || detectLang());
  useEffect(() => { store.set("wp_lang", lang); }, [lang]);
  const t = (id, p) => tr(lang, id, p);

  const [tab, setTab] = useState("pool");
  const [overlay, setOverlay] = useState(null);
  const [toast, setToast] = useState(null);
  const online = api.online();
  const [me, setMe] = useState(() => { const c = online ? store.get(CACHE_KEY(), null) : null; return (c && c.me) || null; });
  // Own birthday (profile): on the server when online, in localStorage otherwise.
  const [localBday, setLocalBday] = useState(() => store.get("wp_birthday", null));
  const birthday = online ? (me && me.birthday) || null : localBday;
  const saveBirthday = async (b) => {
    if (online) {
      try { await api.setBirthday(b); } catch (e) { showToast(t("noConnection"), 3000); return false; }
      setMe(m => ({ ...(m || {}), birthday: b }));
    } else { setLocalBday(b); store.set("wp_birthday", b); }
    if (b) { haptic("success"); showToast(t("myBdaySaved")); }
    return true;
  };
  // First launch: three short intro screens (not when arriving through an invite).
  const [onboard, setOnboard] = useState(() => !store.get("wp_onboarded", false) && !api.startRoomId());
  const finishOnboard = () => { store.set("wp_onboarded", true); setOnboard(false); };
  // keep the offline / error ducks at hand before they're ever needed
  useEffect(() => { const id = setTimeout(warmUtya, 4000); return () => clearTimeout(id); }, []);
  // Online: start from the last state we got from the server (shown instantly),
  // then refresh in the background. Offline/local mode keeps its own keys.
  const [cached] = useState(() => online ? store.get(CACHE_KEY(), null) : null);
  const [rooms, setRooms] = useState(() => (online ? (cached ? cached.rooms : []) : store.get("wp_rooms", [])).map(fixRoom));
  const [wishes, setWishes] = useState(() => online ? (cached ? cached.wishes : []) : store.get("wp_wishes", []));
  const [reserved, setReserved] = useState(() => store.get("wp_reserved", {}));
  const [loading, setLoading] = useState(online && !cached);

  // The old dev-only "Glass" preview is gone; drop its saved choice.
  useEffect(() => { try { window.localStorage.removeItem("wp_design_system"); } catch (e) {} }, []);

  // Persist locally only in single-device (offline) mode. In Telegram the server is the source of truth.
  useEffect(() => { if (!online) store.set("wp_rooms", rooms); }, [rooms, online]);
  useEffect(() => { if (!online) store.set("wp_wishes", wishes); }, [wishes, online]);
  useEffect(() => { if (!online) store.set("wp_reserved", reserved); }, [reserved, online]);
  useEffect(() => { if (online && !loading) store.set(CACHE_KEY(), { wishes, rooms, me }); }, [wishes, rooms, me, online, loading]);

  const showToast = (msg, ms = 1800) => { setToast(msg); setTimeout(() => setToast(null), ms); };

  // netDown: the server can't be reached (no internet), so show the full-screen stub.
  const [netDown, setNetDown] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const refreshState = async ({ quiet } = {}) => {
    try { const st = await api.state(); setMe(st.me || null); setWishes(st.wishes || []); setRooms((st.rooms || []).map(fixRoom)); setNetDown(false); return true; }
    catch (e) { if (!quiet) showToast(t("noConnection"), 3000); return false; }
  };
  const [retrying, setRetrying] = useState(false);
  const retryNet = async () => {
    if (!online) { setNetDown(typeof navigator !== "undefined" && navigator.onLine === false); return; }
    if (retrying) return;
    setRetrying(true);
    const ok = await refreshState({ quiet: true });
    setRetrying(false);
    if (ok) setLoading(false); else setNetDown(true);
  };
  useEffect(() => {
    const off = () => setNetDown(true);
    const on = () => { retryNet(); };
    window.addEventListener("offline", off); window.addEventListener("online", on); window.addEventListener("wp-net-fail", off);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); window.removeEventListener("wp-net-fail", off); };
  }, []); // eslint-disable-line
  // While the stub is up, quietly retry every few seconds so it goes away by itself.
  useEffect(() => {
    if (!netDown) return;
    const id = setInterval(() => { if (typeof navigator === "undefined" || navigator.onLine !== false) retryNet(); }, 5000);
    return () => clearInterval(id);
  }, [netDown]); // eslint-disable-line

  // Online: load state from server + auto-join a room from an invite deep-link (room__inviter).
  useEffect(() => {
    if (!online) return;
    (async () => {
      const sp = api.startRoomId();
      let startId = null, inviterId = null;
      if (sp) { const p = String(sp).split("__"); startId = p[0]; inviterId = p[1] || null; }
      let joinFailed = false;
      // a surprise birthday room you're not in yet: show the gate instead of joining
      if (startId) {
        try {
          const pk = await api.peekRoom(startId);
          const r = pk && pk.room;
          if (r && !r.member && r.type === "birthday" && r.bdayMode === "other") {
            await refreshState({ quiet: true });
            setOverlay({ type: "gate", room: r, inviterId });
            setLoading(false);
            return;
          }
        } catch (e) { /* fall through to a normal join */ }
      }
      if (startId) { try { await api.joinRoom(startId, inviterId); } catch (e) { joinFailed = true; if (e.message === "room_full") showToast(t("roomFull"), 3000); else if (e.message === "not_found") showToast(t("roomGone"), 3000); } }
      const ok = await refreshState({ quiet: true });
      if (!ok) { setNetDown(true); return; }
      if (startId && !joinFailed) setOverlay({ type: "room", roomId: startId });
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  const deleteWish = async (wid) => {
    if (online) {
      try { await api.deleteWish(wid); } catch (e) { showToast(t("noConnection"), 3000); return; }
    }
    setWishes(ws => ws.filter(w => w.id !== wid)); showToast(t("wishDeleted"));
  };

  const [roomRefresh, setRoomRefresh] = useState(0);
  const addIdea = async (roomId, w) => {
    try { await api.addIdea(roomId, { emoji: w.emoji, images: w.images, link: w.link, title: w.title, price: w.price, note: w.note }); }
    catch (e) { showToast(t("noConnection"), 3000); throw e; }
    setRoomRefresh(x => x + 1); setOverlay({ type: "room", roomId }); showToast(t("bdayIdeaAdded"));
  };
  // Invite into a surprise birthday room: first ask if it's *your* birthday.
  const joinFromGate = async (g, asCel) => {
    try { await api.joinRoom(g.room.id, g.inviterId, asCel); }
    catch (e) { showToast(t("noConnection"), 3000); return; }
    await refreshState({ quiet: true });
    setOverlay({ type: "room", roomId: g.room.id });
  };
  const editWish = async (id, w) => {
    if (online) {
      try { const r = await api.updateWish(id, w); setWishes(ws => ws.map(x => x.id === id ? { ...x, ...r.wish } : x)); }
      catch (e) { showToast(t("noConnection"), 3000); throw e; }
    } else setWishes(ws => ws.map(x => x.id === id ? { ...x, ...w, rooms: x.rooms } : x));
    setOverlay(null); showToast(t("wishUpdated"));
  };
  const setGifted = async (id, gifted) => {
    let at = gifted ? Date.now() : null;
    if (online) {
      try { at = (await api.setGifted(id, gifted)).giftedAt; }
      catch (e) { showToast(t("noConnection"), 3000); return; }
    }
    setWishes(ws => ws.map(x => x.id === id ? { ...x, giftedAt: at } : x));
    if (gifted) { haptic("success"); showToast(t("wishGiftedToast")); } else showToast(t("wishBackToast"));
  };
  // fromRoom: created inside a room; it lands in the wishlist and in that room, and we stay there
  const addWish = async (w, fromRoom) => {
    if (online) {
      try { const r = await api.createWish(w); setWishes(ws => [r.wish, ...ws]); }
      catch (e) { showToast(t("noConnection"), 3000); throw e; }
    } else setWishes(ws => [{ ...w, id: "w" + Date.now() }, ...ws]);
    setOverlay(fromRoom ? { type: "room", roomId: fromRoom } : null);
    showToast(t(fromRoom ? "wishAddedRoom" : "wishAdded"));
  };

  const shareInvite = (room) => {
    if (!room) return;
    const tail = (online && me && me.id) ? `${room.id}__${me.id}` : room.id;
    const link = `https://t.me/wishpool_bot/app?startapp=${tail}`;
    const text = t("inviteText", { name: room.name });
    const tg = tgWebApp();
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => showToast(t("linkCopied"))).catch(() => showToast(link));
    } else {
      showToast(link);
    }
  };

  const createRoom = async (data) => {
    if (online) {
      try { const r = await api.createRoom(data); await refreshState(); setOverlay({ type: "room", roomId: r.room.id }); return; }
      catch (e) { showToast(t("noConnection"), 3000); throw e; }
    }
    const id = "r" + Date.now();
    const room = { id, name: data.name, type: data.type, emoji: data.emoji, tint: data.tint, eventTitle: data.eventTitle || "", eventDate: data.eventDate || "",
      members: [{ id: "you", name: t("you"), color: "#7B61FF", you: true }] };
    setRooms(rs => [...rs, room]);
    setOverlay({ type: "room", roomId: id });
  };

  const updateRoom = async (roomId, data) => {
    if (online) {
      try { await api.updateRoom(roomId, data); await refreshState(); setOverlay({ type: "room", roomId }); return; }
      catch (e) { showToast(t("noConnection"), 3000); throw e; }
    }
    setRooms(rs => rs.map(r => r.id === roomId ? { ...r, ...data } : r));
    setOverlay({ type: "room", roomId });
  };

  const leaveRoom = async (roomId) => {
    if (online) {
      try { await api.leaveRoom(roomId); } catch (e) { showToast(t("noConnection"), 3000); return; }
      setOverlay(null); await refreshState();
    } else { setRooms(rs => rs.filter(r => r.id !== roomId)); setOverlay(null); }
    showToast(t("leftRoom"));
  };
  const removeRoom = async (roomId) => {
    if (online) {
      try { await api.deleteRoom(roomId); } catch (e) { showToast(t("noConnection"), 3000); return; }
      setOverlay(null); await refreshState();
    } else { setRooms(rs => rs.filter(r => r.id !== roomId)); setOverlay(null); }
    showToast(t("roomDeleted"));
  };

  const [celebrate, setCelebrate] = useState(null);
  const reserve = async (wish) => {
    const wid = wish.id;
    if (online) {
      try { await api.reserve(wid); } catch (e) { showToast(t("noConnection"), 3000); return; }
    }
    setReserved(r => ({ ...r, [wid]: "you" }));
    setCelebrate({ title: wish.title });
    try { const tg = tgWebApp(); tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred("success"); } catch (e) {}
  };
  const unreserve = async (wid) => {
    if (online) {
      try { await api.unreserve(wid); } catch (e) { showToast(t("noConnection"), 3000); return; }
    }
    setReserved(r => { const n = { ...r }; delete n[wid]; return n; }); showToast(t("giftCancelled"));
  };
  const chip = async (wid) => {
    if (online) { try { await api.chip(wid); } catch (e) { showToast(t("noConnection"), 3000); return false; } }
    else setReserved(r => ({ ...r, [wid]: "chip" }));
    haptic("success"); showToast(t("chipJoined"), 2600); return true;
  };
  const unchip = async (wid) => {
    if (online) { try { await api.unchip(wid); } catch (e) { showToast(t("noConnection"), 3000); return; } }
    else setReserved(r => { const n = { ...r }; delete n[wid]; return n; });
    showToast(t("chipLeft"));
  };
  const toggleWishRoom = async (wid, rid) => {
    if (online) {
      try { const r = await api.toggleWishRoom(wid, rid); setWishes(ws => ws.map(w => w.id === wid ? { ...w, rooms: r.rooms } : w)); return; }
      catch (e) { showToast(t("noConnection"), 3000); return; }
    }
    setWishes(ws => ws.map(w => w.id === wid
      ? { ...w, rooms: w.rooms.includes(rid) ? w.rooms.filter(r => r !== rid) : [...w.rooms, rid] } : w));
  };

  const roomCloser = useRef(null); // set by RoomDetail: shrink back into the folder, then close
  useEffect(() => {
    const tg = tgWebApp();
    const bb = tg && tg.BackButton;
    if (!bb) return;
    let handler;
    if (overlay) {
      handler = () => {
        if (overlay.type === "draw" || overlay.type === "pool" || overlay.type === "editRoom" || overlay.type === "roomWish") setOverlay({ type: "room", roomId: overlay.roomId });
        else if (overlay.type === "room" && roomCloser.current) roomCloser.current();
        else setOverlay(null);
      };
      bb.onClick(handler);
      bb.show();
    } else {
      bb.hide();
    }
    return () => { if (handler) bb.offClick(handler); };
  }, [overlay]);

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: font, fontWeight: 500 }}>
      <StickerDefs />
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body,input,button,textarea,select{font-weight:500;font-family:inherit}
        input::placeholder{font-weight:500}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes basketDrop{0%{transform:translateY(-40px) rotate(-12deg) scale(.6);opacity:0}60%{transform:translateY(6px) rotate(4deg) scale(1.05);opacity:1}80%{transform:translateY(-2px) rotate(-2deg)}100%{transform:none}}
        @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}
        @keyframes spinEmoji{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 ${hex(C.blue,0.0)}}50%{box-shadow:0 0 40px 4px ${hex(C.blue,0.45)}}}
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes obSpin{to{transform:rotate(360deg)}}
        @keyframes obSpinRev{to{transform:rotate(-360deg)}}
        @keyframes obBlink{50%{opacity:0}}
        @keyframes obIn{from{transform:scale(1.3) rotate(-10deg)}to{transform:none}}
        @keyframes obSquish{0%,100%{transform:none}35%{transform:scale(1.07,.88)}65%{transform:scale(.97,1.05)}}
        @keyframes obDrop{0%{transform:translate(-50%,-250px) rotate(-14deg);opacity:0}12%{opacity:1}70%{transform:translate(-50%,-20px) rotate(6deg)}100%{transform:translate(-50%,40px) rotate(0) scale(.8);opacity:1}}
        ::-webkit-scrollbar{display:none}
      `}</style>

      <div style={{ width: "100%", maxWidth: 440, minHeight: "100vh", background: C.bg, position: "relative", overflow: "clip" }}>
        <div style={{ padding: "16px 16px 120px" }}>
          {loading ? <SkeletonScreen tab={tab} /> : (
            <>
              {tab === "pool" && (
                <PoolScreen wishes={wishes} rooms={rooms}
                  onAdd={() => setOverlay({ type: "add" })}
                  onEdit={(id) => setOverlay({ type: "editWish", wishId: id })}
                  onGifted={setGifted}
                  onToggleRoom={toggleWishRoom}
                  onDelete={deleteWish}
                />
              )}
              {tab === "rooms" && (
                <RoomsScreen rooms={rooms} wishes={wishes}
                  onOpen={(id, rect) => setOverlay({ type: "room", roomId: id, from: rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom } : null })}
                  onCreate={() => setOverlay({ type: "createRoom" })} />
              )}
              {tab === "profile" && <ProfileScreen wishes={wishes} rooms={rooms} reserved={reserved} birthday={birthday} onBirthday={saveBirthday} onHistory={() => setOverlay({ type: "history" })} onInvites={() => setOverlay({ type: "invites" })} />}
            </>
          )}
        </div>

        {onboard && <Onboarding onDone={finishOnboard} />}
        {!overlay && <TabBar tab={tab} setTab={(x) => { setTab(x); setOverlay(null); }} />}

        {overlay?.type === "add" && (
          <AddSheet rooms={rooms} onClose={() => setOverlay(null)}
            onSave={addWish} />
        )}
        {overlay?.type === "roomWish" && (
          <AddSheet rooms={rooms} presetRooms={[overlay.roomId]} onClose={() => setOverlay({ type: "room", roomId: overlay.roomId })}
            onSave={(w) => addWish(w, overlay.roomId)} />
        )}
        {overlay?.type === "editWish" && wishes.find(w => w.id === overlay.wishId) && (
          <AddSheet rooms={rooms} initial={wishes.find(w => w.id === overlay.wishId)} onClose={() => setOverlay(null)}
            onSave={(w) => editWish(overlay.wishId, w)} />
        )}
        {overlay?.type === "createRoom" && (
          <CreateRoomSheet online={online} onClose={() => setOverlay(null)} onCreate={createRoom} />
        )}
        {(overlay?.type === "room" || overlay?.type === "pool" || overlay?.type === "draw" || overlay?.type === "editRoom" || overlay?.type === "idea" || overlay?.type === "roomWish") && (
          <RoomDetail room={rooms.find(r => r.id === overlay.roomId)} wishes={wishes}
            reserved={reserved}
            online={online}
            onReserve={reserve}
            onUnreserve={unreserve}
            onChip={chip}
            onUnchip={unchip}
            onAddFromPool={() => setOverlay({ type: "pool", roomId: overlay.roomId })}
            onNewWish={() => setOverlay({ type: "roomWish", roomId: overlay.roomId })}
            onAddIdea={() => setOverlay({ type: "idea", roomId: overlay.roomId })}
            refreshKey={roomRefresh}
            onError={() => showToast(t("noConnection"), 3000)}
            onInvite={() => shareInvite(rooms.find(r => r.id === overlay.roomId))}
            onDraw={() => setOverlay({ type: "draw", roomId: overlay.roomId })}
            onEdit={() => setOverlay({ type: "editRoom", roomId: overlay.roomId })}
            onLeave={() => leaveRoom(overlay.roomId)}
            onDelete={() => removeRoom(overlay.roomId)}
            from={overlay.from} closerRef={roomCloser}
            onBack={() => setOverlay(null)} />
        )}
        {overlay?.type === "idea" && (
          <AddSheet idea rooms={[]} onClose={() => setOverlay({ type: "room", roomId: overlay.roomId })}
            onSave={(w) => addIdea(overlay.roomId, w)} />
        )}
        {overlay?.type === "gate" && (
          <SurpriseGate room={overlay.room} onJoin={(asCel) => joinFromGate(overlay, asCel)} />
        )}
        {overlay?.type === "pool" && (
          <PoolPickerSheet wishes={wishes} roomId={overlay.roomId}
            onToggle={(wid) => toggleWishRoom(wid, overlay.roomId)}
            onClose={() => setOverlay({ type: "room", roomId: overlay.roomId })} />
        )}
        {overlay?.type === "editRoom" && (
          <EditRoomSheet room={rooms.find(r => r.id === overlay.roomId)}
            onClose={() => setOverlay({ type: "room", roomId: overlay.roomId })}
            onSave={(data) => updateRoom(overlay.roomId, data)} />
        )}
        {overlay?.type === "draw" && (
          <DrawFlow room={rooms.find(r => r.id === overlay.roomId)}
            reserved={reserved}
            online={online}
            onReserve={reserve}
            onUnreserve={unreserve}
            onInvite={() => shareInvite(rooms.find(r => r.id === overlay.roomId))}
            onError={() => showToast(t("noConnection"), 3000)}
            onClose={() => setOverlay({ type: "room", roomId: overlay.roomId })} />
        )}

        {overlay?.type === "history" && (
          <HistorySheet online={online} onClose={() => setOverlay(null)} />
        )}
        {overlay?.type === "invites" && (
          <InvitesSheet online={online} rooms={rooms} onShare={shareInvite} onClose={() => setOverlay(null)} />
        )}

        {netDown && <OfflineScreen busy={retrying} onRetry={retryNet} />}

        {celebrate && <GiftTakenSheet title={celebrate.title} onClose={() => setCelebrate(null)} />}

        {toast && (
          <div style={{
            position: "fixed", bottom: 108, left: "50%", transform: "translateX(-50%)",
            background: C.card2, color: C.t1, padding: "12px 18px", borderRadius: R.pill,
            fontSize: 14.5, fontWeight: 600, border: `1px solid ${C.line}`, zIndex: 60,
            animation: "fadeUp .25s ease", maxWidth: 320, textAlign: "center",
          }}>{toast}</div>
        )}
      </div>
    </div>
    </LangCtx.Provider>
  );
}

/* ---------- chrome ---------- */
function FallbackBack({ onBack }) {
  const { t } = useT();
  const hasTG = typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.BackButton;
  if (hasTG) return null;
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, background: C.bg, padding: "14px 16px 6px" }}>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 4, background: C.card, color: C.t1,
        border: `1px solid ${C.line}`, borderRadius: 999, height: H.sm, padding: "0 16px 0 12px", fontSize: 14.5,
        fontWeight: 600, fontFamily: font, cursor: "pointer",
      }}>
        <ChevronLeft size={18} /> {t("back")}
      </button>
    </div>
  );
}
function TabBar({ tab, setTab }) {
  const { t } = useT();
  const items = [
    { id: "pool", label: t("tabWishes"), icon: Gift },
    { id: "rooms", label: t("tabRooms"), icon: Users },
    { id: "profile", label: t("tabProfile"), icon: User },
  ];
  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
      <div style={{
        display: "flex", gap: 8, background: hex("#1C1C1E", 0.92), backdropFilter: "blur(20px)",
        padding: 6, borderRadius: 999, border: `1px solid ${C.line}`,
      }}>
        {items.map(it => {
          const on = tab === it.id; const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => { if (tab !== it.id) haptic("select"); setTab(it.id); }} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              height: H.lg, padding: "0 20px", justifyContent: "center", borderRadius: 999, border: "none", cursor: "pointer",
              background: on ? C.blueSoft : "transparent", color: on ? "#7FB0FF" : C.t2, fontFamily: font,
            }}>
              <Icon size={21} />
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- POOL ---------- */
// The screen's main button sits at the end of the list; a round "+" next to
// the title gives the same action without scrolling down.
const MAIN_CTA = { marginTop: 24 };
function HeaderAdd({ onClick, label }) {
  return (
    <button onClick={() => { haptic("light"); onClick(); }} aria-label={label} style={{
      width: H.lg, height: H.lg, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
      background: C.card2, color: C.t1, display: "flex", alignItems: "center", justifyContent: "center",
    }}><Plus size={24} /></button>
  );
}
function PoolScreen({ wishes, rooms, onAdd, onToggleRoom, onDelete, onEdit, onGifted }) {
  const { t } = useT();
  const [openId, setOpenId] = useState(null);
  // Filter row: all wishes, private ones, per room, and the "gifted" archive.
  const [filter, setFilter] = useState("all");
  const active = wishes.filter(w => !w.giftedAt);
  const gifted = wishes.filter(w => w.giftedAt).sort((a, b) => b.giftedAt - a.giftedAt);
  const roomTabs = rooms.filter(r => active.some(w => (w.rooms || []).includes(r.id)));
  const tabs = [
    ["all", t("filterAll"), active.length],
    ...(active.some(w => !(w.rooms || []).length) && roomTabs.length ? [["private", t("privateShort"), active.filter(w => !(w.rooms || []).length).length]] : []),
    ...roomTabs.map(r => [r.id, r.name, active.filter(w => (w.rooms || []).includes(r.id)).length, r]),
    ...(gifted.length ? [["gifted", t("filterGifted"), gifted.length]] : []),
  ];
  const cur = tabs.some(x => x[0] === filter) ? filter : "all";
  const shown = cur === "all" ? active : cur === "gifted" ? gifted : cur === "private"
    ? active.filter(w => !(w.rooms || []).length) : active.filter(w => (w.rooms || []).includes(cur));
  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: "6px 4px 24px" }}>
        <div>
          <div style={{ color: C.t1, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t("poolTitle")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>{t("poolSub")}</div>
        </div>
        <HeaderAdd onClick={onAdd} label={t("addWish")} />
      </div>

      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "-8px -16px 16px", padding: "0 16px", scrollbarWidth: "none" }}>
          {tabs.map(([k, label, n, r]) => (
            <Chip key={k} active={cur === k} onClick={() => setFilter(k)}>
              {r ? <Sticker emoji={r.emoji} size={15} /> : k === "private" ? <Lock size={14} /> : k === "gifted" ? <Sticker emoji="stk:gift" size={15} /> : null}
              {label}<span style={{ opacity: 0.55 }}>{n}</span>
            </Chip>
          ))}
        </div>
      )}

      {wishes.length === 0 ? (
        <Empty emoji="utya:think" tilt={0} title={t("poolEmptyTitle")} sub={t("poolEmptySub")} />
      ) : shown.length === 0 ? (
        <Empty compact emoji={cur === "gifted" ? "utya:sleep" : "utya:shrug"} tilt={0} title={t("filterEmpty")} sub={t(cur === "gifted" ? "giftedEmptySub" : "filterEmptySub")} />
      ) : (
        /* two-column grid of product-style cards; tap opens the wish sheet */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {shown.map(w => <WishTile key={w.id} w={w} onClick={() => setOpenId(w.id)} />)}
        </div>
      )}
      {openId && wishes.find(w => w.id === openId) && (
        <WishSheet w={wishes.find(w => w.id === openId)} rooms={rooms} onToggleRoom={onToggleRoom}
          onEdit={() => onEdit(openId)}
          onGifted={(g) => { setOpenId(null); onGifted(openId, g); }}
          onDelete={(id) => { setOpenId(null); onDelete(id); }} onClose={() => setOpenId(null)} />
      )}

      <div style={MAIN_CTA}>
        <Pill full kind="primary" icon={<Plus size={19} />} onClick={onAdd}>{t("addWish")}</Pill>
      </div>
    </div>
  );
}

// Wishlist card: square picture (photo, or the sticker on a soft tile),
// two lines of title, price in the accent colour, a small "where" badge.
function WishTile({ w, onClick }) {
  const { t } = useT();
  const img = wishImages(w)[0];
  const shared = w.rooms ? w.rooms.length : 0;
  return (
    <div onClick={() => { haptic("light"); onClick(); }} style={{ cursor: "pointer", background: C.card, borderRadius: 20, padding: 8, border: "1px solid rgba(255,255,255,0.14)", animation: "fadeUp .3s ease", minWidth: 0 }}>
      <div style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: img ? C.card2 : "radial-gradient(120% 90% at 30% 20%, #2A2A2E 0%, #1E1E21 70%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img
          ? <img src={img} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ transform: "rotate(-6deg)" }}><Sticker emoji={w.emoji} size={56} /></div>}
        <div style={{ position: "absolute", left: 8, bottom: 8, height: 24, padding: "0 8px", borderRadius: 999, background: "rgba(0,0,0,0.55)", WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)", color: "#fff", fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          {w.giftedAt ? <><PartyPopper size={12} />{t("giftedBadge")}</> : shared ? <><Users size={12} />{shared}</> : <><Lock size={11} />{t("privateShort")}</>}
        </div>
      </div>
      <div style={{ padding: "12px 4px 4px" }}>
        <div style={{ color: C.t1, fontSize: 14.5, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 37 }}>{w.title}</div>
        <div style={{ color: w.price ? "#7FB0FF" : C.t3, fontSize: 14, fontWeight: 700, marginTop: 4 }}>{w.price || "\u00a0"}</div>
      </div>
    </div>
  );
}
// Everything about one wish: photos, price, link, which rooms see it, delete.
function WishSheet({ w, rooms, onToggleRoom, onDelete, onEdit, onGifted, onClose }) {
  const { t, lang } = useT();
  const giftedDay = w.giftedAt && (() => { const d = new Date(w.giftedAt); return fmtDate(lang, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); })();
  const imgs = wishImages(w);
  return (
    <Sheet title="" onClose={onClose}>
      {imgs.length ? <div style={{ marginTop: -8, borderRadius: R.card, overflow: "hidden" }}><PhotoHeader images={imgs} height={260} inset={0} /></div>
        : <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}><div style={{ transform: "rotate(-6deg)" }}><Sticker emoji={w.emoji} size={88} /></div></div>}
      <div style={{ color: C.t1, fontSize: 20, fontWeight: 800, marginTop: 12, lineHeight: 1.25 }}>{w.title}</div>
      {w.price && <div style={{ color: "#7FB0FF", fontSize: 17, fontWeight: 700, marginTop: 4 }}>{w.price}</div>}
      {w.link && (
        <button onClick={() => window.open(w.link, "_blank")} style={{ marginTop: 12, height: H.sm, padding: "0 16px", borderRadius: 999, border: "none", background: C.blueSoft, color: "#7FB0FF", fontSize: 14, fontWeight: 600, fontFamily: font, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%" }}>
          <Link2 size={15} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkHost(w.link)}</span>
        </button>
      )}
      {w.note && <WishNote text={w.note} style={{ marginTop: 16 }} />}
      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        {!w.giftedAt && <Pill size="sm" kind="ghost" icon={<Pencil size={15} />} onClick={onEdit}>{t("editShort")}</Pill>}
        {w.giftedAt
          ? <Pill size="sm" kind="ghost" icon={<Undo2 size={15} />} onClick={() => onGifted(false)}>{t("ungift")}</Pill>
          : <Pill size="sm" kind="green" onClick={() => tgConfirm(t("giftedHint"), () => onGifted(true))}>{t("gotIt")}<Sticker emoji="stk:gift" size={18} style={{ margin: -8 }} /></Pill>}
      </div>
      {w.giftedAt ? (
        <div style={{ color: C.t2, fontSize: 13, marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}><PartyPopper size={14} />{t("giftedOn", { date: giftedDay })}</div>
      ) : <>
      <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, margin: "24px 0 8px" }}>{t("showInRooms")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rooms.length === 0
          ? <span style={{ color: C.t3, fontSize: 12.5 }}>{t("noRoomsHint")}</span>
          : rooms.filter(r => r.type !== "birthday" || r.iAmCelebrant).map(r => (
            <Chip key={r.id} active={w.rooms.includes(r.id)} color={r.tint} onClick={() => onToggleRoom(w.id, r.id)}>
              <Sticker emoji={r.emoji} size={15} />{r.name}
            </Chip>
          ))}
      </div>
      {w.rooms.length === 0 && rooms.length > 0 && (
        <div style={{ color: C.t3, fontSize: 12.5, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}><Lock size={13} />{t("privateNote")}</div>
      )}
      </>}
      <button onClick={() => tgConfirm(t("confirmDeleteWish"), () => onDelete(w.id))} style={{ marginTop: 16, background: "none", border: "none", height: H.sm, padding: 0, cursor: "pointer", color: "#FF5A5A", fontSize: 14, fontWeight: 600, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Trash2 size={16} /> {t("deleteWish")}
      </button>
    </Sheet>
  );
}

/* ---------- ROOMS ---------- */
// One continuous folder-front outline (tab on the left, smooth step down to
// the body) for a box of w×h px, so the frosted front is a single element with
// no seam between tab and body.
function folderPath(w, h) {
  // Snap edges to whole pixels so the 1px outline renders equally crisp on every side.
  const R0 = Math.round;
  const x0 = R0(w * 0.04), x1 = R0(w * 0.96), yT = R0(h * 0.28), yB = R0(h * 0.37), y1 = R0(h * 0.96), xt = R0(w * 0.5), r = 18, rt = 14;
  const top = `M ${x0} ${yT + rt} Q ${x0} ${yT} ${x0 + rt} ${yT} L ${xt - 10} ${yT} C ${xt} ${yT} ${xt} ${yB} ${xt + 12} ${yB} L ${x1 - r} ${yB} Q ${x1} ${yB} ${x1} ${yB + r}`;
  return { top, full: `${top} L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r} Z` };
}
// Room as a frosted folder: wish photos shared into the room peek out from
// behind the translucent front, the room sticker and the members' avatars are
// on the front, name + member count sit underneath.
const FOLDER_MAX_AVATARS = 5;
function RoomFolder({ room, wishes, onOpen }) {
  const { lang, t } = useT();
  const cd = countdownLabel(lang, t, room.eventDate);
  const box = useRef(null);
  const [dim, setDim] = useState(null);
  // Measured before the first paint so the frosted front is there from frame one.
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const r = el.getBoundingClientRect(); setDim({ w: r.width, h: r.height });
  }, []);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setDim({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const photos = wishes.filter(w => w.rooms.includes(room.id)).map(w => wishImages(w)[0]).filter(Boolean).slice(0, 3);
  const spots = [
    { left: "33%", top: "2%", rot: 0, z: 2 },
    { left: "9%", top: "16%", rot: -10, z: 1 },
    { left: "57%", top: "12%", rot: 9, z: 1 },
  ];
  const fp = dim && folderPath(dim.w, dim.h);
  const members = room.members || [];
  const extra = members.length > FOLDER_MAX_AVATARS ? members.length - (FOLDER_MAX_AVATARS - 1) : 0;
  const shown = extra ? members.slice(0, FOLDER_MAX_AVATARS - 1) : members;
  const AV = 24, OV = 8;
  return (
    <div onClick={() => { haptic("light"); onOpen(box.current && box.current.getBoundingClientRect()); }} style={{ cursor: "pointer", textAlign: "center" }}>
      <div ref={box} style={{ position: "relative", width: "100%", aspectRatio: "1.12" }}>
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "16%", bottom: "10%", borderRadius: 16, background: hex(room.tint, 0.32) }} />
        {/* Photos are cut off exactly at the front's edge: nothing sits under the
            frosted glass to smear into a dark blob. A soft shadow along that edge
            (inside the same cut) makes them read as tucked into the folder. */}
        {fp && photos.length > 0 && (
          <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
            clipPath: `path(evenodd, "M -60 -60 H ${dim.w + 60} V ${dim.h + 60} H -60 Z ${fp.full}")`,
            WebkitClipPath: `path(evenodd, "M -60 -60 H ${dim.w + 60} V ${dim.h + 60} H -60 Z ${fp.full}")` }}>
            {photos.map((src, i) => {
              const sp = spots[i];
              return (
                <div key={i} style={{
                  position: "absolute", left: sp.left, top: sp.top, width: "34%", aspectRatio: "0.82", zIndex: sp.z,
                  transform: `rotate(${sp.rot}deg)`, borderRadius: 10, border: "3px solid #fff",
                  background: `${C.card2} center / cover no-repeat url("${src}")`, boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                }} />
              );
            })}
            <svg width={dim.w} height={dim.h} style={{ position: "absolute", inset: 0, zIndex: 3, overflow: "visible" }} aria-hidden="true">
              <defs><filter id={"fs-" + room.id} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4" /></filter></defs>
              <path d={fp.top} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="10" filter={`url(#fs-${room.id})`} />
            </svg>
          </div>
        )}
        {fp && (
          <>
            {/* No outline and no separate shadow (the frosted front used to smear it
                into a dark blob): each photo darkens towards its bottom instead, so
                one in the folder's own colour still reads as tucked inside. */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 3, clipPath: `path("${fp.full}")`, WebkitClipPath: `path("${fp.full}")`,
              background: `linear-gradient(180deg, ${hex(room.tint, 0.42)} 0%, ${hex(room.tint, 0.26)} 100%)`,
              backdropFilter: "blur(10px) saturate(150%)", WebkitBackdropFilter: "blur(10px) saturate(150%)",
            }} />
          </>
        )}
        <div style={{ position: "absolute", left: "14%", top: "46%", zIndex: 4, transform: "rotate(-8deg)" }}>
          <Sticker emoji={room.emoji} size={34} />
        </div>
        <div style={{ position: "absolute", right: "11%", bottom: "12%", zIndex: 4, display: "flex" }}>
          {shown.map((m, i) => (
            <div key={m.id} style={{ marginLeft: i ? -OV : 0 }}>
              <Avatar m={m} size={AV} cut={i < shown.length - 1 || extra ? OV : 0} />
            </div>
          ))}
          {extra > 0 && (
            <div style={{ marginLeft: -OV, width: AV, height: AV, borderRadius: AV, background: "rgba(255,255,255,0.22)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+{extra}</div>
          )}
        </div>
      </div>
      <div style={{ color: C.t1, fontSize: 15, fontWeight: 700, marginTop: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</div>
      {cd != null
        ? <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 12px", borderRadius: R.pill, background: hex(room.tint, 0.22), color: "#fff", fontSize: 12.5, fontWeight: 600 }}><CalendarDays size={13} />{cd}</div>
        : <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: R.pill, background: C.card2, color: C.t2, fontSize: 12.5 }}>{t("membersColon", { n: room.members.length })}</div>}
    </div>
  );
}
function RoomsScreen({ rooms, wishes, onOpen, onCreate }) {
  const { t } = useT();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: "6px 4px 24px" }}>
        <div>
          <div style={{ color: C.t1, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t("roomsTitle")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>{t("roomsSub")}</div>
        </div>
        <HeaderAdd onClick={onCreate} label={t("createRoom")} />
      </div>

      {rooms.length === 0 ? (
        <Empty emoji="utya:hug" tilt={0} title={t("roomsEmptyTitle")} sub={t("roomsEmptySub")} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 12px" }}>
          {rooms.map(r => <RoomFolder key={r.id} room={r} wishes={wishes} onOpen={(rect) => onOpen(r.id, rect)} />)}
        </div>
      )}

      <div style={MAIN_CTA}>
        <Pill full kind="primary" icon={<Plus size={19} />} onClick={onCreate}>{t("createRoom")}</Pill>
      </div>
    </div>
  );
}

/* ---------- CREATE ROOM ---------- */
// Room type is just a status (couple limits members to two); the folder's
// sticker and colour are picked separately.
const ROOM_PRESETS = [
  { type: "friends", key: "roomFriends" },
  { type: "couple", key: "roomCouple" },
  { type: "birthday", key: "roomBirthday" },
];
// What each type is for, shown under the type chips.
const ROOM_TYPE_HINT = { friends: "friendsRoomHint", couple: "coupleRoomHint", birthday: "birthdayRoomHint" };
const ROOM_STICKERS = STICKERS.map(n => "stk:" + n);
const ROOM_COLORS = ["#2E7DF6", "#38BDF8", "#34C759", "#FF7A45", "#FF4D8D", "#AF52DE"];
// Yellow was dropped from the palette: rooms that still have it show as orange.
const fixRoom = (r) => {
  if (!r) return r;
  let x = r;
  if (String(x.tint).toUpperCase() === "#FFB020") x = { ...x, tint: "#FF7A45" };
  if (x.type === "team" || x.type === "family") x = { ...x, type: "friends" }; // Team and Family were merged into Friends
  return x;
};

const sheetLabel = { color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 };
function RoomStickerPicker({ value, onChange }) {
  const list = Array.from(new Set([...(value && !ROOM_STICKERS.includes(value) ? [value] : []), ...ROOM_STICKERS]));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 16 }}>
      {list.map(e => (
        <button key={e} onClick={() => { haptic("select"); onChange(e); }} style={{
          width: "100%", aspectRatio: "1", borderRadius: "50%", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: value === e ? C.blueSoft : C.card2, border: `1.5px solid ${value === e ? C.blue : "transparent"}`,
        }}><Sticker emoji={e} size={28} /></button>
      ))}
    </div>
  );
}
function RoomColorPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
      {ROOM_COLORS.map(c => {
        const on = value.toLowerCase() === c.toLowerCase();
        return (
          <button key={c} onClick={() => { haptic("select"); onChange(c); }} aria-label={c} style={{
            width: H.sm, height: H.sm, borderRadius: "50%", cursor: "pointer", padding: 0, background: c,
            border: "none", boxShadow: on ? `0 0 0 3px ${C.card}, 0 0 0 5px ${c}` : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{on && <Check size={18} color="#fff" strokeWidth={3} />}</button>
        );
      })}
    </div>
  );
}
// Frosted pill with the room's occasion and countdown, on coloured backgrounds.
function EventBadge({ text }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 12px", borderRadius: R.pill, background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 13.5, fontWeight: 600, maxWidth: "100%" }}>
      <CalendarDays size={15} style={{ flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}
// Live preview in the create/edit sheets: the room's hero in miniature, so the
// chosen sticker, colour and name are seen exactly as the room will look.
function RoomPreview({ emoji, tint, name, eventTitle, eventDate }) {
  const { lang, t } = useT();
  const cd = countdownLabel(lang, t, eventDate);
  return (
    <div style={{
      borderRadius: R.card, marginBottom: 24, padding: "24px 16px", textAlign: "center", overflow: "hidden",
      background: roomHeroBg(tint), transition: "background .3s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "center" }}><Sticker emoji={emoji} size={52} /></div>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
      {cd && <EventBadge text={[eventTitle, cd].filter(Boolean).join(" · ")} />}
    </div>
  );
}
// One tappable row: calendar icon, the chosen date written out ("12 листопада"),
// chevron. The native date input sits invisibly on top, so a tap opens the
// phone's own picker (and showPicker() does it on desktop).
function fmtDate(lang, date) {
  const [y, m, d] = date.split("-").map(Number);
  try { return new Date(y, m - 1, d).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: y !== new Date().getFullYear() ? "numeric" : undefined }); }
  catch (e) { return date; }
}
function DateField({ label, value, onChange, hint }) {
  const { lang, t } = useT();
  const ref = useRef(null);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sheetLabel}>{label}</div>
      <div style={{ position: "relative", height: H.lg, borderRadius: R.pill, background: C.card2, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <CalendarDays size={18} color={value ? C.t1 : C.t3} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, color: value ? C.t1 : C.t3, fontSize: 16, fontWeight: 500 }}>{value ? fmtDate(lang, value) : t("pickDate")}</span>
        <ChevronRight size={18} color={C.t3} style={{ flexShrink: 0 }} />
        <input ref={ref} type="date" value={value} aria-label={label}
          onChange={e => onChange(e.target.value)}
          onClick={e => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch (x) {} }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", fontSize: 16, WebkitAppearance: "none", appearance: "none" }} />
      </div>
      {hint && <div style={{ color: C.t3, fontSize: 12.5, marginTop: 8 }}>{hint}</div>}
    </div>
  );
}
// Next date this day/month comes round (today counts), as YYYY-MM-DD.
function nextOccurrence(day, month) {
  const now = new Date(), y = now.getFullYear();
  const pad = (n) => String(n).padStart(2, "0");
  const thisYear = new Date(y, month - 1, day);
  const today = new Date(y, now.getMonth(), now.getDate());
  const yy = thisYear < today ? y + 1 : y;
  return `${yy}-${pad(month)}-${pad(day)}`;
}
function RoomSheetShell({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: C.card, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "10px 16px 32px", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)", maxWidth: 440, width: "100%", marginInline: "auto", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.card2, margin: "6px auto 18px" }} />
        <div style={{ color: C.t1, fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function CreateRoomSheet({ onClose, onCreate, online }) {
  const { t } = useT();
  const [preset, setPreset] = useState(ROOM_PRESETS[0]);
  const [emoji, setEmoji] = useState(ROOM_STICKERS[0]);
  const [tint, setTint] = useState(ROOM_COLORS[0]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("self"); // birthday: "self" | "other"
  const [celName, setCelName] = useState("");
  const [date, setDate] = useState("");
  const [fromTg, setFromTg] = useState(false);
  const [busy, setBusy] = useState(false);
  const bday = preset.type === "birthday";
  // own birthday: try the date from the Telegram profile
  useEffect(() => {
    if (!bday || mode !== "self" || date || !online) return;
    let live = true;
    api.myBirthday().then(r => { if (live && r && r.birthday) { setDate(nextOccurrence(r.birthday.day, r.birthday.month)); setFromTg(true); } }).catch(() => {});
    return () => { live = false; };
  }, [bday, mode]); // eslint-disable-line
  const autoName = bday ? (mode === "self" ? t("bdayRoomNameMine") : (celName.trim() ? t("bdayRoomNameOf", { name: celName.trim() }) : t("roomBirthday"))) : t(preset.key);
  const title = name.trim() || autoName;
  const ready = !bday || (date && (mode === "self" || celName.trim()));
  const submit = async () => {
    if (busy || !ready) return;
    setBusy(true);
    const extra = bday ? { eventDate: date, eventTitle: "", bdayMode: mode, celebrantName: mode === "other" ? celName.trim() : "" } : {};
    try { await onCreate({ name: title, type: preset.type, emoji, tint, ...extra }); }
    catch (e) { setBusy(false); }
  };
  return (
    <RoomSheetShell title={t("newRoom")} onClose={onClose}>
      <RoomPreview emoji={emoji} tint={tint} name={title} eventTitle="" eventDate={bday ? date : ""} />

      <div style={sheetLabel}>{t("roomSticker")}</div>
      <RoomStickerPicker value={emoji} onChange={setEmoji} />

      <div style={sheetLabel}>{t("roomColor")}</div>
      <RoomColorPicker value={tint} onChange={setTint} />

      <div style={sheetLabel}>{t("roomType")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {ROOM_PRESETS.map(p => (
          <Chip key={p.type} active={preset.type === p.type} onClick={() => setPreset(p)}>{t(p.key)}</Chip>
        ))}
      </div>
      <div key={preset.type} style={{ color: C.t2, fontSize: 13, lineHeight: 1.45, marginTop: -8, marginBottom: 16, animation: "fadeUp .25s ease" }}>{t(ROOM_TYPE_HINT[preset.type])}</div>

      {bday && (
        <div style={{ animation: "fadeUp .25s ease" }}>
          <div style={sheetLabel}>{t("bdayWhose")}</div>
          <Segmented options={[["self", t("bdayMine")], ["other", t("bdayOther")]]} value={mode} onChange={setMode} neutral style={{ marginBottom: 8, background: C.card2 }} />
          <div style={{ color: C.t3, fontSize: 12.5, lineHeight: 1.45, marginBottom: 16 }}>{t(mode === "self" ? "bdayMineNote" : "bdayOtherNote")}</div>
          {mode === "other" && <Field label={t("bdayNameLabel")} value={celName} onChange={setCelName} placeholder={t("bdayNamePh")} />}
          <DateField label={t("bdayDateLabel")} value={date} onChange={(v) => { setDate(v); setFromTg(false); }} hint={fromTg ? t("bdayFromTg") : t("evHint")} />
        </div>
      )}

      <Field label={t("name")} value={name} onChange={setName} placeholder={autoName} />

      <Pill full kind="primary" icon={<Plus size={18} />} disabled={busy || !ready} onClick={submit}>
        {busy ? t("creating") : t("createRoom")}
      </Pill>
    </RoomSheetShell>
  );
}

/* ---------- EDIT ROOM (name, sticker, colour) ---------- */
function EditRoomSheet({ room, onClose, onSave }) {
  const { t } = useT();
  const [name, setName] = useState(room.name);
  const [emoji, setEmoji] = useState(room.emoji);
  const [tint, setTint] = useState(room.tint);
  const bday = room.type === "birthday";
  const [evDate, setEvDate] = useState(room.eventDate || "");
  const [celName, setCelName] = useState(room.celebrantName || "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    const extra = bday ? { eventDate: evDate, eventTitle: "", ...(room.bdayMode === "other" ? { celebrantName: celName.trim() } : {}) } : {};
    try { await onSave({ name: name.trim(), emoji, tint, ...extra }); }
    catch (e) { setBusy(false); }
  };
  return (
    <RoomSheetShell title={t("editRoom")} onClose={onClose}>
      <RoomPreview emoji={emoji} tint={tint} name={name.trim() || room.name} eventTitle="" eventDate={bday ? evDate : ""} />

      <div style={sheetLabel}>{t("roomSticker")}</div>
      <RoomStickerPicker value={emoji} onChange={setEmoji} />

      <div style={sheetLabel}>{t("roomColor")}</div>
      <RoomColorPicker value={tint} onChange={setTint} />

      <Field label={t("name")} value={name} onChange={setName} placeholder={t("name")} />
      {bday && room.bdayMode === "other" && <Field label={t("bdayNameLabel")} value={celName} onChange={setCelName} placeholder={t("bdayNamePh")} />}
      {bday && <DateField label={t("bdayDateLabel")} value={evDate} onChange={setEvDate} hint={t("evHint")} />}

      <Pill full kind="primary" disabled={!name.trim() || busy} onClick={submit}>
        {busy ? t("savingWish") : t("saveChanges")}
      </Pill>
    </RoomSheetShell>
  );
}

/* ---------- MY INVITES (who you invited) ---------- */
function InvitesSheet({ online, rooms, onShare, onClose }) {
  const { t } = useT();
  const [inv, setInv] = useState(null);
  useEffect(() => {
    let live = true;
    if (online) { api.invites().then(d => { if (live) setInv(d.invites || []); }).catch(() => { if (live) setInv([]); }); }
    else setInv([]);
    return () => { live = false; };
  }, [online]);

  const groups = [];
  (inv || []).forEach(x => {
    let g = groups.find(gr => gr.room.id === x.room.id);
    if (!g) { g = { room: x.room, people: [] }; groups.push(g); }
    g.people.push(x.invitee);
  });

  return (
    <Sheet title={t("myInvites")} onClose={onClose}>
      {inv === null ? (
        <div style={{ color: C.t3, fontSize: 14, padding: "18px 4px" }}>{t("loadingInv")}</div>
      ) : groups.length === 0 ? (
        <Empty compact emoji="utya:mail" tilt={0} title={t("invitedNobody")} sub={t("invitedNobodySub")}
          action={rooms.length > 0 && <Pill kind="primary" icon={<Share2 size={16} />} onClick={() => onShare(rooms[0])}>{t("shareBtn")}</Pill>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map(g => (
            <div key={g.room.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <GlossTile emoji={g.room.emoji} size={30} tint={g.room.tint} />
                <div style={{ color: C.t1, fontSize: 15, fontWeight: 700 }}>{g.room.name}</div>
                <div style={{ marginLeft: "auto" }}>
                  <Pill size="sm" kind="soft" icon={<Share2 size={14} />} onClick={() => onShare({ id: g.room.id, name: g.room.name })}>{t("shareBtn")}</Pill>
                </div>
              </div>
              <Card style={{ padding: `0 ${LIST.pad}px` }}>
                {g.people.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: LIST.gap, padding: "16px 0", ...sepBelow(i < g.people.length - 1) }}>
                    <Avatar m={p} size={LIST.icon} />
                    <div style={{ color: C.t1, fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ marginLeft: "auto", color: C.t3, fontSize: 12.5 }}>{t("invitedByYou")}</div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- GIFT HISTORY (wishes I'm currently gifting, across all rooms) ---------- */
function HistorySheet({ online, onClose }) {
  const { t } = useT();
  const [gifts, setGifts] = useState(null);
  useEffect(() => {
    let live = true;
    if (online) { api.gifts().then(d => { if (live) setGifts(d.gifts || []); }).catch(() => { if (live) setGifts([]); }); }
    else setGifts([]);
    return () => { live = false; };
  }, [online]);

  return (
    <Sheet title={t("history")} onClose={onClose}>
      {gifts === null ? (
        <div style={{ color: C.t3, fontSize: 14, padding: "18px 4px" }}>{t("loadingInv")}</div>
      ) : gifts.length === 0 ? (
        <Empty compact emoji="utya:sleep" tilt={0} title={t("historyEmptyTitle")} sub={t("historyEmptySub")} />
      ) : (
        <Card style={{ padding: `0 ${LIST.pad}px` }}>
          {gifts.map((w, i) => (
            <div key={w.id} style={{ ...sepBelow(i < gifts.length - 1) }}>
              <WishRow w={w} right={w.owner && <span style={{ color: C.t3, fontSize: 12.5 }}>{t("giftingFor", { name: w.owner.name })}</span>} />
            </div>
          ))}
        </Card>
      )}
    </Sheet>
  );
}

/* ---------- POOL PICKER (add wishes into a room) ---------- */
function PoolPickerSheet({ wishes, roomId, onToggle, onClose }) {
  const { t } = useT();
  const [pendingId, setPendingId] = useState(null);
  const handleToggle = async (wid) => {
    if (pendingId) return;
    setPendingId(wid);
    try { await onToggle(wid); } finally { setPendingId(null); }
  };
  return (
    <Sheet title={t("roomWishesTitle")} onClose={onClose}>
      {wishes.length === 0 ? (
        <Empty compact emoji="utya:shrug" tilt={0} title={t("poolEmptyTitle")} sub={t("poolEmptyInRoom")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {wishes.map(w => {
            const inRoom = w.rooms.includes(roomId);
            const isPending = pendingId === w.id;
            return (
              <div key={w.id} onClick={() => handleToggle(w.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.6 : 1 }}>
                <GlossTile emoji={w.emoji} image={wishImages(w)[0]} images={wishImages(w)} size={44} bare />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.t1, fontSize: 15.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</div>
                  {w.price && <div style={{ color: C.t2, fontSize: 13 }}>{w.price}</div>}
                </div>
                <div style={{ width: 26, height: 26, borderRadius: 26, flexShrink: 0, border: `2px solid ${inRoom ? C.blue : C.line}`, background: inRoom ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isPending
                    ? <div style={{ width: 12, height: 12, borderRadius: 12, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin .6s linear infinite" }} />
                    : (inRoom && <Check size={16} color="#fff" />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- ROOM HERO ---------- */
const hasTgBack = () => typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.BackButton;
// Solid colour of the hero's top edge (room tint over the dark base): used for
// Telegram's header and for the area revealed when the page bounces at the top.
function heroTop(tint) {
  const n = tint.replace("#", ""); const c = [0, 2, 4].map(k => parseInt(n.slice(k, k + 2), 16));
  return "#" + c.map(v => Math.round(13 + (v - 13) * 0.72).toString(16).padStart(2, "0")).join("");
}
// Blend two #rrggbb colours (k = share of the second one).
function mixHex(c1, c2, k) {
  const p = (c) => [0, 2, 4].map(i => parseInt(c.replace("#", "").slice(i, i + 2), 16));
  const x = p(c1), y = p(c2);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
// Room tint rotated around the colour wheel, for the hero's mesh blobs.
function hueShift(tint, deg) {
  const n = tint.replace("#", ""); let [r, g, b] = [0, 2, 4].map(k => parseInt(n.slice(k, k + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [R1, G1, B1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R1, G1, B1].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}
// Mesh-like hero: soft light behind the sticker, two neighbouring hues
// drifting in from the corners, over the room tint.
// Hue of a colour in degrees (0..360).
const hueOf = (c) => { const n = c.replace("#", ""); const [r, g, b] = [0, 2, 4].map(k => parseInt(n.slice(k, k + 2), 16)); return (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI + 360) % 360; };
function roomHeroBg(tint) {
  // Spots stay in the room's own colour: a lighter shade top-left (nudged a
  // little towards its lighter neighbour) and a deeper one bottom-right.
  const cool = hueOf(tint) >= 180;
  const a = mixHex(hueShift(tint, cool ? -10 : 10), "#ffffff", 0.22), b = mixHex(hueShift(tint, cool ? 8 : -8), "#000000", 0.2);
  return [
    `radial-gradient(42% 34% at 50% 30%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 100%)`,
    `radial-gradient(70% 60% at 0% 10%, ${hex(a, 0.75)} 0%, ${hex(a, 0)} 100%)`,
    `radial-gradient(75% 65% at 100% 95%, ${hex(b, 0.7)} 0%, ${hex(b, 0)} 100%)`,
    `radial-gradient(120% 90% at 50% 30%, ${hex(tint, 0.9)} 0%, ${hex(tint, 0.6)} 55%, ${hex(tint, 0.35)} 100%)`,
    "#0d0d10",
  ].join(", ");
}
// Round frosted-glass button that sits on the coloured hero.
function HeroButton({ onClick, label, children, style }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: H.sm, height: H.sm, borderRadius: H.sm, flexShrink: 0, cursor: "pointer", padding: 0, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      ...style,
    }}>{children}</button>
  );
}
/* ---------- ROOM DETAIL ---------- */
// "Mine in this room": make a brand new wish right here (it also lands in the
// wishlist), or pick / unpick ones from the wishlist.
function MineActions({ has, onNew, onPool }) {
  const { t } = useT();
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <Pill full kind="primary" icon={<Plus size={18} />} onClick={onNew}>{t("newWishHere")}</Pill>
      {/* the pool sheet both adds and removes, so with wishes already here it's "edit" */}
      <Pill full kind="ghost" icon={has ? <Pencil size={17} /> : <Gift size={17} />} onClick={onPool}>{t(has ? "editRoomWishes" : "addFromPool")}</Pill>
    </div>
  );
}
function RoomDetail({ room, wishes, reserved, online, onReserve, onUnreserve, onChip, onUnchip, onAddFromPool, onNewWish, onAddIdea, onInvite, onDraw, onEdit, onLeave, onDelete, onBack, from, closerRef, refreshKey, onError }) {
  const { lang, t } = useT();
  // Opened from a folder: the room grows out of the folder's rectangle
  // (clip-path inset animation) and shrinks back into it on Back.
  const rootRef = useRef(null);
  const insetFrom = () => {
    const el = rootRef.current; if (!el || !from) return null;
    const d = el.getBoundingClientRect();
    return `inset(${from.top - d.top}px ${d.right - from.right}px ${d.bottom - from.bottom}px ${from.left - d.left}px round 24px)`;
  };
  useLayoutEffect(() => {
    const el = rootRef.current, start = insetFrom();
    if (!el || !start || !el.animate) return;
    el.animate([{ clipPath: start, WebkitClipPath: start }, { clipPath: "inset(0px 0px 0px 0px round 0px)", WebkitClipPath: "inset(0px 0px 0px 0px round 0px)" }],
      { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, []); // eslint-disable-line
  const closing = useRef(false);
  const close = () => {
    const el = rootRef.current, end = insetFrom();
    if (closing.current) return;
    if (!el || !end || !el.animate) return onBack();
    closing.current = true;
    setTimeout(() => { try { const tg = tgWebApp(); tg && tg.setHeaderColor && tg.setHeaderColor("#000000"); } catch (e) {} }, 90);
    // stays solid while it shrinks (no see-through double picture), then melts into the folder
    const full = "inset(0px 0px 0px 0px round 0px)";
    const a = el.animate([
      { clipPath: full, WebkitClipPath: full, opacity: 1, easing: "cubic-bezier(.4,0,.2,1)" },
      { clipPath: end, WebkitClipPath: end, opacity: 1, offset: 0.8 },
      { clipPath: end, WebkitClipPath: end, opacity: 0 },
    ], { duration: 380, fill: "forwards" });
    a.onfinish = () => onBack();
  };
  useEffect(() => { if (closerRef) closerRef.current = close; return () => { if (closerRef) closerRef.current = null; }; });
  const heroCd = countdownLabel(lang, t, room.eventDate);
  // Telegram's own top bar takes the hero colour while the room is open.
  // When the room grows out of a folder, the bar turns only once the room
  // reaches the top (and back to black as soon as it starts shrinking), so
  // there is never a black strip between the bar and the room.
  const headerOpen = useRef(!from);
  useEffect(() => {
    const tg = tgWebApp(); if (!tg || !tg.setHeaderColor) return;
    const paint = () => { if (!closing.current) try { tg.setHeaderColor(heroTop(room.tint)); } catch (e) {} };
    let id = null;
    if (headerOpen.current) paint(); else id = setTimeout(() => { headerOpen.current = true; paint(); }, 380);
    return () => { clearTimeout(id); try { tg.setHeaderColor("#000000"); } catch (e) {} };
  }, [room.tint]);
  // The room is its own scroll area. The page under it (the rooms list) must not
  // scroll along: Telegram then draws a hairline under its top bar.
  useEffect(() => {
    const els = [document.documentElement, document.body], prev = els.map(e => e.style.overflow);
    els.forEach(e => { e.style.overflow = "hidden"; });
    return () => els.forEach((e, i) => { e.style.overflow = prev[i]; });
  }, []);
  const [seg, setSeg] = useState("lists");
  const [detail, setDetail] = useState(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(online);
  const [failed, setFailed] = useState(false);
  const isOwner = online ? !!(detail && detail.room && detail.room.owner) : true;

  useEffect(() => { if (online) setLoading(true); }, [room.id]); // eslint-disable-line

  useEffect(() => {
    let live = true;
    if (online) {
      api.room(room.id).then(d => { if (live) { setDetail(d); setFailed(false); } }).catch(() => { if (live && !detail) setFailed(true); }).finally(() => { if (live) setLoading(false); });
    } else {
      setDetail({
        members: room.members,
        lists: room.members.filter(m => !m.you).map(m => ({
          member: m,
          wishes: (m.wishes || []).map(w => ({ ...w, reservedByMe: reserved[w.id] === "you", taken: !!reserved[w.id] && reserved[w.id] !== "you" && reserved[w.id] !== "chip",
            chips: reserved[w.id] === "chip" ? { count: 1, mine: true, total: Math.max(1, room.members.length - 1) } : null })),
        })),
        mine: wishes.filter(w => w.rooms.includes(room.id)),
      });
      setLoading(false);
    }
    return () => { live = false; };
  }, [room.id, online, tick, wishes, reserved, refreshKey]);

  const members = (detail && detail.members) || room.members;
  const lists = (detail && detail.lists) || [];
  const mine = (detail && detail.mine) || [];
  const others = members.filter(m => !m.you);
  const coupleFull = room.type === "couple" && members.length >= 2;
  // Birthday rooms: one birthday person; guests see their wishes + room-only ideas.
  const bday = room.type === "birthday";
  const info = (detail && detail.room) || room;
  const iAmCel = !!info.iAmCelebrant;
  const ideas = (detail && detail.ideas) || [];
  const celMember = info.celebrantId ? members.find(m => m.id === info.celebrantId) : null;
  const celName = (celMember && !celMember.you && celMember.name) || info.celebrantName || "";
  const clearCelebrant = async () => {
    try { await api.setCelebrant(room.id, null); setTick(x => x + 1); } catch (e) { onError && onError(); }
  };
  const removeIdea = (w) => tgConfirm(t("confirmDeleteWish"), async () => {
    try { await api.deleteIdea(room.id, w.id); setTick(x => x + 1); } catch (e) { onError && onError(); }
  });

  const doReserve = async (w) => { await onReserve(w); setTick(x => x + 1); };
  const doUnreserve = async (wid) => { await onUnreserve(wid); setTick(x => x + 1); };
  const doChip = async (wid) => { await onChip(wid); setTick(x => x + 1); };
  const doUnchip = async (wid) => { await onUnchip(wid); setTick(x => x + 1); };
  const [giving, setGiving] = useState(null); // wish picked with "Take": solo or group?
  const [cancelling, setCancelling] = useState(null); // { w, chip } waiting for "are you sure?"
  // With a single possible gifter (a couple, or a room of two) there is nobody
  // to chip in with, so "Take" just takes it.
  const soloOnly = room.type === "couple" || members.length <= 2;

  const reserveRight = (w) => (
    (w.reservedByMe || reserved[w.id] === "you")
      ? <Pill size="sm" kind="green" icon={<Check size={16} />} onClick={() => setCancelling({ w })}>{t("youGift")}</Pill>
      : w.taken ? <span style={{ color: C.t3, fontSize: 13, fontWeight: 600, height: H.sm, padding: "0 12px", display: "inline-flex", alignItems: "center" }}>{t("taken")}</span>
        : w.chips ? (w.chips.mine
          ? <Pill size="sm" kind="green" onClick={() => setCancelling({ w, chip: true })}>{t("chipIn")} · {w.chips.count}/{w.chips.total}<Sticker emoji="stk:piggy" size={18} style={{ margin: -8 }} /></Pill>
          : <Pill size="sm" kind="soft" onClick={() => doChip(w.id)}>{t("chipJoin")} · {w.chips.count}/{w.chips.total}<Sticker emoji="stk:piggy" size={18} style={{ margin: -8 }} /></Pill>)
        : <Pill size="sm" kind="soft" onClick={() => soloOnly ? doReserve(w) : setGiving(w)}>{t("take")}<img src="/stickers/basket.webp" alt="" style={{ height: 34, width: "auto", display: "block", margin: -6 }} /></Pill>
  );

  return (
    <div ref={rootRef} style={{ position: "fixed", inset: 0, maxWidth: 440, marginInline: "auto", background: `linear-gradient(${heroTop(room.tint)} 0 50%, ${C.bg} 50% 100%)`, zIndex: 45, overflowY: "auto", overscrollBehavior: "contain", animation: from ? "none" : "fadeUp .25s ease", display: "flex", flexDirection: "column" }}>
      {/* Telegram-style hero: room-colour gradient with a faint pattern of the room's sticker */}
      <div style={{ position: "relative", overflow: "hidden", flexShrink: 0, padding: "16px 16px 40px", textAlign: "center", background: `linear-gradient(${heroTop(room.tint)} 0, transparent 120px), ${roomHeroBg(room.tint)}` }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", height: H.sm }}>
          {hasTgBack() ? <span /> : <HeroButton onClick={close} label={t("back")}><ChevronLeft size={20} /></HeroButton>}
          {isOwner ? <HeroButton onClick={onEdit} label={t("editRoom")}><Pencil size={17} /></HeroButton> : <span />}
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}><GlossTile emoji={room.emoji} size={80} tint={room.tint} bare /></div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginTop: 12, textShadow: "0 1px 12px rgba(0,0,0,0.25)" }}>{room.name}</div>
          {heroCd && <EventBadge text={[room.eventTitle, heroCd].filter(Boolean).join(" · ")} />}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            {members.map((m, i) => (
              <div key={m.id} style={{ marginLeft: i ? -10 : 0, textAlign: "center" }}><Avatar m={m} size={38} cut={i < members.length - 1 ? 10 : 0} /></div>
            ))}
            {!coupleFull && (
              <button onClick={onInvite} aria-label={t("invite")} style={{ marginLeft: 8, width: H.sm, height: H.sm, borderRadius: H.sm, border: "1.5px dashed rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <Plus size={18} />
              </button>
            )}
          </div>
          {coupleFull || (bday && iAmCel && info.bdayMode === "other") ? null : (
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <div style={{ flex: 1, display: "flex" }}><Pill full kind={room.type === "couple" || bday ? "primary" : "glass"} icon={<Share2 size={17} />} onClick={onInvite}>{t("invite")}</Pill></div>
              {room.type === "friends" && (
                <div style={{ flex: 1, display: "flex" }}><Pill full kind="primary" icon={<Dices size={18} />} onClick={onDraw}>{t("draw")}</Pill></div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* content sheet slides over the hero with rounded corners */}
      {/* fills the rest of the screen so Delete/Leave sits at the very bottom */}
      <div style={{ position: "relative", marginTop: -28, flex: "1 0 auto", display: "flex", flexDirection: "column", background: C.bg, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", boxShadow: "0 -10px 30px rgba(0,0,0,0.25)" }}>

        {!bday && <Segmented options={[["lists", t("segLists")], ["mine", t("segMine")]]} value={seg} onChange={setSeg} neutral style={{ marginBottom: 16 }} />}

        {loading ? (
          <Card style={{ padding: `0 ${LIST.pad}px` }}>
            {[0, 1].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: LIST.gap, padding: "16px 0", ...sepBelow(i === 0) }}>
                <Bone w={LIST.icon} h={LIST.icon} r={8} />
                <div style={{ flex: 1 }}>
                  <Bone w="55%" h={16} r={6} style={{ marginBottom: 8 }} />
                  <Bone w="30%" h={12} r={6} />
                </div>
              </div>
            ))}
          </Card>
        ) : failed ? (
          <Empty emoji="utya:flushed" tilt={0} title={t("roomLoadFailTitle")} sub={t("roomLoadFailSub")}
            action={<Pill kind="primary" icon={<RefreshCw size={17} />} onClick={() => { setLoading(true); setTick(x => x + 1); }}>{t("offlineRetry")}</Pill>} />
        ) : bday ? (
          iAmCel ? (
            /* the birthday person: only their own wishes, the gifts stay a surprise */
            <div>
              <Empty compact emoji="utya:shh" tilt={0} title={t("bdayCelebrantTitle")} sub={t("bdayCelebrantSub")} />
              {mine.length > 0 && (
                <Card style={{ padding: `0 ${LIST.pad}px`, marginTop: 8 }}>
                  {mine.map((w, i) => (
                    <div key={w.id} style={{ ...sepBelow(i < mine.length - 1) }}>
                      <WishRow w={w} right={<span style={{ color: C.t3, fontSize: 12.5 }}>{t("visibleToAll")}</span>} />
                    </div>
                  ))}
                </Card>
              )}
              <MineActions has={mine.length > 0} onNew={onNewWish} onPool={onAddFromPool} />
            </div>
          ) : (
            /* guests: the birthday person's wishes + gift ideas added right here */
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {info.owner && info.bdayMode === "other" && celMember && !celMember.you && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: R.card, background: C.card }}>
                  <Avatar m={celMember} size={28} />
                  <span style={{ flex: 1, color: C.t2, fontSize: 13.5, lineHeight: 1.35 }}>{t("bdayCelJoined", { name: celMember.name })}</span>
                  <button onClick={() => tgConfirm(t("bdayNotCel") + "?", clearCelebrant)} style={{ background: "none", border: "none", color: "#7FB0FF", fontSize: 13.5, fontWeight: 600, fontFamily: font, cursor: "pointer", height: H.sm, padding: 0, whiteSpace: "nowrap" }}>{t("bdayNotCel")}</button>
                </div>
              )}
              {lists.map(({ member: m, wishes: mws }) => mws.length > 0 && (
                <div key={m.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    <Avatar m={m} size={28} /><span style={{ color: C.t1, fontSize: 15.5, fontWeight: 700 }}>{t("bdayWishesOf", { name: m.name })}</span>
                  </div>
                  <Card style={{ padding: `0 ${LIST.pad}px` }}>
                    {mws.map((w, i, arr) => (
                      <div key={w.id} style={{ ...sepBelow(i < arr.length - 1) }}><WishRow w={w} right={reserveRight(w)} /></div>
                    ))}
                  </Card>
                </div>
              ))}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                  <span style={{ color: C.t1, fontSize: 15.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><Sticker emoji="stk:bulb" size={18} style={{ margin: -6 }} />{t("bdayIdeas")}</span>
                  {celName && <span style={{ color: C.t3, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}><Lock size={12} />{t("bdayIdeasHidden", { name: celName })}</span>}
                </div>
                {ideas.length ? (
                  <Card style={{ padding: `0 ${LIST.pad}px` }}>
                    {ideas.map((w, i, arr) => (
                      <div key={w.id} style={{ ...sepBelow(i < arr.length - 1) }}>
                        <WishRow w={{ ...w, price: [w.price, w.by && !w.mineIdea ? t("bdayIdeaBy", { name: w.by.name }) : ""].filter(Boolean).join(" · ") }} right={
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {(w.mineIdea || info.owner) && <button onClick={() => removeIdea(w)} aria-label={t("deleteWish")} style={{ width: H.sm, height: H.sm, border: "none", background: "none", color: C.t3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={16} /></button>}
                            {reserveRight(w)}
                          </div>
                        } />
                      </div>
                    ))}
                  </Card>
                ) : (
                  <Empty compact emoji="utya:think" tilt={0} title={t("bdayNoIdeasTitle")} sub={t("bdayNoIdeasSub")} />
                )}
                <div style={{ marginTop: 16 }}>
                  <Pill full kind={ideas.length ? "ghost" : "primary"} icon={<Plus size={18} />} onClick={onAddIdea}>{t("bdayAddIdea")}</Pill>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", color: C.t3, fontSize: 12.5 }}>
                <Lock size={13} /> {t("reserveNote")}
              </div>
            </div>
          )
        ) : seg === "lists" ? (
          others.length === 0 ? (
            <div>
              <Empty compact emoji="utya:wave" tilt={0} title={t("onlyYouTitle")} sub={t("onlyYouSub")}
                action={<Pill kind="primary" icon={<Share2 size={17} />} onClick={onInvite}>{t("inviteFriends")}</Pill>} />
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {lists.map(({ member: m, wishes: mws }) => (
              <div key={m.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <Avatar m={m} size={28} /><span style={{ color: C.t1, fontSize: 15.5, fontWeight: 700 }}>{m.name}</span>
                </div>
                <Card style={{ padding: `0 ${LIST.pad}px` }}>
                  {mws.map((w, i, arr) => (
                    <div key={w.id} style={{ ...sepBelow(i < arr.length - 1) }}>
                      <WishRow w={w} right={reserveRight(w)} />
                    </div>
                  ))}
                  {!mws.length && (
                    <div style={{ padding: "16px 4px", color: C.t3, fontSize: 13.5 }}>{t("noWishesYet")}</div>
                  )}
                </Card>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", color: C.t3, fontSize: 12.5, marginTop: 4 }}>
              <Lock size={13} /> {t("reserveNote")}
            </div>
          </div>
          )
        ) : (
          <div>
            {mine.length === 0
              ? <Empty emoji="utya:cool" tilt={0} title={t("nothingSharedTitle")} sub={t("nothingSharedSub")} />
              : <Card style={{ padding: `0 ${LIST.pad}px` }}>
                {mine.map((w, i) => (
                  <div key={w.id} style={{ ...sepBelow(i < mine.length - 1) }}>
                    <WishRow w={w} right={<span style={{ color: C.t3, fontSize: 12.5 }}>{t("visibleToAll")}</span>} />
                  </div>
                ))}
              </Card>}
            <MineActions has={mine.length > 0} onNew={onNewWish} onPool={onAddFromPool} />
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", justifyContent: "center" }}>
          {isOwner ? (
            <button onClick={() => tgConfirm(t("confirmDelete"), onDelete)} style={{ height: H.sm, padding: "0 12px", border: "none", cursor: "pointer", background: "none", color: "#FF5A5A", fontSize: 14, fontWeight: 600, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Trash2 size={16} /> {t("deleteRoom")}
            </button>
          ) : (
            <button onClick={() => tgConfirm(t("confirmLeave"), onLeave)} style={{ background: "none", border: "none", height: H.sm, padding: "0 12px", cursor: "pointer", color: C.t2, fontSize: 14, fontWeight: 600, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <X size={16} /> {t("leaveRoom")}
            </button>
          )}
        </div>
      </div>
      {cancelling && <ConfirmSheet
        title={t(cancelling.chip ? "cancelChipTitle" : "cancelGiftTitle", { name: cancelling.w.title })}
        text={t(cancelling.chip ? "cancelChipText" : "cancelGiftText", { name: cancelling.w.title })}
        yes={t(cancelling.chip ? "cancelChipYes" : "cancelGiftYes")} no={t(cancelling.chip ? "keepChip" : "keepIt")}
        onClose={() => setCancelling(null)}
        onYes={() => { const c = cancelling; setCancelling(null); c.chip ? doUnchip(c.w.id) : doUnreserve(c.w.id); }} />}
      {giving && <GiveSheet wish={giving} onClose={() => setGiving(null)}
        onSolo={() => { const w = giving; setGiving(null); doReserve(w); }}
        onGroup={() => { const w = giving; setGiving(null); doChip(w.id); }} />}
    </div>
  );
}

/* ---------- "YOU TOOK A GIFT" CELEBRATION ---------- */
// 🎉 party-popper confetti: two bursts from the bottom corners, tumbling down.
// Skipped when the user prefers reduced motion.
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = ref.current; if (!cv || reduce) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.width = window.innerWidth * dpr, Hh = cv.height = window.innerHeight * dpr;
    const ctx = cv.getContext("2d");
    const colors = ["#2E7DF6", "#7FB0FF", "#FFD36E", "#FF7AB6", "#7CE0C3", "#FFFFFF"];
    const parts = [];
    const shoot = (x, dir) => {
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + dir * (0.15 + Math.random() * 0.55), v = (9 + Math.random() * 9) * dpr;
        parts.push({ x, y: Hh + 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
          w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr, c: colors[Math.floor(Math.random() * colors.length)], life: 1 });
      }
    };
    shoot(W * 0.08, 1); shoot(W * 0.92, -1);
    const t2 = setTimeout(() => { shoot(W * 0.2, 1); shoot(W * 0.8, -1); }, 350);
    const t3 = setTimeout(() => { shoot(W * 0.5, 0.35); shoot(W * 0.5, -0.35); }, 700);
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, W, Hh);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32 * dpr; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (p.vy > 0) p.life -= 0.006;
        if (p.life <= 0 || p.y > Hh + 40) { parts.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.r * 2));
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (parts.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 75 }} />;
}
// Opening an invite to a surprise birthday room: guests go in, the birthday
// person can say so and only ever see their own wishes there.
function SurpriseGate({ room, onJoin }) {
  const { lang, t } = useT();
  const [busy, setBusy] = useState(false);
  const go = async (asCel) => { if (busy) return; setBusy(true); try { await onJoin(asCel); } finally { setBusy(false); } };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: `linear-gradient(${heroTop(room.tint)} 0, transparent 160px), ${roomHeroBg(room.tint)}`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ transform: "rotate(-8deg)" }}><Sticker emoji={room.emoji} size={96} /></div>
        <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginTop: 24 }}>{room.name}</div>
        {room.eventDate && <EventBadge text={fmtDate(lang, room.eventDate)} />}
      </div>
      <div style={{ background: C.card, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "24px 16px calc(24px + env(safe-area-inset-bottom))" }}>
        <div style={{ color: C.t1, fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{t("bdayGateTitle", { name: room.celebrantName || "?" })}</div>
        <div style={{ color: C.t2, fontSize: 14.5, lineHeight: 1.45, marginTop: 8, marginBottom: 24 }}>{t("bdayGateSub")}</div>
        <Pill full kind="primary" disabled={busy} onClick={() => go(false)}>{t("bdayGateIn")}</Pill>
        <div style={{ height: 12 }} />
        <Pill full kind="ghost" disabled={busy} onClick={() => go(true)}>{t("bdayGateMe")}</Pill>
      </div>
    </div>
  );
}
// "Take" on a free wish: gift it alone (reserve) or open a group chip-in.
// "Are you sure?" as a bottom sheet: centred like the "gift taken" sheet, the
// safe choice is the big button, the destructive one is small red text.
function ConfirmSheet({ title, text, yes, no, onYes, onClose, sticker = "utya:sad" }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ textAlign: "center", marginTop: -8 }}>
        <div style={{ display: "inline-block" }}><Sticker emoji={sticker} size={72} /></div>
        <div style={{ color: C.t1, fontSize: 22, fontWeight: 800, marginTop: 16 }}>{title}</div>
        {text && <div style={{ color: C.t2, fontSize: 15, lineHeight: 1.45, marginTop: 8 }}>{text}</div>}
        <div style={{ marginTop: 24 }}><Pill full kind="primary" onClick={onClose}>{no}</Pill></div>
        <button onClick={() => { haptic("warning"); onYes(); }} style={{ marginTop: 8, height: H.sm, padding: "0 16px", background: "none", border: "none", cursor: "pointer", color: "#FF5A5A", fontSize: 14, fontWeight: 600, fontFamily: font }}>{yes}</button>
      </div>
    </Sheet>
  );
}
function GiveSheet({ wish, onSolo, onGroup, onClose }) {
  const { t } = useT();
  const opt = (icon, title, sub, onClick, primary) => (
    <button onClick={() => { haptic("light"); onClick(); }} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: R.tile, border: "none", cursor: "pointer", textAlign: "left", fontFamily: font,
      background: primary ? C.blue : C.card2, color: "#fff", marginTop: 8,
    }}>
      <div style={{ width: H.sm, height: H.sm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: "rotate(-8deg)" }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, color: primary ? "rgba(255,255,255,0.8)" : C.t2, lineHeight: 1.35 }}>{sub}</div>
      </div>
    </button>
  );
  return (
    <Sheet title={t("giveHow", { name: wish.title })} onClose={onClose}>
      {opt(<Sticker emoji="stk:basket" size={34} />, t("giveSolo"), t("giveSoloSub"), onSolo, true)}
      {opt(<Sticker emoji="stk:piggy" size={34} />, t("giveGroup"), t("giveGroupSub"), onGroup, false)}
    </Sheet>
  );
}
function GiftTakenSheet({ title, onClose }) {
  const { t } = useT();
  return (
    <>
      <Sheet onClose={onClose}>
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Sticker emoji="utya:party" size={88} /></div>
          <div style={{ color: C.t1, fontSize: 22, fontWeight: 800, marginTop: 16 }}>{t("giftTakenTitle", { name: title })}</div>
          <div style={{ color: C.t2, fontSize: 15, lineHeight: 1.45, marginTop: 8 }}>{t("giftTakenBody")}</div>
          <div style={{ marginTop: 24 }}><Pill full kind="primary" onClick={onClose}>{t("giftTakenOk")}</Pill></div>
        </div>
      </Sheet>
      <Confetti />
    </>
  );
}

/* ---------- DRAW / SECRET SANTA ---------- */
// Face-down Secret Santa card: blue with a "?" block sticker.
function CardBack({ sticker = 40 }) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 18, background: `radial-gradient(120% 90% at 30% 20%, #6FA8FF 0%, ${C.blue} 45%, #3B2BB8 100%)`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Sticker emoji="stk:qblock" size={sticker} />
    </div>
  );
}
function DrawFlow({ room, reserved, online, onReserve, onUnreserve, onInvite, onError, onClose }) {
  const { t } = useT();
  const [stage, setStage] = useState("setup");
  const [budget, setBudget] = useState("1 000 ₴");
  const [target, setTarget] = useState(null);
  const [targetWishes, setTargetWishes] = useState([]);
  const canDraw = room.members.length >= 3;
  // The show: face-down cards (one per other member) shuffle around, then the
  // drawn person's card flies to the centre and flips over.
  const others = room.members.filter(m => !m.you);
  const [order, setOrder] = useState(() => others.map((_, i) => i));
  const [picked, setPicked] = useState(null); // index into `cards` once the shuffle ends
  const [flipped, setFlipped] = useState(false);
  const cards = (() => {
    let c = others.slice(0, 5);
    if (target && !c.some(m => m.id === target.id)) c = [...c.slice(0, 4), target];
    return c;
  })();

  useEffect(() => {
    if (stage !== "drawing") return;
    let done = false, ready = false, elapsed = false;
    const finish = () => {
      if (!ready || !elapsed || done) return;
      done = true; clearInterval(iv);
      setPicked(true);
      setTimeout(() => { setFlipped(true); haptic("success"); }, 650);
      setTimeout(() => setStage("reveal"), 2100);
    };
    const shuffle = () => setOrder(o => { const a = [...o]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
    const iv = setInterval(() => { shuffle(); haptic("light"); }, 260);
    (async () => {
      if (online) {
        try { await api.runDraw(room.id, budget); const d = await api.draw(room.id); setTarget(d.target); setTargetWishes(d.wishes || []); }
        catch (e) { if (onError) onError(); return; }
      } else {
        const tg = others[Math.floor(Math.random() * others.length)] || room.members[0];
        setTarget(tg); setTargetWishes(tg && tg.wishes ? tg.wishes : []);
      }
      ready = true; finish();
    })();
    const tm = setTimeout(() => { elapsed = true; finish(); }, 2200);
    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [stage]); // eslint-disable-line

  const doReserve = async (wish) => {
    await onReserve(wish);
    setTargetWishes(ws => ws.map(w => w.id === wish.id ? { ...w, reservedByMe: true } : w));
  };
  const doUnreserve = async (wid) => {
    await onUnreserve(wid);
    setTargetWishes(ws => ws.map(w => w.id === wid ? { ...w, reservedByMe: false } : w));
  };
  const isMine = (w) => w.reservedByMe || reserved[w.id] === "you";
  const [cancelling, setCancelling] = useState(null);

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, zIndex: 55, overflowY: "auto", animation: "fadeUp .2s ease" }}>
      {cancelling && <ConfirmSheet title={t("cancelGiftTitle", { name: cancelling.title })} text={t("cancelGiftText", { name: cancelling.title })} yes={t("cancelGiftYes")} no={t("keepIt")}
        onClose={() => setCancelling(null)} onYes={() => { const w = cancelling; setCancelling(null); doUnreserve(w.id); }} />}
      <div style={{ padding: "16px 18px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.line}`, color: C.t2, width: H.sm, height: H.sm, borderRadius: H.sm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={18} />
        </button>
      </div>

      {stage === "setup" && (
        <div style={{ padding: "20px 22px", textAlign: "center", animation: "fadeUp .3s ease" }}>
          {/* same face-down cards as in the shuffle, fanned out */}
          <div style={{ position: "relative", height: 132, marginTop: 8 }}>
            {[-1, 1, 0].map(o => (
              <div key={o} style={{ position: "absolute", left: "50%", top: "50%", width: 80, height: 112, transform: `translate(-50%, -50%) translate(${o * 40}px, ${Math.abs(o) * 8}px) rotate(${o * 12}deg)` }}>
                <CardBack sticker={o === 0 ? 36 : 30} />
              </div>
            ))}
          </div>
          <div style={{ color: C.t1, fontSize: 24, fontWeight: 800, marginTop: 16 }}>{t("secretExchange")}</div>
          <div style={{ color: C.t2, fontSize: 15, marginTop: 8, maxWidth: 300, marginInline: "auto", lineHeight: 1.45 }}>
            {t("drawIntro")}
          </div>

          {!canDraw ? (
            <div style={{ marginTop: 24 }}>
              <div style={{ color: C.t2, fontSize: 14.5, marginBottom: 16, lineHeight: 1.4 }}>
                {t("needThree", { n: room.members.length })}
              </div>
              <Pill kind="primary" icon={<Share2 size={17} />} onClick={onInvite}>{t("inviteFriends")}</Pill>
            </div>
          ) : (
          <>
          <Card style={{ padding: 16, marginTop: 24, textAlign: "left" }}>
            <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t("giftBudget")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["500 ₴", "1 000 ₴", "2 000 ₴"].map(b => (
                <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>{b}</Chip>
              ))}
            </div>
            <div style={{ height: 16 }} />
            <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t("participants", { n: room.members.length })}</div>
            <div style={{ display: "flex" }}>
              {room.members.map((m, i) => <div key={m.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar m={m} size={34} cut={i < room.members.length - 1 ? 8 : 0} /></div>)}
            </div>
          </Card>

          <div style={{ marginTop: 24 }}>
            <Pill full kind="primary" icon={<Sparkles size={18} />} onClick={() => setStage("drawing")}>{t("runDraw")}</Pill>
          </div>
          </>
          )}
        </div>
      )}

      {stage === "drawing" && (
        <div style={{ padding: "48px 16px", textAlign: "center" }}>
          <div style={{ position: "relative", height: 300, perspective: 900 }}>
            {cards.map((m, i) => {
              const n = cards.length, slot = order.indexOf(i) < 0 ? i : order.indexOf(i), off = slot - (n - 1) / 2;
              const isT = picked && target && m.id === target.id;
              const tf = picked
                ? (isT ? "translate(-50%, -50%) translate(0px, 0px) scale(1.55)" : `translate(-50%, -50%) translate(${off * 90}px, 260px) rotate(${off * 20}deg) scale(.7)`)
                : `translate(-50%, -50%) translate(${off * 52}px, ${Math.abs(off) * 10}px) rotate(${off * 9}deg)`;
              return (
                <div key={m.id} style={{
                  position: "absolute", left: "50%", top: "50%", width: 92, height: 128, transform: tf, zIndex: isT ? 10 : slot,
                  opacity: picked && !isT ? 0 : 1, transition: "transform .45s cubic-bezier(.2,.8,.2,1), opacity .4s ease",
                }}>
                  <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transition: "transform .6s cubic-bezier(.3,.7,.2,1)", transform: isT && flipped ? "rotateY(180deg)" : "none" }}>
                    <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}><CardBack sticker={40} /></div>
                    {/* front: who you drew */}
                    <div style={{ position: "absolute", inset: 0, borderRadius: 18, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)",
                      background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 8 }}>
                      <Avatar m={m} size={48} />
                      <div style={{ color: "#111", fontSize: 13, fontWeight: 800, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ color: C.t1, fontSize: 20, fontWeight: 700, marginTop: 24 }}>{flipped ? t("youGot") : t("shuffling")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 8 }}>{flipped ? target && target.name : t("dealing")}</div>
          {flipped && <Confetti />}
        </div>
      )}

      {stage === "reveal" && target && (
        <div style={{ padding: "20px 22px", textAlign: "center" }}>
          <div style={{ color: C.blue, fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{t("youGot")}</div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24, animation: "pop .5s ease" }}>
            <Avatar m={target} size={96} />
          </div>
          <div style={{ color: C.t1, fontSize: 28, fontWeight: 800, marginTop: 16 }}>{target.name}</div>
          <div style={{ color: C.t2, fontSize: 14.5, marginTop: 4 }}>{t("budgetSecret", { b: budget })}</div>

          <div style={{ marginTop: 24, textAlign: "left" }}>
            <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t("wishesOf", { name: target.name })}</div>
            <Card style={{ padding: `0 ${LIST.pad}px` }}>
              {targetWishes.length ? targetWishes.map((w, i) => (
                <div key={w.id} style={{ ...sepBelow(i < targetWishes.length - 1) }}>
                  <WishRow w={w} right={
                    isMine(w)
                      ? <Pill size="sm" kind="green" icon={<Check size={16} />} onClick={() => setCancelling(w)}>{t("youGift")}</Pill>
                      : w.chips ? <span style={{ color: C.t3, fontSize: 12.5, fontWeight: 600 }}>{t("chipNote", { n: w.chips.count, total: w.chips.total })}</span>
                      : <Pill size="sm" kind="soft" onClick={() => doReserve(w)}>{t("take")}<img src="/stickers/basket.webp" alt="" style={{ height: 34, width: "auto", display: "block", margin: -6 }} /></Pill>
                  } />
                </div>
              )) : <div style={{ padding: 16, color: C.t3, fontSize: 13.5 }}>{t("emptyLater")}</div>}
            </Card>
          </div>

          <div style={{ marginTop: 24 }}>
            <Pill full kind="primary" icon={<Check size={18} />} onClick={onClose}>{t("gotItTake")}</Pill>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- ADD SHEET ---------- */
// idea: a gift idea inside a birthday room (no pool, no room picker)
// A price typed as a bare number gets the currency of the interface language:
// hryvnia for uk/ru ("4 200 ₴"), dollars for en ("$4,200"). Anything that
// already has a currency (typed, or filled in from a shop) stays as it is.
function priceNum(raw, lang) {
  const s = String(raw || "").trim();
  if (!/^\d[\d\s.,]*$/.test(s)) return null;
  const n = Number(s.replace(/\s/g, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, ""));
  if (!isFinite(n)) return null;
  return n.toLocaleString(lang === "en" ? "en-US" : "uk-UA", { maximumFractionDigits: 2 }).replace(/\s/g, " ");
}
function withCurrency(raw, lang) {
  const n = priceNum(raw, lang);
  return n == null ? String(raw || "").trim() : lang === "en" ? "$" + n : n + " ₴";
}
function priceRangeText(a, b, lang, t) {
  if (!a || !b) return withCurrency(a || b, lang);
  const na = priceNum(a, lang), nb = priceNum(b, lang);
  if (lang === "en") return t("priceRange", { a: na != null ? "$" + na : a, b: nb != null ? "$" + nb : b });
  // uk/ru: the currency sign once, at the end ("від 1 000 до 2 000 ₴")
  return t("priceRange", { a: na != null ? na : a, b: nb != null ? nb + " ₴" : b });
}
// "от 1 000 до 2 000 ₴" (any of our languages) -> ["1 000", "2 000 ₴"]
const RANGE_RE = /^(?:від|от|from)?\s*(.+?)\s+(?:до|to)\s+(.+)$/i;
function AddSheet({ rooms, onClose, onSave, idea, initial, presetRooms }) {
  const { t, lang } = useT();
  // initial: editing an existing wish (same form, prefilled; rooms are set in the wish sheet)
  const init = initial || {};
  const initRange = init.price && init.price.match(RANGE_RE);
  const [title, setTitle] = useState(init.title || "");
  const [price, setPrice] = useState(initRange ? "" : (init.price || ""));
  const [priceMode, setPriceMode] = useState(initRange ? "range" : "one");
  const [priceA, setPriceA] = useState(initRange ? initRange[1] : "");
  const [priceB, setPriceB] = useState(initRange ? initRange[2] : "");
  const [note, setNote] = useState(init.note || "");
  const initImgs = initial ? wishImages(initial) : [];
  const [emoji, setEmoji] = useState(init.emoji && WISH_EMOJI.includes(init.emoji) ? init.emoji : WISH_EMOJI[0]);
  const [inRooms, setInRooms] = useState(presetRooms || []);
  const [images, setImages] = useState(initImgs);
  const [link, setLink] = useState(init.link || "");
  const [cover, setCover] = useState(initial && !initImgs.length ? "emoji" : "photo");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const MAX_PHOTOS = 3;
  // Paste a product link -> fill name/price and add the shop photo. A newer link
  // replaces what the previous one filled in, but never what the user typed.
  const [linkState, setLinkState] = useState(null); // null | "loading" | "done" | "fail"
  const lastLink = useRef((init.link || "").trim());
  const auto = useRef({ title: "", price: "", image: null });
  const fill = useRef({ title, price, images });
  fill.current = { title, price, images };
  useEffect(() => {
    const url = link.trim();
    if (!/^https?:\/\/[^\s/]+\.[^\s]+/i.test(url) || url === lastLink.current) return;
    const id = setTimeout(async () => {
      lastLink.current = url; setLinkState("loading");
      try {
        const p = await api.preview(url);
        if (lastLink.current !== url) return;
        const cur = fill.current, a = auto.current;
        const mine = (v, prev) => !v.trim() || v === prev;
        if (p.title && mine(cur.title, a.title)) { setTitle(p.title); a.title = p.title; }
        if (p.price && mine(cur.price, a.price)) { setPrice(p.price); a.price = p.price; }
        else if (!p.price && a.price && cur.price === a.price) { setPrice(""); a.price = ""; }
        if (p.image) {
          const blob = await (await fetch(p.image)).blob();
          const small = await compressImage(blob).catch(() => p.image);
          if (lastLink.current !== url) return;
          const prev = a.image; a.image = small;
          setImages(xs => {
            const i = prev ? xs.indexOf(prev) : -1;
            if (i >= 0) return xs.map((x, j) => j === i ? small : x);
            return xs.length < MAX_PHOTOS && !xs.includes(small) ? [...xs, small] : xs;
          });
          setCover("photo");
        } else if (a.image) {
          const prev = a.image; a.image = null;
          setImages(xs => xs.filter(x => x !== prev));
        }
        setLinkState(p.guess ? "guess" : p.title || p.price || p.image ? "done" : "fail");
        haptic(!p.guess && (p.title || p.image) ? "success" : "warning");
      } catch (e) { if (lastLink.current === url) setLinkState("fail"); }
    }, 500);
    return () => clearTimeout(id);
  }, [link]); // eslint-disable-line
  const pickFile = (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - images.length);
    e.target.value = ""; // allow re-picking the same file after removing it
    files.forEach(f => {
      const add = (url) => setImages(xs => xs.length < MAX_PHOTOS ? [...xs, url] : xs);
      compressImage(f).then(add).catch(() => { const r = new FileReader(); r.onload = () => add(r.result); r.readAsDataURL(f); });
    });
  };
  const submit = async () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    const a = priceA.trim(), b = priceB.trim();
    const finalPrice = priceMode === "range" ? priceRangeText(a, b, lang, t) : withCurrency(price, lang);
    try { await onSave({ emoji, images: cover === "photo" ? images : [], image: cover === "photo" ? (images[0] || null) : null, link: link.trim() || null, title: title.trim(), price: finalPrice, note: note.trim(), rooms: inRooms }); }
    catch (e) { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: C.card, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "10px 16px 32px", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)", maxWidth: 440, width: "100%", marginInline: "auto", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.card2, margin: "6px auto 18px" }} />
        <div style={{ color: C.t1, fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{t(initial ? "editWish" : idea ? "bdayNewIdea" : "newWish")}</div>

        <Segmented options={[["photo", t("photo")], ["emoji", t("emojiTab")]]} value={cover} onChange={setCover} neutral style={{ marginBottom: 16, background: C.card2 }} />

        {cover === "photo" ? (
          <div style={{ marginBottom: 16 }}>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={pickFile} style={{ display: "none" }} />
            {images.length ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {images.map((src, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: R.tile, background: `${C.card2} center / cover no-repeat url("${src}")` }}>
                      <button onClick={() => setImages(xs => xs.filter((_, j) => j !== i))} aria-label={t("remove")} style={{
                        position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 28, border: "none", cursor: "pointer",
                        background: "rgba(0,0,0,0.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                      }}><X size={15} /></button>
                    </div>
                  ))}
                  {images.length < MAX_PHOTOS && (
                    <button onClick={() => fileRef.current && fileRef.current.click()} aria-label={t("uploadPhoto")} style={{
                      aspectRatio: "1", borderRadius: R.tile, cursor: "pointer", background: C.card2, border: "none", color: C.t2,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}><Plus size={24} /></button>
                  )}
                </div>
                <div style={{ color: C.t3, fontSize: 12.5, marginTop: 8 }}>{t("photosHint")} · {images.length}/{MAX_PHOTOS}</div>
              </div>
            ) : (
              <button onClick={() => fileRef.current && fileRef.current.click()} style={{
                width: "100%", padding: "26px", borderRadius: R.card, cursor: "pointer",
                background: C.card2, border: "none", color: C.t2, fontFamily: font,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600,
              }}>
                <ImageIcon size={26} color={C.t2} />
                {t("uploadPhoto")}
                <span style={{ color: C.t3, fontSize: 12.5, fontWeight: 500 }}>{t("photosHint")}</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(WISH_EMOJI.length, 7)}, 1fr)`, gap: 8, marginBottom: 16 }}>
            {WISH_EMOJI.map(e => (
              <button key={e} onClick={() => { haptic("select"); setEmoji(e); }} style={{
                width: "100%", aspectRatio: "1", borderRadius: "50%", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: emoji === e ? C.blueSoft : C.card2, border: `1.5px solid ${emoji === e ? C.blue : "transparent"}`,
              }}><Sticker emoji={e} size={28} /></button>
            ))}
          </div>
        )}

        <Field label={t("linkLabel")} value={link} onChange={setLink} placeholder="https://…" />
        <div style={{ color: linkState === "fail" ? "#FF8A80" : linkState === "guess" ? "#FFB27A" : linkState === "done" ? "#7EE29A" : C.t3, fontSize: 12.5, marginTop: -8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          {linkState === "loading" && <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />}
          {linkState === "done" && <Check size={13} />}
          {!linkState && <Sticker emoji="stk:tag" size={14} style={{ margin: -5 }} />}
          {linkState === "loading" ? t("linkLoading") : linkState === "done" ? t("linkDone") : linkState === "fail" ? t("linkFail") : linkState === "guess" ? t("linkGuess") : t("linkHint")}
        </div>
        <Field label={t("whatYouWant")} value={title} onChange={setTitle} placeholder={t("whatYouWantPh")} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ color: C.t2, fontSize: 13, fontWeight: 600 }}>{t("priceOpt")}</div>
          <div style={{ display: "flex", gap: 4, background: C.card2, borderRadius: 999, padding: 4, height: H.sm }}>
            {[["one", t("priceOne")], ["range", t("priceRangeTab")]].map(([k, l]) => (
              <button key={k} onClick={() => {
                if (k === priceMode) return; haptic("select");
                // carry what was typed over to the other mode
                if (k === "range") { setPriceA(price); setPriceB(""); } else setPrice(priceB || priceA);
                setPriceMode(k);
              }} style={{ height: H.sm - 8, padding: "0 12px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: font, fontSize: 12.5, fontWeight: 600, background: priceMode === k ? "#3A3A3E" : "transparent", color: priceMode === k ? "#fff" : C.t2 }}>{l}</button>
            ))}
          </div>
        </div>
        {priceMode === "one" ? (
          <Field value={price} onChange={setPrice} placeholder={lang === "en" ? "$50" : "4 200 ₴"} />
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><Field value={priceA} onChange={setPriceA} placeholder={t("priceFrom") + (lang === "en" ? " $20" : " 1 000")} /></div>
            <div style={{ flex: 1 }}><Field value={priceB} onChange={setPriceB} placeholder={t("priceTo") + (lang === "en" ? " $50" : " 2 000 ₴")} /></div>
          </div>
        )}
        <TextArea label={t("noteLabel")} value={note} onChange={setNote} placeholder={t("notePh")} />

        {!idea && !initial && <>
        <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, margin: "6px 0 8px" }}>{t("showInRooms")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {rooms.filter(r => r.type !== "birthday" || r.iAmCelebrant).map(r => (
            <Chip key={r.id} active={inRooms.includes(r.id)} color={r.tint}
              onClick={() => setInRooms(x => x.includes(r.id) ? x.filter(i => i !== r.id) : [...x, r.id])}>
              <Sticker emoji={r.emoji} size={15} />{r.name}
            </Chip>
          ))}
        </div>
        <div style={{ color: C.t3, fontSize: 12.5, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}><Lock size={13} />{t("nothingSelectedPrivate")}</div>
        </>}
        {(idea || initial) && <div style={{ height: 8 }} />}

        <Pill full kind="primary" disabled={!title.trim() || busy} onClick={submit}>
          {busy ? t("savingWish") : t(initial ? "saveChanges" : "saveWish")}
        </Pill>
      </div>
    </div>
  );
}
function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value.slice(0, 300))} placeholder={placeholder} rows={2}
        style={{
          width: "100%", background: C.card2, border: "1px solid transparent", borderRadius: 20, resize: "none", display: "block",
          minHeight: 76, padding: "14px 16px", color: C.t1, fontSize: 16, lineHeight: 1.4, fontFamily: font, outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = C.blueLine}
        onBlur={e => e.target.style.borderColor = "transparent"} />
    </div>
  );
}
function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", background: C.card2, border: "1px solid transparent", borderRadius: R.pill,
          height: H.lg, padding: "0 16px", color: C.t1, fontSize: 16, fontFamily: font, outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = C.blueLine}
        onBlur={e => e.target.style.borderColor = "transparent"} />
    </div>
  );
}

/* ---------- PROFILE ---------- */
// "My birthday" card: date, days to go, opens a sheet to set it.
function BirthdayCard({ birthday, onSave }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const next = birthday && /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? nextOccurrence(Number(birthday.slice(8)), Number(birthday.slice(5, 7))) : null;
  const left = next ? daysUntil(next) : null;
  const dayMonth = next ? (() => { const [y, m, d] = next.split("-").map(Number); try { return new Date(y, m - 1, d).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long" }); } catch (e) { return next; } })() : null;
  return (
    <>
      <Card onClick={() => { haptic("light"); setOpen(true); }} style={{ marginTop: 24, padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.t2, fontSize: 13, fontWeight: 600 }}>{t("myBday")}</div>
          <div style={{ color: next ? C.t1 : "#7FB0FF", fontSize: 16, fontWeight: 700, marginTop: 4, whiteSpace: "nowrap" }}>{next ? dayMonth : t("myBdayEmpty")}</div>
        </div>
        {left != null && (
          <div style={{ height: 32, padding: "0 12px", borderRadius: 999, background: left === 0 ? C.blue : C.blueSoft, color: left === 0 ? "#fff" : "#7FB0FF", fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            {left === 0 ? t("myBdayToday") : countdownLabel(lang, t, next)}
          </div>
        )}
        <ChevronRight size={20} color={C.t3} />
      </Card>
      {open && <div style={{ textAlign: "left" }}><BirthdaySheet birthday={birthday} onSave={onSave} onClose={() => setOpen(false)} /></div>}
    </>
  );
}
function BirthdaySheet({ birthday, onSave, onClose }) {
  const { t } = useT();
  const [date, setDate] = useState(birthday || "");
  const [fromTg, setFromTg] = useState(false);
  const [busy, setBusy] = useState(false);
  // Nothing set yet: suggest the date from the Telegram profile, if it's visible.
  useEffect(() => {
    if (birthday) return;
    let live = true;
    api.myBirthday().then(r => {
      const b = r && r.birthday;
      if (live && b) { const pad = (n) => String(n).padStart(2, "0"); setDate(`${b.year || new Date().getFullYear()}-${pad(b.month)}-${pad(b.day)}`); setFromTg(true); }
    }).catch(() => {});
    return () => { live = false; };
  }, []); // eslint-disable-line
  const save = async (v) => { setBusy(true); const ok = await onSave(v); setBusy(false); if (ok) onClose(); };
  return (
    <Sheet title={t("myBday")} onClose={onClose}>
      <DateField label={t("bdayDate")} value={date} onChange={(v) => { setDate(v); setFromTg(false); }} hint={fromTg ? t("myBdayFromTg") : t("myBdayHint")} />
      <Pill full kind="primary" disabled={!date || busy} onClick={() => save(date)}>{t("saveChanges")}</Pill>
      {birthday && (
        <button onClick={() => save(null)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", height: H.sm, cursor: "pointer", color: C.t2, fontSize: 14, fontWeight: 600, fontFamily: font }}>{t("myBdayClear")}</button>
      )}
    </Sheet>
  );
}
// First-launch intro, one animated screen on a loop: wish stickers drop into
// the folder (it bounces as it catches each one), then the folder shrinks and
// stickers orbit around it. The line under "Wishpool." types itself out.
const OB_DROP = ["stk:headphones", "stk:cake", "stk:kitty", "stk:gift"];
const OB_RING1 = ["stk:ring", "stk:plane", "stk:gamepad"];
const OB_RING2 = ["stk:matcha", "stk:sneakers", "stk:picture", "stk:lipstick"];
function useTypewriter(text) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN(x => (x >= text.length ? x : x + 1)), 38);
    return () => clearInterval(id);
  }, [text]);
  return text.slice(0, n);
}
function Onboarding({ onDone }) {
  const { t } = useT();
  const [scene, setScene] = useState("drop"); // drop | orbit
  const [drop, setDrop] = useState(0);        // which sticker is falling now
  const [squish, setSquish] = useState(0);    // bumps on every catch
  useEffect(() => {
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const run = () => {
      setScene("drop");
      OB_DROP.forEach((_, i) => { later(() => setDrop(i + 1), 600 + i * 820); later(() => setSquish(x => x + 1), 600 + i * 820 + 560); });
      later(() => { setScene("orbit"); setDrop(0); }, 600 + OB_DROP.length * 820 + 300);
      later(run, 600 + OB_DROP.length * 820 + 300 + 5200);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []);
  const line = useTypewriter(t(scene === "drop" ? "obLine1" : "obLine2"));
  const W = 236, Hh = Math.round(236 / 1.12), fp = folderPath(W, Hh);
  const orbit = scene === "orbit";
  const squishAnim = squish ? "obSquish .5s ease" : "obIn .8s cubic-bezier(.2,.9,.3,1.2)";
  const ring = (items, r, dur, rev) => (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)",
      opacity: orbit ? 1 : 0, transform: orbit ? "scale(1)" : "scale(.6)", transition: "opacity .5s ease, transform .6s cubic-bezier(.2,.8,.2,1)" }}>
      <div style={{ position: "absolute", inset: 0, animation: `${rev ? "obSpinRev" : "obSpin"} ${dur}s linear infinite` }}>
        {items.map((e, i) => {
          const a = (i / items.length) * Math.PI * 2;
          return (
            <div key={e} style={{ position: "absolute", left: r + Math.cos(a) * r, top: r + Math.sin(a) * r, transform: "translate(-50%,-50%)" }}>
              <div style={{ animation: `${rev ? "obSpin" : "obSpinRev"} ${dur}s linear infinite` }}><Sticker emoji={e} size={48} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 95, background: C.bg, display: "flex", flexDirection: "column", padding: "16px 16px 32px", maxWidth: 440, marginInline: "auto", overflow: "hidden" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 360 }}>
        {ring(OB_RING2, 162, 40, true)}
        {ring(OB_RING1, 100, 30, false)}
        {/* the folder: back panel, the falling sticker, then the frosted front on top */}
        <div style={{ position: "absolute", left: "50%", top: "50%", width: W, height: Hh, marginLeft: -W / 2, marginTop: -Hh / 2,
          transform: orbit ? "scale(.62) rotate(-6deg)" : "scale(1) rotate(-4deg)", transition: "transform .7s cubic-bezier(.2,.8,.2,1)" }}>
          {/* back and front bounce together on each catch; the falling sticker sits between them */}
          <div key={"b" + squish} style={{ position: "absolute", inset: 0, animation: squishAnim, transformOrigin: "50% 100%" }}>
            <div style={{ position: "absolute", left: "8%", right: "8%", top: "16%", bottom: "10%", borderRadius: 18, background: "#1B4FA8" }} />
          </div>
          {drop > 0 && !orbit && (
            <div key={"d" + drop} style={{ position: "absolute", left: "50%", top: "22%", animation: "obDrop .78s cubic-bezier(.45,0,.6,1) forwards" }}>
              <Sticker emoji={OB_DROP[drop - 1]} size={84} />
            </div>
          )}
          <div key={"f" + squish} style={{ position: "absolute", inset: 0, animation: squishAnim, transformOrigin: "50% 100%" }}>
            <svg width={W} height={Hh} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden="true">
              <defs><linearGradient id="obf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A93FF" /><stop offset="1" stopColor="#2E7DF6" /></linearGradient></defs>
              <path d={fp.full} fill="url(#obf)" />
            </svg>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 4px" }}>
        <div style={{ color: C.t1, fontSize: 30, fontWeight: 800, letterSpacing: -0.6 }}>Wishpool.</div>
        <div style={{ color: C.t2, fontSize: 17, lineHeight: 1.4, marginTop: 8, minHeight: 48 }}>
          {line}<span style={{ animation: "obBlink 1s steps(1) infinite", color: C.t1 }}>_</span>
        </div>
      </div>
      <div style={{ marginTop: 24 }}><Pill full kind="primary" onClick={onDone}>{t("obStart")}</Pill></div>
    </div>
  );
}
function ProfileScreen({ wishes, rooms, reserved, onHistory, onInvites, birthday, onBirthday }) {
  const { t, lang, setLang } = useT();
  const me = { name: tgUserName() || t("guest"), color: "#7B61FF", photo: tgUserPhoto() };
  const gifting = Object.values(reserved || {}).filter(v => v === "you").length;
  return (
    <div style={{ animation: "fadeUp .3s ease", textAlign: "center", paddingTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "center" }}><Avatar m={me} size={92} /></div>
      <div style={{ color: C.t1, fontSize: 24, fontWeight: 800, marginTop: 16 }}>{me.name}</div>
      <div style={{ color: C.t2, fontSize: 14.5, marginTop: 4 }}>{t("statsLine", { w: wishes.length, r: rooms.length })}</div>

      <BirthdayCard birthday={birthday} onSave={onBirthday} />

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Card style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Gift size={22} color={C.blue} />
          <div style={{ color: C.t1, fontSize: 22, fontWeight: 800, marginTop: 8 }}>{wishes.reduce((n, w) => n + w.rooms.length, 0)}</div>
          <div style={{ color: C.t2, fontSize: 12.5 }}>{t("sharedStat")}</div>
        </Card>
        <Card style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Heart size={22} color="#FF4D8D" />
          <div style={{ color: C.t1, fontSize: 22, fontWeight: 800, marginTop: 8 }}>{gifting}</div>
          <div style={{ color: C.t2, fontSize: 12.5 }}>{t("giftingStat")}</div>
        </Card>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={15} /> {t("language")}
        </div>
        <Segmented options={LANGS.map(l => [l, LANG_SHORT[l]])} value={lang} onChange={setLang} />
      </div>

      <Card style={{ marginTop: 16, padding: `0 ${LIST.pad}px` }}>
        {[[Clock, t("history"), onHistory, "#FF9F0A"], [Link2, t("myInvites"), onInvites, "#5E5CE6"], [Send, t("channel"), () => openTgLink("https://t.me/charlot4k_ui"), "#2E7DF6"]].map(([Icon, l, on, bg], i, arr) => (
          <div key={i} onClick={on} style={{ height: 60, display: "flex", alignItems: "center", gap: LIST.gap, cursor: "pointer", ...sepBelow(i < arr.length - 1) }}>
            <div style={{ width: LIST.icon, height: LIST.icon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={22} color={C.t2} />
            </div>
            <span style={{ flex: 1, textAlign: "left", color: C.t1, fontSize: 16, fontWeight: 500 }}>{l}</span>
            <ChevronRight size={20} color={C.t3} />
          </div>
        ))}
      </Card>
    </div>
  );
}
