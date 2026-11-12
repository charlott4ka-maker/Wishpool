// In-memory store for local dev without a database (data is ephemeral).
import { colorFor } from "./util.js";

export function createMemStore() {
  const D = { users: {}, rooms: {}, members: [], wishes: {}, wishRooms: [], reservations: {}, draws: {}, invites: [], chips: [], reminders: new Set(), notices: {}, events: [], identities: {}, sessions: {}, emailCodes: {}, config: {}, blocks: [], reports: [], friends: [], friendRequests: [], friendCodes: {}, roomInvites: [], roomAdd: {}, grants: {}, subEvents: [], support: [], threads: {} };
  return {
    async init() {},
    async premiumGrant(id) { return D.grants[id] ? { ...D.grants[id] } : null; },
    async grantPremium(id, until, note) { D.grants[id] = { until, note, at: Date.now() }; },
    async dropGrant(id) { delete D.grants[id]; },
    async listGrants() { return Object.entries(D.grants).map(([userId, g]) => ({ userId, name: D.users[userId]?.name || null, ...g })).sort((a, b) => b.at - a.at); },
    async addSubEvent(e) { if (!D.subEvents.some(x => x.id === e.id)) D.subEvents.push({ ...e }); },
    async subEvents(since) { return D.subEvents.filter(e => e.at >= since).sort((a, b) => a.at - b.at); },
    async funnel(since) {
      const us = Object.values(D.users).filter(u => u.id !== "admin-panel" && (u.firstSeen || 0) >= since);
      const size = (rid) => D.members.filter(m => m.roomId === rid).length;
      const mine = (id) => D.members.filter(m => m.userId === id);
      return {
        n: us.length,
        wish: us.filter(u => Object.values(D.wishes).some(w => w.ownerId === u.id)).length,
        room: us.filter(u => mine(u.id).length).length,
        friends: us.filter(u => mine(u.id).some(m => size(m.roomId) > 1)).length,
        gift: us.filter(u => Object.values(D.reservations).includes(u.id) || D.chips.some(c => c.userId === u.id)).length,
        week: us.filter(u => u.lastSeen - u.firstSeen >= 604800000).length,
      };
    },
    async popular(since) {
      const top = (list, key, max = 40) => { const c = {}; for (const x of list) { const k = key(x); if (k) c[k] = (c[k] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, max).map(([id, n]) => ({ id, n })); };
      const ws = Object.values(D.wishes).filter(w => w.createdAt >= since), rs = Object.values(D.rooms).filter(r => (r.createdAt || 0) >= since);
      const picks = {}; for (const e of D.events) if (e.at >= since && /^(accent|icon|paywall)_/.test(e.name)) (picks[e.name] = picks[e.name] || new Set()).add(e.userId);
      return {
        wishStickers: top(ws, w => /^stk:/.test(w.emoji || "") && w.emoji), roomStickers: top(rs, r => /^stk:/.test(r.emoji || "") && r.emoji),
        folders: top(rs, r => r.skin || ""), colors: top(rs, r => (r.tint || "").toLowerCase(), 20),
        picks: Object.entries(picks).map(([id, u]) => ({ id, n: u.size })).sort((a, b) => b.n - a.n),
      };
    },
    async addSupportMsg(m, meta) {
      D.support.push({ ...m });
      const t = D.threads[m.userId] || (D.threads[m.userId] = { userId: m.userId, status: "open", lastAt: 0, userRead: 0, adminRead: 0, meta: "" });
      t.lastAt = m.at; if (meta) t.meta = meta;
      if (m.author === "user") { t.status = "open"; t.userRead = m.at; } else t.adminRead = m.at;
    },
    async userLang(id) { return D.users[id]?.lang || null; },
    async supportMsgs(userId) { return D.support.filter(m => m.userId === userId).sort((a, b) => a.at - b.at).map(({ id, author, text, at }) => ({ id, author, text, at })); },
    async supportThread(userId) { return D.threads[userId] ? { ...D.threads[userId] } : null; },
    async markSupport(userId, who, at) { const t = D.threads[userId]; if (t) t[who === "user" ? "userRead" : "adminRead"] = at; },
    async setSupportStatus(userId, status) { if (D.threads[userId]) D.threads[userId].status = status; },
    async supportUnread(userId) { const t = D.threads[userId]; return t ? D.support.filter(m => m.userId === userId && m.author === "admin" && m.at > t.userRead).length : 0; },
    async supportThreads() {
      return Object.values(D.threads).sort((a, b) => b.lastAt - a.lastAt).map(t => {
        const ms = D.support.filter(m => m.userId === t.userId);
        return { userId: t.userId, name: D.users[t.userId]?.name || null, status: t.status, lastAt: t.lastAt, lastText: ms.length ? ms[ms.length - 1].text : "", unread: ms.filter(m => m.author === "user" && m.at > t.adminRead).length };
      });
    },
    async usersByIds(ids) { return ids.filter(id => D.users[id]).map(id => ({ id, name: D.users[id].name })); },
    async searchUsers(part) {
      const p = part.toLowerCase();
      const email = (id) => Object.entries(D.identities).filter(([k, v]) => v === id && k.startsWith("email:")).map(([k]) => k.slice(6)).join(", ");
      return Object.values(D.users).filter(u => u.id === part || (u.name || "").toLowerCase().includes(p) || email(u.id).toLowerCase().includes(p)).slice(0, 20).map(u => ({ id: u.id, name: u.name, email: email(u.id), lastSeen: u.lastSeen || null }));
    },
    async getConfig() { return JSON.parse(JSON.stringify(D.config)); },
    async setConfig(key, value) { D.config[key] = JSON.parse(JSON.stringify(value)); },
    async friendIds(me) { return D.friends.filter(f => f.a === me).sort((x, y) => y.at - x.at).map(f => f.b); },
    async isFriend(a, b) { return D.friends.some(f => f.a === a && f.b === b); },
    async addFriends(a, b) {
      const at = Date.now();
      for (const [x, y] of [[a, b], [b, a]]) if (!D.friends.some(f => f.a === x && f.b === y)) D.friends.push({ a: x, b: y, at });
      D.friendRequests = D.friendRequests.filter(r => !((r.from === a && r.to === b) || (r.from === b && r.to === a)));
    },
    async removeFriends(a, b) { D.friends = D.friends.filter(f => !((f.a === a && f.b === b) || (f.a === b && f.b === a))); },
    async addFriendRequest(from, to) { if (!D.friendRequests.some(r => r.from === from && r.to === to)) D.friendRequests.push({ from, to, at: Date.now() }); },
    async hasFriendRequest(from, to) { return D.friendRequests.some(r => r.from === from && r.to === to); },
    async dropFriendRequest(from, to) { D.friendRequests = D.friendRequests.filter(r => !(r.from === from && r.to === to)); },
    async incomingRequests(me) { return D.friendRequests.filter(r => r.to === me).map(r => ({ from: r.from, at: r.at })); },
    async outgoingRequests(me) { return D.friendRequests.filter(r => r.from === me).map(r => r.to); },
    async friendCode(me) { return Object.keys(D.friendCodes).find(c => D.friendCodes[c] === me) || null; },
    async setFriendCode(me, code) { if (!Object.values(D.friendCodes).includes(me)) D.friendCodes[code] = me; },
    async friendCodeUser(code) { return D.friendCodes[code] || null; },
    async roomAddPolicy(id) { return D.roomAdd[id] || "invite"; },
    async setRoomAddPolicy(id, v) { D.roomAdd[id] = v; },
    async addRoomInvite(roomId, userId, inviterId) { if (!D.roomInvites.some(i => i.roomId === roomId && i.userId === userId)) D.roomInvites.push({ roomId, userId, inviterId, at: Date.now() }); },
    async roomInvitesFor(me) { return D.roomInvites.filter(i => i.userId === me).map(i => ({ roomId: i.roomId, inviterId: i.inviterId, at: i.at })); },
    async hasRoomInvite(roomId, me) { return D.roomInvites.some(i => i.roomId === roomId && i.userId === me); },
    async dropRoomInvite(roomId, me) { D.roomInvites = D.roomInvites.filter(i => !(i.roomId === roomId && i.userId === me)); },
    async blockedIds(me) { return D.blocks.filter(b => b.userId === me).map(b => b.blockedId); },
    async block(me, id) { if (!D.blocks.some(b => b.userId === me && b.blockedId === id)) D.blocks.push({ userId: me, blockedId: id }); },
    async unblock(me, id) { D.blocks = D.blocks.filter(b => !(b.userId === me && b.blockedId === id)); },
    async addReport(r) { D.reports.unshift({ ...r }); },
    async listReports() { return D.reports.slice(0, 200); },
    async dropReport(id) { D.reports = D.reports.filter(r => r.id !== id); },
    async userEmails(id) { return Object.entries(D.identities).filter(([k, v]) => v === id && k.startsWith("email:")).map(([k]) => k.slice(6)); },
    async identityUser(provider, subject) { return D.identities[provider + ":" + subject] || null; },
    async addIdentity(provider, subject, userId) { const k = provider + ":" + subject; if (!D.identities[k]) D.identities[k] = userId; },
    async createSession(hash, userId) { D.sessions[hash] = userId; },
    async sessionUser(hash) { const id = D.sessions[hash]; return (id && D.users[id]) || null; },
    async dropSession(hash) { delete D.sessions[hash]; },
    async saveEmailCode(email, codeHash, expires) { D.emailCodes[email] = { codeHash, expires, attempts: 0 }; },
    async getEmailCode(email) { return D.emailCodes[email] || null; },
    async bumpEmailCode(email) { if (D.emailCodes[email]) D.emailCodes[email].attempts++; },
    async dropEmailCode(email) { delete D.emailCodes[email]; },
    async updateProfile(id, { name, photo }) { const u = D.users[id]; if (!u) return; if (name != null) u.name = name; if (photo !== undefined) u.photo = photo; },
    async deleteUser(id) {
      for (const r of Object.values(D.rooms).filter(r => r.ownerId === id)) {
        const next = D.members.find(m => m.roomId === r.id && m.userId !== id);
        if (next) r.ownerId = next.userId; else await this.deleteRoom(r.id);
      }
      for (const r of Object.values(D.rooms)) if (r.celebrantId === id) r.celebrantId = null;
      D.blocks = D.blocks.filter(b => b.userId !== id && b.blockedId !== id);
      D.friends = D.friends.filter(f => f.a !== id && f.b !== id);
      D.friendRequests = D.friendRequests.filter(r => r.from !== id && r.to !== id);
      for (const c of Object.keys(D.friendCodes)) if (D.friendCodes[c] === id) delete D.friendCodes[c];
      D.roomInvites = D.roomInvites.filter(i => i.userId !== id && i.inviterId !== id);
      const photos = [];
      for (const w of Object.values(D.wishes).filter(w => w.ownerId === id)) { photos.push(...(w.images && w.images.length ? w.images : [w.image]).filter(Boolean)); await this.deleteWish(w.id); }
      for (const [wid, g] of Object.entries(D.reservations)) if (g === id) delete D.reservations[wid];
      D.chips = D.chips.filter(c => c.userId !== id);
      D.members = D.members.filter(m => m.userId !== id);
      D.invites = D.invites.filter(i => i.inviterId !== id && i.inviteeId !== id);
      D.events = D.events.filter(e => e.userId !== id);
      for (const [k, v] of Object.entries(D.sessions)) if (v === id) delete D.sessions[k];
      for (const [k, v] of Object.entries(D.identities)) if (v === id) delete D.identities[k];
      if (D.users[id] && D.users[id].photo) photos.push(D.users[id].photo);
      delete D.users[id];
      return photos;
    },
    async findUsers(part) { return Object.values(D.users).filter(u => (u.name || "").toLowerCase().includes(part.toLowerCase())).slice(0, 20).map(u => ({ id: u.id, name: u.name })); },
    async touchUser(id, at) { const u = D.users[id]; if (u) { u.lastSeen = at; u.firstSeen = u.firstSeen || at; } },
    async logEvents(userId, names, at) { for (const name of names) D.events.push({ at, userId, name }); },
    async analytics(now) {
      const DAY = 86400000, day0 = now - (now % DAY), us = Object.values(D.users).filter(u => u.id !== "admin-panel"), ws = Object.values(D.wishes).filter(w => !w.roomOnly);
      const uniq = (from) => new Set(D.events.filter(e => e.at >= from).map(e => e.userId)).size;
      const since = day0 - 13 * DAY;
      const days = Array.from({ length: 14 }, (_, i) => { const d = since + i * DAY;
        return { day: new Date(d).toISOString().slice(0, 10), active: new Set(D.events.filter(e => e.at >= d && e.at < d + DAY).map(e => e.userId)).size, new: us.filter(u => u.firstSeen >= d && u.firstSeen < d + DAY).length }; });
      const cl = {}; for (const e of D.events.filter(e => e.at >= now - 7 * DAY)) { const c = cl[e.name] || (cl[e.name] = { name: e.name, n: 0, u: new Set() }); c.n++; c.u.add(e.userId); }
      return {
        online: us.filter(u => u.lastSeen >= now - 300000).length, total: us.length,
        active1: us.filter(u => u.lastSeen >= day0).length, active7: uniq(now - 7 * DAY), active30: uniq(now - 30 * DAY),
        new1: us.filter(u => u.firstSeen >= day0).length, new7: us.filter(u => u.firstSeen >= now - 7 * DAY).length,
        wishes: ws.length, wishes7: ws.filter(w => w.createdAt >= now - 7 * DAY).length,
        rooms: Object.keys(D.rooms).length, rooms7: Object.values(D.rooms).filter(r => r.createdAt >= now - 7 * DAY).length,
        reserved: Object.keys(D.reservations).length, chips: new Set(D.chips.map(c => c.wishId)).size,
        gifted: ws.filter(w => w.giftedAt).length, invites: D.invites.length,
        ios: new Set(Object.values(D.identities)).size, reports: D.reports.length,
        days, clicks: Object.values(cl).sort((a, b) => b.n - a.n).slice(0, 40).map(c => ({ name: c.name, n: c.n, users: c.u.size })),
      };
    },
    async ensureUser(u) {
      const cur = D.users[u.id] || { id: u.id, color: colorFor(u.id) };
      D.users[u.id] = { ...cur, name: u.name, photo: u.photo || null, lang: u.lang || cur.lang || null };
      return D.users[u.id];
    },
    async getUser(id) { return D.users[id] || null; },
    async ensureBotUser(u) { if (!D.users[u.id]) D.users[u.id] = { id: u.id, name: u.name, color: colorFor(u.id), photo: null, lang: u.lang || null }; },
    async setBirthday(id, b) { if (D.users[id]) D.users[id].birthday = b || null; },
    async usersWithBirthday(mmdd) { return Object.values(D.users).filter(u => u.birthday && u.birthday.slice(5) === mmdd); },
    async noticeOnce(key, gapMs) { const now = Date.now(); if (D.notices[key] && D.notices[key] >= now - gapMs) return false; D.notices[key] = now; return true; },
    async isMember(roomId, userId) { return D.members.some(m => m.roomId === roomId && m.userId === userId); },
    async roomMembers(roomId) { return D.members.filter(m => m.roomId === roomId).map(m => D.users[m.userId]).filter(Boolean); },
    async userRoomIds(userId) { return D.members.filter(m => m.userId === userId).map(m => m.roomId); },
    async getRoom(id) { return D.rooms[id] || null; },
    async createRoom(r) { D.rooms[r.id] = { bdayMode: "", celebrantName: "", celebrantId: null, stickerPos: "", skin: "", ...r }; },
    async setCelebrant(roomId, userId) { if (D.rooms[roomId]) D.rooms[roomId].celebrantId = userId || null; },
    async setCelebrantName(roomId, name) { if (D.rooms[roomId]) D.rooms[roomId].celebrantName = name || ""; },
    async roomIdeas(roomId) { return Object.values(D.wishes).filter(w => w.roomOnly === roomId).sort((a, b) => b.createdAt - a.createdAt); },
    async setRoomDecor(id, charms, tag) { if (D.rooms[id]) { D.rooms[id].charms = charms || []; D.rooms[id].tag = tag || ""; } },
    async setRoomCover(id, cover) { if (D.rooms[id]) D.rooms[id].cover = cover || ""; },
    async updateRoom(id, { name, emoji, tint, eventTitle, eventDate, stickerPos, skin }) {
      const r = D.rooms[id]; if (!r) return;
      if (stickerPos !== undefined) r.stickerPos = stickerPos;
      if (skin !== undefined) r.skin = skin;
      if (name !== undefined) r.name = name;
      if (emoji !== undefined) r.emoji = emoji;
      if (tint !== undefined) r.tint = tint;
      if (eventTitle !== undefined) r.eventTitle = eventTitle;
      if (eventDate !== undefined) r.eventDate = eventDate;
    },
    async roomsWithEventOn(day) { return Object.values(D.rooms).filter(r => r.eventDate === day); },
    async markReminder(roomId, day, kind) { const k = roomId + "|" + day + "|" + kind; if (D.reminders.has(k)) return false; D.reminders.add(k); return true; },
    async userLang(id) { return D.users[id] ? D.users[id].lang || null : null; },
    async chips(wishId) { return D.chips.filter(c => c.wishId === wishId).map(c => c.userId); },
    async addChip(wishId, userId) { if (!D.chips.some(c => c.wishId === wishId && c.userId === userId)) D.chips.push({ wishId, userId }); },
    async removeChip(wishId, userId) { D.chips = D.chips.filter(c => !(c.wishId === wishId && c.userId === userId)); },
    async addMember(roomId, userId) { if (!D.members.some(m => m.roomId === roomId && m.userId === userId)) D.members.push({ roomId, userId }); },
    async getWish(id) { return D.wishes[id] || null; },
    async createWish(w) { D.wishes[w.id] = { note: "", giftedAt: null, ...w }; },
    async updateWish(id, w) { const x = D.wishes[id]; if (x) Object.assign(x, { emoji: w.emoji, image: w.image, images: w.images, link: w.link, title: w.title, price: w.price, note: w.note || "" }); },
    async setGifted(id, at) { const x = D.wishes[id]; if (x) x.giftedAt = at; },
    async wishesWithInlineImages(limit) { return Object.values(D.wishes).filter(w => [w.image, ...(w.images || [])].some(x => typeof x === "string" && x.startsWith("data:image/"))).slice(0, limit); },
    async setWishImages(id, images) { const w = D.wishes[id]; if (w) { w.images = images; w.image = images[0] || null; } },
    async deleteWish(id) { delete D.wishes[id]; D.wishRooms = D.wishRooms.filter(x => x.wishId !== id); delete D.reservations[id]; D.chips = D.chips.filter(c => c.wishId !== id); },
    async roomPhotoWishes(roomId, limit = 8) {
      return D.wishRooms.filter(x => x.roomId === roomId).map(x => D.wishes[x.wishId])
        .filter(w => w && !w.giftedAt && D.members.some(m => m.roomId === roomId && m.userId === w.ownerId) && ((w.images && w.images.length) || w.image))
        .sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    },
    async wishRoomIds(wishId) { return D.wishRooms.filter(x => x.wishId === wishId).map(x => x.roomId); },
    async toggleWishRoom(wishId, roomId) {
      const ex = D.wishRooms.find(x => x.wishId === wishId && x.roomId === roomId);
      if (ex) D.wishRooms = D.wishRooms.filter(x => !(x.wishId === wishId && x.roomId === roomId));
      else D.wishRooms.push({ wishId, roomId });
      return this.wishRoomIds(wishId);
    },
    async addWishRoom(wishId, roomId) { if (!D.wishRooms.some(x => x.wishId === wishId && x.roomId === roomId)) D.wishRooms.push({ wishId, roomId }); },
    async userWishes(userId) { return Object.values(D.wishes).filter(w => w.ownerId === userId && !w.roomOnly).sort((a, b) => b.createdAt - a.createdAt); },
    async wishesSharedTo(userId, roomId) { const ids = new Set(D.wishRooms.filter(x => x.roomId === roomId).map(x => x.wishId)); return Object.values(D.wishes).filter(w => w.ownerId === userId && ids.has(w.id) && !w.roomOnly && !w.giftedAt); },
    async giftsByMe(userId) {
      const ids = new Set([...Object.entries(D.reservations).filter(([, g]) => g === userId).map(([wid]) => wid), ...D.chips.filter(c => c.userId === userId).map(c => c.wishId)]);
      return [...ids].map(wid => D.wishes[wid]).filter(Boolean)
        .map(w => ({ wish: w, owner: D.users[w.ownerId] || null }));
    },
    async getReservation(wishId) { return D.reservations[wishId] || null; },
    async setReservation(wishId, gifterId) { D.reservations[wishId] = gifterId; },
    async clearReservation(wishId, gifterId) { if (D.reservations[wishId] === gifterId) delete D.reservations[wishId]; },
    async setDraw(roomId, assignments, budget, exclusions = [], at = Date.now()) { D.draws[roomId] = { assignments, budget, at, exclusions: exclusions || [] }; },
    async getDraw(roomId) { return D.draws[roomId] || null; },
    async removeMember(roomId, userId) { D.members = D.members.filter(m => !(m.roomId === roomId && m.userId === userId)); },
    async removeUserSharesInRoom(roomId, userId) { const own = new Set(Object.values(D.wishes).filter(w => w.ownerId === userId).map(w => w.id)); D.wishRooms = D.wishRooms.filter(x => !(x.roomId === roomId && own.has(x.wishId))); },
    async deleteRoom(roomId) {
      delete D.rooms[roomId];
      for (const w of Object.values(D.wishes)) if (w.roomOnly === roomId) delete D.wishes[w.id];
      D.members = D.members.filter(m => m.roomId !== roomId);
      D.wishRooms = D.wishRooms.filter(x => x.roomId !== roomId);
      delete D.draws[roomId];
      D.invites = D.invites.filter(i => i.roomId !== roomId);
    },
    async recordInvite(roomId, inviterId, inviteeId) { if (!D.invites.some(i => i.roomId === roomId && i.inviteeId === inviteeId)) D.invites.push({ roomId, inviterId, inviteeId, at: Date.now() }); },
    async listInvites(inviterId) {
      return D.invites.filter(i => i.inviterId === inviterId).sort((a, b) => b.at - a.at).map(i => {
        const u = D.users[i.inviteeId] || {}; const r = D.rooms[i.roomId] || {};
        return { room_id: i.roomId, invitee_id: i.inviteeId, uname: u.name, ucolor: u.color, uphoto: u.photo || null, rname: r.name, emoji: r.emoji, tint: r.tint };
      });
    },
  };
}
