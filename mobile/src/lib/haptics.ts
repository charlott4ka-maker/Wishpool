import * as Haptics from "expo-haptics";

import { getPrefs } from "../settings/prefs";
import { IN_TG, tgHaptic } from "./telegram";

export type HapticKind = "light" | "select" | "success" | "warning" | "error";

export function haptic(kind: HapticKind = "light") {
  if (!getPrefs().haptics) return;
  if (IN_TG) return tgHaptic(kind);
  const run = () => {
    switch (kind) {
      case "select":
        return Haptics.selectionAsync();
      case "success":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case "warning":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case "error":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      default:
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  run().catch(() => {});
}
