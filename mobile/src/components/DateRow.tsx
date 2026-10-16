// Native iOS date picker (the compact pill that opens the system calendar).
// Dates are stored as "YYYY-MM-DD", like eventDate on the backend.

import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform, View } from "react-native";

import { useT } from "../i18n";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const LOCALE = { uk: "uk-UA", ru: "ru-RU", en: "en-US" } as const;

export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function fromISODate(s?: string | null): Date | null {
  const m = s && s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Just the picker, for use inside a row or a settings cell. */
export function DatePill({ value, onChange, minimumDate, maximumDate }: { value: string | null; onChange: (iso: string) => void; minimumDate?: Date; maximumDate?: Date }) {
  const { lang } = useT();
  if (Platform.OS === "web") return null; // no native picker on web previews
  return (
    <DateTimePicker
      value={fromISODate(value) || new Date()}
      mode="date"
      display="compact"
      themeVariant="dark"
      accentColor={C.blue}
      locale={LOCALE[lang]}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onChange={(_, d) => d && onChange(toISODate(d))}
    />
  );
}

/** A labelled row: label on the left, the date pill on the right. */
export function DateRow({ label, value, onChange, hint, minimumDate }: { label: string; value: string | null; onChange: (iso: string) => void; hint?: string; minimumDate?: Date }) {
  return (
    <View className="mb-4">
      <View className="h-lg flex-row items-center justify-between rounded-tile bg-card2 pl-4 pr-2">
        <Txt className="text-base">{label}</Txt>
        <DatePill value={value} onChange={onChange} minimumDate={minimumDate} />
      </View>
      {hint ? <Txt className="mt-2 text-[12.5px] leading-[17px] text-t3">{hint}</Txt> : null}
    </View>
  );
}
