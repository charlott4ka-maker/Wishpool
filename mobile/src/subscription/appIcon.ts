// Alternate app icons (Premium). Icon files are declared in app.json under the
// expo-alternate-app-icons plugin; names here must match those entries.

import { requireOptionalNativeModule } from "expo";

import type { ImageSourcePropType } from "react-native";

export type AppIconOption = {
  /** null = the default icon. */
  name: "Glow" | null;
  titleKey: string;
  image: ImageSourcePropType;
};

// the default star, and the Premium one: a glass star glowing on our dark blue
export const APP_ICONS: AppIconOption[] = [
  { name: null, titleKey: "iconClassic", image: require("../../assets/icon.png") },
  { name: "Glow", titleKey: "iconGlow", image: require("../../assets/icons/glow.png") },
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
