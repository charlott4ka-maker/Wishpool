import express from "express";
import cors from "cors";
import { getStore } from "./store.js";
import { authMiddleware } from "./auth.js";
import { uid, cleanImages, pubUser } from "./util.js";
import { botRoute, ensureWebhook } from "./bot.js";

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
    return { id: w.id, emoji: w.emoji, image: images[0] || null, images, link: w.link, title: w.title, price: w.price };
  };
  const withReservations = (ws, me) => Promise.all(ws.map(async w => {
    const g = await store.getReservation(w.id);
    return { ...pubWish(w), reservedByMe: g === me, taken: !!g && g !== me };
  }));

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
  app.post("/api/tg-webhook", botRoute(BOT_TOKEN));
  await ensureWebhook(BOT_TOKEN);

  const api = express.Router();
  // API responses must never be conditionally cached (304) — each call needs a fresh body.
  api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  api.use(authMiddleware(BOT_TOKEN));
  api.use(async (req, _res, next) => { try { await store.ensureUser(req.user); next(); } catch (e) { next(e); } });

  api.get("/me", async (req, res) => res.json({ user: await store.getUser(req.user.id) }));

  api.get("/state", async (req, res) => {
    const me = req.user.id;
    // Independent lookups run in parallel instead of one round trip after another.
    const [raw, roomIds, meUser] = await Promise.all([store.userWishes(me), store.userRoomIds(me), store.getUser(me)]);
    const [wishes, rooms] = await Promise.all([
      Promise.all(raw.map(async w => ({ ...pubWish(w), rooms: await store.wishRoomIds(w.id) }))),
      Promise.all(roomIds.map(async id => {
        const [r, members, shared] = await Promise.all([store.getRoom(id), store.roomMembers(id), store.wishesSharedTo(me, id)]);
        return r && {
          id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint,
          members: members.map(u => pubUser(u, me)),
          sharedCount: shared.length,
        };
      })),
    ]);
    res.json({ me: meUser, wishes, rooms: rooms.filter(Boolean) });
  });

  api.post("/wishes", async (req, res) => {
    const { emoji, image, images: rawImages, link, title, price, rooms = [] } = req.body || {};
    const images = cleanImages(rawImages && rawImages.length ? rawImages : (image ? [image] : []));
    if (!title) return res.status(400).json({ error: "title_required" });
    const w = { id: uid("w"), ownerId: req.user.id, emoji: emoji || "🎁", image: images[0] || null, images, link: link || null, title, price: price || "", createdAt: Date.now() };
    await store.createWish(w);
    for (const rid of rooms) if (await store.isMember(rid, req.user.id)) await store.addWishRoom(w.id, rid);
    res.json({ wish: { ...pubWish(w), rooms: await store.wishRoomIds(w.id) } });
  });

  api.delete("/wishes/:id", async (req, res) => {
    const w = await store.getWish(req.params.id);
    if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    await store.deleteWish(w.id);
    res.json({ ok: true });
  });

  api.post("/wishes/:id/room", async (req, res) => {
    const w = await store.getWish(req.params.id);
    const { roomId } = req.body || {};
    if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
    if (!(await store.isMember(roomId, req.user.id))) return res.status(403).json({ error: "not_member" });
    const roomsNow = await store.toggleWishRoom(w.id, roomId);
    res.json({ rooms: roomsNow });
  });

  api.post("/rooms", async (req, res) => {
    const { name, type, emoji, tint } = req.body || {};
    const r = { id: uid("r"), name: name || "Room", type: type || "friends", emoji: emoji || "🎁", tint: tint || "#2E7DF6", ownerId: req.user.id, createdAt: Date.now() };
    await store.createRoom(r);
    await store.addMember(r.id, req.user.id);
    res.json({ room: { id: r.id } });
  });

  api.patch("/rooms/:id", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    if (r.ownerId !== req.user.id) return res.status(403).json({ error: "not_owner" });
    const { name, emoji, tint } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "name_required" });
    const okTint = typeof tint === "string" && /^#[0-9a-fA-F]{6}$/.test(tint) ? tint : r.tint;
    await store.updateRoom(r.id, { name: name.trim(), emoji: emoji || r.emoji, tint: okTint });
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

  api.get("/rooms/:id", async (req, res) => {
    const me = req.user.id;
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, me))) return res.status(404).json({ error: "not_found" });
    const members = await store.roomMembers(r.id);
    const [lists, mineRaw] = await Promise.all([
      Promise.all(members.filter(x => x.id !== me).map(async u => ({ member: pubUser(u), wishes: await withReservations(await store.wishesSharedTo(u.id, r.id), me) }))),
      store.wishesSharedTo(me, r.id),
    ]);
    const mine = mineRaw.map(pubWish); // owner sees no reservations (surprise-safe)
    res.json({
      room: { id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint, owner: r.ownerId === me },
      members: members.map(u => pubUser(u, me)),
      lists, mine,
    });
  });

  api.post("/wishes/:id/reserve", async (req, res) => {
    const w = await store.getWish(req.params.id);
    if (!w) return res.status(404).json({ error: "not_found" });
    if (w.ownerId === req.user.id) return res.status(403).json({ error: "own_wish" });
    const cur = await store.getReservation(w.id);
    if (cur && cur !== req.user.id) return res.status(409).json({ error: "taken" });
    await store.setReservation(w.id, req.user.id);
    res.json({ ok: true });
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
    const wishes = await withReservations(await store.wishesSharedTo(u.id, req.params.id), me);
    res.json({ budget: draw.budget, target: pubUser(u), wishes });
  });

  app.use("/api", api);

  return app;
}
