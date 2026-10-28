// A friend's wish from a room in a native sheet that fits its content: the
// photos, the full title, price, shop link and note, and the gift part:
// "I'll get it", or the gift you're giving (cancel it here), or "Taken".
// Report is at the bottom. The room hands the wish over (lib/openedWish).

import { useRouter } from "expo-router";
import { Check, Flag } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { toast, ToastHost } from "../../components/Toast";
import { Pill, Txt } from "../../components/ui";
import { WishInfo } from "../../components/WishDetails";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { openedWish } from "../../lib/openedWish";
import { askReport } from "../../lib/report";
import { api } from "../../services/api";
import { C } from "../../theme/tokens";

export default function FriendWish() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [w] = useState(openedWish.w);
  const roomId = openedWish.roomId;
  if (!w) return null;

  const take = () => router.replace({ pathname: "/room/take", params: { id: w.id, title: w.title, link: w.link || "" } });
  const untake = () =>
    Alert.alert(t("cancelGiftTitle"), t("cancelGiftText", { name: w.title }), [
      { text: t("keepIt"), style: "cancel" },
      {
        text: t("cancelGiftYes"),
        style: "destructive",
        onPress: async () => {
          haptic("light");
          try {
            await api.unreserve(w.id);
            router.back();
            toast.info(t("toastUntaken"), { root: true });
          } catch {
            toast.error(t("toastError"));
          }
        },
      },
    ]);

  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader />
      <WishInfo w={w} />
      <View className="mt-6">
        {w.reservedByMe ? (
          <View className="gap-3">
            <View className="h-lg flex-row items-center justify-center gap-2 rounded-full bg-greenSoft">
              <Check size={18} color={C.greenText} />
              <Txt className="font-m700 text-base text-greenText">{t("youGift")}</Txt>
            </View>
            <Pill full kind="ghost" onPress={untake}>{t("cancelGiftYes")}</Pill>
          </View>
        ) : w.taken ? (
          <View className="h-lg items-center justify-center rounded-full bg-bg">
            <Txt className="font-m600 text-[15px] text-t3">{t("taken")}</Txt>
          </View>
        ) : (
          <Pill full onPress={take}>
            <Txt className="font-m700 text-base text-white">{t("take")}</Txt>
            <Sticker emoji="stk:basket" size={20} style={{ margin: -6 }} />
          </Pill>
        )}
      </View>
      <Pressable onPress={() => askReport(t, { wishId: w.id, roomId })} hitSlop={8} className="mt-4 h-sm flex-row items-center justify-center gap-2 self-center">
        <Flag size={15} color={C.t3} />
        <Txt className="font-m600 text-[13.5px] text-t3">{t("reportWish")}</Txt>
      </Pressable>
      <ToastHost inSheet />
    </View>
  );
}
