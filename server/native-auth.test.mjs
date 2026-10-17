// iOS sign-in endpoints: node server/native-auth.test.mjs (PGLITE_TEST=1 for Postgres)
import crypto from "crypto";
import assert from "assert";
import { createApp } from "./app.js";
import { verifyAppleToken } from "./native-auth.js";

const logs = [];
const log0 = console.log;
console.log = (...a) => { logs.push(a.join(" ")); };
process.env.REVIEW_EMAIL = "review@wishpool.test"; process.env.REVIEW_CODE = "424242";
const app = await createApp();
app.use((err, _q, res, _n) => { log0(err); res.status(500).json({ error: "server_error" }); });
const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}`;
const call = async (method, path, body, token) => {
  const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
try {
  // e-mail code
  assert.equal((await call("POST", "/api/auth/email/start", { email: "bad" })).status, 400);
  assert.equal((await call("POST", "/api/auth/email/start", { email: "Anna.K@Example.com" })).status, 200);
  assert.equal((await call("POST", "/api/auth/email/start", { email: "anna.k@example.com" })).status, 429);
  const code = logs.find(l => l.includes("anna.k@example.com")).match(/(\d{6})$/)[1];
  assert.equal((await call("POST", "/api/auth/email/verify", { email: "anna.k@example.com", code: code === "000000" ? "111111" : "000000" })).status, 401);
  const ok = await call("POST", "/api/auth/email/verify", { email: "anna.k@example.com", code });
  assert.equal(ok.status, 200); assert.equal(ok.body.user.name, "Anna k");
  const tok = ok.body.token;
  assert.equal((await call("POST", "/api/auth/email/verify", { email: "anna.k@example.com", code })).status, 401, "code is single-use");
  // signed-in API
  const st = await call("GET", "/api/state", null, tok); assert.equal(st.status, 200); assert.equal(st.body.me.id, ok.body.user.id);
  assert.equal((await call("GET", "/api/state", null, "x".repeat(40))).status, 401);
  assert.equal((await call("PATCH", "/api/me", { name: "  Аня  " }, tok)).body.user.name, "Аня");
  assert.equal((await call("PATCH", "/api/me", { name: "" }, tok)).status, 400);
  // review account, rooms, invites
  const rv = await call("POST", "/api/auth/email/verify", { email: "review@wishpool.test", code: "424242" });
  assert.equal(rv.status, 200);
  const w = await call("POST", "/api/wishes", { title: "Headphones" }, tok); assert.equal(w.status, 200);
  const room = (await call("POST", "/api/rooms", { name: "Friends", type: "friends" }, tok)).body.room;
  await call("POST", `/api/wishes/${w.body.wish.id}/room`, { roomId: room.id }, tok);
  assert.equal((await call("GET", `/api/rooms/${room.id}/peek`, null, rv.body.token)).body.room.memberCount, 1);
  assert.equal((await call("POST", `/api/rooms/${room.id}/join`, { inviterId: ok.body.user.id }, rv.body.token)).status, 200);
  assert.equal((await call("POST", `/api/wishes/${w.body.wish.id}/reserve`, null, rv.body.token)).status, 200);
  // same e-mail again -> same account
  await new Promise(r => setTimeout(r, 0));
  // delete: the room goes to the other member, the session dies
  assert.equal((await call("DELETE", "/api/me", null, tok)).status, 200);
  assert.equal((await call("GET", "/api/state", null, tok)).status, 401);
  const after = await call("GET", `/api/rooms/${room.id}`, null, rv.body.token);
  assert.equal(after.status, 200); assert.equal(after.body.room.owner, true); assert.equal(after.body.members.length, 1); assert.equal(after.body.lists.length, 0);
  assert.equal((await call("GET", "/api/gifts", null, rv.body.token)).body.gifts.length, 0);
  // sign out drops the session
  await call("POST", "/api/sign-out", null, rv.body.token);
  assert.equal((await call("GET", "/api/state", null, rv.body.token)).status, 401);

  // Apple token check with our own key standing in for Apple's
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256" };
  const nonce = "raw-nonce";
  const mk = (claims, key = privateKey) => {
    const h = Buffer.from(JSON.stringify({ alg: "RS256", kid: "k1" })).toString("base64url");
    const p = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), key).toString("base64url")}`;
  };
  const good = { iss: "https://appleid.apple.com", aud: "app.wishpool.ios", exp: Date.now() / 1000 + 600, sub: "001.abc", email: "A@B.com", nonce: crypto.createHash("sha256").update(nonce).digest("hex") };
  const keys = async () => [jwk];
  assert.deepEqual(await verifyAppleToken(mk(good), nonce, { keys }), { sub: "001.abc", email: "a@b.com" });
  assert.deepEqual(await verifyAppleToken(mk({ ...good, aud: "host.exp.Exponent" }), nonce, { keys }), { sub: "001.abc", email: "a@b.com" });
  for (const [bad, n, why] of [[{ ...good, aud: "other" }, nonce, "bad_audience"], [{ ...good, exp: 1 }, nonce, "expired"], [good, "other", "bad_nonce"], [{ ...good, iss: "x" }, nonce, "bad_issuer"]]) {
    await assert.rejects(verifyAppleToken(mk(bad), n, { keys }), new RegExp(why));
  }
  const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  await assert.rejects(verifyAppleToken(mk(good, other), nonce, { keys }), /bad_signature/);
  assert.equal((await call("POST", "/api/auth/apple", { identityToken: "a.b.c", nonce })).status, 401);
  log0("smoke ok", process.env.PGLITE_TEST ? "(pglite)" : "(memory)");
} finally { srv.close(); }
process.exit(0);
