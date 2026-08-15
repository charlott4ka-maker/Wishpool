// In-memory store for local dev without a database (data is ephemeral).
import { colorFor } from "./util.js";

export function createMemStore() {
  const D = { users: {}, rooms: {}, members: [], wishes: {}, wishRooms: [], reservations: {}, draws: {} };
  return {
    async init() {},
    async ensureUser(u) { if (!D.users[u.id]) D.users[u.id] = { id: u.id, name: u.name, color: colorFor(u.id) }; return D.users[u.id]; },
    async getUser(id) { return D.users[id] || null; },
    async isMember(roomId, userId) { return D.members.some(m => m.roomId === roomId && m.userId === userId); },
    async roomMembers(roomId) { return D.members.filter(m => m.roomId === roomId).map(m => D.users[m.userId]).filter(Boolean); },
    async userRoomIds(userId) { return D.members.filter(m => m.userId === userId).map(m => m.roomId); },
    async getRoom(id) { return D.rooms[id] || null; },
    async createRoom(r) { D.rooms[r.id] = { ...r }; },
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
    async getReservation(wishId) { return D.reservations[wishId] || null; },
    async setReservation(wishId, gifterId) { D.reservations[wishId] = gifterId; },
    async clearReservation(wishId, gifterId) { if (D.reservations[wishId] === gifterId) delete D.reservations[wishId]; },
    async setDraw(roomId, assignments, budget) { D.draws[roomId] = { assignments, budget, at: Date.now() }; },
    async getDraw(roomId) { return D.draws[roomId] || null; },
  };
}
