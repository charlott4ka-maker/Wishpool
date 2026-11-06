// app.json as is, except for the web builds: the admin page's phone preview
// (WP_PREVIEW=1, scripts/build-admin-preview.mjs) lives under /admin/preview and
// the Telegram Mini App (WP_TG=1, scripts/build-tg.mjs) under /tg.
module.exports = ({ config }) =>
  process.env.WP_PREVIEW
    ? { ...config, experiments: { ...config.experiments, baseUrl: "/admin/preview" } }
    : process.env.WP_TG
      ? { ...config, experiments: { ...config.experiments, baseUrl: "/tg" } }
      : config;
