// A one-time ask (lib/notifyAsk.ts): reminders a week and a day before a
// room's date. "Remind me" asks iOS, then turns the app's switch on.
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../components/SheetHeader";
import { Sticker } from "../components/Sticker";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { setPref } from "../settings/prefs";
import { useAccent } from "../theme/accent";

export default function NotifyAsk() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const yes = async () => {
    haptic("select");
    try {
      const res = await Notifications.requestPermissionsAsync();
      if (res.granted) setPref("notifications", true);
    } catch {
      /* nothing to do: Settings still has the switch */
    }
    router.back();
  };
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("notifyAskTitle")} />
      <View className="items-center pb-6">
        <Sticker emoji="stk:cake" size={64} />
        <Txt className="mt-4 text-center text-[14.5px] leading-5 text-t2">{t("notifyAskText")}</Txt>
      </View>
      <View className="gap-2">
        <Pill full onPress={yes}>{t("notifyAskYes")}</Pill>
        <Pill full kind="ghost" onPress={() => router.back()}>{t("notifyAskLater")}</Pill>
      </View>
    </View>
  );
}
