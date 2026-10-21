// Writes web/public/admin/app-data.json for the admin page: every app text
// (key -> uk/ru/en) and the bundled stickers with the ones in the picker.
// Run after changing texts or stickers: node --experimental-strip-types mobile/scripts/export-admin-data.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "src");
const { WEB_STRINGS } = await import(path.join(src, "i18n/webStrings.ts"));
const { MOBILE_STRINGS } = await import(path.join(src, "i18n/mobileStrings.ts"));
const bundled = fs.readdirSync(path.join(here, "..", "assets/stickers")).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)).sort();
const flags = fs.readFileSync(path.join(src, "subscription/featureFlags.ts"), "utf8");
const inPicker = [...flags.matchAll(/stickers:\s*\[([\s\S]*?)\]/g)].flatMap((m) => [...m[1].replace(/\/\/.*$/gm, "").matchAll(/"([a-z0-9_-]+)"/g)].map((x) => x[1]));
const out = { strings: { ...WEB_STRINGS, ...MOBILE_STRINGS }, stickers: { bundled, inPicker } };
const file = path.join(here, "..", "..", "web/public/admin/app-data.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out));
console.log(`app-data.json: ${Object.keys(out.strings).length} texts, ${bundled.length} stickers (${inPicker.length} in the picker)`);
