import React, { useState, useEffect, useRef, useContext, createContext } from "react";
import { createPortal } from "react-dom";
import {
  Gift, Users, User, Plus, Check, ChevronLeft, ChevronRight, X,
  Share2, Lock, Dices, Sparkles, Clock, MoreHorizontal, Link2, Heart, Image as ImageIcon, Trash2, Globe, Send, Pencil,
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
async function apiReq(method, path, body) {
  const h = { "Content-Type": "application/json" };
  const d = tgInitData(); if (d) h["X-Init-Data"] = d;
  const res = await fetch("/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  if (!res.ok) { let e = {}; try { e = await res.json(); } catch (x) {} throw new Error(e.error || ("http_" + res.status)); }
  return res.json();
}
const api = {
  online: () => !!tgInitData(),          // true inside Telegram → real multiplayer
  startRoomId: tgStartParam,             // room id from an invite deep-link
  state: () => apiReq("GET", "/state"),
  createWish: (w) => apiReq("POST", "/wishes", w),
  deleteWish: (id) => apiReq("DELETE", "/wishes/" + id),
  toggleWishRoom: (id, roomId) => apiReq("POST", "/wishes/" + id + "/room", { roomId }),
  createRoom: (r) => apiReq("POST", "/rooms", r),
  updateRoom: (id, data) => apiReq("PATCH", "/rooms/" + id, data),
  joinRoom: (id, inviterId) => apiReq("POST", "/rooms/" + id + "/join", inviterId ? { inviterId } : {}),
  leaveRoom: (id) => apiReq("POST", "/rooms/" + id + "/leave"),
  deleteRoom: (id) => apiReq("DELETE", "/rooms/" + id),
  invites: () => apiReq("GET", "/invites"),
  room: (id) => apiReq("GET", "/rooms/" + id),
  reserve: (id) => apiReq("POST", "/wishes/" + id + "/reserve"),
  unreserve: (id) => apiReq("DELETE", "/wishes/" + id + "/reserve"),
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
function tgConfirm(message, onYes) {
  const w = tgWebApp();
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
  wishAdded: { uk: "Бажання додано", ru: "Желание добавлено", en: "Wish added" },
  wishDeleted: { uk: "Бажання видалено", ru: "Желание удалено", en: "Wish deleted" },
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
  roomFamily: { uk: "Сім’я", ru: "Семья", en: "Family" },
  roomTeam: { uk: "Команда", ru: "Команда", en: "Team" },
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
  nothingSharedSub: { uk: "Відкрий бажання в пулі й увімкни цю кімнату.", ru: "Открой желание в пуле и включи эту комнату.", en: "Open a wish in your pool and enable this room." },
  visibleToAll: { uk: "видно всім", ru: "видно всем", en: "visible to all" },
  addFromPool: { uk: "Додати з пулу", ru: "Добавить из пула", en: "Add from pool" },
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
  budgetSecret: { uk: "Бюджет {b} · тримаємо в секреті 🤫", ru: "Бюджет {b} · держим в секрете 🤫", en: "Budget {b} · keep it secret 🤫" },
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
  coupleRoomHint: { uk: "У цьому типі кімнати може бути лише двоє учасників.", ru: "В комнате этого типа может быть только два участника.", en: "This room type can only have two members." },
  coupleFullHint: { uk: "Кімната для двох вже заповнена", ru: "Комната для двоих уже заполнена", en: "This two-person room is full" },
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
const STICKERS = ["candle", "ghost", "coconut", "shell", "uno", "orange", "matcha", "flower", "bear", "plumbob", "bag", "qblock"];
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
  return `url(#stk-${w * 10}) drop-shadow(0 ${(size * 0.06).toFixed(1)}px ${(size * 0.12).toFixed(1)}px rgba(0,0,0,0.45))`;
}
// Image stickers (web/public/stickers/<name>.webp) are stored as "stk:<name>".
function Sticker({ emoji, size, style }) {
  if (typeof emoji === "string" && emoji.startsWith("stk:")) {
    return <img src={`/stickers/${emoji.slice(4)}.webp`} alt="" draggable={false}
      style={{ height: size * 1.1, width: size * 1.1, objectFit: "contain", display: "inline-block", verticalAlign: "middle", filter: stickerFilter(size), ...style }} />;
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
      onClick={disabled ? undefined : onClick}
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
    <button onClick={onClick} style={{
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
function Segmented({ options, value, onChange, style }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.card, height: H.lg, padding: (H.lg - H.sm) / 2, borderRadius: 999, ...style }}>
      {options.map(([k, l]) => {
        const on = value === k;
        return (
          <button key={k} onClick={() => onChange(k)} style={{
            flex: 1, padding: "0 10px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: font,
            fontSize: 14, fontWeight: 600, background: on ? C.blue : "transparent", color: on ? "#fff" : C.t2,
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
function Empty({ emoji, title, sub }) {
  return (
    <div style={{ padding: "48px 24px", animation: "fadeUp .4s ease", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Sticker emoji={emoji} size={72} />
      <div style={{ color: C.t1, fontSize: 18, fontWeight: 700, marginTop: 16 }}>{title}</div>
      <div style={{ color: C.t2, fontSize: 14.5, marginTop: 8, maxWidth: 260, lineHeight: 1.4 }}>{sub}</div>
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
function WishRow({ w, right, noPhoto }) {
  const imgs = wishImages(w);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: LIST.gap, padding: "16px 0", minHeight: 64 }}>
      <GlossTile emoji={w.emoji} image={noPhoto ? null : imgs[0]} images={imgs} size={LIST.icon} bare />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.t1, fontSize: 16, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</div>
        {w.price && <div style={{ color: C.t2, fontSize: 13.5, marginTop: 4 }}>{w.price}</div>}
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
export default function App() {
  const [lang, setLang] = useState(() => store.get("wp_lang", null) || detectLang());
  useEffect(() => { store.set("wp_lang", lang); }, [lang]);
  const t = (id, p) => tr(lang, id, p);

  const [tab, setTab] = useState("pool");
  const [overlay, setOverlay] = useState(null);
  const [toast, setToast] = useState(null);
  const online = api.online();
  const [me, setMe] = useState(null);
  const [rooms, setRooms] = useState(() => store.get("wp_rooms", []));
  const [wishes, setWishes] = useState(() => store.get("wp_wishes", []));
  const [reserved, setReserved] = useState(() => store.get("wp_reserved", {}));
  const [loading, setLoading] = useState(online);

  // The old dev-only "Glass" preview is gone; drop its saved choice.
  useEffect(() => { try { window.localStorage.removeItem("wp_design_system"); } catch (e) {} }, []);

  // Persist locally only in single-device (offline) mode. In Telegram the server is the source of truth.
  useEffect(() => { if (!online) store.set("wp_rooms", rooms); }, [rooms, online]);
  useEffect(() => { if (!online) store.set("wp_wishes", wishes); }, [wishes, online]);
  useEffect(() => { if (!online) store.set("wp_reserved", reserved); }, [reserved, online]);

  const showToast = (msg, ms = 1800) => { setToast(msg); setTimeout(() => setToast(null), ms); };

  const refreshState = async () => { try { const st = await api.state(); setMe(st.me || null); setWishes(st.wishes || []); setRooms(st.rooms || []); } catch (e) { showToast(t("noConnection"), 3000); } };

  // Online: load state from server + auto-join a room from an invite deep-link (room__inviter).
  useEffect(() => {
    if (!online) return;
    (async () => {
      const sp = api.startRoomId();
      let startId = null, inviterId = null;
      if (sp) { const p = String(sp).split("__"); startId = p[0]; inviterId = p[1] || null; }
      let joinFailed = false;
      if (startId) { try { await api.joinRoom(startId, inviterId); } catch (e) { joinFailed = true; if (e.message === "room_full") showToast(t("roomFull"), 3000); } }
      await refreshState();
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

  const addWish = async (w) => {
    if (online) {
      try { const r = await api.createWish(w); setWishes(ws => [r.wish, ...ws]); }
      catch (e) { showToast(t("noConnection"), 3000); throw e; }
    } else setWishes(ws => [{ ...w, id: "w" + Date.now() }, ...ws]);
    setOverlay(null); showToast(t("wishAdded"));
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
    const room = { id, name: data.name, type: data.type, emoji: data.emoji, tint: data.tint,
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
  const toggleWishRoom = async (wid, rid) => {
    if (online) {
      try { const r = await api.toggleWishRoom(wid, rid); setWishes(ws => ws.map(w => w.id === wid ? { ...w, rooms: r.rooms } : w)); return; }
      catch (e) { showToast(t("noConnection"), 3000); return; }
    }
    setWishes(ws => ws.map(w => w.id === wid
      ? { ...w, rooms: w.rooms.includes(rid) ? w.rooms.filter(r => r !== rid) : [...w.rooms, rid] } : w));
  };

  useEffect(() => {
    const tg = tgWebApp();
    const bb = tg && tg.BackButton;
    if (!bb) return;
    let handler;
    if (overlay) {
      handler = () => {
        if (overlay.type === "draw" || overlay.type === "pool" || overlay.type === "editRoom") setOverlay({ type: "room", roomId: overlay.roomId });
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
        ::-webkit-scrollbar{display:none}
      `}</style>

      <div style={{ width: "100%", maxWidth: 440, minHeight: "100vh", background: C.bg, position: "relative", overflow: "hidden" }}>
        <div style={{ padding: "16px 16px 120px" }}>
          {loading ? <SkeletonScreen tab={tab} /> : (
            <>
              {tab === "pool" && (
                <PoolScreen wishes={wishes} rooms={rooms}
                  onAdd={() => setOverlay({ type: "add" })}
                  onToggleRoom={toggleWishRoom}
                  onDelete={deleteWish}
                />
              )}
              {tab === "rooms" && (
                <RoomsScreen rooms={rooms} wishes={wishes}
                  onOpen={(id) => setOverlay({ type: "room", roomId: id })}
                  onCreate={() => setOverlay({ type: "createRoom" })} />
              )}
              {tab === "profile" && <ProfileScreen wishes={wishes} rooms={rooms} reserved={reserved} onHistory={() => setOverlay({ type: "history" })} onInvites={() => setOverlay({ type: "invites" })} />}
            </>
          )}
        </div>

        {!overlay && <TabBar tab={tab} setTab={(x) => { setTab(x); setOverlay(null); }} />}

        {overlay?.type === "add" && (
          <AddSheet rooms={rooms} onClose={() => setOverlay(null)}
            onSave={addWish} />
        )}
        {overlay?.type === "createRoom" && (
          <CreateRoomSheet onClose={() => setOverlay(null)} onCreate={createRoom} />
        )}
        {(overlay?.type === "room" || overlay?.type === "pool" || overlay?.type === "draw" || overlay?.type === "editRoom") && (
          <RoomDetail room={rooms.find(r => r.id === overlay.roomId)} wishes={wishes}
            reserved={reserved}
            online={online}
            onReserve={reserve}
            onUnreserve={unreserve}
            onAddFromPool={() => setOverlay({ type: "pool", roomId: overlay.roomId })}
            onInvite={() => shareInvite(rooms.find(r => r.id === overlay.roomId))}
            onDraw={() => setOverlay({ type: "draw", roomId: overlay.roomId })}
            onEdit={() => setOverlay({ type: "editRoom", roomId: overlay.roomId })}
            onLeave={() => leaveRoom(overlay.roomId)}
            onDelete={() => removeRoom(overlay.roomId)}
            onBack={() => setOverlay(null)} />
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
            <button key={it.id} onClick={() => setTab(it.id)} style={{
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
function PoolScreen({ wishes, rooms, onAdd, onToggleRoom, onDelete }) {
  const { t } = useT();
  const [openId, setOpenId] = useState(null);
  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "6px 4px 24px" }}>
        <div>
          <div style={{ color: C.t1, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t("poolTitle")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>{t("poolSub")}</div>
        </div>
      </div>

      {wishes.length === 0 ? (
        <Empty emoji="🎁" title={t("poolEmptyTitle")} sub={t("poolEmptySub")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {wishes.map(w => (
            <Card key={w.id} onClick={() => setOpenId(openId === w.id ? null : w.id)} style={{ padding: `${wishImages(w).length ? 0 : 4}px 16px ${openId === w.id ? 16 : 4}px`, cursor: "pointer", border: "1px solid rgba(255,255,255,0.14)", overflow: "hidden" }}>
              {wishImages(w).length > 0 && <PhotoHeader images={wishImages(w)} />}
              <WishRow w={w} noPhoto={wishImages(w).length > 0} right={
                <ChevronRight size={20} color={C.t2} style={{ transform: openId === w.id ? "rotate(90deg)" : "none", transition: ".2s" }} />
              } />
              {openId === w.id && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, animation: "fadeUp .2s ease", cursor: "default" }}>
                  <div style={{ color: C.t2, fontSize: 12.5, marginBottom: 8, fontWeight: 600 }}>{t("showInRooms")}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {rooms.length === 0
                      ? <span style={{ color: C.t3, fontSize: 12.5 }}>{t("noRoomsHint")}</span>
                      : rooms.map(r => (
                        <Chip key={r.id} active={w.rooms.includes(r.id)} color={r.tint} onClick={() => onToggleRoom(w.id, r.id)}>
                          <Sticker emoji={r.emoji} size={15} />{r.name}
                        </Chip>
                      ))}
                  </div>
                  {w.rooms.length === 0 && rooms.length > 0 && (
                    <div style={{ color: C.t3, fontSize: 12.5, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}><Lock size={13} />{t("privateNote")}</div>
                  )}
                  <button onClick={() => tgConfirm(t("confirmDeleteWish"), () => onDelete(w.id))} style={{ marginTop: 8, background: "none", border: "none", height: H.sm, padding: 0, cursor: "pointer", color: "#FF5A5A", fontSize: 13.5, fontWeight: 600, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Trash2 size={15} /> {t("deleteWish")}
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Pill full kind="primary" icon={<Plus size={19} />} onClick={onAdd}>{t("addWish")}</Pill>
      </div>
    </div>
  );
}

/* ---------- ROOMS ---------- */
// Room as a frosted folder: wish photos shared into the room peek out from
// behind a translucent folder front (tab on the left), the room sticker is
// stuck on the front, name + member count sit underneath.
// One continuous folder-front outline (tab on the left, smooth step down to
// the body) for a box of w×h px, so the frosted front is a single element with
// no seam between tab and body.
function folderPath(w, h) {
  const x0 = w * 0.04, x1 = w * 0.96, yT = h * 0.28, yB = h * 0.37, y1 = h * 0.96, xt = w * 0.5, r = 18, rt = 14;
  const top = `M ${x0} ${yT + rt} Q ${x0} ${yT} ${x0 + rt} ${yT} L ${xt - 10} ${yT} C ${xt} ${yT} ${xt} ${yB} ${xt + 12} ${yB} L ${x1 - r} ${yB} Q ${x1} ${yB} ${x1} ${yB + r}`;
  return { top, full: `${top} L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r} Z` };
}
// Room as a frosted folder: wish photos shared into the room peek out from
// behind the translucent front, the room sticker and the members' avatars are
// on the front, name + member count sit underneath.
const FOLDER_MAX_AVATARS = 5;
function RoomFolder({ room, wishes, onOpen }) {
  const { t } = useT();
  const box = useRef(null);
  const [dim, setDim] = useState(null);
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
    <div onClick={onOpen} style={{ cursor: "pointer", textAlign: "center", animation: "fadeUp .3s ease" }}>
      <div ref={box} style={{ position: "relative", width: "100%", aspectRatio: "1.12" }}>
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "16%", bottom: "10%", borderRadius: 16, background: hex(room.tint, 0.22) }} />
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
        {fp && (
          <>
            <div style={{
              position: "absolute", inset: 0, zIndex: 3, clipPath: `path("${fp.full}")`, WebkitClipPath: `path("${fp.full}")`,
              background: `linear-gradient(180deg, ${hex(room.tint, 0.42)} 0%, ${hex(room.tint, 0.26)} 100%)`,
              backdropFilter: "blur(10px) saturate(150%)", WebkitBackdropFilter: "blur(10px) saturate(150%)",
            }} />
            <svg width={dim.w} height={dim.h} style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", overflow: "visible" }} aria-hidden="true">
              <path d={fp.full} fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
            </svg>
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
      <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: R.pill, background: C.card2, color: C.t2, fontSize: 12.5 }}>{t("membersColon", { n: room.members.length })}</div>
    </div>
  );
}
function RoomsScreen({ rooms, wishes, onOpen, onCreate }) {
  const { t } = useT();
  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <div style={{ padding: "6px 4px 24px" }}>
        <div style={{ color: C.t1, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t("roomsTitle")}</div>
        <div style={{ color: C.t2, fontSize: 14, marginTop: 4 }}>{t("roomsSub")}</div>
      </div>

      {rooms.length === 0 ? (
        <Empty emoji="👋" title={t("roomsEmptyTitle")} sub={t("roomsEmptySub")} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 12px" }}>
          {rooms.map(r => <RoomFolder key={r.id} room={r} wishes={wishes} onOpen={() => onOpen(r.id)} />)}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Pill full kind={rooms.length === 0 ? "primary" : "ghost"} icon={<Plus size={19} />} onClick={onCreate}>{t("createRoom")}</Pill>
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
  { type: "family", key: "roomFamily" },
  { type: "team", key: "roomTeam" },
];
const ROOM_STICKERS = STICKERS.map(n => "stk:" + n);
const ROOM_COLORS = ["#2E7DF6", "#38BDF8", "#34C759", "#FFB020", "#FF7A45", "#FF4D8D", "#AF52DE"];

const sheetLabel = { color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 };
function RoomStickerPicker({ value, onChange }) {
  const list = Array.from(new Set([...(value && !ROOM_STICKERS.includes(value) ? [value] : []), ...ROOM_STICKERS]));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 16 }}>
      {list.map(e => (
        <button key={e} onClick={() => onChange(e)} style={{
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
          <button key={c} onClick={() => onChange(c)} aria-label={c} style={{
            width: H.sm, height: H.sm, borderRadius: "50%", cursor: "pointer", padding: 0, background: c,
            border: "none", boxShadow: on ? `0 0 0 3px ${C.card}, 0 0 0 5px ${c}` : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{on && <Check size={18} color="#fff" strokeWidth={3} />}</button>
        );
      })}
    </div>
  );
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

function CreateRoomSheet({ onClose, onCreate }) {
  const { t } = useT();
  const [preset, setPreset] = useState(ROOM_PRESETS[0]);
  const [emoji, setEmoji] = useState(ROOM_STICKERS[0]);
  const [tint, setTint] = useState(ROOM_COLORS[0]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const title = name.trim() || t(preset.key);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try { await onCreate({ name: title, type: preset.type, emoji, tint }); }
    catch (e) { setBusy(false); }
  };
  return (
    <RoomSheetShell title={t("newRoom")} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <GlossTile emoji={emoji} size={80} tint={tint} />
      </div>

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
      {preset.type === "couple" && (
        <div style={{ color: C.t3, fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>{t("coupleRoomHint")}</div>
      )}

      <Field label={t("name")} value={name} onChange={setName} placeholder={t(preset.key)} />

      <Pill full kind="primary" icon={<Plus size={18} />} disabled={busy} onClick={submit}>
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
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try { await onSave({ name: name.trim(), emoji, tint }); }
    catch (e) { setBusy(false); }
  };
  return (
    <RoomSheetShell title={t("editRoom")} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <GlossTile emoji={emoji} size={80} tint={tint} />
      </div>

      <div style={sheetLabel}>{t("roomSticker")}</div>
      <RoomStickerPicker value={emoji} onChange={setEmoji} />

      <div style={sheetLabel}>{t("roomColor")}</div>
      <RoomColorPicker value={tint} onChange={setTint} />

      <Field label={t("name")} value={name} onChange={setName} placeholder={t("name")} />

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 10px 4px" }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>🔗</div>
          <div style={{ color: C.t1, fontSize: 16, fontWeight: 700, marginTop: 12 }}>{t("invitedNobody")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 8, maxWidth: 280, lineHeight: 1.4 }}>{t("invitedNobodySub")}</div>
          {rooms.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Pill kind="primary" icon={<Share2 size={16} />} onClick={() => onShare(rooms[0])}>{t("shareBtn")}</Pill>
            </div>
          )}
        </div>
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 10px 4px" }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>🎁</div>
          <div style={{ color: C.t1, fontSize: 16, fontWeight: 700, marginTop: 12 }}>{t("historyEmptyTitle")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 8, maxWidth: 260, lineHeight: 1.4 }}>{t("historyEmptySub")}</div>
        </div>
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
    <Sheet title={t("addFromPool")} onClose={onClose}>
      {wishes.length === 0 ? (
        <div style={{ color: C.t2, fontSize: 14, padding: "6px 2px 4px", lineHeight: 1.4 }}>{t("poolEmptyInRoom")}</div>
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
function roomHeroBg(tint) {
  return `radial-gradient(120% 90% at 50% 30%, ${hex(tint, 0.85)} 0%, ${hex(tint, 0.55)} 55%, ${hex(tint, 0.3)} 100%), #0d0d10`;
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
// Faint one-colour copies of the room sticker in rings around the centre,
// like Telegram's profile pattern.
const PATTERN = [
  [50, 22, 30, .9], [26, 40, 26, .8], [74, 40, 26, .8], [18, 78, 24, .7], [82, 78, 24, .7],
  [34, 12, 20, .55], [66, 12, 20, .55], [10, 30, 18, .5], [90, 30, 18, .5], [30, 108, 22, .6],
  [70, 108, 22, .6], [6, 112, 18, .45], [94, 112, 18, .45], [42, 150, 18, .45], [58, 150, 18, .45],
  [16, 158, 16, .4], [84, 158, 16, .4], [50, 195, 18, .4], [26, 205, 16, .35], [74, 205, 16, .35],
];
function StickerPattern({ emoji }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", maskImage: "radial-gradient(90% 80% at 50% 40%, #000 30%, transparent 100%)", WebkitMaskImage: "radial-gradient(90% 80% at 50% 40%, #000 30%, transparent 100%)" }}>
      {PATTERN.map(([x, y, sz, o], i) => {
        const st = { position: "absolute", left: `${x}%`, top: y, transform: "translate(-50%,-50%)", filter: "brightness(0)", opacity: 0.16 * o };
        return typeof emoji === "string" && emoji.startsWith("stk:")
          ? <img key={i} src={`/stickers/${emoji.slice(4)}.webp`} alt="" style={{ ...st, width: sz * 1.2, height: sz * 1.2, objectFit: "contain" }} />
          : <span key={i} style={{ ...st, fontSize: sz, lineHeight: 1 }}>{emoji}</span>;
      })}
    </div>
  );
}

/* ---------- ROOM DETAIL ---------- */
function RoomDetail({ room, wishes, reserved, online, onReserve, onUnreserve, onAddFromPool, onInvite, onDraw, onEdit, onLeave, onDelete, onBack }) {
  const { t } = useT();
  // Telegram's own top bar takes the hero colour while the room is open.
  useEffect(() => {
    const tg = tgWebApp(); if (!tg || !tg.setHeaderColor) return;
    const top = heroTop(room.tint);
    try { tg.setHeaderColor(top); } catch (e) {}
    return () => { try { tg.setHeaderColor("#000000"); } catch (e) {} };
  }, [room.tint]);
  const [seg, setSeg] = useState("lists");
  const [detail, setDetail] = useState(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(online);
  const isOwner = online ? !!(detail && detail.room && detail.room.owner) : true;

  useEffect(() => { if (online) setLoading(true); }, [room.id]); // eslint-disable-line

  useEffect(() => {
    let live = true;
    if (online) {
      api.room(room.id).then(d => { if (live) setDetail(d); }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    } else {
      setDetail({
        members: room.members,
        lists: room.members.filter(m => !m.you).map(m => ({
          member: m,
          wishes: (m.wishes || []).map(w => ({ ...w, reservedByMe: reserved[w.id] === "you", taken: !!reserved[w.id] && reserved[w.id] !== "you" })),
        })),
        mine: wishes.filter(w => w.rooms.includes(room.id)),
      });
      setLoading(false);
    }
    return () => { live = false; };
  }, [room.id, online, tick, wishes, reserved]);

  const members = (detail && detail.members) || room.members;
  const lists = (detail && detail.lists) || [];
  const mine = (detail && detail.mine) || [];
  const others = members.filter(m => !m.you);
  const coupleFull = room.type === "couple" && members.length >= 2;

  const doReserve = async (w) => { await onReserve(w); setTick(x => x + 1); };
  const doUnreserve = async (wid) => { await onUnreserve(wid); setTick(x => x + 1); };

  const reserveRight = (w) => (
    (w.reservedByMe || reserved[w.id] === "you")
      ? <Pill size="sm" kind="green" icon={<Check size={16} />} onClick={() => doUnreserve(w.id)}>{t("youGift")}</Pill>
      : w.taken ? <span style={{ color: C.t3, fontSize: 13, fontWeight: 600, height: H.sm, padding: "0 12px", display: "inline-flex", alignItems: "center" }}>{t("taken")}</span>
        : <Pill size="sm" kind="soft" onClick={() => doReserve(w)}>{t("take")}<img src="/stickers/basket.webp" alt="" style={{ height: 22, width: "auto", display: "block" }} /></Pill>
  );

  return (
    <div style={{ position: "absolute", inset: 0, top: 0, background: `linear-gradient(${heroTop(room.tint)} 0 50%, ${C.bg} 50% 100%)`, zIndex: 45, overflowY: "auto", animation: "fadeUp .25s ease" }}>
      {/* Telegram-style hero: room-colour gradient with a faint pattern of the room's sticker */}
      <div style={{ position: "relative", overflow: "hidden", padding: "16px 16px 52px", textAlign: "center", background: `linear-gradient(${heroTop(room.tint)} 0, transparent 120px), ${roomHeroBg(room.tint)}` }}>
        <StickerPattern emoji={room.emoji} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", height: H.sm }}>
          {hasTgBack() ? <span /> : <HeroButton onClick={onBack} label={t("back")}><ChevronLeft size={20} /></HeroButton>}
          {isOwner ? <HeroButton onClick={onEdit} label={t("editRoom")}><Pencil size={17} /></HeroButton> : <span />}
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}><GlossTile emoji={room.emoji} size={96} tint={room.tint} bare /></div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginTop: 12, textShadow: "0 1px 12px rgba(0,0,0,0.25)" }}>{room.name}</div>
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
          {coupleFull ? (
            <div style={{ marginTop: 16, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{t("coupleFullHint")}</div>
          ) : (
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <div style={{ flex: 1, display: "flex" }}><Pill full kind={room.type === "couple" ? "primary" : "glass"} icon={<Share2 size={17} />} onClick={onInvite}>{t("invite")}</Pill></div>
              {room.type !== "couple" && (
                <div style={{ flex: 1, display: "flex" }}><Pill full kind="primary" icon={<Dices size={18} />} onClick={onDraw}>{t("draw")}</Pill></div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* content sheet slides over the hero with rounded corners */}
      <div style={{ position: "relative", marginTop: -28, background: C.bg, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "24px 16px 140px", boxShadow: "0 -10px 30px rgba(0,0,0,0.25)" }}>

        <Segmented options={[["lists", t("segLists")], ["mine", t("segMine")]]} value={seg} onChange={setSeg} style={{ marginBottom: 16 }} />

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
        ) : seg === "lists" ? (
          others.length === 0 ? (
            <div>
              <Empty emoji="🫂" title={t("onlyYouTitle")} sub={t("onlyYouSub")} />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Pill kind="primary" icon={<Share2 size={17} />} onClick={onInvite}>{t("inviteFriends")}</Pill>
              </div>
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
              ? <Empty emoji="👀" title={t("nothingSharedTitle")} sub={t("nothingSharedSub")} />
              : <Card style={{ padding: `0 ${LIST.pad}px` }}>
                {mine.map((w, i) => (
                  <div key={w.id} style={{ ...sepBelow(i < mine.length - 1) }}>
                    <WishRow w={w} right={<span style={{ color: C.t3, fontSize: 12.5 }}>{t("visibleToAll")}</span>} />
                  </div>
                ))}
              </Card>}
            <div style={{ marginTop: 16 }}>
              <Pill full kind="ghost" icon={<Plus size={18} />} onClick={onAddFromPool}>{t("addFromPool")}</Pill>
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          {isOwner ? (
            <button onClick={() => tgConfirm(t("confirmDelete"), onDelete)} style={{ background: "none", border: "none", height: H.sm, padding: "0 12px", cursor: "pointer", color: "#FF5A5A", fontSize: 14, fontWeight: 600, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Trash2 size={16} /> {t("deleteRoom")}
            </button>
          ) : (
            <button onClick={() => tgConfirm(t("confirmLeave"), onLeave)} style={{ background: "none", border: "none", height: H.sm, padding: "0 12px", cursor: "pointer", color: C.t2, fontSize: 14, fontWeight: 600, fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <X size={16} /> {t("leaveRoom")}
            </button>
          )}
        </div>
      </div>
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
function GiftTakenSheet({ title, onClose }) {
  const { t } = useT();
  return (
    <>
      <Sheet onClose={onClose}>
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <img src="/stickers/basket.webp" alt="" style={{ width: 168, height: "auto", display: "block", margin: "0 auto", animation: "basketDrop .7s cubic-bezier(.2,.9,.3,1.25)" }} />
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
function DrawFlow({ room, reserved, online, onReserve, onUnreserve, onInvite, onError, onClose }) {
  const { t } = useT();
  const [stage, setStage] = useState("setup");
  const [budget, setBudget] = useState("1 000 ₴");
  const [spin, setSpin] = useState("🎁");
  const [target, setTarget] = useState(null);
  const [targetWishes, setTargetWishes] = useState([]);
  const canDraw = room.members.length >= 3;

  useEffect(() => {
    if (stage !== "drawing") return;
    const pool = ["🎁", "🎲", "✨", "💝", "🎀", "🥳"];
    let i = 0;
    const iv = setInterval(() => { setSpin(pool[i++ % pool.length]); }, 110);
    (async () => {
      if (online) {
        try { await api.runDraw(room.id, budget); const d = await api.draw(room.id); setTarget(d.target); setTargetWishes(d.wishes || []); }
        catch (e) { if (onError) onError(); }
      } else {
        const tg = room.members.find(m => !m.you) || room.members[0];
        setTarget(tg); setTargetWishes(tg && tg.wishes ? tg.wishes : []);
      }
    })();
    const tm = setTimeout(() => { clearInterval(iv); setStage("reveal"); }, 1700);
    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [stage]);

  const doReserve = async (wish) => {
    await onReserve(wish);
    setTargetWishes(ws => ws.map(w => w.id === wish.id ? { ...w, reservedByMe: true } : w));
  };
  const doUnreserve = async (wid) => {
    await onUnreserve(wid);
    setTargetWishes(ws => ws.map(w => w.id === wid ? { ...w, reservedByMe: false } : w));
  };
  const isMine = (w) => w.reservedByMe || reserved[w.id] === "you";

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, zIndex: 55, overflowY: "auto", animation: "fadeUp .2s ease" }}>
      <div style={{ padding: "16px 18px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.line}`, color: C.t2, width: H.sm, height: H.sm, borderRadius: H.sm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={18} />
        </button>
      </div>

      {stage === "setup" && (
        <div style={{ padding: "20px 22px", textAlign: "center", animation: "fadeUp .3s ease" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><GlossTile emoji="🎲" size={104} tint={C.blue} /></div>
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
        <div style={{ padding: "80px 22px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ animation: "glow 1.2s ease-in-out infinite", borderRadius: 30 }}>
              <div style={{ animation: "spinEmoji .5s ease-in-out infinite" }}>
                <GlossTile emoji={spin} size={128} tint={C.blue} />
              </div>
            </div>
          </div>
          <div style={{ color: C.t1, fontSize: 20, fontWeight: 700, marginTop: 32 }}>{t("shuffling")}</div>
          <div style={{ color: C.t2, fontSize: 14, marginTop: 8 }}>{t("dealing")}</div>
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
                      ? <Pill size="sm" kind="green" icon={<Check size={16} />} onClick={() => doUnreserve(w.id)}>{t("youGift")}</Pill>
                      : <Pill size="sm" kind="soft" onClick={() => doReserve(w)}>{t("take")}<img src="/stickers/basket.webp" alt="" style={{ height: 22, width: "auto", display: "block" }} /></Pill>
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
function AddSheet({ rooms, onClose, onSave }) {
  const { t } = useT();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [emoji, setEmoji] = useState(WISH_EMOJI[0]);
  const [inRooms, setInRooms] = useState([]);
  const [images, setImages] = useState([]);
  const [link, setLink] = useState("");
  const [cover, setCover] = useState("photo");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const MAX_PHOTOS = 3;
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
    try { await onSave({ emoji, images: cover === "photo" ? images : [], image: cover === "photo" ? (images[0] || null) : null, link: link.trim() || null, title: title.trim(), price: price.trim(), rooms: inRooms }); }
    catch (e) { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: C.card, borderRadius: `${R.sheet}px ${R.sheet}px 0 0`, padding: "10px 16px 32px", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)", maxWidth: 440, width: "100%", marginInline: "auto", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.card2, margin: "6px auto 18px" }} />
        <div style={{ color: C.t1, fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{t("newWish")}</div>

        <Segmented options={[["photo", t("photo")], ["emoji", t("emojiTab")]]} value={cover} onChange={setCover} style={{ marginBottom: 16 }} />

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
              <button key={e} onClick={() => setEmoji(e)} style={{
                width: "100%", aspectRatio: "1", borderRadius: "50%", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: emoji === e ? C.blueSoft : C.card2, border: `1.5px solid ${emoji === e ? C.blue : "transparent"}`,
              }}><Sticker emoji={e} size={28} /></button>
            ))}
          </div>
        )}

        <Field label={t("whatYouWant")} value={title} onChange={setTitle} placeholder={t("whatYouWantPh")} />
        <Field label={t("priceOpt")} value={price} onChange={setPrice} placeholder="4 200 ₴" />
        <Field label={t("linkOpt")} value={link} onChange={setLink} placeholder="https://…" />

        <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, margin: "6px 0 8px" }}>{t("showInRooms")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {rooms.map(r => (
            <Chip key={r.id} active={inRooms.includes(r.id)} color={r.tint}
              onClick={() => setInRooms(x => x.includes(r.id) ? x.filter(i => i !== r.id) : [...x, r.id])}>
              <Sticker emoji={r.emoji} size={15} />{r.name}
            </Chip>
          ))}
        </div>
        <div style={{ color: C.t3, fontSize: 12.5, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}><Lock size={13} />{t("nothingSelectedPrivate")}</div>

        <Pill full kind="primary" disabled={!title.trim() || busy} onClick={submit}>
          {busy ? t("savingWish") : t("saveWish")}
        </Pill>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
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
function ProfileScreen({ wishes, rooms, reserved, onHistory, onInvites }) {
  const { t, lang, setLang } = useT();
  const me = { name: tgUserName() || t("guest"), color: "#7B61FF", photo: tgUserPhoto() };
  const gifting = Object.values(reserved || {}).filter(v => v === "you").length;
  return (
    <div style={{ animation: "fadeUp .3s ease", textAlign: "center", paddingTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "center" }}><Avatar m={me} size={92} /></div>
      <div style={{ color: C.t1, fontSize: 24, fontWeight: 800, marginTop: 16 }}>{me.name}</div>
      <div style={{ color: C.t2, fontSize: 14.5, marginTop: 4 }}>{t("statsLine", { w: wishes.length, r: rooms.length })}</div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
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
