// One wish in a native iOS sheet that fits its content (grabber, swipe down
// to close, and a close button).

import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CloseButton } from "../../components/ui";
import { WishDetails } from "../../components/WishDetails";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";

export default function WishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wishes, rooms, toggleWishRoom, setGifted, deleteWish } = useWishpool();
  const w = wishes.find((x) => x.id === id);
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      {/* the close button sits over the photo / sticker, the sheet has no title */}
      <View style={{ position: "absolute", top: 32, right: 24, zIndex: 10 }}>
        <CloseButton onPress={() => router.back()} />
      </View>
      {w ? (
        <WishDetails
          w={w}
          rooms={rooms}
          onToggleRoom={toggleWishRoom}
          onEdit={() => router.replace({ pathname: "/wish/new", params: { id: w.id } })}
          onGifted={(g) => {
            haptic(g ? "success" : "light");
            router.back();
            setGifted(w.id, g).catch(() => {});
          }}
          onDelete={() => {
            router.back();
            deleteWish(w.id).catch(() => {});
          }}
        />
      ) : null}
    </View>
  );
}
