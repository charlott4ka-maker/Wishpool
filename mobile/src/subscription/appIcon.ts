// Alternate app icons (Premium). Icon files are declared in app.json under the
// expo-alternate-app-icons plugin; names here must match those entries.

import type { StickerName } from "../components/stickerAssets";

export type AppIconOption = {
  /** null = the default icon. */
  name: "Ocean" | "Blush" | "Matcha" | null;
  titleKey: string;
  sticker: StickerName;
  tint: string;
};

export const APP_ICONS: AppIconOption[] = [
  { name: null, titleKey: "iconClassic", sticker: "gift", tint: "#161618" },
  { name: "Ocean", titleKey: "iconOcean", sticker: "gift", tint: "#2E7DF6" },
  { name: "Blush", titleKey: "iconBlush", sticker: "kitty", tint: "#FF4D8D" },
  { name: "Matcha", titleKey: "iconMatcha", sticker: "matcha", tint: "#34C759" },
];

// Required lazily: the native module isn't in Expo Go or on web, and a
// top-level import would crash the Profile tab there.
type IconsModule = typeof import("expo-alternate-app-icons");
let mod: IconsModule | null | undefined;
function icons(): IconsModule | null {
  if (mod === undefined) {
    try {
      mod = require("expo-alternate-app-icons") as IconsModule;
    } catch {
      mod = null;
    }
  }
  return mod;
}

export const appIconsSupported = (): boolean => {
  try {
    return !!icons()?.supportsAlternateIcons;
  } catch {
    return false;
  }
};

export function currentAppIcon(): AppIconOption["name"] {
  try {
    return (icons()?.getAppIconName() as AppIconOption["name"]) || null;
  } catch {
    return null;
  }
}

export async function changeAppIcon(name: AppIconOption["name"], isPremium: boolean): Promise<boolean> {
  if (name && !isPremium) return false; // going back to the default icon is always allowed
  if (!appIconsSupported()) return false;
  await icons()!.setAlternateAppIcon(name);
  return true;
}
