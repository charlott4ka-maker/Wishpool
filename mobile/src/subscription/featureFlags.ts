// What Premium unlocks. Every gate in the UI goes through these helpers, so a
// limit changes in one place.

import type { StickerName } from "../components/stickerAssets";

export type PremiumFeature = "stickerPacks" | "extraPhotos" | "appIcons";

export const PLAN_LIMITS = {
  free: { photosPerWish: 1 },
  // The backend keeps up to 3 photos per wish (MAX_IMAGES in server/util.js).
  // Raise both together to go up to 5.
  premium: { photosPerWish: 3 },
} as const;

export function photoLimit(isPremium: boolean): number {
  return (isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.free).photosPerWish;
}

export type StickerPack = {
  id: string;
  /** i18n key of the pack name. */
  titleKey: string;
  stickers: StickerName[];
  isPremiumOnly: boolean;
};

// Same order as STICKERS in web/src/App.jsx, so rooms and wishes created on
// either app pick from the same grid.
export const STICKER_PACKS: StickerPack[] = [
  {
    id: "classic",
    titleKey: "packClassic",
    isPremiumOnly: false,
    stickers: [
      "candle", "ghost", "coconut", "shell", "uno", "orange", "matcha", "flower", "bear", "plumbob", "bag", "qblock",
      "cake", "gift", "piggy", "headphones", "book", "sneakers", "lipstick", "plane", "kitty", "ring", "picture", "gamepad",
    ],
  },
  {
    // Placeholder contents until the exclusive 3D pack is drawn: drop new WebPs
    // into assets/stickers, re-run the asset list, and list them here.
    id: "party",
    titleKey: "packParty",
    isPremiumOnly: true,
    stickers: ["basket", "bulb", "envelope", "eyes", "note"],
  },
];

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
