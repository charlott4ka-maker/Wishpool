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
const strings = { ...WEB_STRINGS, ...MOBILE_STRINGS };

// Which screen shows which text, for the preview: every file's string literals
// that are text keys, then for each key the screen that reaches that file in
// the fewest imports. Screens with an id open the demo's room / wish.
const ROUTES = [
  ["app/(tabs)/(wishes)/index.tsx", "/"], ["app/(tabs)/_layout.tsx", "/"], ["app/(tabs)/rooms/index.tsx", "/rooms"],
  ["app/(tabs)/profile.tsx", "/profile"], ["app/room/[id].tsx", "/room/r-friends"], ["app/wish/[id].tsx", "/wish/w1"],
  ["app/wish/new.tsx", "/wish/new"], ["app/room/new.tsx", "/room/new"], ["app/room/pick.tsx", "/room/pick?id=r-friends"],
  ["app/settings.tsx", "/settings"], ["app/faq.tsx", "/faq"], ["app/birthday.tsx", "/birthday"], ["app/profile-edit.tsx", "/profile-edit"],
  ["app/onboarding.tsx", "/onboarding"], ["app/sign-in-options.tsx", "/sign-in-options"],
];
const files = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const f = path.join(d, e.name);
  if (e.isDirectory()) walk(f); else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && !/i18n/.test(f)) files[path.relative(src, f)] = fs.readFileSync(f, "utf8");
});
walk(src);
const resolve = (from, spec) => {
  const base = path.join(path.dirname(from), spec);
  return [base + ".tsx", base + ".ts", path.join(base, "index.tsx"), path.join(base, "index.ts")].find((c) => files[c]);
};
const imports = Object.fromEntries(Object.entries(files).map(([f, code]) => [f, [...code.matchAll(/from\s+"(\.\.?\/[^"]+)"/g)].map((m) => resolve(f, m[1])).filter(Boolean)]));
const keysIn = Object.fromEntries(Object.entries(files).map(([f, code]) => [f, [...new Set([...code.matchAll(/"([A-Za-z0-9_]+)"/g)].map((m) => m[1]).filter((k) => strings[k]))]]));
const best = {};
ROUTES.forEach(([file, url], order) => {
  const dist = { [file]: 0 }, queue = [file];
  while (queue.length) {
    const f = queue.shift();
    for (const k of keysIn[f] || []) {
      const score = dist[f] * 100 + order;
      if (!best[k] || score < best[k][0]) best[k] = [score, url];
    }
    for (const g of imports[f] || []) if (!(g in dist)) { dist[g] = dist[f] + 1; queue.push(g); }
  }
});
const screens = Object.fromEntries(Object.entries(best).map(([k, v]) => [k, v[1]]));
const out = { strings, stickers: { bundled, inPicker }, screens };
const file = path.join(here, "..", "..", "web/public/admin/app-data.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out));
console.log(`app-data.json: ${Object.keys(out.strings).length} texts (${Object.keys(screens).length} on a screen), ${bundled.length} stickers (${inPicker.length} in the picker)`);
