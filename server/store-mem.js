// In-memory store for local dev without a database (data is ephemeral).
import { colorFor } from "./util.js";

export function createMemStore() {
  const D = { users: {}, rooms: {}, members: [], wishes: {}, wishRooms: [], reservations: {}, draws: {}, invites: [], chips: [], reminders: new Set() };
  return {
    async init() {},
    async ensureUser(u) {
      const cur = D.users[u.id] || { id: u.id, color: colorFor(u.id) };
      D.users[u.id] = { ...cur, name: u.name, photo: u.photo || null, lang: u.lang || cur.lang || null };
      return D.users[u.id];
    },
    async getUser(id) { return D.users[id] || null; },
    async isMember(roomId, userId) { return D.members.some(m => m.roomId === roomId && m.userId === userId); },
    async roomMembers(roomId) { return D.members.filter(m => m.roomId === roomId).map(m => D.users[m.userId]).filter(Boolean); },
    async userRoomIds(userId) { return D.members.filter(m => m.userId === userId).map(m => m.roomId); },
    async getRoom(id) { return D.rooms[id] || null; },
    async createRoom(r) { D.rooms[r.id] = { bdayMode: "", celebrantName: "", celebrantId: null, ...r }; },
    async setCelebrant(roomId, userId) { if (D.rooms[roomId]) D.rooms[roomId].celebrantId = userId || null; },
    async setCelebrantName(roomId, name) { if (D.rooms[roomId]) D.rooms[roomId].celebrantName = name || ""; },
    async roomIdeas(roomId) { return Object.values(D.wishes).filter(w => w.roomOnly === roomId).sort((a, b) => b.createdAt - a.createdAt); },
    async updateRoom(id, { name, emoji, tint, eventTitle, eventDate }) {
      const r = D.rooms[id]; if (!r) return;
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
    async createWish(w) { D.wishes[w.id] = { ...w }; },
    async wishesWithInlineImages(limit) { return Object.values(D.wishes).filter(w => [w.image, ...(w.images || [])].some(x => typeof x === "string" && x.startsWith("data:image/"))).slice(0, limit); },
    async setWishImages(id, images) { const w = D.wishes[id]; if (w) { w.images = images; w.image = images[0] || null; } },
    async deleteWish(id) { delete D.wishes[id]; D.wishRooms = D.wishRooms.filter(x => x.wishId !== id); delete D.reservations[id]; D.chips = D.chips.filter(c => c.wishId !== id); },
    async wishRoomIds(wishId) { return D.wishRooms.filter(x => x.wishId === wishId).map(x => x.roomId); },
    async toggleWishRoom(wishId, roomId) {
      const ex = D.wishRooms.find(x => x.wishId === wishId && x.roomId === roomId);
      if (ex) D.wishRooms = D.wishRooms.filter(x => !(x.wishId === wishId && x.roomId === roomId));
      else D.wishRooms.push({ wishId, roomId });
      return this.wishRoomIds(wishId);
    },
    async addWishRoom(wishId, roomId) { if (!D.wishRooms.some(x => x.wishId === wishId && x.roomId === roomId)) D.wishRooms.push({ wishId, roomId }); },
    async userWishes(userId) { return Object.values(D.wishes).filter(w => w.ownerId === userId && !w.roomOnly).sort((a, b) => b.createdAt - a.createdAt); },
    async wishesSharedTo(userId, roomId) { const ids = new Set(D.wishRooms.filter(x => x.roomId === roomId).map(x => x.wishId)); return Object.values(D.wishes).filter(w => w.ownerId === userId && ids.has(w.id) && !w.roomOnly); },
    async giftsByMe(userId) {
      const ids = new Set([...Object.entries(D.reservations).filter(([, g]) => g === userId).map(([wid]) => wid), ...D.chips.filter(c => c.userId === userId).map(c => c.wishId)]);
      return [...ids].map(wid => D.wishes[wid]).filter(Boolean)
        .map(w => ({ wish: w, owner: D.users[w.ownerId] || null }));
    },
    async getReservation(wishId) { return D.reservations[wishId] || null; },
    async setReservation(wishId, gifterId) { D.reservations[wishId] = gifterId; },
    async clearReservation(wishId, gifterId) { if (D.reservations[wishId] === gifterId) delete D.reservations[wishId]; },
    async setDraw(roomId, assignments, budget) { D.draws[roomId] = { assignments, budget, at: Date.now() }; },
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
