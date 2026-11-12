// The draw in a friends room, above the friends' lists: who you give to once
// it's done (their wishes are in the lists below), the button to run it while
// it isn't, how many more people it needs under 3, and "draw again" for the owner.

import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { api, type DrawData } from "../services/api";
import { toast } from "./Toast";
import { C } from "../theme/tokens";
import { DrawReveal } from "./DrawReveal";
import { Sticker } from "./Sticker";
import { Avatar, Pill, Txt } from "./ui";
import { useFlag } from "../lib/flags";

export function DrawCard({ roomId, draw, members, owner, onChanged }: { roomId: string; draw: DrawData | null; members: number; owner: boolean; onChanged?: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const reveal = useFlag("drawReveal");
  const open = () =>
    router.push({ pathname: "/room/draw", params: { id: roomId, budget: draw?.budget || "", again: draw?.drawn ? "1" : "", no: JSON.stringify(draw?.exclusions || []) } });
  // people who joined after the draw: the owner slots them in (one pair changes each)
  const addLate = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await api.drawAddLate(roomId);
      haptic("success");
      onChanged?.();
    } catch {
      haptic("error");
      toast.error(t("toastError"));
    } finally {
      setAdding(false);
    }
  };
  const waiting = owner && draw?.drawn && draw.waiting ? (
    <View className="mt-3 flex-row items-center justify-between gap-3">
      <Txt className="flex-1 text-[13px] text-t2">{t("drawWaiting", { n: draw.waiting })}</Txt>
      <Pill size="sm" loading={adding} onPress={addLate}>{t("drawAddLate")}</Pill>
    </View>
  ) : null;
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
        {/* the first time: the gift opens and shows who it is */}
        {reveal ? <DrawReveal roomId={roomId} target={draw.target} /> : null}
        <View className="flex-row items-center gap-3">
          <Avatar m={draw.target} size={48} />
          <View className="flex-1">
            <Txt className="text-[13px] text-t2">{t("youGot")}</Txt>
            <Txt numberOfLines={1} className="font-m800 text-xl">{draw.target.name}</Txt>
          </View>
          <Sticker emoji="stk:gift" size={34} rotate={-6} />
        </View>
        {draw.budget ? <Txt className="mt-3 text-[13px] text-t2">{t("budgetSecret", { b: draw.budget })}</Txt> : null}
        {waiting}
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
            {members < 3 ? t("needThree", { n: members }) : draw?.drawn ? (owner ? t("drawCardSub") : t("drawLate")) : owner ? t("drawCardSub") : t("drawOwnerWill")}
          </Txt>
        </View>
      </View>
      {waiting}
      {members >= 3 && !draw?.drawn && owner ? (
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
