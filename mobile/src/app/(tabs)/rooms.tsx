// "Кімнати": rooms as folders in a two-column grid.

import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoomFolder } from "../../components/RoomFolder";
import { Empty, HeaderAdd, Pill, ScreenTitle } from "../../components/ui";
import { TabBarFade } from "../../components/TabBarFade";
import { useT } from "../../i18n";
import { useWishpool } from "../../store/WishpoolContext";

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
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        <ScreenTitle title={t("roomsTitle")} sub={t("roomsSub")} right={<HeaderAdd onPress={create} label={t("createRoom")} />} />
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
                {row.map((r) => (
                  <RoomFolder key={r.id} room={r} wishes={wishes} onPress={() => router.push({ pathname: "/room/[id]", params: { id: r.id } })} />
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
    </View>
  );
}
