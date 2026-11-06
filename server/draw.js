// The gift draw (Secret Santa) in a friends room. Everyone stands in one ring
// and gives to the next person, so nobody gets themselves and everyone gives
// and gets exactly once. Rules:
// - only the room's owner runs it, and only the owner runs it again;
// - "never each other" pairs (a couple, colleagues) and blocks either way are
//   never matched;
// - when someone leaves, deletes their account or a block appears, only one
//   pair changes: the person who gave to them now gives to whoever they gave to;
// - people who join later aren't in it until the owner adds them, which
//   again changes one pair (A → B becomes A → new → B);
// - everyone sees only their own person, the owner included.

// fair shuffle (Fisher-Yates)
function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

const key = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
const banned = (no, a, b) => a === b || no.has(key(a, b));

// a ring over ids with no banned neighbours, or null when there's none
export function makeRing(ids, no) {
  if (ids.length < 2) return null;
  for (let tries = 0; tries < 3000; tries++) {
    const s = shuffle(ids);
    if (s.every((id, i) => !banned(no, id, s[(i + 1) % s.length]))) {
      const map = {};
      s.forEach((id, i) => { map[id] = s[(i + 1) % s.length]; });
      return map;
    }
  }
  return null;
}

// take someone out: their giver takes over their person
function dropFromRing(map, id) {
  const giver = Object.keys(map).find((g) => map[g] === id);
  const next = map[id];
  delete map[id];
  if (giver && giver !== id) {
    if (next && next !== giver) map[giver] = next;
    else delete map[giver]; // only the giver was left
  }
}

// a pair that became banned (a block): swap people with another giver so both fit
function fixBanned(map, no) {
  for (const a of Object.keys(map)) {
    if (!banned(no, a, map[a])) continue;
    const swap = shuffle(Object.keys(map)).find((b) => b !== a && !banned(no, a, map[b]) && !banned(no, b, map[a]));
    if (swap) [map[a], map[swap]] = [map[swap], map[a]];
  }
}

// put someone in: a random A → B with A–new and new–B allowed becomes A → new → B
function insertIntoRing(map, id, no) {
  const spots = shuffle(Object.keys(map)).filter((a) => !banned(no, a, id) && !banned(no, id, map[a]));
  if (!spots.length) return false;
  const a = spots[0];
  map[id] = map[a];
  map[a] = id;
  return true;
}

// the banned pairs in a room: the owner's "never each other" list plus blocks
async function bannedPairs(store, memberIds, exclusions) {
  const no = new Set((exclusions || []).filter((p) => Array.isArray(p) && p.length === 2).map(([a, b]) => key(a, b)));
  const set = new Set(memberIds);
  for (const id of memberIds) for (const b of await store.blockedIds(id)) if (set.has(b)) no.add(key(id, b));
  return no;
}

// bring a stored draw in line with who's in the room now; saves when it changed
async function settle(store, roomId, draw, memberIds) {
  const map = { ...draw.assignments };
  const before = JSON.stringify(map);
  const inRoom = new Set(memberIds);
  for (const id of Object.keys(map)) if (!inRoom.has(id)) dropFromRing(map, id);
  for (const id of Object.values({ ...map })) if (!inRoom.has(id)) dropFromRing(map, id);
  const no = await bannedPairs(store, Object.keys(map), draw.exclusions);
  fixBanned(map, no);
  if (Object.keys(map).length < 2) for (const k of Object.keys(map)) delete map[k];
  if (JSON.stringify(map) !== before) {
    await store.setDraw(roomId, map, draw.budget, draw.exclusions || [], draw.at);
    return { ...draw, assignments: map };
  }
  return draw;
}

export function drawRoutes(api, store, { pubUser, withReservations }) {
  const load = async (req, res) => {
    const r = await store.getRoom(req.params.id);
    if (!r || !(await store.isMember(r.id, req.user.id))) { res.status(404).json({ error: "not_found" }); return null; }
    const members = await store.roomMembers(r.id);
    return { r, members, ids: members.map((u) => u.id) };
  };

  // run it (or again): the owner only. `redraw: false` (the iPhone app's first
  // run) refuses when it's already done, so a double tap can't reshuffle it.
  api.post("/rooms/:id/draw", async (req, res) => {
    const ctx = await load(req, res);
    if (!ctx) return;
    const { r, ids } = ctx;
    if (r.ownerId !== req.user.id) return res.status(403).json({ error: "owner_only" });
    if (ids.length < 3) return res.status(400).json({ error: "need_three" });
    const prev = await store.getDraw(r.id);
    if (prev && req.body && req.body.redraw === false) return res.status(409).json({ error: "already_drawn" });
    const idSet = new Set(ids);
    const exclusions = Array.isArray(req.body && req.body.exclusions)
      ? req.body.exclusions.filter((p) => Array.isArray(p) && p.length === 2 && p[0] !== p[1] && idSet.has(p[0]) && idSet.has(p[1])).slice(0, 50)
      : (prev && prev.exclusions) || [];
    const map = makeRing(ids, await bannedPairs(store, ids, exclusions));
    if (!map) return res.status(422).json({ error: "impossible" });
    const budget = typeof (req.body && req.body.budget) === "string" ? req.body.budget.trim().slice(0, 40) : "";
    await store.setDraw(r.id, map, budget || null, exclusions);
    res.json({ ok: true });
  });

  // the owner adds everyone who joined after the draw, one pair changing each
  api.post("/rooms/:id/draw/add", async (req, res) => {
    const ctx = await load(req, res);
    if (!ctx) return;
    const { r, ids } = ctx;
    if (r.ownerId !== req.user.id) return res.status(403).json({ error: "owner_only" });
    let draw = await store.getDraw(r.id);
    if (!draw) return res.status(404).json({ error: "not_drawn" });
    draw = await settle(store, r.id, draw, ids);
    const map = { ...draw.assignments };
    const no = await bannedPairs(store, ids, draw.exclusions);
    const left = [];
    for (const id of ids) if (!map[id] && !insertIntoRing(map, id, no)) left.push(id);
    await store.setDraw(r.id, map, draw.budget, draw.exclusions || [], draw.at);
    res.json({ ok: true, left: left.length });
  });

  api.get("/rooms/:id/draw", async (req, res) => {
    const ctx = await load(req, res);
    if (!ctx) return;
    const { r, ids, members } = ctx;
    const me = req.user.id;
    let draw = await store.getDraw(r.id);
    if (!draw) return res.json({ drawn: false, target: null });
    draw = await settle(store, r.id, draw, ids);
    const owner = r.ownerId === me;
    const out = { drawn: true, budget: draw.budget };
    // the owner: who's still without a pair (joined later), and the "never each other" list
    if (owner) Object.assign(out, { waiting: ids.filter((id) => !draw.assignments[id]).length, exclusions: draw.exclusions || [] });
    const tid = draw.assignments[me];
    const u = tid && members.find((m) => m.id === tid);
    if (!u) return res.json({ ...out, target: null });
    const wishes = await withReservations(await store.wishesSharedTo(u.id, r.id), me, ids.length - 1);
    res.json({ ...out, target: pubUser(u), wishes });
  });
}
