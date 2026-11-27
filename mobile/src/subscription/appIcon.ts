// Alternate app icons (Premium). Icon files are declared in app.json under the
// expo-alternate-app-icons plugin; names here must match those entries.

import { requireOptionalNativeModule } from "expo";

import type { ImageSourcePropType } from "react-native";

export type AppIconName = "Glow" | "NewYear" | null;

export type AppIconOption = {
  /** null = the default icon. */
  name: AppIconName;
  titleKey: string;
  image: ImageSourcePropType;
  /** only in the New Year season */
  season?: "newYear";
};

// the default star; the Premium one (a glass star glowing on our dark blue);
// and the same icon in burgundy with the New Year star
export const APP_ICONS: AppIconOption[] = [
  { name: null, titleKey: "iconClassic", image: require("../../assets/icon.png") },
  { name: "Glow", titleKey: "iconGlow", image: require("../../assets/icons/glow.png") },
  { name: "NewYear", titleKey: "iconNewYear", image: require("../../assets/icons/newyear.png"), season: "newYear" },
];

// The native module isn't in Expo Go or on web. Importing the package there
// throws (and Expo Go shows it as a red error even inside try/catch), so check
// for the native side first and only then load the package.
type IconsModule = typeof import("expo-alternate-app-icons");
let mod: IconsModule | null | undefined;
function icons(): IconsModule | null {
  if (mod === undefined) {
    mod = requireOptionalNativeModule("ExpoAlternateAppIcons") ? (require("expo-alternate-app-icons") as IconsModule) : null;
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

export function currentAppIcon(): AppIconName {
  try {
    return (icons()?.getAppIconName() as AppIconName) || null;
  } catch {
    return null;
  }
}

export async function changeAppIcon(name: AppIconName, isPremium: boolean): Promise<boolean> {
  if (name && !isPremium) return false; // going back to the default icon is always allowed
  if (!appIconsSupported()) return false;
  await icons()!.setAlternateAppIcon(name);
  return true;
}
