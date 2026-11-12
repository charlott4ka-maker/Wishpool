import { putObject, storageOn } from "./storage.js";
import { FOLDER_SKINS } from "./util.js";

// What the admin page (web/public/admin) changes without a new app build:
//   strings   text overrides by string key: { key: { uk, ru, en } }
//   banners   strips shown on the Wishes tab: who sees them, text, colours, what a tap does
//   stickers  { hidden: [name], extra: [{ name }] } — hidden ones leave the picker
//             (old wishes still show them), extra ones are uploaded to the bucket
//             as stickers/<name>.webp and served at /stickers/<name>.webp
// GET /api/config is public and cached for a minute; the admin routes sit behind
// the normal sign-in and an admin check.

const KEY_RE = /^[A-Za-z0-9_]{1,60}$/;
const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const LANGS = ["uk", "ru", "en"];

const day = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
// a schedule check for the public config: a day of slack each side, since people
// live in other time zones; the app checks the exact day on the phone
export function inWindow(x, now = Date.now()) {
  const lo = new Date(now - 86400000).toISOString().slice(0, 10), hi = new Date(now + 86400000).toISOString().slice(0, 10);
  return !(x.from && x.from > hi) && !(x.until && x.until < lo);
}

const text = (v, max) => Object.fromEntries(LANGS.map(l => [l, typeof v?.[l] === "string" ? v[l].slice(0, max) : ""]));

export function cleanStrings(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("bad_strings");
  const out = {};
  for (const [k, row] of Object.entries(v).slice(0, 2000)) {
    if (!KEY_RE.test(k)) continue;
    const t = text(row, 2000);
    if (LANGS.some(l => t[l])) out[k] = Object.fromEntries(LANGS.filter(l => t[l]).map(l => [l, t[l]]));
  }
  return out;
}

export function cleanBanners(v) {
  if (!Array.isArray(v)) throw new Error("bad_banners");
  return v.slice(0, 10).map((b, i) => ({
    id: typeof b?.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : `b${Date.now().toString(36)}${i}`,
    active: !!b?.active,
    audience: ["all", "signedIn", "guest"].includes(b?.audience) ? b.audience : "signedIn",
    text: text(b?.text, 200),
    color1: HEX_RE.test(b?.color1) ? b.color1 : "#047DFB",
    color2: HEX_RE.test(b?.color2) ? b.color2 : (HEX_RE.test(b?.color1) ? b.color1 : "#2290F6"),
    textColor: HEX_RE.test(b?.textColor) ? b.textColor : "#FFFFFF",
    sticker: typeof b?.sticker === "string" && /^stk:[a-z0-9_-]{1,40}$/.test(b.sticker) ? b.sticker : "",
    action: ["none", "link", "signin", "santa"].includes(b?.action) ? b.action : "none",
    url: typeof b?.url === "string" && /^https:\/\/\S{1,500}$/.test(b.url) ? b.url : "",
    dismissible: b?.dismissible !== false,
    // a schedule: shown from / until these days (inclusive), empty = no limit
    from: day(b?.from),
    until: day(b?.until),
  }));
}

export function cleanStickers(v) {
  const names = (a) => [...new Set((Array.isArray(a) ? a : []).map(x => (typeof x === "string" ? x : x?.name)).filter(n => typeof n === "string" && NAME_RE.test(n)))];
  // packOrder: the sticker packs (classic, newyear, party...) in the order the pickers show them
  const ids = [...new Set((Array.isArray(v?.packOrder) ? v.packOrder : []).filter(id => typeof id === "string" && /^[a-z0-9_-]{1,40}$/.test(id)))].slice(0, 30);
  // order: inside each pack, the stickers' own order
  const order = {};
  for (const [k, list] of Object.entries(v?.order && typeof v.order === "object" ? v.order : {}).slice(0, 30))
    if (/^[a-z0-9_-]{1,40}$/.test(k)) order[k] = names(list).slice(0, 200);
  return { hidden: names(v?.hidden).slice(0, 200), extra: names(v?.extra).slice(0, 200).map(name => ({ name })), packOrder: ids, order };
}

// premium folders: the order they show in, and any taken out of the picker
export function cleanFolders(v) {
  const ids = (a) => [...new Set((Array.isArray(a) ? a : []).filter(id => FOLDER_SKINS.includes(id)))];
  return { order: ids(v?.order), hidden: ids(v?.hidden) };
}

// seasonal things in the app, switched on and off on the admin page
export function cleanSeason(v) {
  return { newYear: v?.newYear !== false };
}

// in-app notifications (Profile › bell), made on the admin page: a list row
// (icon, title, a line) and a page (an optional banner picture, text, bullet
// lists, info plates, a button)
export const NEWS_ICONS = ["bell", "gift", "sparkles", "snowflake", "star", "heart", "info", "megaphone", "crown", "calendar", "palette", "users"];
export const NEWS_ACTIONS = ["none", "link", "santa", "newRoom", "newWish", "signin", "premium"];
const L3 = (v, max) => Object.fromEntries(["uk", "ru", "en"].map((l) => [l, typeof v?.[l] === "string" ? v[l].slice(0, max) : ""]));
export function cleanNews(v) {
  if (!Array.isArray(v)) throw new Error("bad_news");
  return v.slice(0, 60).map((n) => ({
    id: typeof n?.id === "string" && /^[a-z0-9_-]{1,40}$/i.test(n.id) ? n.id : "n" + Math.random().toString(36).slice(2, 10),
    active: !!n?.active,
    audience: ["all", "signedIn", "guest"].includes(n?.audience) ? n.audience : "all",
    date: typeof n?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(n.date) ? n.date : new Date().toISOString().slice(0, 10),
    // the date is also when it goes out; until: the last day it's in the list (empty = always)
    until: day(n?.until),
    icon: NEWS_ICONS.includes(n?.icon) ? n.icon : "bell",
    color: typeof n?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(n.color) ? n.color : "#0A82F9",
    title: L3(n?.title, 80),
    sub: L3(n?.sub, 140),
    image: typeof n?.image === "string" && /^https:\/\//.test(n.image) ? n.image.slice(0, 400) : "",
    blocks: (Array.isArray(n?.blocks) ? n.blocks : []).slice(0, 12).map((b) => ({
      type: ["text", "list", "info"].includes(b?.type) ? b.type : "text",
      text: L3(b?.text, 1500),
    })),
    button: {
      label: L3(n?.button?.label, 40),
      action: NEWS_ACTIONS.includes(n?.button?.action) ? n.button.action : "none",
      url: typeof n?.button?.url === "string" && /^https?:\/\//.test(n.button.url) ? n.button.url.slice(0, 400) : "",
    },
  }));
}

// feature switches (mobile/src/lib/flags.ts lists them): on/off and the share of
// people who get it (0-100, picked by a stable hash of the account or phone)
export function cleanFlags(v) {
  const out = {};
  for (const [k, f] of Object.entries(v && typeof v === "object" && !Array.isArray(v) ? v : {}).slice(0, 60)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(k)) continue;
    const p = Math.round(Number(f?.percent));
    out[k] = { on: !!f?.on, percent: isFinite(p) ? Math.min(100, Math.max(0, p)) : 100 };
  }
  return out;
}

const CLEAN = { flags: cleanFlags, strings: cleanStrings, banners: cleanBanners, stickers: cleanStickers, folders: cleanFolders, season: cleanSeason, news: cleanNews };
const EMPTY = { flags: {}, strings: {}, banners: [], stickers: { hidden: [], extra: [] }, folders: { order: [], hidden: [] }, season: { newYear: true }, news: [] };

/** GET /api/config: what the app reads on start (only active banners). */
export function publicConfigRoute(store) {
  return async (_req, res, next) => {
    try {
      const c = { ...EMPTY, ...(await store.getConfig()) };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
      res.json({ strings: c.strings, banners: c.banners.filter(b => b.active && inWindow(b)), stickers: c.stickers, folders: c.folders, season: cleanSeason(c.season), flags: c.flags || {}, news: (c.news || []).filter(n => n.active && inWindow({ from: n.date, until: n.until })) });
    } catch (e) { next(e); }
  };
}

/** Admin routes on the signed-in API router; `isAdmin(req)` decides who gets in. */
export function adminConfigRoutes(api, store, isAdmin) {
  const guard = async (req, res, next) => {
    try { if (await isAdmin(req)) return next(); res.status(403).json({ error: "not_admin" }); } catch (e) { next(e); }
  };
  api.get("/admin/config", guard, async (_req, res) => res.json({ ...EMPTY, ...(await store.getConfig()), storage: storageOn() }));
  api.put("/admin/config/:key", guard, async (req, res) => {
    const clean = CLEAN[req.params.key];
    if (!clean) return res.status(404).json({ error: "unknown_key" });
    let value;
    try { value = clean(req.body && req.body.value); } catch (e) { return res.status(400).json({ error: e.message }); }
    await store.setConfig(req.params.key, value);
    res.json({ value });
  });
  // a banner picture for a notification: a WebP made on the admin page, at news/<random>.webp
  api.post("/admin/news-image", guard, async (req, res, next) => {
    try {
      const m = typeof req.body?.image === "string" && req.body.image.match(/^data:image\/webp;base64,(.+)$/s);
      if (!m) return res.status(400).json({ error: "webp_only" });
      const buf = Buffer.from(m[1], "base64");
      if (buf.length > 900 * 1024) return res.status(400).json({ error: "too_big" });
      if (!storageOn()) return res.status(400).json({ error: "storage_off" });
      const url = await putObject(`news/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.webp`, buf, "image/webp");
      res.json({ url });
    } catch (e) { next(e); }
  });
  // a new sticker: a WebP (the admin page converts and resizes it) at stickers/<name>.webp
  api.post("/admin/sticker", guard, async (req, res, next) => {
    try {
      const { name, image } = req.body || {};
      if (typeof name !== "string" || !NAME_RE.test(name)) return res.status(400).json({ error: "bad_name" });
      const m = typeof image === "string" && image.match(/^data:image\/webp;base64,(.+)$/s);
      if (!m) return res.status(400).json({ error: "webp_only" });
      const buf = Buffer.from(m[1], "base64");
      if (buf.length > 600 * 1024) return res.status(400).json({ error: "too_big" });
      if (!storageOn()) return res.status(400).json({ error: "storage_off" });
      const cur = cleanStickers((await store.getConfig()).stickers);
      if (cur.extra.some(s => s.name === name)) return res.status(409).json({ error: "name_taken" });
      await putObject(`stickers/${name}.webp`, buf, "image/webp");
      const next = { ...cur, extra: [...cur.extra, { name }] };
      await store.setConfig("stickers", next);
      res.json({ value: next });
    } catch (e) { next(e); }
  });
}
