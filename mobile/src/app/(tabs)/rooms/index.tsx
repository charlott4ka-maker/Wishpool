// "Кімнати": rooms as folders in a two-column grid.

import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { RoomFolder } from "../../../components/RoomFolder";
import { Empty, HeaderAdd, Pill, ScreenTitle } from "../../../components/ui";
import { StatusBarBackdrop } from "../../../components/StatusBarBackdrop";
import { TabBarFade } from "../../../components/TabBarFade";
import { useT } from "../../../i18n";
import { useWishpool } from "../../../store/WishpoolContext";

export default function RoomsScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rooms, wishes } = useWishpool();
  const create = () => router.push("/room/new");
  const rows: (typeof rooms)[] = [];
  for (let i = 0; i < rooms.length; i += 2) rows.push(rooms.slice(i, i + 2));

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        key={rooms.length ? "list" : "empty"}
        className="flex-1 bg-bg"
        contentInsetAdjustmentBehavior="never"
        scrollEnabled={rooms.length > 0}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: rooms.length ? 120 : insets.bottom + 90 }}
      >
        <ScreenTitle title={t("roomsTitle")} right={<HeaderAdd onPress={create} label={t("createRoom")} />} />
        {rooms.length === 0 ? (
          <Empty
            fill
            emoji="stk:kitty"
            tilt={0}
            title={t("roomsEmptyTitle")}
            sub={t("roomsEmptySub")}
            action={
              <Pill full icon={<Plus size={19} color="#fff" />} onPress={create}>
                {t("createRoom")}
              </Pill>
            }
          />
        ) : (
          <View className="gap-6">
            {rows.map((row, i) => (
              <View key={i} className="flex-row gap-3">
                {row.map((r, j) => (
                  // folders rise in one after another
                  <Animated.View key={r.id} style={{ flex: 1 }} entering={FadeInDown.delay(Math.min(i * 2 + j, 10) * 50).springify().damping(18)} layout={LinearTransition.springify().damping(18)}>
                    <RoomFolder room={r} wishes={wishes} onPress={() => router.push({ pathname: "/room/[id]", params: { id: r.id } })} />
                  </Animated.View>
                ))}
                {row.length === 1 ? <View className="flex-1" /> : null}
              </View>
            ))}
          </View>
        )}
        {rooms.length ? (
          <View className="mt-6">
            <Pill full icon={<Plus size={19} color="#fff" />} onPress={create}>
              {t("createRoom")}
            </Pill>
          </View>
        ) : null}
      </ScrollView>
      <TabBarFade />
      <StatusBarBackdrop />
    </View>
  );
}
