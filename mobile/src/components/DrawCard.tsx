// The draw in a friends room, above the friends' lists: who you give to once
// it's done (their wishes are in the lists below), the button to run it while
// it isn't, how many more people it needs under 3, and "draw again" for the owner.

import { useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import type { DrawData } from "../services/api";
import { C } from "../theme/tokens";
import { Sticker } from "./Sticker";
import { Avatar, Pill, Txt } from "./ui";

export function DrawCard({ roomId, draw, members, owner }: { roomId: string; draw: DrawData | null; members: number; owner: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const open = () => router.push({ pathname: "/room/draw", params: { id: roomId, budget: draw?.budget || "" } });
  const again = () => {
    haptic("select");
    Alert.alert(t("drawAgain"), t("drawAgainConfirm"), [
      { text: t("setCancel"), style: "cancel" },
      { text: t("drawAgain"), onPress: open },
    ]);
  };

  // drawn, and you have someone
  if (draw?.drawn && draw.target) {
    return (
      <View className="rounded-card bg-raised p-4">
        <View className="flex-row items-center gap-3">
          <Avatar m={draw.target} size={48} />
          <View className="flex-1">
            <Txt className="text-[13px] text-t2">{t("youGot")}</Txt>
            <Txt numberOfLines={1} className="font-m800 text-xl">{draw.target.name}</Txt>
          </View>
          <Sticker emoji="stk:gift" size={34} rotate={-6} />
        </View>
        {draw.budget ? <Txt className="mt-3 text-[13px] text-t2">{t("budgetSecret", { b: draw.budget })}</Txt> : null}
        {owner ? (
          <Pressable onPress={again} hitSlop={8} className="mt-3 self-start">
            <Txt className="font-m600 text-[13px] text-t3">{t("drawAgain")}</Txt>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="rounded-card bg-raised p-4">
      <View className="flex-row items-center gap-3">
        <Sticker emoji="stk:gift" size={34} rotate={-6} />
        <View className="flex-1">
          <Txt className="font-m700 text-base">{t("draw")}</Txt>
          <Txt className="mt-0.5 text-[13px] leading-[18px] text-t2">
            {members < 3 ? t("needThree", { n: members }) : draw?.drawn ? t("drawLate") : t("drawCardSub")}
          </Txt>
        </View>
      </View>
      {members >= 3 && !draw?.drawn ? (
        <View className="mt-3">
          <Pill full size="sm" onPress={open}>{t("drawRun")}</Pill>
        </View>
      ) : null}
      {members >= 3 && draw?.drawn && owner ? (
        <View className="mt-3">
          <Pill full size="sm" kind="ghost" onPress={again}>{t("drawAgain")}</Pill>
        </View>
      ) : null}
    </View>
  );
}
