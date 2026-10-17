// "My birthday" card on the profile, like BirthdayCard in the Mini App: the
// date, a days-to-go pill, a tap opens the sheet to set it.

import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { useT } from "../i18n";
import { countdownLabel, daysUntil } from "../lib/dates";
import { usePrefs } from "../settings/prefs";
import { C } from "../theme/tokens";
import { toISODate } from "./DateRow";
import { Card, Txt } from "./ui";

const LOCALE = { uk: "uk-UA", ru: "ru-RU", en: "en-GB" } as const;

/** This year's birthday, or next year's once it has passed ("YYYY-MM-DD"). */
export function nextBirthday(birthday: string | null): string | null {
  const m = birthday && birthday.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
  if (d < today) d = new Date(now.getFullYear() + 1, Number(m[1]) - 1, Number(m[2]));
  return toISODate(d);
}

export function BirthdayCard() {
  const { t, lang } = useT();
  const router = useRouter();
  const { birthday } = usePrefs();
  const next = nextBirthday(birthday);
  const left = daysUntil(next || undefined);
  const dayMonth = next ? new Date(next + "T00:00:00").toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long" }) : null;
  return (
    <Card className="flex-row items-center gap-3 p-4" onPress={() => router.push("/birthday")}>
      <View className="flex-1">
        <Txt className="font-m600 text-[13px] text-t2">{t("myBday")}</Txt>
        <Txt numberOfLines={1} className="mt-1 font-m700 text-base" style={{ color: next ? C.t1 : C.blueText }}>{dayMonth || t("myBdayEmpty")}</Txt>
      </View>
      {left != null ? (
        <View className="h-8 justify-center rounded-full px-3" style={{ backgroundColor: left === 0 ? C.blue : C.blueSoft }}>
          <Txt className="font-m700 text-[13.5px]" style={{ color: left === 0 ? "#fff" : C.blueText }}>{left === 0 ? t("myBdayToday") : countdownLabel(lang, t, next || undefined)}</Txt>
        </View>
      ) : null}
      <ChevronRight size={20} color={C.t3} />
    </Card>
  );
}
