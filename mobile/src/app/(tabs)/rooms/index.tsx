// "Кімнати": rooms as folders in a two-column grid.

import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Plus } from "lucide-react-native";
import { ScrollView, View } from "react-native";

import { RoomFolder } from "../../../components/RoomFolder";
import { HeaderPlus } from "../../../components/LargeTitleStack";
import { Empty, Pill } from "../../../components/ui";
import { C } from "../../../theme/tokens";
import { TabBarFade } from "../../../components/TabBarFade";
import { useT } from "../../../i18n";
import { useWishpool } from "../../../store/WishpoolContext";

export default function RoomsScreen() {
  const { t } = useT();
  const router = useRouter();
  const { rooms: allRooms, wishes } = useWishpool();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rooms = q ? allRooms.filter((r) => r.name.toLowerCase().includes(q)) : allRooms;
  const create = () => router.push("/room/new");
  const rows: (typeof rooms)[] = [];
  for (let i = 0; i < rooms.length; i += 2) rows.push(rooms.slice(i, i + 2));

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 120 }}>
        <Stack.Screen
          options={{
            title: t("roomsTitle"),
            headerRight: () => <HeaderPlus onPress={create} label={t("createRoom")} />,
            headerSearchBarOptions: { placeholder: t("searchRooms"), hideWhenScrolling: true, tintColor: C.blue, textColor: C.t1, onChangeText: (e) => setQuery(e.nativeEvent.text) },
          }}
        />
        {q && rooms.length === 0 ? (
          <Empty compact emoji="stk:ghost" tilt={0} title={t("filterEmpty")} />
        ) : rooms.length === 0 ? (
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
