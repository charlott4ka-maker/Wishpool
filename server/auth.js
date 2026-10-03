import crypto from "crypto";

// Verify Telegram Mini App initData per the official algorithm.
export function verifyInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calc = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (calc !== hash) return null;
    const user = JSON.parse(params.get("user") || "{}");
    if (!user.id) return null;
    return { id: String(user.id), name: user.first_name || "User" };
  } catch (e) { return null; }
}

// Express middleware: resolves req.user from the X-Init-Data header.
// In production BOT_TOKEN must be set, and only verified Telegram initData is accepted —
// the X-Dev-User / demo fallback below is never reachable once a BOT_TOKEN is configured,
// since it would otherwise let anyone impersonate any user id.
export function authMiddleware(botToken) {
  return (req, res, next) => {
    if (botToken) {
      const initData = req.get("X-Init-Data");
      const u = initData && verifyInitData(initData, botToken);
      if (u) { req.user = u; return next(); }
      return res.status(401).json({ error: initData ? "bad_init_data" : "no_auth" });
    }
    // No BOT_TOKEN configured: local dev / browser preview only.
    const dev = req.get("X-Dev-User");
    if (dev) {
      try { const u = JSON.parse(dev); if (u.id) { req.user = { id: String(u.id), name: u.name || "Dev" }; return next(); } } catch {}
    }
    req.user = { id: "demo", name: "Demo" };
    next();
  };
}
