// app.json as is, except for the admin page's phone preview (WP_PREVIEW=1,
// scripts/build-admin-preview.mjs): that web build lives under /admin/preview.
module.exports = ({ config }) =>
  process.env.WP_PREVIEW ? { ...config, experiments: { ...config.experiments, baseUrl: "/admin/preview" } } : config;
