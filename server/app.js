import express from "express";
import cors from "cors";
import { getStore } from "./store.js";
import { authMiddleware } from "./auth.js";
import { uid } from "./util.js";

export async function createApp() {
  const BOT_TOKEN = process.env.BOT_TOKEN || "";
  const store = await getStore();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "6mb" }));

  const pubWish = (w) => ({ id: w.id, emoji: w.emoji, image: w.image, link: w.link, title: w.title, price: w.price });

  const api = express.Router();
  api.use(authMiddleware(BOT_TOKEN));
  api.use(async (req, _res, next) => { try { await store.ensureUser(req.user); next(); } catch (e) { next(e); } });

  api.get("/me", async (req, res) => res.json({ user: await store.getUser(req.user.id) }));

  api.get("/state", async (req, res) => {
    const me = req.user.id;
    const raw = await store.userWishes(me);
    const wishes = [];
    for (const w of raw) wishes.push({ ...pubWish(w), rooms: await store.wishRoomIds(w.id) });
    const roomIds = await store.userRoomIds(me);
    const rooms = [];
    for (const id of roomIds) {
      const r = await store.getRoom(id);
      if (!r) continue;
      const members = await store.roomMembers(id);
      rooms.push({
        id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint,
        members: members.map(u => ({ id: u.id, name: u.id === me ? "You" : u.name, color: u.color, you: u.id === me })),
        sharedCount: (await store.wishesSharedTo(me, id)).length,
      });
    }
    res.json({ me: await store.getUser(me), wishes, rooms });
  });

  api.post("/wishes", async (req, res) => {
    const { emoji, image, link, title, price, rooms = [] } = req.body || {};
    if (!title) return res.status(400).json({ error: "title_required" });
    const w = { id: uid("w"), ownerId: req.user.id, emoji: emoji || "🎁", image: image || null, link: link || null, title, price: price || "", createdAt: Date.now() };
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

  api.post("/rooms/:id/join", async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r) return res.status(404).json({ error: "room_not_found" });
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
      invitee: { id: x.invitee_id, name: x.uname, color: x.ucolor },
    })) });
  });

  api.get("/rooms/:id", async (req, res) => {
    const me = req.user.id;
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, me))) return res.status(404).json({ error: "not_found" });
    const members = await store.roomMembers(r.id);
    const lists = [];
    for (const u of members.filter(x => x.id !== me)) {
      const ws = await store.wishesSharedTo(u.id, r.id);
      const wishes = [];
      for (const w of ws) { const g = await store.getReservation(w.id); wishes.push({ ...pubWish(w), reservedByMe: g === me, taken: !!g && g !== me }); }
      lists.push({ member: { id: u.id, name: u.name, color: u.color }, wishes });
    }
    const mine = (await store.wishesSharedTo(me, r.id)).map(pubWish); // owner sees no reservations (surprise-safe)
    res.json({
      room: { id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint, owner: r.ownerId === me },
      members: members.map(u => ({ id: u.id, name: u.id === me ? "You" : u.name, color: u.color, you: u.id === me })),
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

  api.get("/rooms/:id/draw", async (req, res) => {
    const me = req.user.id;
    const draw = await store.getDraw(req.params.id);
    if (!draw || !draw.assignments[me]) return res.json({ target: null });
    const u = await store.getUser(draw.assignments[me]);
    const ws = await store.wishesSharedTo(u.id, req.params.id);
    const wishes = [];
    for (const w of ws) { const g = await store.getReservation(w.id); wishes.push({ ...pubWish(w), reservedByMe: g === me, taken: !!g && g !== me }); }
    res.json({ budget: draw.budget, target: { id: u.id, name: u.name, color: u.color }, wishes });
  });

  app.use("/api", api);

  return app;
}
