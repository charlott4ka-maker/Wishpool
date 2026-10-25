// Builds the web version of the app for the admin page's phone preview into
// web/public/admin/preview (served at wishpool.clickbrickk.com/admin/preview),
// then refreshes app-data.json (texts, stickers, and which screen shows which text).
// Run after app changes worth previewing: npm run admin-preview
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "..", "web/public/admin/preview");
fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, WP_PREVIEW: "1", EXPO_PUBLIC_API_URL: "https://wishpool.clickbrickk.com", CI: "1" },
});
execSync("node --experimental-strip-types scripts/export-admin-data.mjs", { cwd: root, stdio: "inherit" });
