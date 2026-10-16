// "From my wishes" / "Edit wishes" for a room (PoolPickerSheet in the Mini
// App): tick wishes from the wishlist to show them in this room.

import { useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { Empty } from "../../components/ui";
import { WishList, WishRow } from "../../components/WishRow";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";

export default function PickWishes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { wishes, toggleWishRoom } = useWishpool();
  const active = wishes.filter((w) => !w.giftedAt);
  return (
    // fits its content (FIT_SHEET); a long wishlist scrolls inside
    <ScrollView className="bg-card" style={{ maxHeight: height * 0.85 }} contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("roomWishesTitle")} />
      {active.length === 0 ? (
        <Empty compact emoji="stk:ghost" tilt={0} title={t("poolEmptyTitle")} sub={t("poolEmptyInRoom")} />
      ) : (
        <View className="rounded-card bg-bg">
          <WishList>
            {active.map((w) => {
              const on = w.rooms.includes(id);
              return (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    haptic("select");
                    toggleWishRoom(w.id, id).catch(() => {});
                  }}
                >
                  <WishRow
                    w={w}
                    right={
                      <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: on ? C.blue : "transparent", borderWidth: on ? 0 : 1.5, borderColor: C.t3 }}>
                        {on ? (
                          <Animated.View entering={ZoomIn.springify().damping(12)} exiting={ZoomOut.duration(120)}>
                            <Check size={16} color="#fff" />
                          </Animated.View>
                        ) : null}
                      </View>
                    }
                  />
                </Pressable>
              );
            })}
          </WishList>
        </View>
      )}
    </ScrollView>
  );
}
