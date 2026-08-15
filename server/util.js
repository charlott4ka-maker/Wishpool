export const COLORS = ["#7B61FF", "#FF4D8D", "#2E9E5B", "#F5A623", "#2E7DF6", "#FF7A45", "#34C759", "#A479E2"];
export const colorFor = (id) => COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
export const uid = (p) => p + Math.random().toString(36).slice(2, 10);
export const mapWish = (r) => r && ({ id: r.id, ownerId: r.owner_id, emoji: r.emoji, image: r.image, link: r.link, title: r.title, price: r.price, createdAt: Number(r.created_at) });
export const mapRoom = (r) => r && ({ id: r.id, name: r.name, type: r.type, emoji: r.emoji, tint: r.tint, ownerId: r.owner_id, createdAt: Number(r.created_at) });
