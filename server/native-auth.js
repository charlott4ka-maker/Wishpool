import crypto from "crypto";
import express from "express";
import { colorFor } from "./util.js";
import { safeLang } from "./auth.js";

// Sign-in for the iOS app (the Mini App keeps using Telegram initData):
//   POST /api/auth/apple         { identityToken, nonce, fullName?, email? } -> { token, user }
//   POST /api/auth/email/start   { email, lang? }                          -> { ok }
//   POST /api/auth/email/verify  { email, code }                           -> { token, user }
// The app then sends "Authorization: Bearer <token>". Only a hash of the token
// is stored, and DELETE /me drops every session of the account.
//
//   APPLE_AUDIENCES  bundle ids allowed in Apple tokens (default: app.wishpool.ios,host.exp.Exponent for Expo Go)
//   RESEND_API_KEY   e-mail codes go out through Resend (resend.com)
//   MAIL_FROM        sender, e.g. "Wishpool <hello@wishpool.clickbrickk.com>" (a domain verified in Resend)
//   REVIEW_EMAIL / REVIEW_CODE  App Review account: this address signs in with this code, no e-mail is sent

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const hashToken = (t) => sha256("wp_session:" + t);
const newUserId = () => "u" + crypto.randomBytes(8).toString("hex");
const cleanName = (x) => typeof x === "string" ? x.trim().replace(/\s+/g, " ").slice(0, 40) : "";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const nameFromEmail = (e) => { const s = e.split("@")[0].replace(/[._+-]+/g, " ").trim(); return s ? s[0].toUpperCase() + s.slice(1, 40) : "Wishpool"; };

// ---- Apple identity token (a JWT signed with one of Apple's public keys) ----
let appleKeys = null, appleKeysAt = 0;
async function appleJwks(force) {
  if (!force && appleKeys && Date.now() - appleKeysAt < 6 * 3600e3) return appleKeys;
  const r = await fetch("https://appleid.apple.com/auth/keys", { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("apple_keys_" + r.status);
  appleKeys = (await r.json()).keys || [];
  appleKeysAt = Date.now();
  return appleKeys;
}
const audiences = () => String(process.env.APPLE_AUDIENCES || "app.wishpool.ios,host.exp.Exponent").split(",").map(x => x.trim()).filter(Boolean);

// The app hashed a random nonce (SHA-256, hex) into the Apple request and sends
// us the raw one: a token captured elsewhere can't be replayed here.
export async function verifyAppleToken(idToken, rawNonce, { keys = appleJwks, now = Date.now() } = {}) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("bad_token");
  const [h, p, s] = parts;
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
  const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  if (header.alg !== "RS256") throw new Error("bad_alg");
  let jwk = (await keys(false)).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await keys(true)).find(k => k.kid === header.kid); // Apple rotated its keys
  if (!jwk) throw new Error("unknown_key");
  const ok = crypto.verify("RSA-SHA256", Buffer.from(h + "." + p), crypto.createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
  if (!ok) throw new Error("bad_signature");
  if (claims.iss !== "https://appleid.apple.com") throw new Error("bad_issuer");
  if (!audiences().includes(claims.aud)) throw new Error("bad_audience");
  if (!claims.exp || claims.exp * 1000 < now) throw new Error("expired");
  if (!rawNonce || claims.nonce !== sha256(String(rawNonce))) throw new Error("bad_nonce");
  if (!claims.sub) throw new Error("no_subject");
  return { sub: String(claims.sub), email: typeof claims.email === "string" ? claims.email.toLowerCase() : null };
}

// ---- E-mail codes ----
const MAIL = {
  uk: { subject: (c) => `Код для входу в Wishpool: ${c}`, body: (c) => `Твій код для входу в Wishpool: ${c}\n\nВін діє 10 хвилин. Якщо це не ти, просто проігноруй цей лист.` },
  ru: { subject: (c) => `Код для входа в Wishpool: ${c}`, body: (c) => `Твой код для входа в Wishpool: ${c}\n\nОн действует 10 минут. Если это не ты, просто проигнорируй это письмо.` },
  en: { subject: (c) => `Your Wishpool code: ${c}`, body: (c) => `Your Wishpool sign-in code: ${c}\n\nIt works for 10 minutes. If this wasn't you, just ignore this e-mail.` },
};
async function sendCode(email, code, lang) {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) {
    // local dev: the code goes to the server log instead of an inbox
    if (!process.env.VERCEL) { console.log(`[mail] code for ${email}: ${code}`); return; }
    throw new Error("mail_not_configured");
  }
  const L = MAIL[safeLang(lang)];
  const text = L.body(code);
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#111">
    <p>${text.split("\n\n")[0].replace(code, `<b style="font-size:28px;letter-spacing:4px">${code}</b>`)}</p>
    <p style="color:#666;font-size:14px">${text.split("\n\n")[1]}</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: L.subject(code), text, html }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("mail_" + r.status);
}

export function nativeAuthRoutes(store) {
  const r = express.Router();
  r.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

  // One account per Apple ID / e-mail; the first sign-in creates it.
  // Apple shares the e-mail too, so signing in with Apple or with that same
  // address by code lands in the same account.
  const signIn = async (provider, subject, { name, email }) => {
    let id = await store.identityUser(provider, subject);
    if (!id && provider !== "email" && email) {
      id = await store.identityUser("email", email);
      if (id) await store.addIdentity(provider, subject, id);
    }
    if (!id) {
      id = newUserId();
      await store.ensureUser({ id, name: cleanName(name) || (email ? nameFromEmail(email) : "Wishpool"), photo: null, lang: null });
      await store.addIdentity(provider, subject, id);
    }
    if (provider !== "email" && email && !(await store.identityUser("email", email))) await store.addIdentity("email", email, id);
    const token = crypto.randomBytes(32).toString("base64url");
    await store.createSession(hashToken(token), id);
    const u = await store.getUser(id);
    return { token, user: { id: u.id, name: u.name, photo: u.photo || null, color: u.color || colorFor(u.id), email: email || null } };
  };

  r.post("/apple", async (req, res, next) => {
    try {
      const { identityToken, nonce, fullName, email } = req.body || {};
      let claims;
      try { claims = await verifyAppleToken(identityToken, nonce); }
      catch (e) { return res.status(401).json({ error: "apple_" + e.message }); }
      res.json(await signIn("apple", claims.sub, { name: fullName, email: claims.email || (typeof email === "string" ? email : null) }));
    } catch (e) { next(e); }
  });

  r.post("/email/start", async (req, res, next) => {
    try {
      const email = String((req.body && req.body.email) || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "bad_email" });
      if (process.env.REVIEW_EMAIL && email === process.env.REVIEW_EMAIL.toLowerCase()) return res.json({ ok: true });
      if (!(await store.noticeOnce("mail:" + email, 30000))) return res.status(429).json({ error: "too_soon" });
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
      await store.saveEmailCode(email, sha256(email + ":" + code), Date.now() + 10 * 60000);
      try { await sendCode(email, code, req.body && req.body.lang); }
      catch (e) { console.error("mail failed", e.message); return res.status(502).json({ error: "mail_failed" }); }
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  r.post("/email/verify", async (req, res, next) => {
    try {
      const email = String((req.body && req.body.email) || "").trim().toLowerCase();
      const code = String((req.body && req.body.code) || "").replace(/\D/g, "");
      if (!EMAIL_RE.test(email) || code.length !== 6) return res.status(400).json({ error: "bad_code" });
      const review = process.env.REVIEW_EMAIL && process.env.REVIEW_CODE && email === process.env.REVIEW_EMAIL.toLowerCase();
      if (review) {
        if (code !== String(process.env.REVIEW_CODE)) return res.status(401).json({ error: "bad_code" });
      } else {
        const row = await store.getEmailCode(email);
        if (!row || row.expires < Date.now()) return res.status(401).json({ error: "code_expired" });
        if (row.attempts >= 5) return res.status(429).json({ error: "too_many_attempts" });
        if (row.codeHash !== sha256(email + ":" + code)) { await store.bumpEmailCode(email); return res.status(401).json({ error: "bad_code" }); }
        await store.dropEmailCode(email);
      }
      res.json(await signIn("email", email, { email }));
    } catch (e) { next(e); }
  });

  return r;
}
