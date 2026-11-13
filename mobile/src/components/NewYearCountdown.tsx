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
import { useRemoteConfig } from "../lib/remoteConfig";
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
  const { season: { newYear } } = useRemoteConfig();
  const [closed, setClosed] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setClosed(!!v)).catch(() => setClosed(false));
  }, []);
  const now = new Date();
  // from mid-November to the end of December
  const season = (now.getMonth() === 10 && now.getDate() >= 10) || now.getMonth() === 11;
  const hasSanta = rooms.some((r) => NEW_YEAR_STICKERS.includes(r.emoji));
  if (!newYear || closed !== false || !season || hasSanta) return null;
  const n = daysToNewYear(now);
  const days = lang === "en" ? `${n} ${n === 1 ? "day" : "days"}` : `${n} ${plural(lang, n, DAY_FORMS[lang])}`;
  return (
    <Pressable
      onPress={() => {
        haptic("light");
        router.push({ pathname: "/room/new", params: { preset: "santa" } });
      }}
      className="flex-row items-center gap-3 rounded-tile bg-raised py-3 pl-3 pr-3"
    >
      <Sticker emoji="stk:tree" size={34} />
      <View className="flex-1">
        <Txt className="font-m700 text-[15px]">{t("nyCountdown", { days })}</Txt>
        {/* the chevron follows the line, 4pt after it, on its level */}
        <View className="mt-0.5 flex-row items-center gap-1">
          <Txt className="shrink text-[13px] text-t2" numberOfLines={1}>{t("nyCountdownSub")}</Txt>
          <ChevronRight size={14} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth />
        </View>
      </View>
      {/* the same round close button as the banners */}
      <Pressable
        hitSlop={8}
        onPress={() => {
          haptic("light");
          setClosed(true);
          AsyncStorage.setItem(KEY, "1").catch(() => {});
        }}
        style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)" }}
        accessibilityLabel={t("closeBtn")}
      >
        <X size={16} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
      </Pressable>
    </Pressable>
  );
}
