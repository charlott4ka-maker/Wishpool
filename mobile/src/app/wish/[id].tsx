// One wish in a native iOS sheet that fits its content (grabber, swipe down
// to close, and a close button).

import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { WishDetails } from "../../components/WishDetails";
import { toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";

export default function WishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { wishes, rooms, toggleWishRoom, setGifted, deleteWish, addWish } = useWishpool();
  const w = wishes.find((x) => x.id === id);
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      {/* like the Mini App: an untitled header row with the close button, photos below */}
      <SheetHeader />
      {w ? (
        <WishDetails
          w={w}
          rooms={rooms}
          onToggleRoom={toggleWishRoom}
          onEdit={() => router.replace({ pathname: "/wish/new", params: { id: w.id } })}
          onGifted={(g) => {
            haptic(g ? "success" : "light");
            router.back();
            setGifted(w.id, g).catch(() => toast.error(t("toastError"), { root: true }));
            if (g) toast.success(t("toastGifted"), { root: true });
          }}
          onDelete={() => {
            router.back();
            deleteWish(w.id).catch(() => toast.error(t("toastError"), { root: true }));
            const { id: _id, giftedAt: _g, ...data } = w;
            toast.info(t("toastWishDeleted"), { root: true, action: { label: t("toastUndo"), onPress: () => addWish(data).catch(() => {}) } });
          }}
        />
      ) : null}
    </View>
  );
}
