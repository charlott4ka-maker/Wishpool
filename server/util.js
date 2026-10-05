export const COLORS = ["#7B61FF", "#FF4D8D", "#2E9E5B", "#F5A623", "#2E7DF6", "#FF7A45", "#34C759", "#A479E2"];
export const colorFor = (id) => COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
// Public shape of a user wherever they appear in API responses.
export const pubUser = (u, me) => ({ id: u.id, name: me && u.id === me ? "You" : u.name, color: u.color, photo: u.photo || null, ...(me ? { you: u.id === me } : {}) });
export const uid = (p) => p + Math.random().toString(36).slice(2, 10);
// Up to 3 photos per wish, stored as a JSON array; older rows only have `image`.
export const MAX_IMAGES = 3;
const parseImages = (r) => {
  try { const a = JSON.parse(r.images || "null"); if (Array.isArray(a)) return a.slice(0, MAX_IMAGES); } catch {}
  return r.image ? [r.image] : [];
};
export const mapWish = (r) => r && ({ id: r.id, ownerId: r.owner_id, emoji: r.emoji, image: r.image, images: parseImages(r), link: r.link, title: r.title, price: r.price, createdAt: Number(r.created_at), roomOnly: r.room_only || null });
// Accept data-URL images (from the in-app picker) or https URLs; drop anything else.
export const cleanImages = (list) => (Array.isArray(list) ? list : [])
  .filter(x => typeof x === "string" && (/^data:image\/(jpeg|png|webp|gif);base64,/.test(x) || /^https:\/\//.test(x)))
  .slice(0, MAX_IMAGES);
export const mapRoom = (r) => r && ({ id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint, ownerId: r.owner_id, createdAt: Number(r.created_at), eventTitle: r.event_title || "", eventDate: r.event_date || "",
  // birthday rooms: whose birthday ("self" = the creator, "other" = a surprise for someone else)
  bdayMode: r.bday_mode || "", celebrantName: r.celebrant_name || "", celebrantId: r.celebrant_id || null });
// Room event ("Anya's birthday", 2026-11-12): short title + a YYYY-MM-DD date.
export const cleanEvent = (title, date) => ({
  eventTitle: typeof title === "string" ? title.trim().slice(0, 60) : "",
  eventDate: typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
});
