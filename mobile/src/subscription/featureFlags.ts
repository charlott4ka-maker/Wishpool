// What Premium unlocks. Every gate in the UI goes through these helpers, so a
// limit changes in one place.

import type { StickerName } from "../components/stickerAssets";

// Premium is hidden for now: no paywall, no Premium card, no locked packs or
// icons, no upsell hints. Everything stays in the code; flip to true to bring it back.
// The TestFlight test build turns it on with EXPO_PUBLIC_PREMIUM=1 (eas.json
// profile "testflight", and in `eas update --channel testflight`).
export const PREMIUM_ENABLED = process.env.EXPO_PUBLIC_PREMIUM === "1";

export type PremiumFeature = "stickerPacks" | "extraPhotos" | "appIcons";

export const PLAN_LIMITS = {
  free: { photosPerWish: 1 },
  // The backend keeps up to 3 photos per wish (MAX_IMAGES in server/util.js).
  // Raise both together to go up to 5.
  premium: { photosPerWish: 3 },
} as const;

export function photoLimit(isPremium: boolean): number {
  // While Premium is hidden everyone gets 3 photos, same as the Mini App.
  if (!PREMIUM_ENABLED) return PLAN_LIMITS.premium.photosPerWish;
  return (isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.free).photosPerWish;
}

export type StickerPack = {
  id: string;
  /** i18n key of the pack name. */
  titleKey: string;
  stickers: StickerName[];
  isPremiumOnly: boolean;
};

// Same order as STICKERS in web/src/App.jsx, minus the branded ones.
export const STICKER_PACKS: StickerPack[] = [
  {
    id: "classic",
    titleKey: "packClassic",
    isPremiumOnly: false,
    stickers: [
      // no branded ones (McDonald's bag, Nike sneakers, Hello Kitty, Sims plumbob,
      // Mario block): their files stay so older wishes and rooms still show them
      "candle", "ghost", "coconut", "shell", "uno", "orange", "matcha", "flower", "bear",
      "cake", "gift", "piggy", "headphones", "book", "lipstick", "plane", "ring", "picture", "gamepad",
    ],
  },
  {
    // New Year: only in the Secret Santa room's picker (pack="newyear")
    id: "newyear",
    titleKey: "packNewYear",
    isPremiumOnly: false,
    stickers: ["santa", "tree", "snowman", "gingerbread", "bauble", "reindeer"],
  },
  {
    // the exclusive Premium pack (from her references, 2026-11): an evil eye, a
    // burgundy bow, a glass heart, an 8 ball, a CD with pixel stars, a disco ball
    // and a brown camera (the last three cut straight from her pictures)
    id: "party",
    titleKey: "packParty",
    isPremiumOnly: true,
    stickers: ["disc", "disco", "camera", "evileye", "bow", "glassheart", "ball8"],
  },
];

export const NEW_YEAR_STICKERS = ["santa", "tree", "snowman", "gingerbread", "bauble", "reindeer"].map((n) => `stk:${n}`);

export const stickerId = (name: StickerName) => `stk:${name}`;

export function isStickerLocked(emoji: string, isPremium: boolean): boolean {
  if (isPremium || !emoji.startsWith("stk:")) return false;
  const name = emoji.slice(4);
  return STICKER_PACKS.some((p) => p.isPremiumOnly && (p.stickers as string[]).includes(name));
}

export function canUse(feature: PremiumFeature, isPremium: boolean): boolean {
  switch (feature) {
    case "stickerPacks":
    case "appIcons":
      return isPremium;
    case "extraPhotos":
      return isPremium;
  }
}

/** The packs in the admin page's order (any it doesn't list keep the app's order, after). */
export function orderedPacks(order?: string[]): StickerPack[] {
  const o = order || [];
  const rank = (id: string) => (o.includes(id) ? o.indexOf(id) : o.length + STICKER_PACKS.findIndex((p) => p.id === id));
  return [...STICKER_PACKS].sort((a, b) => rank(a.id) - rank(b.id));
}

/** A pack's stickers in the admin page's order (new ones it doesn't list keep their place, after). */
export function orderedNames(names: string[], order?: string[]): string[] {
  const o = (order || []).filter((n) => names.includes(n));
  return [...o, ...names.filter((n) => !o.includes(n))];
}

/** The sticker a new room or wish starts with: the first classic sticker in the
 *  admin page's order (not hidden), else the candle. */
export function defaultSticker(cfg?: { order?: Record<string, string[]>; hidden?: string[] }): string {
  const classic = STICKER_PACKS.find((p) => p.id === "classic");
  const hidden = new Set(cfg?.hidden || []);
  const first = classic ? orderedNames(classic.stickers as string[], cfg?.order?.classic).find((n) => !hidden.has(n)) : undefined;
  return first ? `stk:${first}` : "stk:candle";
}
