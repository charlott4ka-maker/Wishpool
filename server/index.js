import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";
import { authMiddleware } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json({ limit: "6mb" })); // room for base64 photos

const COLORS = ["#7B61FF", "#FF4D8D", "#2E9E5B", "#F5A623", "#2E7DF6", "#FF7A45", "#34C759", "#A479E2"];
const colorFor = (id) => COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const uid = (p) => p + Math.random().toString(36).slice(2, 10);

const D = db.raw();

function ensureUser(u) { if (!D.users[u.id]) { D.users[u.id] = { id: u.id, name: u.name, color: colorFor(u.id) }; db.save(); } return D.users[u.id]; }
function isMember(roomId, userId) { return D.members.some(m => m.roomId === roomId && m.userId === userId); }
function roomMembers(roomId) { return D.members.filter(m => m.roomId === roomId).map(m => D.users[m.userId]).filter(Boolean); }
function wishRoomIds(wishId) { return D.wishRooms.filter(x => x.wishId === wishId).map(x => x.roomId); }
function wishesSharedTo(userId, roomId) {
  const ids = new Set(D.wishRooms.filter(x => x.roomId === roomId).map(x => x.wishId));
  return Object.values(D.wishes).filter(w => w.ownerId === userId && ids.has(w.id));
}
function pubWish(w) { return { id: w.id, emoji: w.emoji, image: w.image, link: w.link, title: w.title, price: w.price }; }

const api = express.Router();
api.use(authMiddleware(BOT_TOKEN));
api.use((req, _res, next) => { ensureUser(req.user); next(); });

// who am I
api.get("/me", (req, res) => res.json({ user: D.users[req.user.id] }));

// full personal state: my pool + my rooms
api.get("/state", (req, res) => {
  const me = req.user.id;
  const wishes = Object.values(D.wishes).filter(w => w.ownerId === me)
    .map(w => ({ ...pubWish(w), rooms: wishRoomIds(w.id) }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const myRoomIds = D.members.filter(m => m.userId === me).map(m => m.roomId);
  const rooms = myRoomIds.map(id => D.rooms[id]).filter(Boolean).map(r => ({
    id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint,
    members: roomMembers(r.id).map(u => ({ id: u.id, name: u.id === me ? "You" : u.name, color: u.color, you: u.id === me })),
    sharedCount: wishesSharedTo(me, r.id).length,
  }));
  res.json({ me: D.users[me], wishes, rooms });
});

// create wish
api.post("/wishes", (req, res) => {
  const { emoji, image, link, title, price, rooms = [] } = req.body || {};
  if (!title) return res.status(400).json({ error: "title_required" });
  const w = { id: uid("w"), ownerId: req.user.id, emoji: emoji || "🎁", image: image || null, link: link || null, title, price: price || "", createdAt: Date.now() };
  D.wishes[w.id] = w;
  rooms.filter(rid => isMember(rid, req.user.id)).forEach(rid => D.wishRooms.push({ wishId: w.id, roomId: rid }));
  db.save();
  res.json({ wish: { ...pubWish(w), rooms: wishRoomIds(w.id) } });
});

api.delete("/wishes/:id", (req, res) => {
  const w = D.wishes[req.params.id];
  if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
  delete D.wishes[w.id];
  D.wishRooms = D.wishRooms.filter(x => x.wishId !== w.id);
  delete D.reservations[w.id];
  db.save();
  res.json({ ok: true });
});

// toggle a wish in/out of a room
api.post("/wishes/:id/room", (req, res) => {
  const w = D.wishes[req.params.id];
  const { roomId } = req.body || {};
  if (!w || w.ownerId !== req.user.id) return res.status(404).json({ error: "not_found" });
  if (!isMember(roomId, req.user.id)) return res.status(403).json({ error: "not_member" });
  const exists = D.wishRooms.find(x => x.wishId === w.id && x.roomId === roomId);
  if (exists) D.wishRooms = D.wishRooms.filter(x => !(x.wishId === w.id && x.roomId === roomId));
  else D.wishRooms.push({ wishId: w.id, roomId });
  db.save();
  res.json({ rooms: wishRoomIds(w.id) });
});

// create room
api.post("/rooms", (req, res) => {
  const { name, type, emoji, tint } = req.body || {};
  const r = { id: uid("r"), name: name || "Room", type: type || "friends", emoji: emoji || "🎁", tint: tint || "#2E7DF6", ownerId: req.user.id, createdAt: Date.now() };
  D.rooms[r.id] = r;
  D.members.push({ roomId: r.id, userId: req.user.id });
  db.save();
  res.json({ room: { id: r.id } });
});

// join room via invite (startapp deep-link carries the room id)
api.post("/rooms/:id/join", (req, res) => {
  const r = D.rooms[req.params.id];
  if (!r) return res.status(404).json({ error: "room_not_found" });
  if (!isMember(r.id, req.user.id)) { D.members.push({ roomId: r.id, userId: req.user.id }); db.save(); }
  res.json({ room: { id: r.id } });
});

// room detail with surprise-safe visibility
api.get("/rooms/:id", (req, res) => {
  const me = req.user.id;
  const r = D.rooms[req.params.id];
  if (!r || !isMember(r.id, me)) return res.status(404).json({ error: "not_found" });
  const members = roomMembers(r.id);
  const lists = members.filter(u => u.id !== me).map(u => ({
    member: { id: u.id, name: u.name, color: u.color },
    wishes: wishesSharedTo(u.id, r.id).map(w => {
      const gifter = D.reservations[w.id];              // who reserved (hidden from owner, but owner is not `me` here)
      return { ...pubWish(w), reservedByMe: gifter === me, taken: !!gifter && gifter !== me };
    }),
  }));
  // my own list here — NO reservation info leaks to the owner (surprise protected)
  const mine = wishesSharedTo(me, r.id).map(pubWish);
  res.json({
    room: { id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint },
    members: members.map(u => ({ id: u.id, name: u.id === me ? "You" : u.name, color: u.color, you: u.id === me })),
    lists, mine,
  });
});

// reserve / unreserve (gifter = me). Only on wishes that are NOT mine.
api.post("/wishes/:id/reserve", (req, res) => {
  const w = D.wishes[req.params.id];
  if (!w) return res.status(404).json({ error: "not_found" });
  if (w.ownerId === req.user.id) return res.status(403).json({ error: "own_wish" });
  if (D.reservations[w.id] && D.reservations[w.id] !== req.user.id) return res.status(409).json({ error: "taken" });
  D.reservations[w.id] = req.user.id; db.save();
  res.json({ ok: true });
});
api.delete("/wishes/:id/reserve", (req, res) => {
  const w = D.wishes[req.params.id];
  if (w && D.reservations[w.id] === req.user.id) { delete D.reservations[w.id]; db.save(); }
  res.json({ ok: true });
});

// run the secret-santa draw (owner action). Cyclic derangement — nobody draws themselves.
api.post("/rooms/:id/draw", (req, res) => {
  const r = D.rooms[req.params.id];
  if (!r || !isMember(r.id, req.user.id)) return res.status(404).json({ error: "not_found" });
  const ids = roomMembers(r.id).map(u => u.id);
  if (ids.length < 3) return res.status(400).json({ error: "need_three" });
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const map = {};
  shuffled.forEach((id, i) => { map[id] = shuffled[(i + 1) % shuffled.length]; });
  D.draws[r.id] = { assignments: map, budget: (req.body && req.body.budget) || null, at: Date.now() };
  db.save();
  res.json({ ok: true });
});

// my assignment in a room's draw + the target's wishes shared here
api.get("/rooms/:id/draw", (req, res) => {
  const me = req.user.id;
  const draw = D.draws[req.params.id];
  if (!draw || !draw.assignments[me]) return res.json({ target: null });
  const tid = draw.assignments[me];
  const u = D.users[tid];
  const wishes = wishesSharedTo(tid, req.params.id).map(w => {
    const g = D.reservations[w.id];
    return { ...pubWish(w), reservedByMe: g === me, taken: !!g && g !== me };
  });
  res.json({ budget: draw.budget, target: { id: u.id, name: u.name, color: u.color }, wishes });
});

app.use("/api", api);

// serve the built frontend
const webDist = path.join(__dirname, "..", "web", "dist");
app.use(express.static(webDist));
app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));

app.listen(PORT, () => console.log(`Wishpool server on :${PORT} (auth: ${BOT_TOKEN ? "telegram" : "DEV MODE"})`));
