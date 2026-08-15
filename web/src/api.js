// Wishpool API client. Same-origin by default (the server serves this app).
// Inside Telegram, requests are authenticated automatically via initData.
const BASE = ""; // set to your API origin if you host the API separately

function initData() { try { return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || ""; } catch (e) { return ""; } }
function startParam() { try { return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || null; } catch (e) { return null; } }
function headers() { const h = { "Content-Type": "application/json" }; const d = initData(); if (d) h["X-Init-Data"] = d; return h; }
async function req(method, path, body) {
  const res = await fetch(BASE + "/api" + path, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { let e = {}; try { e = await res.json(); } catch (x) {} throw new Error(e.error || ("http_" + res.status)); }
  return res.json();
}

export const api = {
  // true when running inside Telegram (real multiplayer). Otherwise fall back to local mode.
  online: () => !!initData(),
  startRoomId: startParam,           // room id from an invite deep-link (?startapp=<roomId>)
  me: () => req("GET", "/me"),
  state: () => req("GET", "/state"),
  createWish: (w) => req("POST", "/wishes", w),
  deleteWish: (id) => req("DELETE", "/wishes/" + id),
  toggleWishRoom: (id, roomId) => req("POST", "/wishes/" + id + "/room", { roomId }),
  createRoom: (r) => req("POST", "/rooms", r),
  joinRoom: (id) => req("POST", "/rooms/" + id + "/join"),
  room: (id) => req("GET", "/rooms/" + id),
  reserve: (id) => req("POST", "/wishes/" + id + "/reserve"),
  unreserve: (id) => req("DELETE", "/wishes/" + id + "/reserve"),
  runDraw: (id, budget) => req("POST", "/rooms/" + id + "/draw", { budget }),
  draw: (id) => req("GET", "/rooms/" + id + "/draw"),
};
