// Local reminders for birthday rooms: a week before (Friends' birthdays switch)
// and the day before (Gift reminders switch), at 10:00. Rescheduled whenever
// rooms, settings or the language change; a tap opens the room.
// Notifications about other people's actions (new wishes, new members) need
// push from the backend and are not sent from here.

import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useT } from "../i18n";
import { useWishpool } from "../store/WishpoolContext";
import { fromISODate } from "../components/DateRow";
import { usePrefs } from "./prefs";


Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function at10(d: Date, daysBefore: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - daysBefore);
  x.setHours(10, 0, 0, 0);
  return x;
}

export function ReminderSync() {
  const { rooms } = useWishpool();
  const prefs = usePrefs();
  const { t } = useT();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;
    let live = true;
    (async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!prefs.notifications || !live) return;
      if (!(await Notifications.getPermissionsAsync()).granted) return;
      const now = Date.now();
      for (const r of rooms) {
        const day = fromISODate(r.eventDate);
        if (!day) continue;
        const plan: [boolean, number, string, string][] = [
          [prefs.notifyBirthdays, 7, "remindWeekTitle", "remindWeekBody"],
          [prefs.notifyGiftReminders, 1, "remindDayTitle", "remindDayBody"],
        ];
        for (const [on, before, title, body] of plan) {
          const when = at10(day, before);
          if (!on || when.getTime() <= now) continue;
          await Notifications.scheduleNotificationAsync({
            content: { title: t(title, { name: r.name }), body: t(body), data: { roomId: r.id } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
          });
        }
      }
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [rooms, prefs, t]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const roomId = res.notification.request.content.data?.roomId;
      if (typeof roomId === "string") router.push({ pathname: "/room/[id]", params: { id: roomId } });
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
