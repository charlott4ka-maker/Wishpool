// Alternate app icons (Premium). Icon files are declared in app.json under the
// expo-alternate-app-icons plugin; names here must match those entries.

import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";

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

export const appIconsSupported = (): boolean => {
  try {
    return supportsAlternateIcons;
  } catch {
    return false; // Expo Go / web: the native module isn't there
  }
};

export function currentAppIcon(): AppIconOption["name"] {
  try {
    return (getAppIconName() as AppIconOption["name"]) || null;
  } catch {
    return null;
  }
}

export async function changeAppIcon(name: AppIconOption["name"], isPremium: boolean): Promise<boolean> {
  if (name && !isPremium) return false; // going back to the default icon is always allowed
  if (!appIconsSupported()) return false;
  await setAlternateAppIcon(name);
  return true;
}
