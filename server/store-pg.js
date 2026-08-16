// Postgres-backed store. Works with any Postgres (Neon / Supabase free tiers).
// `q(sql, params)` is injected: a node-postgres pool.query in prod, pglite in tests.
import { colorFor, mapWish, mapRoom } from "./util.js";

export function createPgStore(q) {
  return {
    async init() {
      await q(`CREATE TABLE IF NOT EXISTS users(id text primary key, name text, color text)`);
      await q(`CREATE TABLE IF NOT EXISTS rooms(id text primary key, name text, type text, emoji text, tint text, owner_id text, created_at bigint)`);
      await q(`CREATE TABLE IF NOT EXISTS members(room_id text, user_id text, primary key(room_id,user_id))`);
      await q(`CREATE TABLE IF NOT EXISTS wishes(id text primary key, owner_id text, emoji text, image text, link text, title text, price text, created_at bigint)`);
      await q(`CREATE TABLE IF NOT EXISTS wish_rooms(wish_id text, room_id text, primary key(wish_id,room_id))`);
      await q(`CREATE TABLE IF NOT EXISTS reservations(wish_id text primary key, gifter_id text)`);
      await q(`CREATE TABLE IF NOT EXISTS draws(room_id text primary key, assignments jsonb, budget text, at bigint)`);
      await q(`CREATE TABLE IF NOT EXISTS invites(room_id text, inviter_id text, invitee_id text, at bigint, primary key(room_id, invitee_id))`);
    },
    async ensureUser(u) {
      await q(`INSERT INTO users(id,name,color) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`, [u.id, u.name, colorFor(u.id)]);
      const { rows } = await q(`SELECT id,name,color FROM users WHERE id=$1`, [u.id]);
      return rows[0];
    },
    async getUser(id) { const { rows } = await q(`SELECT id,name,color FROM users WHERE id=$1`, [id]); return rows[0] || null; },
    async isMember(roomId, userId) { const { rows } = await q(`SELECT 1 FROM members WHERE room_id=$1 AND user_id=$2`, [roomId, userId]); return rows.length > 0; },
    async roomMembers(roomId) { const { rows } = await q(`SELECT u.id,u.name,u.color FROM members m JOIN users u ON u.id=m.user_id WHERE m.room_id=$1`, [roomId]); return rows; },
    async userRoomIds(userId) { const { rows } = await q(`SELECT room_id FROM members WHERE user_id=$1`, [userId]); return rows.map(r => r.room_id); },
    async getRoom(id) { const { rows } = await q(`SELECT * FROM rooms WHERE id=$1`, [id]); return mapRoom(rows[0]); },
    async createRoom(r) { await q(`INSERT INTO rooms(id,name,type,emoji,tint,owner_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, [r.id, r.name, r.type, r.emoji, r.tint, r.ownerId, r.createdAt]); },
    async updateRoom(id, { name, emoji }) { await q(`UPDATE rooms SET name=COALESCE($2,name), emoji=COALESCE($3,emoji) WHERE id=$1`, [id, name ?? null, emoji ?? null]); },
    async addMember(roomId, userId) { await q(`INSERT INTO members(room_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [roomId, userId]); },
    async getWish(id) { const { rows } = await q(`SELECT * FROM wishes WHERE id=$1`, [id]); return mapWish(rows[0]); },
    async createWish(w) { await q(`INSERT INTO wishes(id,owner_id,emoji,image,link,title,price,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [w.id, w.ownerId, w.emoji, w.image, w.link, w.title, w.price, w.createdAt]); },
    async deleteWish(id) { await q(`DELETE FROM wishes WHERE id=$1`, [id]); await q(`DELETE FROM wish_rooms WHERE wish_id=$1`, [id]); await q(`DELETE FROM reservations WHERE wish_id=$1`, [id]); },
    async wishRoomIds(wishId) { const { rows } = await q(`SELECT room_id FROM wish_rooms WHERE wish_id=$1`, [wishId]); return rows.map(r => r.room_id); },
    async toggleWishRoom(wishId, roomId) {
      const { rows } = await q(`SELECT 1 FROM wish_rooms WHERE wish_id=$1 AND room_id=$2`, [wishId, roomId]);
      if (rows.length) await q(`DELETE FROM wish_rooms WHERE wish_id=$1 AND room_id=$2`, [wishId, roomId]);
      else await q(`INSERT INTO wish_rooms(wish_id,room_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [wishId, roomId]);
      return this.wishRoomIds(wishId);
    },
    async addWishRoom(wishId, roomId) { await q(`INSERT INTO wish_rooms(wish_id,room_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [wishId, roomId]); },
    async userWishes(userId) { const { rows } = await q(`SELECT * FROM wishes WHERE owner_id=$1 ORDER BY created_at DESC`, [userId]); return rows.map(mapWish); },
    async wishesSharedTo(userId, roomId) { const { rows } = await q(`SELECT w.* FROM wishes w JOIN wish_rooms wr ON wr.wish_id=w.id WHERE w.owner_id=$1 AND wr.room_id=$2`, [userId, roomId]); return rows.map(mapWish); },
    async giftsByMe(userId) {
      const { rows } = await q(`SELECT w.*, u.name AS owner_name, u.color AS owner_color FROM reservations r
        JOIN wishes w ON w.id = r.wish_id JOIN users u ON u.id = w.owner_id
        WHERE r.gifter_id=$1 ORDER BY w.created_at DESC`, [userId]);
      return rows.map(r => ({ wish: mapWish(r), owner: { id: r.owner_id, name: r.owner_name, color: r.owner_color } }));
    },
    async getReservation(wishId) { const { rows } = await q(`SELECT gifter_id FROM reservations WHERE wish_id=$1`, [wishId]); return rows[0] ? rows[0].gifter_id : null; },
    async setReservation(wishId, gifterId) { await q(`INSERT INTO reservations(wish_id,gifter_id) VALUES($1,$2) ON CONFLICT(wish_id) DO UPDATE SET gifter_id=EXCLUDED.gifter_id`, [wishId, gifterId]); },
    async clearReservation(wishId, gifterId) { await q(`DELETE FROM reservations WHERE wish_id=$1 AND gifter_id=$2`, [wishId, gifterId]); },
    async setDraw(roomId, assignments, budget) { await q(`INSERT INTO draws(room_id,assignments,budget,at) VALUES($1,$2::jsonb,$3,$4) ON CONFLICT(room_id) DO UPDATE SET assignments=EXCLUDED.assignments, budget=EXCLUDED.budget, at=EXCLUDED.at`, [roomId, JSON.stringify(assignments), budget, Date.now()]); },
    async getDraw(roomId) { const { rows } = await q(`SELECT assignments,budget FROM draws WHERE room_id=$1`, [roomId]); if (!rows[0]) return null; const a = rows[0].assignments; return { assignments: typeof a === "string" ? JSON.parse(a) : a, budget: rows[0].budget }; },
    async removeMember(roomId, userId) { await q(`DELETE FROM members WHERE room_id=$1 AND user_id=$2`, [roomId, userId]); },
    async removeUserSharesInRoom(roomId, userId) { await q(`DELETE FROM wish_rooms WHERE room_id=$1 AND wish_id IN (SELECT id FROM wishes WHERE owner_id=$2)`, [roomId, userId]); },
    async deleteRoom(roomId) {
      await q(`DELETE FROM members WHERE room_id=$1`, [roomId]);
      await q(`DELETE FROM wish_rooms WHERE room_id=$1`, [roomId]);
      await q(`DELETE FROM draws WHERE room_id=$1`, [roomId]);
      await q(`DELETE FROM invites WHERE room_id=$1`, [roomId]);
      await q(`DELETE FROM rooms WHERE id=$1`, [roomId]);
    },
    async recordInvite(roomId, inviterId, inviteeId) { await q(`INSERT INTO invites(room_id,inviter_id,invitee_id,at) VALUES($1,$2,$3,$4) ON CONFLICT(room_id,invitee_id) DO NOTHING`, [roomId, inviterId, inviteeId, Date.now()]); },
    async listInvites(inviterId) {
      const { rows } = await q(`SELECT i.room_id, i.invitee_id, u.name AS uname, u.color AS ucolor, r.name AS rname, r.emoji, r.tint
        FROM invites i JOIN users u ON u.id=i.invitee_id JOIN rooms r ON r.id=i.room_id
        WHERE i.inviter_id=$1 ORDER BY i.at DESC`, [inviterId]);
      return rows;
    },
  };
}
