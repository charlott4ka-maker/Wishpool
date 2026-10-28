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
  const room = (await call("POST", "/api/rooms", { name: "Friends", type: "friends", stickerPos: "0.5,0.4" }, tok)).body.room;
  // the sticker's spot on the folder: kept, changed, and junk ignored
  const roomPos = async () => (await call("GET", "/api/state", null, tok)).body.rooms.find(r => r.id === room.id).stickerPos;
  assert.equal(await roomPos(), "0.5,0.4");
  await call("PATCH", `/api/rooms/${room.id}`, { name: "Friends", stickerPos: "0.2,0.6" }, tok);
  assert.equal(await roomPos(), "0.2,0.6");
  await call("PATCH", `/api/rooms/${room.id}`, { name: "Friends", stickerPos: "9,9" }, tok);
  assert.equal(await roomPos(), "");
  await call("POST", `/api/wishes/${w.body.wish.id}/room`, { roomId: room.id }, tok);
  assert.equal((await call("GET", `/api/rooms/${room.id}/peek`, null, rv.body.token)).body.room.memberCount, 1);
  assert.equal((await call("POST", `/api/rooms/${room.id}/join`, { inviterId: ok.body.user.id }, rv.body.token)).status, 200);
  // the folder shows friends' wish photos too
  const pic = await call("POST", "/api/wishes", { title: "Lamp", images: ["data:image/png;base64,iVBORw0KGgo="], rooms: [room.id] }, tok);
  const rvRoom = (await call("GET", "/api/state", null, rv.body.token)).body.rooms.find(r => r.id === room.id);
  assert.equal(rvRoom.photos.length, 1); assert.match(rvRoom.photos[0], /^\/api\/img\//);
  await call("DELETE", `/api/wishes/${pic.body.wish.id}`, null, tok);
  assert.equal((await call("POST", `/api/wishes/${w.body.wish.id}/reserve`, null, rv.body.token)).status, 200);
  // report and block: the reviewer reports Anna's wish, blocks her, her wishes leave the room
  const anna = ok.body.user.id, rvt = rv.body.token;
  assert.equal((await call("POST", "/api/reports", { wishId: w.body.wish.id, roomId: room.id, reason: "spam" }, rvt)).status, 200);
  assert.equal((await call("POST", "/api/reports", { userId: rv.body.user.id }, rvt)).status, 400, "not yourself");
  assert.equal((await call("GET", "/api/admin/reports", null, rvt)).status, 403);
  assert.equal((await call("GET", `/api/rooms/${room.id}`, null, rvt)).body.lists[0].wishes.length, 1);
  assert.equal((await call("POST", "/api/blocks", { userId: anna }, rvt)).status, 200);
  const blk = (await call("GET", `/api/rooms/${room.id}`, null, rvt)).body;
  assert.equal(blk.lists[0].wishes.length, 0); assert.equal(blk.lists[0].member.blocked, true);
  await call("DELETE", `/api/blocks/${anna}`, null, rvt);
  assert.equal((await call("GET", `/api/rooms/${room.id}`, null, rvt)).body.lists[0].wishes.length, 1);
  process.env.ADMIN_EMAILS = "review@wishpool.test";
  const reps = (await call("GET", "/api/admin/reports", null, rvt)).body.reports;
  assert.equal(reps.length, 1); assert.equal(reps[0].wish.title, "Headphones"); assert.equal(reps[0].user.id, anna);
  const stats = (await call("GET", "/api/admin/stats", null, rvt)).body;
  assert.equal(stats.ios, 2); assert.equal(stats.reports, 1); assert.equal(stats.days.length, 14);
  await call("DELETE", `/api/admin/reports/${reps[0].id}`, null, rvt);
  assert.equal((await call("GET", "/api/admin/reports", null, rvt)).body.reports.length, 0);
  delete process.env.ADMIN_EMAILS;
  // admin page: login + password from the environment
  assert.equal((await call("POST", "/api/admin-login", { login: "a", password: "b" })).status, 503);
  Object.assign(process.env, { ADMIN_LOGIN: "Panel@Wishpool.app", ADMIN_PASSWORD: "s3cret-pass" });
  assert.equal((await call("POST", "/api/admin-login", { login: "panel@wishpool.app", password: "nope" })).status, 401);
  assert.equal((await call("POST", "/api/admin-login", { login: "panel@wishpool.app", password: "s3cret-pass" })).status, 429, "one try per 3s");
  await new Promise(r => setTimeout(r, 3100));
  const adm = await call("POST", "/api/admin-login", { login: "panel@wishpool.app", password: "s3cret-pass" });
  assert.equal(adm.status, 200);
  assert.equal((await call("GET", "/api/admin/reports", null, adm.body.token)).status, 200);
  assert.equal((await call("GET", "/api/admin/stats", null, adm.body.token)).status, 200);
  delete process.env.ADMIN_LOGIN; delete process.env.ADMIN_PASSWORD;
  // same e-mail again -> same account
  await new Promise(r => setTimeout(r, 0));
  // delete: the room goes to the other member, the session dies
  assert.equal((await call("DELETE", "/api/me", null, tok)).status, 200);
  assert.equal((await call("GET", "/api/state", null, tok)).status, 401);
  const after = await call("GET", `/api/rooms/${room.id}`, null, rv.body.token);
  assert.equal(after.status, 200); assert.equal(after.body.room.owner, true); assert.equal(after.body.members.length, 1); assert.equal(after.body.lists.length, 0);
  assert.equal((await call("GET", "/api/gifts", null, rv.body.token)).body.gifts.length, 0);
  // avatar: uploaded to the bucket (stubbed here) and kept as our own /p/ path
  Object.assign(process.env, { R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "k", R2_SECRET_ACCESS_KEY: "s", R2_BUCKET: "b", R2_PUBLIC_URL: "https://pub.test" });
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => String(url).includes("r2.cloudflarestorage.com") ? Promise.resolve(new Response("", { status: 200 })) : realFetch(url, opts);
  const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
  const av = await call("PATCH", "/api/me", { name: "Rev", photo: jpg }, rv.body.token);
  assert.match(av.body.user.photo, /^\/p\/u\/u[0-9a-f]+\/[0-9a-f]+\.jpg$/);
  // sent back unchanged (the app strips its site again): the photo stays
  assert.equal((await call("PATCH", "/api/me", { name: "Rev", photo: av.body.user.photo }, rv.body.token)).body.user.photo, av.body.user.photo);
  assert.equal((await call("PATCH", "/api/me", { name: "Rev", photo: null }, rv.body.token)).body.user.photo, null);
  // admin page: only ADMIN_EMAILS get in; config is public, banners only when active
  assert.equal((await call("GET", "/api/admin/config", null, rv.body.token)).status, 403);
  process.env.ADMIN_EMAILS = "Review@wishpool.test";
  assert.equal((await call("GET", "/api/admin/config", null, rv.body.token)).status, 200);
  await call("PUT", "/api/admin/config/strings", { value: { poolTitle: { ru: "Хотелки" }, "bad key!": { ru: "x" } } }, rv.body.token);
  await call("PUT", "/api/admin/config/banners", { value: [
    { id: "save", active: true, audience: "signedIn", text: { ru: "Привет" }, color1: "#ff0000", textColor: "#000000", action: "link", url: "https://example.com" },
    { id: "off", active: false, text: { ru: "Нет" } },
  ] }, rv.body.token);
  const up = await call("POST", "/api/admin/sticker", { name: "star-new", image: "data:image/webp;base64,UklGRg==" }, rv.body.token);
  assert.equal(up.status, 200);
  assert.equal((await call("POST", "/api/admin/sticker", { name: "star-new", image: "data:image/webp;base64,UklGRg==" }, rv.body.token)).status, 409);
  assert.equal((await call("POST", "/api/admin/sticker", { name: "x", image: "data:image/png;base64,AAAA" }, rv.body.token)).status, 400);
  await call("PUT", "/api/admin/config/stickers", { value: { hidden: ["uno", "BAD NAME"], extra: up.body.value.extra } }, rv.body.token);
  const pub = await call("GET", "/api/config");
  assert.deepEqual(pub.body.strings, { poolTitle: { ru: "Хотелки" } });
  assert.equal(pub.body.banners.length, 1);
  assert.equal(pub.body.banners[0].color2, "#ff0000");
  assert.deepEqual(pub.body.stickers, { hidden: ["uno"], extra: [{ name: "star-new" }] });
  delete process.env.ADMIN_EMAILS;

  globalThis.fetch = realFetch;
  for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"]) delete process.env[k];

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
