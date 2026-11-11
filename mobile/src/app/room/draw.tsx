// Run the draw in a friends room (the owner only): an optional gift budget and
// "never each other" pairs (a couple, colleagues), then everyone gets one person
// to give to (server/draw.js). Drawing again changes everyone's match. A sheet
// that fits its content.

import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { toast, ToastHost } from "../../components/Toast";
import { Avatar, Chip, Field, Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";
import { useAccent } from "../../theme/accent";

type Pair = [string, string];

export default function RunDraw() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, budget: was, again, no } = useLocalSearchParams<{ id: string; budget?: string; again?: string; no?: string }>();
  const { rooms } = useWishpool();
  const members = rooms.find((r) => r.id === id)?.members || [];
  const [budget, setBudget] = useState(was || "");
  const [pairs, setPairs] = useState<Pair[]>(() => {
    try {
      return (JSON.parse(no || "[]") as Pair[]).filter((p) => p.every((x) => members.some((m) => m.id === x)));
    } catch {
      return [];
    }
  });
  const [first, setFirst] = useState<string | null>(null); // the first of a pair being picked
  const [busy, setBusy] = useState(false);
  const name = (uid: string) => members.find((m) => m.id === uid)?.name || "";

  const pick = (uid: string) => {
    haptic("select");
    if (!first) return setFirst(uid);
    if (first === uid) return setFirst(null);
    const k = [first, uid].sort().join("|");
    if (!pairs.some((p) => [...p].sort().join("|") === k)) setPairs((cur) => [...cur, [first, uid]]);
    setFirst(null);
  };

  const run = async () => {
    if (busy || !id) return;
    setBusy(true);
    try {
      await api.runDraw(id, budget.trim(), !!again, pairs);
      haptic("success");
      router.back();
      toast.success(t("toastDrawn"), { root: true });
    } catch (e) {
      setBusy(false);
      haptic("error");
      toast.error(t(String((e as Error)?.message || "").includes("impossible") ? "drawImpossible" : "toastError"));
    }
  };

  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("draw")} />
      <View className="items-center pb-6">
        <Sticker emoji="stk:gift" size={64} rotate={-6} />
        <Txt className="mt-4 text-center text-[14.5px] leading-5 text-t2">{t("drawIntro")}</Txt>
      </View>
      <Field label={t("giftBudget")} value={budget} onChangeText={setBudget} placeholder={t("budgetPh")} />

      {/* "never each other": tap two people to pair them up */}
      {members.length > 3 ? (
        <View className="mb-6">
          <Txt className="mb-1 font-m600 text-[13px] text-t2">{t("drawNever")}</Txt>
          <Txt className="mb-3 text-[12.5px] leading-[18px] text-t3">{t("drawNeverHint")}</Txt>
          {pairs.length ? (
            <View className="mb-3 gap-2">
              {pairs.map((p) => (
                <View key={p.join("|")} className="h-sm flex-row items-center gap-2 rounded-full bg-card2 pl-3 pr-1">
                  <Txt numberOfLines={1} className="flex-1 font-m600 text-[14px]">{name(p[0])} + {name(p[1])}</Txt>
                  <Pressable onPress={() => setPairs((cur) => cur.filter((x) => x !== p))} hitSlop={8} accessibilityLabel={t("setDelete")} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                    <X size={16} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            {members.map((m) => (
              <Chip key={m.id} active={first === m.id} onPress={() => pick(m.id)}>
                <Avatar m={m} size={20} />
                {m.name}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      <Pill full loading={busy} onPress={run}>{t(again ? "drawAgain" : "runDraw")}</Pill>
      <ToastHost inSheet />
    </View>
  );
}
