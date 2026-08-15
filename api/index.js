import { createApp } from "../server/app.js";

// Cached across warm invocations of the same function instance so the
// Postgres pool (created inside createApp -> getStore) is reused instead of
// reconnecting on every request.
let appPromise;
function getApp() {
  if (!appPromise) {
    appPromise = createApp().then(app => {
      app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "server_error" }); });
      return app;
    });
  }
  return appPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  app(req, res);
}
