// A letter to support with the app and iOS version filled in; without a Mail
// app the address is copied instead.

import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

import { toast } from "../components/Toast";

export const SUPPORT_EMAIL = "support@clickbrickk.com";

export async function writeSupport(copied: string) {
  const version = Constants.expoConfig?.version || "1.0.0";
  const body = `\n\n\nWishpool ${version} · ${Platform.OS} ${Platform.Version}`;
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Wishpool")}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Clipboard.setStringAsync(SUPPORT_EMAIL).catch(() => {});
    toast.info(copied);
  }
}
