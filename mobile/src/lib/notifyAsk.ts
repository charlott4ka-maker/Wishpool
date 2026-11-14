// Reminders only reach people who turned notifications on, and that used to
// happen only in Settings. So the first time someone opens a room with a date
// ahead (a birthday, a gift swap), we ask once, in a sheet that says what for
// (app/notify-ask.tsx); the system prompt comes after "Remind me".
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import type { useRouter } from "expo-router";
import { Platform } from "react-native";

import { fromISODate } from "../components/DateRow";
import { getPrefs } from "../settings/prefs";

const KEY = "wp_notify_asked";
let asking = false;

type Router = ReturnType<typeof useRouter>;

export async function maybeAskNotify(router: Router, eventDate?: string | null) {
  if (Platform.OS === "web" || asking || getPrefs().notifications) return;
  const day = fromISODate(eventDate);
  if (!day || day.getTime() < Date.now() - 86400000) return;
  asking = true;
  try {
    if (await AsyncStorage.getItem(KEY)) return;
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status === "denied") return; // said no to the system: Settings still has the switch
    await AsyncStorage.setItem(KEY, "1");
    router.push("/notify-ask");
  } catch {
    /* storage or permissions unavailable: don't ask */
  } finally {
    asking = false;
  }
}
