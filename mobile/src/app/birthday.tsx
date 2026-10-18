// Sheet to set or remove your birthday (BirthdaySheet in the Mini App), with
// the iOS inline calendar. Kept on the phone in prefs; with an account it goes
// to the server too, so friends in your rooms get reminded.

import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fromISODate, toISODate } from "../components/DateRow";
import { SheetHeader } from "../components/SheetHeader";
import { Pill, Txt } from "../components/ui";
import { toast } from "../components/Toast";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { api } from "../services/api";
import { setPref, usePrefs } from "../settings/prefs";
import { useWishpool } from "../store/WishpoolContext";
import { C } from "../theme/tokens";

const LOCALE = { uk: "uk-UA", ru: "ru-RU", en: "en-US" } as const;

export default function BirthdaySheet() {
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { birthday } = usePrefs();
  const { online } = useWishpool();
  const [date, setDate] = useState<Date>(fromISODate(birthday) || new Date(2000, 0, 1));
  const save = (v: string | null) => {
    setPref("birthday", v);
    if (online) api.setBirthday(v).catch(() => {});
    haptic("success");
    router.back();
    if (v) toast.success(t("myBdaySaved"), { root: true });
  };
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("myBday")} />
      {Platform.OS !== "web" ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant="dark"
          accentColor={C.blue}
          locale={LOCALE[lang]}
          maximumDate={new Date()}
          onChange={(_, d) => d && setDate(d)}
          // the iOS wheels keep their own width; centred, not hugging the left edge
          style={{ alignSelf: "center" }}
        />
      ) : null}
      <Txt className="mb-6 mt-2 text-center text-[12.5px] leading-[17px] text-t3">{t("myBdayHint")}</Txt>
      <Pill full onPress={() => save(toISODate(date))}>{t("saveChanges")}</Pill>
      {birthday ? (
        <Pressable onPress={() => save(null)} className="mt-2 h-sm items-center justify-center">
          <Txt className="font-m600 text-sm text-t2">{t("myBdayClear")}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
