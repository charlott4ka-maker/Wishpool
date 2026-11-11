// Rooms tab, until New Year: "N days to New Year" with a tree, and a tap makes
// a Secret Santa room. Hidden once you have a Santa room or close it (×).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ChevronRight, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useT } from "../i18n";
import { DAY_FORMS, plural } from "../lib/dates";
import { haptic } from "../lib/haptics";
import { NEW_YEAR_STICKERS } from "../subscription/featureFlags";
import { C } from "../theme/tokens";
import type { Room } from "../types";
import { Sticker } from "./Sticker";
import { Txt } from "./ui";

const KEY = "wp_ny_card_2027";

export function daysToNewYear(now = new Date()) {
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  return Math.ceil((ny.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5);
}

export function NewYearCountdown({ rooms }: { rooms: Room[] }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [closed, setClosed] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setClosed(!!v)).catch(() => setClosed(false));
  }, []);
  const now = new Date();
  // from mid-November to the end of December
  const season = (now.getMonth() === 10 && now.getDate() >= 10) || now.getMonth() === 11;
  const hasSanta = rooms.some((r) => NEW_YEAR_STICKERS.includes(r.emoji));
  if (closed !== false || !season || hasSanta) return null;
  const n = daysToNewYear(now);
  const days = lang === "en" ? `${n} ${n === 1 ? "day" : "days"}` : `${n} ${plural(lang, n, DAY_FORMS[lang])}`;
  return (
    <Pressable
      onPress={() => {
        haptic("light");
        router.push({ pathname: "/room/new", params: { preset: "santa" } });
      }}
      className="flex-row items-center gap-3 rounded-tile bg-raised py-3 pl-3 pr-2"
    >
      <Sticker emoji="stk:tree" size={34} />
      <View className="flex-1">
        <Txt className="font-m700 text-[15px]">{t("nyCountdown", { days })}</Txt>
        <Txt className="mt-0.5 text-[13px] text-t2">{t("nyCountdownSub")}</Txt>
      </View>
      <ChevronRight size={18} color={C.t3} />
      <Pressable
        hitSlop={8}
        onPress={() => {
          haptic("light");
          setClosed(true);
          AsyncStorage.setItem(KEY, "1").catch(() => {});
        }}
        className="h-8 w-8 items-center justify-center"
        accessibilityLabel={t("closeBtn")}
      >
        <X size={16} color={C.t3} strokeWidth={1.5} absoluteStrokeWidth />
      </Pressable>
    </Pressable>
  );
}
