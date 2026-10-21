import { putObject, storageOn } from "./storage.js";

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
    action: ["none", "link", "signin"].includes(b?.action) ? b.action : "none",
    url: typeof b?.url === "string" && /^https:\/\/\S{1,500}$/.test(b.url) ? b.url : "",
    dismissible: b?.dismissible !== false,
  }));
}

export function cleanStickers(v) {
  const names = (a) => [...new Set((Array.isArray(a) ? a : []).map(x => (typeof x === "string" ? x : x?.name)).filter(n => typeof n === "string" && NAME_RE.test(n)))];
  return { hidden: names(v?.hidden).slice(0, 200), extra: names(v?.extra).slice(0, 200).map(name => ({ name })) };
}

const CLEAN = { strings: cleanStrings, banners: cleanBanners, stickers: cleanStickers };
const EMPTY = { strings: {}, banners: [], stickers: { hidden: [], extra: [] } };

/** GET /api/config: what the app reads on start (only active banners). */
export function publicConfigRoute(store) {
  return async (_req, res, next) => {
    try {
      const c = { ...EMPTY, ...(await store.getConfig()) };
      res.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
      res.json({ strings: c.strings, banners: c.banners.filter(b => b.active), stickers: c.stickers });
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
