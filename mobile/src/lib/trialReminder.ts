// The paywall promises "we'll remind you 2 days before the trial ends": after a
// purchase with a free trial, a local notification two days before its last
// day. A tap opens the Premium page (Manage subscription is there).
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const TRIAL_ID = "trial_end";

export async function scheduleTrialReminder(trialDays: number, title: string, body: string) {
  if (Platform.OS === "web" || trialDays < 3) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    const ok = perm.granted || (perm.status !== "denied" && (await Notifications.requestPermissionsAsync()).granted);
    if (!ok) return;
    const when = new Date(Date.now() + (trialDays - 2) * 86400000);
    await Notifications.cancelScheduledNotificationAsync(TRIAL_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_ID,
      content: { title, body, data: { route: "/premium" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    /* no notifications: nothing to schedule */
  }
}
