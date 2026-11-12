// Support as a chat: people write from the app (Settings › Support), the admin
// page answers in its «Поддержка» tab. Each new message from a person is also
// mailed to support@; an answer is mailed to the person when they signed in
// with an e-mail, and waits in the app with a red count on the Support row.
import { mailSupport } from "./moderation.js";
import { uid } from "./util.js";

const REPLY_MAIL = {
  uk: { subject: "Відповідь підтримки Wishpool", foot: "Відповісти можна в застосунку: Налаштування › Підтримка." },
  ru: { subject: "Ответ поддержки Wishpool", foot: "Ответить можно в приложении: Настройки › Поддержка." },
  en: { subject: "Wishpool support replied", foot: "You can answer in the app: Settings › Support." },
};
async function mailUser(to, lang, text) {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  const L = REPLY_MAIL[lang] || REPLY_MAIL.en;
  if (!key || !from) { if (!process.env.VERCEL) console.log(`[mail] to ${to}: ${text}`); return; }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: L.subject, text: `${text}\n\n${L.foot}` }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}

const clean = (t) => (typeof t === "string" ? t.replace(/\r/g, "").trim().slice(0, 4000) : "");

export function supportRoutes(api, store, isAdmin) {
  // the person's own chat; opening it marks the answers read
  api.get("/support", async (req, res, next) => {
    try {
      const msgs = await store.supportMsgs(req.user.id);
      if (msgs.length) await store.markSupport(req.user.id, "user", Date.now());
      res.json({ messages: msgs });
    } catch (e) { next(e); }
  });
  api.post("/support", async (req, res, next) => {
    try {
      if (req.user.id === "demo") return res.status(400).json({ error: "demo" });
      const text = clean(req.body && req.body.text);
      if (!text) return res.status(400).json({ error: "empty" });
      const meta = typeof req.body.meta === "string" ? req.body.meta.slice(0, 200) : "";
      const m = { id: uid("sp"), userId: req.user.id, author: "user", text, at: Date.now() };
      await store.addSupportMsg(m, meta);
      const [u, emails] = await Promise.all([store.getUser(req.user.id), store.userEmails(req.user.id)]);
      await mailSupport(`Wishpool: сообщение в поддержку от ${u ? u.name : req.user.id}`, `${text}\n\n— ${u ? u.name : ""} (${req.user.id})${emails.length ? " " + emails.join(", ") : ""}\n${meta}\nОтветить: wishpool.clickbrickk.com/admin › Поддержка`);
      res.json({ message: m });
    } catch (e) { next(e); }
  });

  const guard = async (req, res, next) => {
    try { if (await isAdmin(req)) return next(); res.status(403).json({ error: "not_admin" }); } catch (e) { next(e); }
  };
  api.get("/admin/support", guard, async (_req, res, next) => {
    try { res.json({ threads: await store.supportThreads() }); } catch (e) { next(e); }
  });
  api.get("/admin/support/:userId", guard, async (req, res, next) => {
    try {
      const id = String(req.params.userId);
      const [thread, messages, user, emails] = await Promise.all([store.supportThread(id), store.supportMsgs(id), store.getUser(id), store.userEmails(id)]);
      if (!thread) return res.status(404).json({ error: "no_thread" });
      await store.markSupport(id, "admin", Date.now());
      res.json({ thread, messages, user: user && { id: user.id, name: user.name, photo: user.photo }, email: emails[0] || "" });
    } catch (e) { next(e); }
  });
  api.post("/admin/support/:userId", guard, async (req, res, next) => {
    try {
      const id = String(req.params.userId);
      const text = clean(req.body && req.body.text);
      if (!text) return res.status(400).json({ error: "empty" });
      if (!(await store.supportThread(id))) return res.status(404).json({ error: "no_thread" });
      const m = { id: uid("sp"), userId: id, author: "admin", text, at: Date.now() };
      await store.addSupportMsg(m);
      // answered: the thread counts as done until they write again
      await store.setSupportStatus(id, "done");
      const [emails, lang] = await Promise.all([store.userEmails(id), store.userLang(id)]);
      if (emails[0]) await mailUser(emails[0], lang, text);
      res.json({ message: m, mailed: !!emails[0] });
    } catch (e) { next(e); }
  });
  api.post("/admin/support/:userId/status", guard, async (req, res, next) => {
    try {
      await store.setSupportStatus(String(req.params.userId), req.body && req.body.status === "done" ? "done" : "open");
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}
