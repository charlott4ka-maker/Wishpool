// Push to the iPhone app through Expo's push service (free; Expo hands it to
// Apple with the APNs key set up in EAS credentials). The app registers its
// push address (POST /api/push-token) once notifications are on, and drops it
// when they're turned off. Telegram people get the bot's messages instead.

const EXPO = "https://exp.host/--/api/v2/push/send";
const OK = /^ExponentPushToken\[[\w-]{10,80}\]$/;
export const goodPushToken = (t) => typeof t === "string" && OK.test(t);

/** Send one line to every phone of this person; addresses Apple says are gone are dropped. */
export async function pushTo(store, userId, make, data = {}) {
  let tokens = [];
  try { tokens = await store.pushTokens(userId); } catch (e) { return 0; }
  if (!tokens.length) return 0;
  const messages = tokens.map((t) => ({ to: t.token, body: make(t.lang), data, sound: "default" }));
  try {
    const res = await fetch(EXPO, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(messages) });
    const out = await res.json().catch(() => null);
    const tickets = (out && out.data) || [];
    let sent = 0;
    await Promise.all(tickets.map(async (tk, i) => {
      if (tk && tk.status === "ok") sent++;
      else if (tk && tk.details && tk.details.error === "DeviceNotRegistered") await store.dropPushToken(messages[i].to).catch(() => {});
    }));
    return sent;
  } catch (e) { return 0; }
}

export function pushRoutes(api, store) {
  api.post("/push-token", async (req, res) => {
    const { token, lang } = req.body || {};
    if (!goodPushToken(token)) return res.status(400).json({ error: "bad_token" });
    await store.setPushToken(req.user.id, token, ["uk", "ru", "en"].includes(lang) ? lang : null);
    res.json({ ok: true });
  });
  api.delete("/push-token", async (req, res) => {
    const token = req.body && req.body.token;
    if (goodPushToken(token)) await store.dropPushToken(token, req.user.id);
    res.json({ ok: true });
  });
}
