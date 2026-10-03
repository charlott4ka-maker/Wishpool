// In-memory store for local dev without a database (data is ephemeral).
import { colorFor } from "./util.js";

export function createMemStore() {
  const D = { users: {}, rooms: {}, members: [], wishes: {}, wishRooms: [], reservations: {}, draws: {}, invites: [] };
  return {
    async init() {},
    async ensureUser(u) { if (!D.users[u.id]) D.users[u.id] = { id: u.id, name: u.name, color: colorFor(u.id) }; return D.users[u.id]; },
    async getUser(id) { return D.users[id] || null; },
    async isMember(roomId, userId) { return D.members.some(m => m.roomId === roomId && m.userId === userId); },
    async roomMembers(roomId) { return D.members.filter(m => m.roomId === roomId).map(m => D.users[m.userId]).filter(Boolean); },
    async userRoomIds(userId) { return D.members.filter(m => m.userId === userId).map(m => m.roomId); },
    async getRoom(id) { return D.rooms[id] || null; },
    async createRoom(r) { D.rooms[r.id] = { ...r }; },
    async updateRoom(id, { name, emoji }) {
      const r = D.rooms[id]; if (!r) return;
      if (name !== undefined) r.name = name;
      if (emoji !== undefined) r.emoji = emoji;
    },
    async addMember(roomId, userId) { if (!D.members.some(m => m.roomId === roomId && m.userId === userId)) D.members.push({ roomId, userId }); },
    async getWish(id) { return D.wishes[id] || null; },
    async createWish(w) { D.wishes[w.id] = { ...w }; },
    async deleteWish(id) { delete D.wishes[id]; D.wishRooms = D.wishRooms.filter(x => x.wishId !== id); delete D.reservations[id]; },
    async wishRoomIds(wishId) { return D.wishRooms.filter(x => x.wishId === wishId).map(x => x.roomId); },
    async toggleWishRoom(wishId, roomId) {
      const ex = D.wishRooms.find(x => x.wishId === wishId && x.roomId === roomId);
      if (ex) D.wishRooms = D.wishRooms.filter(x => !(x.wishId === wishId && x.roomId === roomId));
      else D.wishRooms.push({ wishId, roomId });
      return this.wishRoomIds(wishId);
    },
    async addWishRoom(wishId, roomId) { if (!D.wishRooms.some(x => x.wishId === wishId && x.roomId === roomId)) D.wishRooms.push({ wishId, roomId }); },
    async userWishes(userId) { return Object.values(D.wishes).filter(w => w.ownerId === userId).sort((a, b) => b.createdAt - a.createdAt); },
    async wishesSharedTo(userId, roomId) { const ids = new Set(D.wishRooms.filter(x => x.roomId === roomId).map(x => x.wishId)); return Object.values(D.wishes).filter(w => w.ownerId === userId && ids.has(w.id)); },
    async giftsByMe(userId) {
      return Object.entries(D.reservations).filter(([, g]) => g === userId).map(([wid]) => D.wishes[wid]).filter(Boolean)
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
      D.members = D.members.filter(m => m.roomId !== roomId);
      D.wishRooms = D.wishRooms.filter(x => x.roomId !== roomId);
      delete D.draws[roomId];
      D.invites = D.invites.filter(i => i.roomId !== roomId);
    },
    async recordInvite(roomId, inviterId, inviteeId) { if (!D.invites.some(i => i.roomId === roomId && i.inviteeId === inviteeId)) D.invites.push({ roomId, inviterId, inviteeId, at: Date.now() }); },
    async listInvites(inviterId) {
      return D.invites.filter(i => i.inviterId === inviterId).sort((a, b) => b.at - a.at).map(i => {
        const u = D.users[i.inviteeId] || {}; const r = D.rooms[i.roomId] || {};
        return { room_id: i.roomId, invitee_id: i.inviteeId, uname: u.name, ucolor: u.color, rname: r.name, emoji: r.emoji, tint: r.tint };
      });
    },
  };
}
