// One room, laid out like RoomDetail in the Mini App: a mesh hero in the room
// colour (back button, sticker, name, countdown, avatars with a dashed "+",
// Invite), then a rounded sheet with "Friends' lists / My items here".
// "I'll get it" (Даруй таємно): a gift taken by someone shows as "Taken" to the
// other gifters, while the wish owner never sees it (the backend hides it).

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, Check, ChevronLeft, Gift, Lock, Pencil, Plus, Share2, Trash2, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Share, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoomListSkeleton } from "../../components/Skeleton";
import { SwipeRow } from "../../components/SwipeRow";
import { heroTop, RoomHeroBg } from "../../components/RoomHeroBg";
import { Sticker } from "../../components/Sticker";
import { Avatar, Empty, Pill, Segmented, Txt } from "../../components/ui";
import { WishList, WishRow } from "../../components/WishRow";
import { toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { countdownLabel } from "../../lib/dates";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { C, H } from "../../theme/tokens";
import type { Member, Wish } from "../../types";

type RoomWish = Wish & { reservedByMe?: boolean; taken?: boolean; chips?: { count: number; mine: boolean; total: number } | null };
type Detail = { lists: { member: Member; wishes: RoomWish[] }[]; mine: Wish[]; members?: (Member & { you?: boolean })[]; owner?: boolean };

// Round frosted button on the coloured hero (HeroButton in the Mini App).
function HeroButton({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="h-sm w-sm items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" }}>
      {children}
    </Pressable>
  );
}

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rooms, wishes, online, removeRoom } = useWishpool();
  const room = rooms.find((r) => r.id === id);
  const [seg, setSeg] = useState<"lists" | "mine">("lists");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(online);

  const load = useCallback(async () => {
    if (!online || !id) return;
    try {
      const d = await api.room(id);
      setDetail({ lists: d.lists || [], mine: d.mine || [], members: d.members, owner: d.room?.owner });
    } finally {
      setLoading(false);
    }
  }, [online, id]);
  // also reloads after the "I'll get it" and pick-wishes sheets close
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  if (!room) return <Empty emoji="stk:ghost" title={t("roomGone")} action={<Pill onPress={() => router.back()}>{t("back")}</Pill>} />;

  const members: (Member & { you?: boolean })[] = detail?.members || room.members || [];
  const mine = detail ? detail.mine : wishes.filter((w) => w.rooms.includes(room.id));
  const lists = detail?.lists || [];
  const others = members.filter((m) => !m.you && m.id !== "me");
  const coupleFull = room.type === "couple" && members.length >= 2;
  const isOwner = online ? !!detail?.owner : true; // a guest's rooms are all their own
  const cd = countdownLabel(lang, t, room.eventDate);

  // The iOS share sheet (AirDrop, Messages, Telegram...). The link opens the
  // room in the Telegram Mini App; a guest room only exists on this phone, so
  // then it's an invite to Wishpool itself.
  const invite = () => {
    const link = online ? `https://t.me/wishpool_bot/app?startapp=${room.id}` : "https://t.me/wishpool_bot/app";
    const text = online ? t("inviteText", { name: room.name }) : t("inviteAppText");
    Share.share({ message: `${text}\n${link}`, url: link }).catch(() => {});
  };

  const untake = (w: RoomWish) =>
    Alert.alert(t("cancelGiftTitle"), t("cancelGiftText", { name: w.title }), [
      { text: t("keepIt"), style: "cancel" },
      {
        text: t("cancelGiftYes"),
        style: "destructive",
        onPress: async () => {
          haptic("light");
          try {
            await api.unreserve(w.id);
            toast.info(t("toastUntaken"));
          } catch {
            toast.error(t("toastError"));
          } finally {
            load().catch(() => {});
          }
        },
      },
    ]);

  const openTake = (w: RoomWish) => router.push({ pathname: "/room/take", params: { id: w.id, title: w.title, link: w.link || "" } });

  const reserveRight = (w: RoomWish) =>
    w.reservedByMe ? (
      <Pill size="sm" kind="green" icon={<Check size={16} color={C.greenText} />} onPress={() => untake(w)}>{t("youGift")}</Pill>
    ) : w.taken ? (
      <View className="h-sm justify-center px-3">
        <Txt className="font-m600 text-[13px] text-t3">{t("taken")}</Txt>
      </View>
    ) : (
      <Pill size="sm" kind="soft" onPress={() => openTake(w)}>
        <Txt className="font-m600 text-sm text-blueText">{t("take")}</Txt>
        <Sticker emoji="stk:basket" size={18} style={{ margin: -6 }} />
      </Pill>
    );

  const leaveOrDelete = () =>
    Alert.alert(t(isOwner ? "confirmDelete" : "confirmLeave"), "", [
      { text: t("setCancel"), style: "cancel" },
      {
        text: t(isOwner ? "deleteRoom" : "leaveRoom"),
        style: "destructive",
        onPress: () => {
          router.back();
          removeRoom(room.id, isOwner)
            .then(() => toast.info(t(isOwner ? "toastRoomDeleted" : "toastLeftRoom")))
            .catch(() => toast.error(t("toastError")));
        },
      },
    ]);

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: C.card }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* overscroll at the top shows the hero colour, not black */}
      <View pointerEvents="none" style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: heroTop(room.tint) }} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 40, overflow: "hidden" }}>
        <RoomHeroBg tint={room.tint} />
        <View className="flex-row items-center justify-between" style={{ height: H.sm }}>
          <HeroButton onPress={() => router.back()} label={t("back")}>
            <ChevronLeft size={20} color="#fff" />
          </HeroButton>
        </View>
        <View className="items-center">
          <View style={{ marginTop: 4, width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
            <Sticker emoji={room.emoji} size={45} />
          </View>
          <Txt className="mt-3 text-center font-m800 text-[26px] text-white" style={{ textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } }}>{room.name}</Txt>
          {cd ? (
            <View className="mt-2 flex-row items-center gap-2 rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
              <CalendarDays size={15} color="#fff" />
              <Txt className="font-m600 text-[13.5px] text-white">{[room.eventTitle, cd].filter(Boolean).join(" · ")}</Txt>
            </View>
          ) : null}
          <View className="mt-3 flex-row items-center">
            {members.map((m, i) => (
              <View key={m.id} style={{ marginLeft: i ? -10 : 0, borderRadius: 40, borderWidth: 2, borderColor: "rgba(0,0,0,0.25)" }}>
                <Avatar m={m} size={38} />
              </View>
            ))}
            {!coupleFull ? (
              <Pressable onPress={invite} accessibilityLabel={t("invite")} className="ml-2 h-sm w-sm items-center justify-center rounded-full" style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.85)", backgroundColor: "rgba(255,255,255,0.12)" }}>
                <Plus size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
          {!coupleFull ? (
            <View className="mt-6 w-full">
              <Pill full kind={room.type === "friends" ? "glass" : "primary"} icon={<Share2 size={17} color="#fff" />} onPress={invite}>
                {t("invite")}
              </Pill>
            </View>
          ) : null}
        </View>
      </View>

      {/* content sheet slides over the hero with rounded corners */}
      <View className="flex-1 bg-card px-4 pt-4" style={{ marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: insets.bottom + 16 }}>
        <Segmented options={[["lists", t("segLists")], ["mine", t("segMine")]]} value={seg} onChange={setSeg} neutral fill={C.bg} className="mb-4" />

        {seg === "lists" ? (
          loading ? (
            <RoomListSkeleton />
          ) : others.length === 0 || lists.length === 0 ? (
            <Empty compact emoji="stk:bear" tilt={0} title={t("onlyYouTitle")} sub={t("onlyYouSub")} action={<Pill icon={<Share2 size={17} color="#fff" />} onPress={invite}>{t("inviteFriends")}</Pill>} />
          ) : (
            <View className="gap-6">
              {lists.map(({ member, wishes: ws }, i) => (
                <Animated.View key={member.id} entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(18)}>
                  <View className="mb-1 flex-row items-center gap-3">
                    <Avatar m={member} size={28} />
                    <Txt className="font-m700 text-[15.5px]">{member.name}</Txt>
                  </View>
                  {ws.length ? (
                    <WishList>
                      {ws.map((w) =>
                        // swipe left: "I'll get it", or "Not giving" on your own pick
                        w.taken && !w.reservedByMe ? (
                          <WishRow key={w.id} w={w} right={reserveRight(w)} />
                        ) : (
                          <SwipeRow
                            key={w.id}
                            label={t(w.reservedByMe ? "swipeUntake" : "swipeTake")}
                            color={w.reservedByMe ? C.danger : C.blue}
                            icon={w.reservedByMe ? <X size={20} color="#fff" /> : <Gift size={20} color="#fff" />}
                            onAction={() => (w.reservedByMe ? untake(w) : openTake(w))}
                          >
                            <WishRow w={w} right={reserveRight(w)} />
                          </SwipeRow>
                        ),
                      )}
                    </WishList>
                  ) : (
                    <View className="rounded-card bg-bg px-5 py-4">
                      <Txt className="text-[13.5px] text-t3">{t("noWishesYet")}</Txt>
                    </View>
                  )}
                </Animated.View>
              ))}
              <View className="mt-1 flex-row items-center justify-center gap-2">
                <Lock size={13} color={C.t3} />
                <Txt className="text-[12.5px] text-t3">{t("reserveNote")}</Txt>
              </View>
            </View>
          )
        ) : (
          <Animated.View entering={FadeIn.duration(220)}>
            {mine.length === 0 ? (
              <Empty compact emoji="stk:gift" tilt={0} title={t("nothingSharedTitle")} sub={t("nothingSharedSub")} />
            ) : (
              <WishList>
                {mine.map((w) => (
                  <WishRow key={w.id} w={w} right={<Txt className="text-[12.5px] text-t3">{t("visibleToAll")}</Txt>} />
                ))}
              </WishList>
            )}
            {/* MineActions: a new wish right here, or pick from the wishlist */}
            <View className="mt-4 gap-2">
              <Pill full icon={<Plus size={18} color="#fff" />} onPress={() => router.push({ pathname: "/wish/new", params: { room: room.id } })}>
                {t("newWishHere")}
              </Pill>
              <Pill full kind="ghost" icon={mine.length ? <Pencil size={17} color={C.t1} /> : <Gift size={17} color={C.t1} />} onPress={() => router.push({ pathname: "/room/pick", params: { id: room.id } })}>
                {t(mine.length ? "editRoomWishes" : "addFromPool")}
              </Pill>
            </View>
          </Animated.View>
        )}

        <View className="mt-auto items-center pt-4">
          <Pressable onPress={leaveOrDelete} className="h-sm flex-row items-center gap-2 px-3">
            {isOwner ? <Trash2 size={16} color={C.danger} /> : <X size={16} color={C.t2} />}
            <Txt className={`font-m600 text-sm ${isOwner ? "text-danger" : "text-t2"}`}>{t(isOwner ? "deleteRoom" : "leaveRoom")}</Txt>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
