// Pushes about friends (server/push.js): a new wish in a room, "someone picked
// a gift for you", the draw, invitations, friends, support answers, birthdays
// from profiles. While notifications are on (Settings, or "Remind me" on a
// room's date) and iOS allows them, this phone's Expo push address goes to the
// server; turned off, it's taken back. A tap on a push is handled in ReminderSync.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { api } from "../services/api";
import { usePrefs } from "./prefs";

const KEY = "wp_push_token";

export function PushSync() {
  const { status } = useAuth();
  const { notifications } = usePrefs();
  const { lang } = useT();

  useEffect(() => {
    if (Platform.OS === "web" || status !== "signedIn" || !api.configured()) return;
    let live = true;
    (async () => {
      const last = await AsyncStorage.getItem(KEY);
      const allowed = notifications && (await Notifications.getPermissionsAsync()).granted;
      if (!allowed) {
        // off: the server stops pushing to this phone
        if (last) {
          await api.dropPushToken(last).catch(() => {});
          await AsyncStorage.removeItem(KEY);
        }
        return;
      }
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      if (!live || !token) return;
      await api.pushToken(token, lang);
      await AsyncStorage.setItem(KEY, token);
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [status, notifications, lang]);

  return null;
}

/** Before signing out: this phone shouldn't keep getting the old account's pushes. */
export async function dropPushTokenOnSignOut() {
  const last = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!last) return;
  await api.dropPushToken(last).catch(() => {});
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
