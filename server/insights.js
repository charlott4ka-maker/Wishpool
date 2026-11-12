// The admin page's «Аналитика»: the funnel (how far people get) and what they
// pick (stickers, folders, colours, app colour and icon).
const DAY = 86400000;

export function insightsRoutes(api, store, isAdmin) {
  api.get("/admin/insights", async (req, res, next) => {
    try {
      if (!(await isAdmin(req))) return res.status(403).json({ error: "not_admin" });
      const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 0;
      const since = days ? Date.now() - days * DAY : 0;
      const [funnel, popular] = await Promise.all([store.funnel(since), store.popular(since)]);
      res.json({ days, funnel, popular });
    } catch (e) { next(e); }
  });
}
