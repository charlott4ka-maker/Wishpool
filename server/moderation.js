import { uid } from "./util.js";

// What App Review asks of apps where people see each other's content (rooms):
// a way to report a wish or a person, and to block a person. A report is kept
// for the admin page (Жалобы) and mailed to support, so it gets looked at within
// a day; a block hides that person's wishes from you in every room, and also
// sends a note to support.

const REASONS = ["spam", "offensive", "inappropriate", "other"];
const SUPPORT = () => process.env.SUPPORT_EMAIL || "support@clickbrickk.com";

async function mailSupport(subject, text) {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) { if (!process.env.VERCEL) console.log(`[mail] ${subject}\n${text}`); return; }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [SUPPORT()], subject, text }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}

const who = (u, id) => (u ? `${u.name} (${u.id})` : id || "?");

export function moderationRoutes(api, store, { isAdmin, pubWish, dropPhotos }) {
  api.post("/reports", async (req, res, next) => {
    try {
      const me = req.user.id;
      const b = req.body || {};
      const reason = REASONS.includes(b.reason) ? b.reason : "other";
      const w = typeof b.wishId === "string" ? await store.getWish(b.wishId) : null;
      const userId = w ? w.ownerId : (typeof b.userId === "string" ? b.userId : "");
      if (!userId || userId === me) return res.status(400).json({ error: "bad_report" });
      const roomId = typeof b.roomId === "string" ? b.roomId.slice(0, 40) : "";
      await store.addReport({ id: uid("rp"), reporterId: me, userId, wishId: w ? w.id : "", roomId, reason, createdAt: Date.now() });
      const [reporter, target] = await Promise.all([store.getUser(me), store.getUser(userId)]);
      await mailSupport(`Wishpool: жалоба (${reason})`, [
        `Кто пожаловался: ${who(reporter, me)}`,
        `На кого: ${who(target, userId)}`,
        w ? `Желание: «${w.title}» (${w.id})${w.link ? "\nСсылка: " + w.link : ""}` : "",
        roomId ? `Комната: ${roomId}` : "",
        `Причина: ${reason}`,
        "",
        "Разобрать: https://wishpool.clickbrickk.com/admin (вкладка «Жалобы»)",
      ].filter(x => x !== "").join("\n"));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  api.post("/blocks", async (req, res, next) => {
    try {
      const me = req.user.id, id = req.body && req.body.userId;
      if (typeof id !== "string" || !id || id === me) return res.status(400).json({ error: "bad_user" });
      await store.block(me, id);
      const [a, t] = await Promise.all([store.getUser(me), store.getUser(id)]);
      await mailSupport("Wishpool: блокировка", `${who(a, me)} заблокировал(а) ${who(t, id)}.`);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
  api.delete("/blocks/:id", async (req, res) => {
    await store.unblock(req.user.id, req.params.id);
    res.json({ ok: true });
  });

  // admin page: the reports with who/what, and taking a wish down
  const guard = async (req, res, next) => {
    try { if (await isAdmin(req)) return next(); res.status(403).json({ error: "not_admin" }); } catch (e) { next(e); }
  };
  api.get("/admin/reports", guard, async (_req, res) => {
    const list = await store.listReports();
    const users = {};
    const user = async (id) => (id in users ? users[id] : (users[id] = await store.getUser(id).then(u => u && { id: u.id, name: u.name }).catch(() => null)));
    res.json({
      reports: await Promise.all(list.map(async r => {
        const w = r.wishId ? await store.getWish(r.wishId) : null;
        return { ...r, reporter: await user(r.reporterId), user: await user(r.userId), wish: w ? pubWish(w) : null };
      })),
    });
  });
  api.delete("/admin/reports/:id", guard, async (req, res) => {
    await store.dropReport(req.params.id);
    res.json({ ok: true });
  });
  api.delete("/admin/wishes/:id", guard, async (req, res) => {
    const w = await store.getWish(req.params.id);
    if (!w) return res.status(404).json({ error: "not_found" });
    await store.deleteWish(w.id);
    dropPhotos(w);
    res.json({ ok: true });
  });
}
