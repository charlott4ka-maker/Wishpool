// A wish card on the wishlist: tap opens the wish sheet, long press opens the
// iOS action sheet (edit, share, I got it, delete). The native Link preview was
// dropped: its wrapper broke the card's size in the grid.

import { useRouter } from "expo-router";
import { ActionSheetIOS, Alert, Platform, Share } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { linkHost } from "../services/affiliate/urlCleanup";
import { useWishpool } from "../store/WishpoolContext";
import type { Wish } from "../types";
import { toast } from "./Toast";
import { WishTile } from "./WishTile";

export function WishCard({ w }: { w: Wish }) {
  const { t } = useT();
  const router = useRouter();
  const { setGifted, deleteWish, addWish } = useWishpool();

  const open = () => router.push({ pathname: "/wish/[id]", params: { id: w.id } });
  const edit = () => router.push({ pathname: "/wish/new", params: { id: w.id } });
  const share = () => {
    const parts = [w.title, w.price, w.link].filter(Boolean);
    Share.share({ message: parts.join("\n"), url: w.link || undefined }).catch(() => {});
  };
  const gifted = () => {
    haptic(w.giftedAt ? "light" : "success");
    setGifted(w.id, !w.giftedAt).catch(() => toast.error(t("toastError")));
    if (!w.giftedAt) toast.success(t("toastGifted"));
  };
  const remove = () =>
    Alert.alert(t("confirmDeleteWish"), "", [
      { text: t("setCancel"), style: "cancel" },
      { text: t("setDelete"), style: "destructive", onPress: () => {
          haptic("light");
          deleteWish(w.id).catch(() => toast.error(t("toastError")));
          // undo puts it back as a new wish with the same content
          const { id: _id, giftedAt: _g, ...data } = w;
          toast.info(t("toastWishDeleted"), { action: { label: t("toastUndo"), onPress: () => addWish(data).catch(() => {}) } });
        } },
    ]);

  const menu = () => {
    haptic("select");
    const actions: [string, () => void][] = [
      ...(!w.giftedAt ? [[t("editShort"), edit] as [string, () => void]] : []),
      [t("shareBtn"), share],
      [t(w.giftedAt ? "ungift" : "gotIt"), gifted],
      [t("deleteWish"), remove],
    ];
    const options = [...actions.map((a) => a[0]), t("setCancel")];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: w.title, message: w.link ? linkHost(w.link) : undefined, options, destructiveButtonIndex: actions.length - 1, cancelButtonIndex: actions.length, userInterfaceStyle: "dark" },
        (i) => i < actions.length && actions[i][1](),
      );
    } else {
      Alert.alert(w.title, "", [...actions.map(([text, onPress]) => ({ text, onPress })), { text: t("setCancel"), style: "cancel" as const }]);
    }
  };

  return <WishTile w={w} onPress={open} onLongPress={menu} delayLongPress={350} />;
}
