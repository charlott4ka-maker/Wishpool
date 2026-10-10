import express from "express";
import cors from "cors";
import { getStore } from "./store.js";
import { authMiddleware } from "./auth.js";
import { uid, cleanImages, pubUser, cleanEvent, cleanNote } from "./util.js";
import { botRoute, ensureWebhook, ensureBotMenu, remindRoute, telegramBirthdate, notifyWishShared, notifyGiftPicked } from "./bot.js";
import { previewLink, probe } from "./preview.js";
import { storageOn, storeImages, dropImages } from "./storage.js";

export async function createApp() {
  const BOT_TOKEN = process.env.BOT_TOKEN || "";
  const store = await getStore();

  const app = express();
  app.set("etag", false);
  app.use(cors());
  app.use(express.json({ limit: "6mb" }));

  // Photos stored inline (data: URLs) are served as separate, long-cached URLs
  // instead of being inlined into every JSON response: lists stay tiny and the
  // phone/CDN download each photo only once. Wish photos never change after
  // creation, so the URL can be cached forever.
  const imgUrls = (w, list) => list.map((x, i) => x.startsWith("data:") ? `/api/img/${w.id}/${i}` : x);
  const pubWish = (w) => {
    const images = imgUrls(w, w.images && w.images.length ? w.images : (w.image ? [w.image] : []));
    return { id: w.id, emoji: w.emoji, image: images[0] || null, images, link: w.link, title: w.title, price: w.price, note: w.note || "", giftedAt: w.giftedAt || null };
  };
  // What a gifter sees on someone else's wish: solo reservation, or a group
  // chip-in ("chips": who's in, out of `total` possible gifters in the room).
  const withReservations = (ws, me, total) => Promise.all(ws.map(async w => {
    const [g, ch] = await Promise.all([store.getReservation(w.id), store.chips(w.id)]);
    return {
      ...pubWish(w), reservedByMe: g === me, taken: !!g && g !== me,
      chips: ch.length ? { count: ch.length, mine: ch.includes(me), total: Math.max(total || 0, ch.length) } : null,
    };
  }));
  const roomOut = (r, me) => ({
    id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint, eventTitle: r.eventTitle || "", eventDate: r.eventDate || "",
    bdayMode: r.bdayMode || "", celebrantName: r.celebrantName || "",
    // who the birthday person is, as far as this viewer needs to know
    iAmCelebrant: !!me && r.celebrantId === me, hasCelebrant: !!r.celebrantId, celebrantId: r.celebrantId || null,
  });
  const cleanName = (x) => typeof x === "string" ? x.trim().slice(0, 40) : "";

  // Public: <img> tags can't send the initData header. Wish ids are random.
  app.get("/api/img/:wid/:i", async (req, res, next) => {
    try {
      const w = await store.getWish(req.params.wid);
      const list = w ? (w.images && w.images.length ? w.images : (w.image ? [w.image] : [])) : [];
      const src = list[Number(req.params.i)];
      const m = typeof src === "string" && src.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.*)$/s);
      if (!m) return res.status(404).end();
      res.set("Content-Type", m[1]);
      res.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
      res.send(Buffer.from(m[2], "base64"));
    } catch (e) { next(e); }
  });

  // Bot webhook (Telegram -> us): before the initData auth, it has its own secret.
  // Wishes sent to the bot: a product link (filled in like the add form does),
  // a photo with its caption, or just a name. They land in the private pool.
  app.post("/api/tg-webhook", botRoute(BOT_TOKEN, {
    async addWish(from, { text, url, image, fallbackTitle }) {
      const owner = { id: String(from.id), name: from.first_name || "User", lang: from.language_code };
      await store.ensureBotUser(owner);
      let title = text, price = "", images = image ? [image] : [], guess = false;
      if (url) {
        try {
          const p = await previewLink(url);
          if (!title) { title = p.title; guess = !!p.guess; }
          price = p.price || "";
          if (p.image && !images.length) images = [p.image];
        } catch (e) { console.error("bot preview failed", e.message); }
      }
      title = (title || "").slice(0, 120) || fallbackTitle;
      const id = uid("w");
      images = cleanImages(images);
      if (storageOn() && images.length) { try { images = await storeImages(images, `w/${id}`); } catch (e) { console.error("r2 upload failed", e.message); } }
      await store.createWish({ id, ownerId: owner.id, emoji: "stk:bag", image: images[0] || null, images, link: url, title, price, note: "", createdAt: Date.now() });
      return { id, title, price, guess };
    },
    async undoWish(userId, wishId) {
      const w = await store.getWish(wishId);
      if (!w || w.ownerId !== userId) return false;
      await store.deleteWish(w.id);
      await dropImages(w.images && w.images.length ? w.images : [w.image]);
      return true;
    },
  }));
  // One-off move of photos that still live inline in the database into R2.
  // Sticker packs through the bot (for picking mascot stickers), admin only:
  // /api/admin/stickerset?key=..&name=UtyaDuck -> list; /api/admin/stickerfile?key=..&id=<file_id> -> the file
  app.get("/api/admin/stickerset", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.query.key !== secret) return res.status(401).json({ error: "bad_key" });
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(String(req.query.name || ""))}`).then(x => x.json()).catch(e => ({ error: e.message }));
    if (!r || !r.ok) return res.json(r);
    res.json({ title: r.result.title, type: r.result.sticker_type, stickers: r.result.stickers.map((x, i) => ({ i, emoji: x.emoji, animated: x.is_animated, video: x.is_video, id: x.file_id })) });
  });
  app.get("/api/admin/stickerfile", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.query.key !== secret) return res.status(401).json({ error: "bad_key" });
    const f = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(String(req.query.id || ""))}`).then(x => x.json()).catch(() => null);
    if (!f || !f.ok) return res.status(404).json({ error: "no_file" });
    const r = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${f.result.file_path}`);
    res.set("Content-Type", "application/octet-stream").send(Buffer.from(await r.arrayBuffer()));
  });
  // Link import check for a shop: /api/admin/preview?key=<CRON_SECRET>&url=<product url>
  app.get("/api/admin/preview", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.query.key !== secret) return res.status(401).json({ error: "bad_key" });
    if (req.query.probe) return res.json(await probe(String(req.query.url || "")).catch(e => ({ error: e.message })));
    const t0 = Date.now(), trace = [];
    try {
      const p = await previewLink(String(req.query.url || ""), trace);
      res.json({ ms: Date.now() - t0, title: p.title, price: p.price, image: p.image ? p.image.slice(0, 40) + "… " + p.image.length : null, trace });
    } catch (e) { res.json({ ms: Date.now() - t0, error: e.message, trace }); }
  });
  // Open /api/admin/move-photos?key=<CRON_SECRET> a few times until "left": 0.
  app.get("/api/admin/move-photos", async (req, res, next) => {
    try {
      const secret = process.env.CRON_SECRET;
      if (!secret || req.query.key !== secret) return res.status(401).json({ error: "bad_key" });
      if (!storageOn()) return res.status(400).json({ error: "r2_not_configured" });
      const batch = await store.wishesWithInlineImages(20);
      let moved = 0;
      for (const w of batch) {
        const list = w.images && w.images.length ? w.images : (w.image ? [w.image] : []);
        const next = await storeImages(list, `w/${w.id}`);
        await store.setWishImages(w.id, next);
        moved++;
      }
      res.json({ moved, left: (await store.wishesWithInlineImages(1000)).length });
    } catch (e) { next(e); }
  });
  // Daily Vercel cron: event reminders (a week and a day before).
  app.get("/api/cron/remind", remindRoute(BOT_TOKEN, store));
  await Promise.all([ensureWebhook(BOT_TOKEN), ensureBotMenu(BOT_TOKEN)]);

  const api = express.Router();
  // API responses must never be conditionally cached (304) — each call needs a fresh body.
  api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  api.use(authMiddleware(BOT_TOKEN));
  api.use(async (req, _res, next) => { try { await store.ensureUser(req.user); next(); } catch (e) { next(e); } });

  api.get("/me", async (req, res) => res.json({ user: await store.getUser(req.user.id) }));
  // Own birthday in the profile (YYYY-MM-DD, or null to clear).
  api.put("/me/birthday", async (req, res) => {
    const b = req.body && req.body.birthday;
    if (b != null && !(typeof b === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b))) return res.status(400).json({ error: "bad_date" });
    await store.setBirthday(req.user.id, b || null);
    res.json({ birthday: b || null });
  });
  api.get("/me/birthday", async (req, res) => res.json({ birthday: await telegramBirthdate(BOT_TOKEN, req.user.id) }));

  api.get("/state", async (req, res) => {
    const me = req.user.id;
    // Independent lookups run in parallel instead of one round trip after another.
    const [raw, roomIds, meUser] = await Promise.all([store.userWishes(me), store.userRoomIds(me), store.getUser(me)]);
    const [wishes, rooms] = await Promise.all([
      Promise.all(raw.map(async w => ({ ...pubWish(w), rooms: await store.wishRoomIds(w.id) }))),
      Promise.all(roomIds.map(async id => {
        const [r, members, shared] = await Promise.all([store.getRoom(id), store.roomMembers(id), store.wishesSharedTo(me, id)]);
        return r && {
          ...roomOut(r, me),
          members: members.map(u => pubUser(u, me)),
          sharedCount: shared.length,
        };
      })),
    ]);
    res.json({ me: meUser, wishes, rooms: rooms.filter(Boolean) });
  });

  api.post("/wishes", async (req, res) => {
    const { emoji, image, images: rawImages, link, title, price, note, rooms = [] } = req.body || {};
    let images = cleanImages(rawImages && rawImages.length ? rawImages : (image ? [image] : []));
    if (!title) return res.status(400).json({ error: "title_required" });
    const id = uid("w");
    // Photos go to R2 when it's configured; if the upload fails they stay inline, so nothing is lost.
    if (storageOn() && images.length) {
      try { images = await storeImages(images, `w/${id}`); } catch (e) { console.error("r2 upload failed", e.message); }
    }
    const w = { id, ownerId: req.user.id, emoji: emoji || "🎁", image: images[0] || null, images, link: link || null, title, price: price || "", note: cleanNote(note), createdAt: Date.now() };
    await store.createWish(w);
    for (const rid of rooms) if (await store.isMember(rid, req.user.id)) await store.addWishRoom(w.id, rid);
    const shared = await store.wishRoomIds(w.id);
    await Promise.all(shared.map(rid => notifyWishShared(BOT_TOKEN, store, req.user, w, rid)));
    res.json({ wish: { ...pubWish(w), rooms: shared } });
  });

  // Edit a wish. Photos it already had come back as their public URLs (or as
  // /api/img/<id>/<i> for ones still stored inline) and are kept as they are.
  api.patch("/wishes/:id", async (req, res) => {
    const old = await store.getWish(req.params.id);
    if (!old || old.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    const { emoji, images: rawImages, link, title, price, note } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "title_required" });
    const oldImgs = old.images && old.images.length ? old.images : (old.image ? [old.image] : []);
    const back = (x) => { const m = typeof x === "string" && x.match(new RegExp(`^/api/img/${old.id}/(\\d+)$`)); return m ? oldImgs[Number(m[1])] : x; };
    let images = (Array.isArray(rawImages) ? rawImages.map(back) : []).filter(x => typeof x === "string" && (x.startsWith("data:image/") || /^https:\/\//.test(x)));
    images = cleanImages(images);
    if (storageOn() && images.length) {
      try { images = await storeImages(images, `w/${old.id}`); } catch (e) { console.error("r2 upload failed", e.message); }
    }
    const w = { emoji: emoji || old.emoji, image: images[0] || null, images, link: link || null, title: String(title).trim(), price: price || "", note: cleanNote(note) };
    await store.updateWish(old.id, w);
    await dropImages(oldImgs.filter(x => !images.includes(x)));
    const fresh = await store.getWish(old.id);
    res.json({ wish: { ...pubWish(fresh), rooms: await store.wishRoomIds(old.id) } });
  });
  // "Got it": the wish leaves every room and moves to the "Gifted" archive (and back).
  api.post("/wishes/:id/gifted", async (req, res) => {
    const w = await store.getWish(req.params.id);
    if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    const at = req.body && req.body.gifted ? Date.now() : null;
    await store.setGifted(w.id, at);
    res.json({ giftedAt: at });
  });

  api.delete("/wishes/:id", async (req, res) => {
    const w = await store.getWish(req.params.id);
    if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    await store.deleteWish(w.id);
    await dropImages(w.images && w.images.length ? w.images : [w.image]);
    res.json({ ok: true });
  });

  api.post("/wishes/:id/room", async (req, res) => {
    const w = await store.getWish(req.params.id);
    const { roomId } = req.body || {};
    if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    if (!(await store.isMember(roomId, req.user.id))) return res.status(403).json({ error: "not_member" });
    const roomsNow = await store.toggleWishRoom(w.id, roomId);
    if (roomsNow.includes(roomId) && !w.giftedAt) await notifyWishShared(BOT_TOKEN, store, req.user, w, roomId);
    res.json({ rooms: roomsNow });
  });

  api.post("/rooms", async (req, res) => {
    const { name, type, emoji, tint, eventTitle, eventDate, bdayMode, celebrantName } = req.body || {};
    const t = ["friends", "couple", "birthday"].includes(type) ? type : "friends";
    const mode = t === "birthday" ? (bdayMode === "other" ? "other" : "self") : "";
    const r = {
      id: uid("r"), name: name || "Room", type: t, emoji: emoji || "🎁", tint: tint || "#2E7DF6", ownerId: req.user.id, createdAt: Date.now(),
      // only birthday rooms carry a date now
      ...(t === "birthday" ? cleanEvent(eventTitle, eventDate) : {}),
      bdayMode: mode, celebrantName: mode === "other" ? cleanName(celebrantName) : (mode === "self" ? cleanName(req.user.name) : ""),
      celebrantId: mode === "self" ? req.user.id : null,
    };
    await store.createRoom(r);
    await store.addMember(r.id, req.user.id);
    res.json({ room: { id: r.id } });
  });

  api.patch("/rooms/:id", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    if (r.ownerId !== req.user.id) return res.status(403).json({ error: "not_owner" });
    const body = req.body || {};
    const { name, emoji, tint } = body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name_required" });
    const okTint = typeof tint === "string" && /^#[0-9a-fA-F]{6}$/.test(tint) ? tint : r.tint;
    // event fields are optional; sending them (even empty) sets/clears the event
    const ev = r.type === "birthday" && ("eventTitle" in body || "eventDate" in body) ? cleanEvent(body.eventTitle, body.eventDate) : {};
    await store.updateRoom(r.id, { name: name.trim(), emoji: emoji || r.emoji, tint: okTint, ...ev });
    if (r.type === "birthday" && r.bdayMode === "other" && "celebrantName" in body) await store.setCelebrantName(r.id, cleanName(body.celebrantName));
    res.json({ ok: true });
  });

  api.post("/rooms/:id/join", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r) return res.status(404).json({ error: "room_not_found" });
    const already = await store.isMember(r.id, req.user.id);
    if (!already && r.type === "couple" && (await store.roomMembers(r.id)).length >= 2) {
      return res.status(403).json({ error: "room_full" });
    }
    await store.addMember(r.id, req.user.id);
    // Surprise birthday room: the person it's for can say so on the way in.
    // They then only see their own wishes, never the ideas or who gifts what.
    if (r.type === "birthday" && r.bdayMode === "other" && req.body && req.body.asCelebrant && !r.celebrantId) {
      await store.setCelebrant(r.id, req.user.id);
    }
    const inviterId = req.body && req.body.inviterId;
    if (inviterId && inviterId !== req.user.id && await store.isMember(r.id, inviterId)) {
      await store.recordInvite(r.id, inviterId, req.user.id);
    }
    res.json({ room: { id: r.id } });
  });

  api.post("/rooms/:id/leave", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, req.user.id))) return res.status(404).json({ error: "not_found" });
    if (r.ownerId === req.user.id) return res.status(403).json({ error: "owner_cannot_leave" });
    await store.removeMember(r.id, req.user.id);
    await store.removeUserSharesInRoom(r.id, req.user.id);
    res.json({ ok: true });
  });

  api.delete("/rooms/:id", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    if (r.ownerId !== req.user.id) return res.status(403).json({ error: "not_owner" });
    await store.deleteRoom(r.id);
    res.json({ ok: true });
  });

  api.get("/invites", async (req, res) => {
    const rows = await store.listInvites(req.user.id);
    res.json({ invites: rows.map(x => ({
      room: { id: x.room_id, name: x.rname, emoji: x.emoji, tint: x.tint },
      invitee: { id: x.invitee_id, name: x.uname, color: x.ucolor, photo: x.uphoto || null },
    })) });
  });

  // What someone opening an invite link sees before joining (no wishes).
  api.get("/rooms/:id/peek", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r) return res.status(404).json({ error: "room_not_found" });
    res.json({ room: { ...roomOut(r, req.user.id), member: await store.isMember(r.id, req.user.id), memberCount: (await store.roomMembers(r.id)).length } });
  });

  // Room owner: "this isn't the birthday person" (or set someone as them).
  api.post("/rooms/:id/celebrant", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r || r.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    if (r.type !== "birthday" || r.bdayMode !== "other") return res.status(400).json({ error: "not_surprise" });
    const uidNew = req.body && req.body.userId;
    if (uidNew && !(await store.isMember(r.id, uidNew))) return res.status(400).json({ error: "not_member" });
    await store.setCelebrant(r.id, uidNew || null);
    res.json({ ok: true });
  });

  // Gift ideas added inside a birthday room: they live only in the room,
  // never in anyone's pool, and the birthday person never sees them.
  api.post("/rooms/:id/ideas", async (req, res) => {
    const me = req.user.id;
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, me))) return res.status(404).json({ error: "not_found" });
    if (r.type !== "birthday") return res.status(400).json({ error: "not_birthday" });
    if (r.celebrantId === me) return res.status(403).json({ error: "celebrant" });
    const { emoji, images: rawImages, link, title, price, note } = req.body || {};
    if (!title) return res.status(400).json({ error: "title_required" });
    const id = uid("w");
    let images = cleanImages(rawImages || []);
    if (storageOn() && images.length) { try { images = await storeImages(images, `w/${id}`); } catch (e) { console.error("r2 upload failed", e.message); } }
    const w = { id, ownerId: me, emoji: emoji || "🎁", image: images[0] || null, images, link: link || null, title, price: price || "", note: cleanNote(note), createdAt: Date.now(), roomOnly: r.id };
    await store.createWish(w);
    await store.addWishRoom(w.id, r.id);
    res.json({ ok: true, id });
  });
  api.delete("/rooms/:id/ideas/:wid", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    const w = await store.getWish(req.params.wid);
    if (!r || !w || w.roomOnly !== r.id || (w.ownerId !== req.user.id && r.ownerId !== req.user.id)) return res.status(404).json({ error: "not_found" });
    await store.deleteWish(w.id);
    await dropImages(w.images && w.images.length ? w.images : [w.image]);
    res.json({ ok: true });
  });

  api.get("/rooms/:id", async (req, res) => {
    const me = req.user.id;
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, me))) return res.status(404).json({ error: "not_found" });
    const members = await store.roomMembers(r.id);
    if (r.type === "birthday") {
      const head = { room: { ...roomOut(r, me), owner: r.ownerId === me }, members: members.map(u => pubUser(u, me)) };
      // The birthday person: just their own shared wishes, nothing about gifts.
      if (r.celebrantId === me) return res.json({ ...head, lists: [], ideas: [], mine: (await store.wishesSharedTo(me, r.id)).map(pubWish) });
      // Guests: the birthday person's wishes (if they're in) + everyone's ideas.
      const gifters = Math.max(1, members.length - (r.celebrantId ? 1 : 0));
      const cel = r.celebrantId && members.find(u => u.id === r.celebrantId);
      const [celWishes, ideasRaw] = await Promise.all([
        cel ? withReservations(await store.wishesSharedTo(cel.id, r.id), me, gifters) : [],
        store.roomIdeas(r.id),
      ]);
      const byId = Object.fromEntries(members.map(u => [u.id, u]));
      const ideas = (await withReservations(ideasRaw, me, gifters)).map((w, i) => ({ ...w, by: byId[ideasRaw[i].ownerId] ? pubUser(byId[ideasRaw[i].ownerId], me) : null, mineIdea: ideasRaw[i].ownerId === me }));
      return res.json({ ...head, lists: cel ? [{ member: pubUser(cel), wishes: celWishes }] : [], ideas, mine: [] });
    }
    const gifters = members.length - 1; // everyone but the wish owner
    const [lists, mineRaw] = await Promise.all([
      Promise.all(members.filter(x => x.id !== me).map(async u => ({ member: pubUser(u), wishes: await withReservations(await store.wishesSharedTo(u.id, r.id), me, gifters) }))),
      store.wishesSharedTo(me, r.id),
    ]);
    const mine = mineRaw.map(pubWish); // owner sees no reservations (surprise-safe)
    res.json({
      room: { ...roomOut(r, me), owner: r.ownerId === me },
      members: members.map(u => pubUser(u, me)),
      lists, mine,
    });
  });

  api.post("/wishes/:id/reserve", async (req, res) => {
    const w = await store.getWish(req.params.id);
    if (!w) return res.status(404).json({ error: "not_found" });
    if (w.ownerId === req.user.id && !w.roomOnly) return res.status(403).json({ error: "own_wish" });
    const cur = await store.getReservation(w.id);
    if (cur && cur !== req.user.id) return res.status(409).json({ error: "taken" });
    if ((await store.chips(w.id)).length) return res.status(409).json({ error: "chipping" });
    await store.setReservation(w.id, req.user.id);
    await notifyGiftPicked(BOT_TOKEN, store, w, req.user.id);
    res.json({ ok: true });
  });

  // Chip in together on a wish (instead of one person taking it). Only people
  // who share a room with the wish can join; the owner never sees any of this.
  api.post("/wishes/:id/chip", async (req, res) => {
    const me = req.user.id;
    const w = await store.getWish(req.params.id);
    if (!w) return res.status(404).json({ error: "not_found" });
    if (w.ownerId === me && !w.roomOnly) return res.status(403).json({ error: "own_wish" });
    const roomIds = await store.wishRoomIds(w.id);
    const ok = (await Promise.all(roomIds.map(rid => store.isMember(rid, me)))).some(Boolean);
    if (!ok) return res.status(403).json({ error: "not_member" });
    const cur = await store.getReservation(w.id);
    if (cur && cur !== me) return res.status(409).json({ error: "taken" });
    if (cur === me) await store.clearReservation(w.id, me); // turning my solo gift into a group one
    await store.addChip(w.id, me);
    await notifyGiftPicked(BOT_TOKEN, store, w, me);
    res.json({ ok: true });
  });
  api.delete("/wishes/:id/chip", async (req, res) => {
    await store.removeChip(req.params.id, req.user.id);
    res.json({ ok: true });
  });

  // Product link -> { title, price, image } for the add-wish form.
  api.get("/preview", async (req, res) => {
    try { res.json(await previewLink(String(req.query.url || ""))); }
    catch (e) { res.status(422).json({ error: e.message || "preview_failed" }); }
  });

  api.delete("/wishes/:id/reserve", async (req, res) => {
    await store.clearReservation(req.params.id, req.user.id);
    res.json({ ok: true });
  });

  api.post("/rooms/:id/draw", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, req.user.id))) return res.status(404).json({ error: "not_found" });
    const ids = (await store.roomMembers(r.id)).map(u => u.id);
    if (ids.length < 3) return res.status(400).json({ error: "need_three" });
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const map = {};
    shuffled.forEach((id, i) => { map[id] = shuffled[(i + 1) % shuffled.length]; });
    await store.setDraw(r.id, map, (req.body && req.body.budget) || null);
    res.json({ ok: true });
  });

  api.get("/gifts", async (req, res) => {
    const rows = await store.giftsByMe(req.user.id);
    res.json({ gifts: rows.map(({ wish, owner }) => ({ ...pubWish(wish), owner: owner ? pubUser(owner) : null })) });
  });

  api.get("/rooms/:id/draw", async (req, res) => {
    const me = req.user.id;
    const draw = await store.getDraw(req.params.id);
    if (!draw || !draw.assignments[me]) return res.json({ target: null });
    const u = await store.getUser(draw.assignments[me]);
    const wishes = await withReservations(await store.wishesSharedTo(u.id, req.params.id), me, (await store.roomMembers(req.params.id)).length - 1);
    res.json({ budget: draw.budget, target: pubUser(u), wishes });
  });

  app.use("/api", api);

  return app;
}
