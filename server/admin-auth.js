import crypto from "crypto";
import express from "express";

import { hashToken } from "./native-auth.js";

// The admin page signs in with one login and password from the environment
// (ADMIN_LOGIN, ADMIN_PASSWORD), not an e-mail code. A good login gets a normal
// session for the "admin-panel" account, which isAdmin() lets through.
// One try per IP every 3 seconds; with a long random password that's plenty.

export const ADMIN_PANEL_ID = "admin-panel";
const same = (a, b) => crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(), crypto.createHash("sha256").update(b).digest());

export function adminLoginRoute(store) {
  const r = express.Router();
  r.post("/", async (req, res, next) => {
    try {
      res.set("Cache-Control", "no-store");
      const L = process.env.ADMIN_LOGIN, P = process.env.ADMIN_PASSWORD;
      if (!L || !P) return res.status(503).json({ error: "not_configured" });
      const ip = String(req.get("x-forwarded-for") || req.ip || "").split(",")[0].trim();
      if (!(await store.noticeOnce("adminlogin:" + ip, 3000))) return res.status(429).json({ error: "too_soon" });
      const login = String((req.body && req.body.login) || "").trim().toLowerCase(), password = String((req.body && req.body.password) || "");
      if (!same(login, L.trim().toLowerCase()) || !same(password, P)) return res.status(401).json({ error: "bad_login" });
      await store.ensureUser({ id: ADMIN_PANEL_ID, name: "Admin", photo: null, lang: "ru" });
      const token = crypto.randomBytes(32).toString("base64url");
      await store.createSession(hashToken(token), ADMIN_PANEL_ID);
      res.json({ token });
    } catch (e) { next(e); }
  });
  return r;
}
