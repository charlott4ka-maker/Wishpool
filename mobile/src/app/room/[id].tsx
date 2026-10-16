// One room. Friends' lists with "I'll get it" (Даруйте потай): a gift taken by
// someone shows as "Taken" to the other gifters, while the wish owner never
// sees it (the backend hides reservations from the owner). "My items here"
// lists what you shared into the room.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, ChevronLeft, Lock, ShoppingBag } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sticker } from "../../components/Sticker";
import { Avatar, Card, Empty, Pill, Segmented, Sheet, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool, wishImages } from "../../store/WishpoolContext";
import { C, hex, mixHex } from "../../theme/tokens";
import type { Member, Wish } from "../../types";

type RoomWish = Wish & { reservedByMe?: boolean; taken?: boolean; chips?: { count: number; mine: boolean; total: number } | null };
type Detail = { lists: { member: Member; wishes: RoomWish[] }[]; mine: Wish[] };

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rooms, wishes, online } = useWishpool();
  const room = rooms.find((r) => r.id === id);
  const [seg, setSeg] = useState<"lists" | "mine">("lists");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(online);
  const [gift, setGift] = useState<RoomWish | null>(null);

  const load = useCallback(async () => {
    if (!online || !id) return;
    try {
      const d = await api.room(id);
      setDetail({ lists: d.lists || [], mine: d.mine || [] });
    } finally {
      setLoading(false);
    }
  }, [online, id]);
  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!room) return <Empty emoji="stk:ghost" title={t("roomGone")} action={<Pill onPress={() => router.back()}>{t("back")}</Pill>} />;

  const mine = detail ? detail.mine : wishes.filter((w) => w.rooms.includes(room.id));
  const lists = detail?.lists || [];

  const take = async (w: RoomWish) => {
    setGift(null);
    haptic("success");
    try {
      if (w.reservedByMe) await api.unreserve(w.id);
      else await api.reserve(w.id);
    } finally {
      load().catch(() => {});
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <LinearGradient colors={[mixHex(room.tint, "#000000", 0.25), hex(room.tint, 0.18), C.bg]} style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 24 }}>
          <Pressable onPress={() => router.back()} className="h-sm w-sm items-center justify-center rounded-full bg-black/25" accessibilityLabel={t("back")}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
          <View className="mt-4 items-center">
            <Sticker emoji={room.emoji} size={64} rotate={-8} />
            <Txt className="mt-4 text-center font-m800 text-[26px]">{room.name}</Txt>
            <View className="mt-3 flex-row">
              {room.members.slice(0, 6).map((m, i) => (
                <View key={m.id} style={{ marginLeft: i ? -8 : 0, borderRadius: 30, borderWidth: 2, borderColor: mixHex(room.tint, "#000000", 0.5) }}>
                  <Avatar m={m} size={28} />
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <View className="px-4">
          <Segmented options={[["lists", t("segLists")], ["mine", t("segMine")]]} value={seg} onChange={setSeg} className="mb-6" />

          {seg === "lists" ? (
            loading ? (
              <ActivityIndicator color={C.t2} className="mt-8" />
            ) : lists.length === 0 ? (
              <Empty emoji="stk:bear" tilt={0} title={t("onlyYouTitle")} sub={t("onlyYouSub")} />
            ) : (
              lists.map(({ member, wishes: ws }) => (
                <View key={member.id} className="mb-6">
                  <View className="mb-3 flex-row items-center gap-3">
                    <Avatar m={member} size={30} />
                    <Txt className="font-m700 text-base">{member.name}</Txt>
                  </View>
                  {ws.length === 0 ? (
                    <Txt className="text-[13px] text-t3">{t("noWishesYet")}</Txt>
                  ) : (
                    <Card className="px-4">
                      {ws.map((w, i) => (
                        <View key={w.id} className="flex-row items-center gap-3 py-3" style={{ borderBottomWidth: i < ws.length - 1 ? 0.5 : 0, borderBottomColor: C.line }}>
                          <WishThumb w={w} />
                          <View className="flex-1">
                            <Txt numberOfLines={2} className="font-m600 text-[14.5px]">{w.title}</Txt>
                            {w.price ? <Txt className="mt-0.5 font-m700 text-[13px] text-blueText">{w.price}</Txt> : null}
                          </View>
                          {w.taken ? (
                            <View className="h-sm flex-row items-center gap-1 rounded-full bg-card2 px-3">
                              <Lock size={13} color={C.t3} />
                              <Txt className="font-m600 text-[13px] text-t3">{t("taken")}</Txt>
                            </View>
                          ) : w.reservedByMe ? (
                            <Pill size="sm" kind="green" icon={<Check size={15} color={C.greenText} />} onPress={() => take(w)}>{t("youGift")}</Pill>
                          ) : (
                            <Pill size="sm" kind="soft" onPress={() => setGift(w)}>{t("take")}</Pill>
                          )}
                        </View>
                      ))}
                    </Card>
                  )}
                </View>
              ))
            )
          ) : mine.length === 0 ? (
            <Empty emoji="stk:gift" tilt={0} title={t("nothingSharedTitle")} sub={t("nothingSharedSub")} action={<Pill onPress={() => router.push("/wish/new")}>{t("newWishHere")}</Pill>} />
          ) : (
            <Card className="px-4">
              {mine.map((w, i) => (
                <View key={w.id} className="flex-row items-center gap-3 py-3" style={{ borderBottomWidth: i < mine.length - 1 ? 0.5 : 0, borderBottomColor: C.line }}>
                  <WishThumb w={w} />
                  <View className="flex-1">
                    <Txt numberOfLines={2} className="font-m600 text-[14.5px]">{w.title}</Txt>
                    <Txt className="mt-0.5 text-[12.5px] text-t3">{t("visibleToAll")}</Txt>
                  </View>
                </View>
              ))}
            </Card>
          )}
          {seg === "lists" && lists.length > 0 ? <Txt className="mt-2 text-center text-[12.5px] text-t3">{t("reserveNote")}</Txt> : null}
        </View>
      </ScrollView>

      <Sheet visible={!!gift} onClose={() => setGift(null)} title={gift ? t("giftTakenTitle", { name: gift.title }) : ""}>
        <View className="items-center pb-4">
          <Sticker emoji="stk:gift" size={72} rotate={-6} />
          <Txt className="mt-4 text-center text-[14.5px] leading-5 text-t2">{t("giftTakenBody")}</Txt>
        </View>
        {gift?.link ? (
          <View className="mb-3">
            <Pill full kind="ghost" icon={<ShoppingBag size={18} color={C.t1} />} onPress={() => WebBrowser.openBrowserAsync(gift.link!)}>
              {t("buyLink")}
            </Pill>
          </View>
        ) : null}
        <Pill full onPress={() => gift && take(gift)}>{t("giftTakenOk")}</Pill>
      </Sheet>
    </View>
  );
}

function WishThumb({ w }: { w: Wish }) {
  const img = wishImages(w)[0];
  return (
    <View className="h-lg w-lg items-center justify-center overflow-hidden rounded-xl bg-card2">
      {img ? <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Sticker emoji={w.emoji} size={26} />}
    </View>
  );
}
