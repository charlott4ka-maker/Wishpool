// A wish card on the wishlist that opens the wish sheet on tap, and on long
// press shows the native iOS preview with a context menu (edit, share, I got
// it, delete).

import { Link, useRouter } from "expo-router";
import { Alert, Share, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { linkHost } from "../services/affiliate/urlCleanup";
import { useWishpool } from "../store/WishpoolContext";
import type { Wish } from "../types";
import { WishTile } from "./WishTile";

export function WishCard({ w }: { w: Wish }) {
  const { t } = useT();
  const router = useRouter();
  const { setGifted, deleteWish } = useWishpool();

  const share = () => {
    const parts = [w.title, w.price, w.link].filter(Boolean);
    Share.share({ message: parts.join("\n"), url: w.link || undefined }).catch(() => {});
  };
  const remove = () =>
    Alert.alert(t("confirmDeleteWish"), "", [
      { text: t("setCancel"), style: "cancel" },
      { text: t("setDelete"), style: "destructive", onPress: () => deleteWish(w.id).catch(() => {}) },
    ]);

  return (
    <View className="flex-1">
      <Link href={{ pathname: "/wish/[id]", params: { id: w.id } }} asChild>
        <Link.Trigger>
          <WishTile w={w} />
        </Link.Trigger>
        <Link.Preview />
        <Link.Menu title={w.link ? linkHost(w.link) : undefined}>
          {!w.giftedAt ? (
            <Link.MenuAction icon="pencil" onPress={() => router.push({ pathname: "/wish/new", params: { id: w.id } })}>
              {t("editShort")}
            </Link.MenuAction>
          ) : null}
          <Link.MenuAction icon="square.and.arrow.up" onPress={share}>
            {t("shareBtn")}
          </Link.MenuAction>
          <Link.MenuAction
            icon={w.giftedAt ? "arrow.uturn.backward" : "gift"}
            onPress={() => {
              haptic(w.giftedAt ? "light" : "success");
              setGifted(w.id, !w.giftedAt).catch(() => {});
            }}
          >
            {t(w.giftedAt ? "ungift" : "gotIt")}
          </Link.MenuAction>
          <Link.MenuAction icon="trash" destructive onPress={remove}>
            {t("deleteWish")}
          </Link.MenuAction>
        </Link.Menu>
      </Link>
    </View>
  );
}
