// "I'll get it" confirmation for a friend's wish, in a native iOS sheet that
// fits its content. The room screen reloads when the sheet closes.

import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ShoppingBag } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { Pill, Txt } from "../../components/ui";
import { ToastHost, toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { C } from "../../theme/tokens";

export default function TakeGift() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, title, link } = useLocalSearchParams<{ id: string; title: string; link?: string }>();
  const [busy, setBusy] = useState(false);
  const take = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.reserve(id);
      haptic("success");
      router.back();
      toast.success(t("toastTaken"), { root: true });
    } catch {
      haptic("error");
      toast.error(t("toastError"));
      setBusy(false);
    }
  };
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("giftTakenTitle", { name: title || "" })} />
      <View className="items-center pb-6">
        <Sticker emoji="stk:gift" size={72} rotate={-6} />
        <Txt className="mt-4 text-center text-[14.5px] leading-5 text-t2">{t("giftTakenBody")}</Txt>
      </View>
      {link ? (
        <View className="mb-3">
          <Pill full kind="ghost" icon={<ShoppingBag size={18} color={C.t1} />} onPress={() => WebBrowser.openBrowserAsync(link)}>
            {t("buyLink")}
          </Pill>
        </View>
      ) : null}
      <Pill full disabled={busy} onPress={take}>{t("giftTakenOk")}</Pill>
      <ToastHost inSheet />
    </View>
  );
}
