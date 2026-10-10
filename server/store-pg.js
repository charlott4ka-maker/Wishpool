// Postgres-backed store. Works with any Postgres (Neon / Supabase free tiers).
// `q(sql, params)` is injected: a node-postgres pool.query in prod, pglite in tests.
import { colorFor, mapWish, mapRoom } from "./util.js";

export function createPgStore(q) {
  return {
    async init() {
      await q(`CREATE TABLE IF NOT EXISTS users(id text primary key, name text, color text)`);
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo text`);
      await q(`CREATE TABLE IF NOT EXISTS rooms(id text primary key, name text, type text, emoji text, tint text, owner_id text, created_at bigint)`);
      await q(`CREATE TABLE IF NOT EXISTS members(room_id text, user_id text, primary key(room_id,user_id))`);
      await q(`CREATE TABLE IF NOT EXISTS wishes(id text primary key, owner_id text, emoji text, image text, link text, title text, price text, created_at bigint)`);
      await q(`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS images text`);
      await q(`CREATE TABLE IF NOT EXISTS wish_rooms(wish_id text, room_id text, primary key(wish_id,room_id))`);
      await q(`CREATE TABLE IF NOT EXISTS reservations(wish_id text primary key, gifter_id text)`);
      await q(`CREATE TABLE IF NOT EXISTS draws(room_id text primary key, assignments jsonb, budget text, at bigint)`);
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lang text`);
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday text`);
      await q(`CREATE TABLE IF NOT EXISTS notices(key text primary key, at bigint)`);
      await q(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS event_title text`);
      await q(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS event_date text`);
      await q(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bday_mode text`);
      await q(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS celebrant_name text`);
      await q(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS celebrant_id text`);
      await q(`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS room_only text`);
      await q(`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS note text`);
      await q(`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS gifted_at bigint`);
      await q(`CREATE TABLE IF NOT EXISTS chips(wish_id text, user_id text, at bigint, primary key(wish_id,user_id))`);
      await q(`CREATE TABLE IF NOT EXISTS reminders(room_id text, day text, kind text, primary key(room_id,day,kind))`);
      await q(`CREATE TABLE IF NOT EXISTS invites(room_id text, inviter_id text, invitee_id text, at bigint, primary key(room_id, invitee_id))`);
      // analytics: when people first/last opened the app, and a plain event log
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_seen bigint`);
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen bigint`);
      await q(`CREATE TABLE IF NOT EXISTS events(at bigint, user_id text, name text)`);
      await q(`CREATE INDEX IF NOT EXISTS events_at ON events(at)`);
    },
    async findUsers(part) { const { rows } = await q(`SELECT id,name,first_seen,last_seen FROM users WHERE name ILIKE $1 ORDER BY last_seen DESC NULLS LAST LIMIT 20`, ["%" + part + "%"]); return rows; },
    async touchUser(id, at) { await q(`UPDATE users SET last_seen=$2, first_seen=COALESCE(first_seen,$2) WHERE id=$1`, [id, at]); },
    async logEvents(userId, names, at) {
      if (!names.length) return;
      const vals = names.map((_, i) => `($1,$2,$${i + 3})`).join(",");
      await q(`INSERT INTO events(at,user_id,name) VALUES ${vals}`, [at, userId, ...names]);
    },
    // everything the admin screen shows, in one go
    async analytics(now) {
      const D = 86400000, M5 = 5 * 60000;
      const day0 = now - (now % D);
      const one = async (sql, p = []) => Number((await q(sql, p)).rows[0].n) || 0;
      const [online, total, active1, active7, active30, new1, new7, wishes, wishes7, rooms, rooms7, reserved, chips, gifted, invites] = await Promise.all([
        one(`SELECT count(*) n FROM users WHERE last_seen >= $1`, [now - M5]),
        one(`SELECT count(*) n FROM users`),
        one(`SELECT count(*) n FROM users WHERE last_seen >= $1`, [day0]),
        one(`SELECT count(DISTINCT user_id) n FROM events WHERE at >= $1`, [now - 7 * D]),
        one(`SELECT count(DISTINCT user_id) n FROM events WHERE at >= $1`, [now - 30 * D]),
        one(`SELECT count(*) n FROM users WHERE first_seen >= $1`, [day0]),
        one(`SELECT count(*) n FROM users WHERE first_seen >= $1`, [now - 7 * D]),
        one(`SELECT count(*) n FROM wishes WHERE room_only IS NULL`),
        one(`SELECT count(*) n FROM wishes WHERE room_only IS NULL AND created_at >= $1`, [now - 7 * D]),
        one(`SELECT count(*) n FROM rooms`),
        one(`SELECT count(*) n FROM rooms WHERE created_at >= $1`, [now - 7 * D]),
        one(`SELECT count(*) n FROM reservations`),
        one(`SELECT count(DISTINCT wish_id) n FROM chips`),
        one(`SELECT count(*) n FROM wishes WHERE gifted_at IS NOT NULL`),
        one(`SELECT count(*) n FROM invites`),
      ]);
      const since = day0 - 13 * D;
      const [act, fresh, clicks] = await Promise.all([
        q(`SELECT (at - at % ${D}) d, count(DISTINCT user_id) n FROM events WHERE at >= $1 GROUP BY 1`, [since]),
        q(`SELECT (first_seen - first_seen % ${D}) d, count(*) n FROM users WHERE first_seen >= $1 GROUP BY 1`, [since]),
        q(`SELECT name, count(*) n, count(DISTINCT user_id) u FROM events WHERE at >= $1 GROUP BY name ORDER BY n DESC LIMIT 40`, [now - 7 * D]),
      ]);
      const byDay = (rows) => Object.fromEntries(rows.map(r => [Number(r.d), Number(r.n)]));
      const a = byDay(act.rows), f = byDay(fresh.rows);
      const days = Array.from({ length: 14 }, (_, i) => { const d = since + i * D; return { day: new Date(d).toISOString().slice(0, 10), active: a[d] || 0, new: f[d] || 0 }; });
      return {
        online, total, active1, active7, active30, new1, new7,
        wishes, wishes7, rooms, rooms7, reserved, chips, gifted, invites,
        days, clicks: clicks.rows.map(r => ({ name: r.name, n: Number(r.n), users: Number(r.u) })),
      };
    },
    async ensureUser(u) {
      // name and photo are refreshed on every visit (photo goes null if the user hides it)
      const { rows } = await q(`INSERT INTO users(id,name,color,photo,lang) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, photo=EXCLUDED.photo, lang=COALESCE(EXCLUDED.lang, users.lang) RETURNING id,name,color,photo`, [u.id, u.name, colorFor(u.id), u.photo || null, u.lang || null]);
      return rows[0];
    },
    async getUser(id) { const { rows } = await q(`SELECT id,name,color,photo,birthday FROM users WHERE id=$1`, [id]); return rows[0] || null; },
    // someone who writes to the bot before ever opening the app; never overwrites a known profile
    async ensureBotUser(u) { await q(`INSERT INTO users(id,name,color,photo,lang) VALUES($1,$2,$3,NULL,$4) ON CONFLICT(id) DO NOTHING`, [u.id, u.name, colorFor(u.id), u.lang || null]); },
    async setBirthday(id, b) { await q(`UPDATE users SET birthday=$2 WHERE id=$1`, [id, b || null]); },
    // birthdays falling on MM-DD (stored as YYYY-MM-DD)
    async usersWithBirthday(mmdd) { const { rows } = await q(`SELECT id,name FROM users WHERE substr(birthday,6,5)=$1`, [mmdd]); return rows; },
    // true at most once per `gapMs` for the same key (bot notifications must not spam)
    async noticeOnce(key, gapMs) {
      const now = Date.now();
      const { rows } = await q(`INSERT INTO notices(key,at) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET at=EXCLUDED.at WHERE notices.at < $3 RETURNING key`, [key, now, now - gapMs]);
      return rows.length > 0;
    },
    async isMember(roomId, userId) { const { rows } = await q(`SELECT 1 FROM members WHERE room_id=$1 AND user_id=$2`, [roomId, userId]); return rows.length > 0; },
    async roomMembers(roomId) { const { rows } = await q(`SELECT u.id,u.name,u.color,u.photo FROM members m JOIN users u ON u.id=m.user_id WHERE m.room_id=$1`, [roomId]); return rows; },
    async userRoomIds(userId) { const { rows } = await q(`SELECT room_id FROM members WHERE user_id=$1`, [userId]); return rows.map(r => r.room_id); },
    async getRoom(id) { const { rows } = await q(`SELECT * FROM rooms WHERE id=$1`, [id]); return mapRoom(rows[0]); },
    async createRoom(r) { await q(`INSERT INTO rooms(id,name,type,emoji,tint,owner_id,created_at,event_title,event_date,bday_mode,celebrant_name,celebrant_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [r.id, r.name, r.type, r.emoji, r.tint, r.ownerId, r.createdAt, r.eventTitle || "", r.eventDate || "", r.bdayMode || "", r.celebrantName || "", r.celebrantId || null]); },
    async setCelebrant(roomId, userId) { await q(`UPDATE rooms SET celebrant_id=$2 WHERE id=$1`, [roomId, userId || null]); },
    async setCelebrantName(roomId, name) { await q(`UPDATE rooms SET celebrant_name=$2 WHERE id=$1`, [roomId, name || ""]); },
    async roomIdeas(roomId) { const { rows } = await q(`SELECT * FROM wishes WHERE room_only=$1 ORDER BY created_at DESC`, [roomId]); return rows.map(mapWish); },
    async updateRoom(id, { name, emoji, tint, eventTitle, eventDate }) { await q(`UPDATE rooms SET name=COALESCE($2,name), emoji=COALESCE($3,emoji), tint=COALESCE($4,tint), event_title=COALESCE($5,event_title), event_date=COALESCE($6,event_date) WHERE id=$1`, [id, name ?? null, emoji ?? null, tint ?? null, eventTitle ?? null, eventDate ?? null]); },
    async roomsWithEventOn(day) { const { rows } = await q(`SELECT * FROM rooms WHERE event_date=$1`, [day]); return rows.map(mapRoom); },
    async markReminder(roomId, day, kind) { const { rows } = await q(`INSERT INTO reminders(room_id,day,kind) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING room_id`, [roomId, day, kind]); return rows.length > 0; },
    async userLang(id) { const { rows } = await q(`SELECT lang FROM users WHERE id=$1`, [id]); return rows[0] ? rows[0].lang : null; },
    async chips(wishId) { const { rows } = await q(`SELECT user_id FROM chips WHERE wish_id=$1 ORDER BY at`, [wishId]); return rows.map(r => r.user_id); },
    async addChip(wishId, userId) { await q(`INSERT INTO chips(wish_id,user_id,at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [wishId, userId, Date.now()]); },
    async removeChip(wishId, userId) { await q(`DELETE FROM chips WHERE wish_id=$1 AND user_id=$2`, [wishId, userId]); },
    async addMember(roomId, userId) { await q(`INSERT INTO members(room_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [roomId, userId]); },
    async getWish(id) { const { rows } = await q(`SELECT * FROM wishes WHERE id=$1`, [id]); return mapWish(rows[0]); },
    async createWish(w) { await q(`INSERT INTO wishes(id,owner_id,emoji,image,images,link,title,price,created_at,room_only,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [w.id, w.ownerId, w.emoji, w.image, JSON.stringify(w.images || []), w.link, w.title, w.price, w.createdAt, w.roomOnly || null, w.note || ""]); },
    async updateWish(id, w) { await q(`UPDATE wishes SET emoji=$2, image=$3, images=$4, link=$5, title=$6, price=$7, note=$8 WHERE id=$1`, [id, w.emoji, w.image, JSON.stringify(w.images || []), w.link, w.title, w.price, w.note || ""]); },
    async setGifted(id, at) { await q(`UPDATE wishes SET gifted_at=$2 WHERE id=$1`, [id, at]); },
    async wishesWithInlineImages(limit) { const { rows } = await q(`SELECT * FROM wishes WHERE images LIKE '%data:image/%' OR image LIKE 'data:image/%' LIMIT $1`, [limit]); return rows.map(mapWish); },
    async setWishImages(id, images) { await q(`UPDATE wishes SET images=$2, image=$3 WHERE id=$1`, [id, JSON.stringify(images), images[0] || null]); },
    async deleteWish(id) { await q(`DELETE FROM wishes WHERE id=$1`, [id]); await q(`DELETE FROM wish_rooms WHERE wish_id=$1`, [id]); await q(`DELETE FROM reservations WHERE wish_id=$1`, [id]); await q(`DELETE FROM chips WHERE wish_id=$1`, [id]); },
    async wishRoomIds(wishId) { const { rows } = await q(`SELECT room_id FROM wish_rooms WHERE wish_id=$1`, [wishId]); return rows.map(r => r.room_id); },
    async toggleWishRoom(wishId, roomId) {
      const { rows } = await q(`SELECT 1 FROM wish_rooms WHERE wish_id=$1 AND room_id=$2`, [wishId, roomId]);
      if (rows.length) await q(`DELETE FROM wish_rooms WHERE wish_id=$1 AND room_id=$2`, [wishId, roomId]);
      else await q(`INSERT INTO wish_rooms(wish_id,room_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [wishId, roomId]);
      return this.wishRoomIds(wishId);
    },
    async addWishRoom(wishId, roomId) { await q(`INSERT INTO wish_rooms(wish_id,room_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [wishId, roomId]); },
    // room-only gift ideas (birthday rooms) never show up in anyone's pool
    async userWishes(userId) { const { rows } = await q(`SELECT * FROM wishes WHERE owner_id=$1 AND room_only IS NULL ORDER BY created_at DESC`, [userId]); return rows.map(mapWish); },
    async wishesSharedTo(userId, roomId) { const { rows } = await q(`SELECT w.* FROM wishes w JOIN wish_rooms wr ON wr.wish_id=w.id WHERE w.owner_id=$1 AND wr.room_id=$2 AND w.room_only IS NULL AND w.gifted_at IS NULL`, [userId, roomId]); return rows.map(mapWish); },
    async giftsByMe(userId) {
      const { rows } = await q(`SELECT w.*, u.name AS owner_name, u.color AS owner_color, u.photo AS owner_photo FROM wishes w
        JOIN users u ON u.id = w.owner_id
        WHERE w.id IN (SELECT wish_id FROM reservations WHERE gifter_id=$1 UNION SELECT wish_id FROM chips WHERE user_id=$1)
        ORDER BY w.created_at DESC`, [userId]);
      return rows.map(r => ({ wish: mapWish(r), owner: { id: r.owner_id, name: r.owner_name, color: r.owner_color, photo: r.owner_photo } }));
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
      await q(`DELETE FROM wishes WHERE room_only=$1`, [roomId]);
      await q(`DELETE FROM rooms WHERE id=$1`, [roomId]);
    },
    async recordInvite(roomId, inviterId, inviteeId) { await q(`INSERT INTO invites(room_id,inviter_id,invitee_id,at) VALUES($1,$2,$3,$4) ON CONFLICT(room_id,invitee_id) DO NOTHING`, [roomId, inviterId, inviteeId, Date.now()]); },
    async listInvites(inviterId) {
      const { rows } = await q(`SELECT i.room_id, i.invitee_id, u.name AS uname, u.color AS ucolor, u.photo AS uphoto, r.name AS rname, r.emoji, r.tint
        FROM invites i JOIN users u ON u.id=i.invitee_id JOIN rooms r ON r.id=i.room_id
        WHERE i.inviter_id=$1 ORDER BY i.at DESC`, [inviterId]);
      return rows;
    },
  };
}
