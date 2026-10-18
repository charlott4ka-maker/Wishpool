// "From my wishes" / "Edit wishes" for a room (PoolPickerSheet in the Mini
// App): tick wishes from the wishlist to show them in this room.

import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { Pill, Txt } from "../../components/ui";
import { WishList, WishRow } from "../../components/WishRow";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";

export default function PickWishes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { wishes, toggleWishRoom } = useWishpool();
  const active = wishes.filter((w) => !w.giftedAt);
  return (
    // fits its content (FIT_SHEET); a long wishlist scrolls inside
    <ScrollView showsVerticalScrollIndicator={false} className="bg-card" style={{ maxHeight: height * 0.85 }} contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("roomWishesTitle")} />
      {active.length === 0 ? (
        // nothing to pick yet: one short line and the way to add a wish (it lands in this room)
        <View className="items-center py-4">
          <Sticker emoji="stk:ghost" size={64} />
          <Txt className="mt-6 text-center font-m700 text-lg">{t("pickEmptyTitle")}</Txt>
          <View className="mt-6 self-stretch">
            <Pill full icon={<Plus size={18} color="#fff" />} onPress={() => router.replace({ pathname: "/wish/new", params: { room: id } })}>
              {t("addWish")}
            </Pill>
          </View>
        </View>
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
                        {on ? <Check size={16} color="#fff" /> : null}
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
