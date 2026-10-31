// Run the draw in a friends room: an optional gift budget, then everyone gets
// one person to give to (server: POST /rooms/:id/draw). Drawing again (the
// owner only) changes everyone's match. A sheet that fits its content.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { toast, ToastHost } from "../../components/Toast";
import { Field, Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";

export default function RunDraw() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, budget: was } = useLocalSearchParams<{ id: string; budget?: string }>();
  const [budget, setBudget] = useState(was || "");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || !id) return;
    setBusy(true);
    try {
      await api.runDraw(id, budget.trim());
      haptic("success");
      router.back();
      toast.success(t("toastDrawn"), { root: true });
    } catch {
      setBusy(false);
      haptic("error");
      toast.error(t("toastError"));
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
      <Pill full loading={busy} onPress={run}>{t("runDraw")}</Pill>
      <ToastHost inSheet />
    </View>
  );
}
