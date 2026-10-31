import crypto from "crypto";

import { pubUser } from "./util.js";

// Friends, without public IDs or search: you add someone you share a room with
// (they get a request to accept), or send your personal link (whoever opens it
// becomes your friend at once, since you chose to send it). Friends can then
// be added straight to a room. How that lands is the friend's choice
// ("room_add"): "invite" (the default) leaves an invitation they accept or
// decline; "instant" puts them in the room right away. Strangers can never
// add anyone to a room.

const SITE = () => (process.env.SITE_URL || "https://wishpool.clickbrickk.com").replace(/\/+$/, "");
const newCode = () => crypto.randomBytes(9).toString("base64url");

export function friendRoutes(api, store) {
  const shareRoom = async (a, b) => {
    const [ra, rb] = await Promise.all([store.userRoomIds(a), store.userRoomIds(b)]);
    const set = new Set(rb);
    return ra.some((id) => set.has(id));
  };
  const userOut = async (id) => {
    const u = await store.getUser(id);
    return u ? pubUser(u) : null;
  };

  // everything the Friends screen shows
  api.get("/friends", async (req, res, next) => {
    try {
      const me = req.user.id;
      const [ids, incoming, outgoing, invites, roomAdd] = await Promise.all([
        store.friendIds(me), store.incomingRequests(me), store.outgoingRequests(me), store.roomInvitesFor(me), store.roomAddPolicy(me),
      ]);
      const friends = (await Promise.all(ids.map(userOut))).filter(Boolean);
      const requests = (await Promise.all(incoming.map(async (r) => ({ user: await userOut(r.from), at: r.at })))).filter((r) => r.user);
      const roomInvites = (await Promise.all(invites.map(async (i) => {
        const [r, inviter, members] = await Promise.all([store.getRoom(i.roomId), userOut(i.inviterId), store.roomMembers(i.roomId)]);
        return r && { room: { id: r.id, name: r.name, emoji: r.emoji, tint: r.tint, type: r.type, memberCount: members.length }, inviter, at: i.at };
      }))).filter(Boolean);
      res.json({ friends, requests, outgoing, roomInvites, roomAdd });
    } catch (e) { next(e); }
  });

  // "Add friend" from a room: a request, or friends at once if they asked first
  api.post("/friends/request", async (req, res, next) => {
    try {
      const me = req.user.id, id = req.body && req.body.userId;
      if (typeof id !== "string" || !id || id === me || !(await store.getUser(id))) return res.status(400).json({ error: "bad_user" });
      if (await store.isFriend(me, id)) return res.json({ status: "friends" });
      if (await store.hasFriendRequest(id, me)) {
        await store.addFriends(me, id);
        return res.json({ status: "friends" });
      }
      if (!(await shareRoom(me, id))) return res.status(403).json({ error: "no_shared_room" });
      if ((await store.blockedIds(id)).includes(me)) return res.json({ status: "requested" }); // quietly nothing
      await store.addFriendRequest(me, id);
      res.json({ status: "requested" });
    } catch (e) { next(e); }
  });
  api.post("/friends/:id/accept", async (req, res) => {
    const me = req.user.id, id = req.params.id;
    if (!(await store.hasFriendRequest(id, me))) return res.status(404).json({ error: "no_request" });
    await store.addFriends(me, id);
    res.json({ ok: true });
  });
  api.post("/friends/:id/decline", async (req, res) => {
    await store.dropFriendRequest(req.params.id, req.user.id);
    res.json({ ok: true });
  });
  // remove a friend (or take back your own request)
  api.delete("/friends/:id", async (req, res) => {
    const me = req.user.id, id = req.params.id;
    await store.removeFriends(me, id);
    await store.dropFriendRequest(me, id);
    res.json({ ok: true });
  });

  // your personal link: wishpool.clickbrickk.com/friend/<code>
  api.get("/friends/link", async (req, res, next) => {
    try {
      const me = req.user.id;
      let code = await store.friendCode(me);
      if (!code) {
        await store.setFriendCode(me, newCode());
        code = await store.friendCode(me);
      }
      res.json({ code, url: `${SITE()}/friend/${code}` });
    } catch (e) { next(e); }
  });
  api.get("/friends/code/:code", async (req, res) => {
    const id = await store.friendCodeUser(req.params.code);
    if (!id) return res.status(404).json({ error: "not_found" });
    const user = await userOut(id);
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json({ user, self: id === req.user.id, friend: await store.isFriend(req.user.id, id) });
  });
  api.post("/friends/code/:code", async (req, res) => {
    const me = req.user.id, id = await store.friendCodeUser(req.params.code);
    if (!id) return res.status(404).json({ error: "not_found" });
    if (id === me) return res.status(400).json({ error: "self" });
    await store.addFriends(me, id);
    res.json({ ok: true, user: await userOut(id) });
  });

  // how friends' "add to room" reaches you
  api.put("/me/room-add", async (req, res) => {
    const v = req.body && req.body.value;
    if (v !== "invite" && v !== "instant") return res.status(400).json({ error: "bad_value" });
    await store.setRoomAddPolicy(req.user.id, v);
    res.json({ roomAdd: v });
  });

  // add friends to a room you're in: straight in, or an invitation, as each prefers
  api.post("/rooms/:id/add", async (req, res, next) => {
    try {
      const me = req.user.id;
      const r = await store.getRoom(req.params.id);
      if (!r || !(await store.isMember(r.id, me))) return res.status(404).json({ error: "not_found" });
      const ids = (Array.isArray(req.body && req.body.userIds) ? req.body.userIds : []).filter((x) => typeof x === "string").slice(0, 50);
      const added = [], invited = [];
      let count = (await store.roomMembers(r.id)).length;
      for (const id of ids) {
        if (id === me || !(await store.isFriend(me, id)) || (await store.isMember(r.id, id))) continue;
        if ((await store.roomAddPolicy(id)) === "instant") {
          if (r.type === "couple" && count >= 2) continue;
          await store.addMember(r.id, id);
          await store.recordInvite(r.id, me, id);
          count++;
          added.push(id);
        } else {
          await store.addRoomInvite(r.id, id, me);
          invited.push(id);
        }
      }
      res.json({ added, invited });
    } catch (e) { next(e); }
  });
  api.post("/room-invites/:roomId/accept", async (req, res) => {
    const me = req.user.id;
    const r = await store.getRoom(req.params.roomId);
    if (!r || !(await store.hasRoomInvite(r.id, me))) return res.status(404).json({ error: "not_found" });
    if (!(await store.isMember(r.id, me)) && r.type === "couple" && (await store.roomMembers(r.id)).length >= 2) {
      await store.dropRoomInvite(r.id, me);
      return res.status(403).json({ error: "room_full" });
    }
    await store.addMember(r.id, me);
    await store.dropRoomInvite(r.id, me);
    res.json({ room: { id: r.id } });
  });
  api.post("/room-invites/:roomId/decline", async (req, res) => {
    await store.dropRoomInvite(req.params.roomId, req.user.id);
    res.json({ ok: true });
  });
}
