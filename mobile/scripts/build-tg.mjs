// Builds the app's web version as the Telegram Mini App into web/public/tg
// (served at wishpool.clickbrickk.com/tg; the site root sends Telegram there).
// Telegram's SDK goes into the page head so the app reads initData on start.
// Run after app changes: npm run tg-build
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "..", "web/public/tg");
fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, WP_TG: "1", EXPO_PUBLIC_API_URL: "https://wishpool.clickbrickk.com", CI: "1" },
});
const index = path.join(out, "index.html");
let html = fs.readFileSync(index, "utf8");
html = html.replace("<head>", '<head><script src="https://telegram.org/js/telegram-web-app.js"></script>');
// no pinch zoom, and room for the notch in Telegram's full screen
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />');
fs.writeFileSync(index, html);
console.log("Telegram Mini App build:", out);
