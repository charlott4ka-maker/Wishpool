// Premium on the server side:
//   - gifts: the admin page hands Premium to someone (a blogger, a friend, a
//     tester) for a while or forever, no purchase; /state carries it to the app
//   - RevenueCat: its webhook (POST /api/revenuecat) lands every purchase,
//     renewal, cancellation and expiry here, so the admin page can count
//     subscribers, trials, conversions and money; when REVENUECAT_API_KEY and
//     REVENUECAT_PROJECT_ID are set, RevenueCat's own overview is shown too.
// Set in the RevenueCat dashboard (Integrations › Webhooks): URL
// https://wishpool.clickbrickk.com/api/revenuecat and an Authorization header
// equal to REVENUECAT_WEBHOOK_AUTH on Vercel.

const DAY = 86400000;
const FOREVER = 253402300799000; // 9999-12-31: "forever" kept as a date so one column covers both

/** the gift's end as the app sees it: ms, or null when there is no gift (or it ran out) */
export async function premiumGift(store, userId, now = Date.now()) {
  const g = await store.premiumGrant(userId);
  return g && g.until > now ? { until: g.until, forever: g.until >= FOREVER } : null;
}

const PAID = ["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"];

/** POST /api/revenuecat (no user sign-in: RevenueCat signs with the shared header) */
export function revenueCatWebhook(store) {
  return async (req, res, next) => {
    try {
      const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
      if (!secret || req.get("Authorization") !== secret) return res.status(401).json({ error: "bad_auth" });
      const e = req.body && req.body.event;
      if (!e || typeof e.type !== "string") return res.status(400).json({ error: "no_event" });
      if (e.type === "TEST") return res.json({ ok: true });
      const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
      await store.addSubEvent({
        id: String(e.id || `${e.type}-${e.app_user_id}-${e.event_timestamp_ms || Date.now()}`).slice(0, 80),
        at: num(e.event_timestamp_ms) || num(e.purchased_at_ms) || Date.now(),
        userId: String(e.app_user_id || e.original_app_user_id || "").slice(0, 80),
        type: e.type.slice(0, 40),
        product: String(e.product_id || "").slice(0, 120),
        period: String(e.period_type || "").slice(0, 20),
        price: num(e.price) || 0, // USD; negative for refunds
        env: e.environment === "SANDBOX" ? "sandbox" : "prod",
        conversion: !!e.is_trial_conversion,
        expires: num(e.expiration_at_ms),
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  };
}

// numbers for the admin page, from our own copy of RevenueCat's events
export function subStats(events, now = Date.now()) {
  const prod = events.filter((e) => e.env === "prod").sort((a, b) => a.at - b.at);
  // each person's last word decides where they stand now
  const last = new Map();
  for (const e of prod) if (e.userId && e.type !== "BILLING_ISSUE" && e.type !== "SUBSCRIBER_ALIAS" && e.type !== "TRANSFER") last.set(e.userId, e);
  let subs = 0, trials = 0, monthly = 0, annual = 0, cancelling = 0;
  for (const e of last.values()) {
    if (e.type === "EXPIRATION" || !e.expires || e.expires < now) continue;
    if (e.period === "TRIAL") trials++;
    else {
      subs++;
      if (/annual|year/i.test(e.product)) annual++; else monthly++;
    }
    // still on, but auto-renew is off: leaves at the end of the period
    if (e.type === "CANCELLATION") cancelling++;
  }
  const since = (d) => prod.filter((e) => e.at >= now - d * DAY);
  const m30 = since(30);
  const trialsStarted = m30.filter((e) => e.type === "INITIAL_PURCHASE" && e.period === "TRIAL").length;
  // conversions: of the trials that ended in the last 30 days, how many paid
  const allTrials = prod.filter((e) => e.type === "INITIAL_PURCHASE" && e.period === "TRIAL" && e.expires && e.expires <= now && e.expires >= now - 30 * DAY);
  const converted = allTrials.filter((t) => prod.some((e) => e.userId === t.userId && e.at >= t.at && (e.conversion || (PAID.includes(e.type) && e.period === "NORMAL")))).length;
  const money = (list) => Math.round(list.reduce((s, e) => s + (e.price || 0), 0) * 100) / 100;
  return {
    subs, trials, monthly, annual, cancelling,
    trialsStarted30: trialsStarted,
    trialsEnded30: allTrials.length,
    converted30: converted,
    revenue30: money(m30),
    revenue7: money(since(7)),
    revenueAll: money(prod),
    sandbox: events.length - prod.length,
  };
}

// RevenueCat's own overview (API v2), when the keys are there; a minute's cache
let rcCache = { at: 0, data: null };
async function rcOverview() {
  const key = process.env.REVENUECAT_API_KEY, project = process.env.REVENUECAT_PROJECT_ID;
  if (!key || !project) return null;
  if (Date.now() - rcCache.at < 60000) return rcCache.data;
  try {
    const r = await fetch(`https://api.revenuecat.com/v2/projects/${encodeURIComponent(project)}/metrics/overview`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    const data = r.ok ? { currency: j.currency || "USD", metrics: (j.metrics || []).map((m) => ({ id: m.id, name: m.name, unit: m.unit || "", value: m.value, period: m.period || "" })) } : { error: j.message || `HTTP ${r.status}` };
    rcCache = { at: Date.now(), data };
    return data;
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

/** admin routes on the signed-in API router */
export function premiumAdminRoutes(api, store, isAdmin) {
  const guard = async (req, res, next) => {
    try { if (await isAdmin(req)) return next(); res.status(403).json({ error: "not_admin" }); } catch (e) { next(e); }
  };
  api.get("/admin/premium", guard, async (_req, res, next) => {
    try {
      const now = Date.now();
      const [events, grants, rc] = await Promise.all([store.subEvents(now - 400 * DAY), store.listGrants(), rcOverview()]);
      const names = new Map((await store.usersByIds([...new Set(events.slice(-30).map((e) => e.userId))])).map((u) => [u.id, u.name]));
      res.json({
        stats: subStats(events, now),
        recent: events.filter((e) => e.env === "prod").slice(-30).reverse().map((e) => ({ ...e, name: names.get(e.userId) || null })),
        grants: grants.map((g) => ({ ...g, forever: g.until >= FOREVER, active: g.until > now })),
        revenuecat: rc,
        webhook: !!process.env.REVENUECAT_WEBHOOK_AUTH,
      });
    } catch (e) { next(e); }
  });
  // find someone to give Premium to: by name or e-mail
  api.get("/admin/premium/users", guard, async (req, res, next) => {
    try {
      const q = String(req.query.q || "").trim().slice(0, 60);
      if (q.length < 2) return res.json({ users: [] });
      res.json({ users: await store.searchUsers(q) });
    } catch (e) { next(e); }
  });
  // { userId, days } (days 0 or missing = forever), note: who it's for
  api.post("/admin/premium/grant", guard, async (req, res, next) => {
    try {
      const b = req.body || {};
      const userId = typeof b.userId === "string" ? b.userId.slice(0, 80) : "";
      if (!userId || !(await store.getUser(userId))) return res.status(404).json({ error: "no_user" });
      const days = Number(b.days) || 0;
      if (days < 0 || days > 3650) return res.status(400).json({ error: "bad_days" });
      // more days on top of a gift that still runs
      const cur = await store.premiumGrant(userId);
      const from = cur && cur.until > Date.now() && cur.until < FOREVER ? cur.until : Date.now();
      const until = days ? from + days * DAY : FOREVER;
      await store.grantPremium(userId, until, typeof b.note === "string" ? b.note.slice(0, 120) : "");
      res.json({ ok: true, until });
    } catch (e) { next(e); }
  });
  api.delete("/admin/premium/grant/:userId", guard, async (req, res, next) => {
    try {
      await store.dropGrant(String(req.params.userId));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}

export { FOREVER };
