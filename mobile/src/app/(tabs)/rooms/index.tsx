// "Кімнати": rooms as folders in a two-column grid.

import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { useGridColumns } from "../../../lib/gridColumns";
import { usePullRefresh } from "../../../lib/pullRefresh";
import { RoomFolder } from "../../../components/RoomFolder";
import { RoomGridSkeleton } from "../../../components/Skeleton";
import { Empty, HeaderAdd, Pill } from "../../../components/ui";
import { TabBarFade } from "../../../components/TabBarFade";
import { Block, BLOCK_GAP, BLOCK_R, TabHeader } from "../../../components/TabHeader";
import { useT } from "../../../i18n";
import { useWishpool } from "../../../store/WishpoolContext";
import { C } from "../../../theme/tokens";

export default function RoomsScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rooms, wishes, ready, refresh } = useWishpool();
  const pull = usePullRefresh(refresh);
  const create = () => router.push("/room/new");
  const cols = useGridColumns();
  const rows: (typeof rooms)[] = [];
  for (let i = 0; i < rooms.length; i += cols) rows.push(rooms.slice(i, i + cols));

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title={t("roomsTitle")} right={<HeaderAdd onPress={create} label={t("createRoom")} />} />
      {/* fixed content frame (see Wishes): the gap under the header and the fill under the tab bar stay put */}
      <View style={{ flex: 1, marginTop: BLOCK_GAP, backgroundColor: C.card, borderTopLeftRadius: BLOCK_R, borderTopRightRadius: BLOCK_R, overflow: "hidden" }}>
      <ScrollView showsVerticalScrollIndicator={false}
        key={rooms.length ? "list" : "empty"}
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        scrollEnabled={rooms.length > 0}
        contentContainerStyle={{ flexGrow: 1 }}
        // pull down to reload, like the Wishes tab
        refreshControl={
          <RefreshControl tintColor={C.t2} refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
        }
      >
        {/* one content block down to the bottom; extra top room for the photos peeking out of the folders */}
        <Block grow style={{ paddingTop: 24, paddingBottom: rooms.length ? 120 : insets.bottom + 90 }}>
        {!ready ? (
          <RoomGridSkeleton />
        ) : rooms.length === 0 ? (
          <Empty
            fill
            emoji="stk:piggy"
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
                {Array.from({ length: cols - row.length }, (_, k) => <View key={"pad" + k} className="flex-1" />)}
              </View>
            ))}
          </View>
        )}
        </Block>
      </ScrollView>
      </View>
      <TabBarFade />
    </View>
  );
}
