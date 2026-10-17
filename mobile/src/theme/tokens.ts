// Tokens for the iOS app (tailwind.config.js has the same colours). Surfaces
// follow the block layout: blocks (card) on a lighter page (bg) with 4pt gaps.
// Use Tailwind classes for layout; these are for props that take raw values
// (icon colors, SVG fills, shadows, gradients).
export const C = {
  bg: "#222831",
  card: "#15181D",
  card2: "#222831",
  /** cards on screens whose own fill is the block colour (profile, settings) */
  raised: "#1E2228",
  line: "rgba(255,255,255,0.08)",
  t1: "#FFFFFF",
  t2: "#8A8A8E",
  t3: "#5A5A5E",
  /** placeholder (and the search glass) in inputs: a cool grey that sits on the blue-grey fill */
  hint: "#6B7487",
  blue: "#0A82F9",
  blueSoft: "rgba(10,130,249,0.16)",
  blueLine: "rgba(10,130,249,0.45)",
  blueText: "#7FB0FF",
  green: "#34C759",
  greenText: "#7EE29A",
  danger: "#FF5A5A",
  gold: "#FFC94D",
  // the blue strip that peeks out from behind a block (sign-in prompt)
  brand: "#047DFB",
  brand2: "#2290F6",
} as const;

// Exactly two control heights.
export const H = { lg: 52, sm: 40 } as const;
export const R = { card: 26, tile: 18, sheet: 32, pill: 999 } as const;
// Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
export const S = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const ROOM_COLORS = ["#0A82F9", "#38BDF8", "#34C759", "#FF7A45", "#FF4D8D", "#AF52DE"];

export function hex(h: string, a: number): string {
  const n = h.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function mixHex(c1: string, c2: string, k: number): string {
  const p = (c: string) => [0, 2, 4].map((i) => parseInt(c.replace("#", "").slice(i, i + 2), 16));
  const a = p(c1), b = p(c2);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
