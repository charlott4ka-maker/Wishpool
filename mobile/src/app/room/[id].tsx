// One room, laid out like RoomDetail in the Mini App: a mesh hero in the room
// colour (back button, sticker, name, countdown, avatars with a dashed "+",
// Invite), then a rounded sheet with "Friends' lists / My items here".
// "I'll get it" (Даруй таємно): a gift taken by someone shows as "Taken" to the
// other gifters, while the wish owner never sees it (the backend hides it).

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { CalendarDays, Check, ChevronLeft, Ellipsis, Gift, Lock, Pencil, Plus, Share2, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, RefreshControl, ScrollView, Share, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoomListSkeleton } from "../../components/Skeleton";
import { SwipeRow } from "../../components/SwipeRow";
import { heroTop, RoomHeroBg } from "../../components/RoomHeroBg";
import { Sticker } from "../../components/Sticker";
import { Avatar, Empty, GlassCircle, Pill, Segmented, Txt } from "../../components/ui";
import { WishList, WishRow } from "../../components/WishRow";
import { toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { countdownLabel } from "../../lib/dates";
import { haptic } from "../../lib/haptics";
import { useAuth } from "../../auth/AuthContext";
import { api, SITE_URL } from "../../services/api";
import { actionSheet } from "../../lib/actionSheet";
import { asMe, useMe } from "../../lib/me";
import { usePullRefresh } from "../../lib/pullRefresh";
import { askReport } from "../../lib/report";
import { openedWish, type RoomWish } from "../../lib/openedWish";
import { useWishpool } from "../../store/WishpoolContext";
import { C, H } from "../../theme/tokens";
import type { Member, Wish } from "../../types";

type Detail = { lists: { member: Member; wishes: RoomWish[] }[]; mine: Wish[]; members?: (Member & { you?: boolean })[]; owner?: boolean };

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rooms, wishes, online, removeRoom, refresh } = useWishpool();
  const { user } = useAuth();
  const me = useMe();
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

  // pull down: the room (friends' lists, who's in) and the room list
  const pull = usePullRefresh(useCallback(() => Promise.all([load(), refresh()]), [load, refresh]));

  // opened from an invite link there may be nothing underneath: then home
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!room) return <Empty emoji="stk:ghost" title={t("roomGone")} action={<Pill onPress={goBack}>{t("back")}</Pill>} />;

  const members: (Member & { you?: boolean })[] = (detail?.members || room.members || []).map((m) => asMe(m, me));
  const mine = detail ? detail.mine : wishes.filter((w) => w.rooms.includes(room.id));
  const lists = detail?.lists || room.demoLists || [];
  const others = members.filter((m) => !m.you && m.id !== "me");
  const coupleFull = room.type === "couple" && members.length >= 2;
  const isOwner = online ? !!detail?.owner : true; // a guest's rooms are all their own
  const cd = countdownLabel(lang, t, room.eventDate);

  // The iOS share sheet (AirDrop, Messages, Telegram...). The link opens the
  // room in the iPhone app when it's installed, otherwise its web page sends
  // people on to the Telegram Mini App. A guest room only exists on this
  // phone, so then it's an invite to Wishpool itself.
  const invite = () => {
    const link = online ? `${SITE_URL}/join/${room.id}${user?.id ? "?from=" + encodeURIComponent(user.id) : ""}` : "https://t.me/wishpool_bot/app";
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

  // a friend's wish in full (long titles, photos, note) in a sheet
  const openWish = (w: RoomWish) => {
    openedWish.w = w;
    openedWish.roomId = room.id;
    router.push("/room/wish");
  };

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

  // Report / block someone else (App Review 1.2): ⋯ by a friend's name, or a
  // long press on one of their wishes. Reports go to support and the admin page.
  const sheet = (title: string, actions: [string, () => void][], destructive?: number) => actionSheet(title, t("setCancel"), actions, destructive);
  const report = (target: { wishId?: string; userId?: string }) => askReport(t, { ...target, roomId: room.id });
  const block = (m: Member) =>
    Alert.alert(t("blockTitle", { name: m.name }), t("blockText"), [
      { text: t("setCancel"), style: "cancel" },
      {
        text: t("blockUser"),
        style: "destructive",
        onPress: () =>
          api
            .block(m.id)
            .then(() => {
              haptic("success");
              toast.info(t("toastBlocked"));
            })
            .catch(() => toast.error(t("toastError")))
            .finally(() => load().catch(() => {})),
      },
    ]);
  const unblock = (m: Member) => {
    haptic("light");
    api
      .unblock(m.id)
      .catch(() => toast.error(t("toastError")))
      .finally(() => load().catch(() => {}));
  };
  const memberMenu = (m: Member) => {
    haptic("select");
    sheet(m.name, [[t("reportUser"), () => report({ userId: m.id })], [t("blockUser"), () => block(m)]], 1);
  };
  const wishMenu = online
    ? (w: RoomWish) => () => {
        haptic("select");
        sheet(w.title, [[t("reportWish"), () => report({ wishId: w.id })]]);
      }
    : () => undefined;

  const openMenu = () => {
    haptic("select");
    const actions: [string, () => void][] = isOwner
      ? [
          [t("editRoom"), () => router.push({ pathname: "/room/new", params: { id: room.id } })],
          [t("deleteRoom"), leaveOrDelete],
        ]
      : [[t("leaveRoom"), leaveOrDelete]];
    const options = [...actions.map((a) => a[0]), t("setCancel")];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: room.name, options, destructiveButtonIndex: actions.length - 1, cancelButtonIndex: actions.length, userInterfaceStyle: "dark" },
        (i) => i < actions.length && actions[i][1](),
      );
    } else {
      Alert.alert(room.name, "", [...actions.map(([text, onPress]) => ({ text, onPress })), { text: t("setCancel"), style: "cancel" as const }]);
    }
  };

  const leaveOrDelete = () =>
    Alert.alert(t(isOwner ? "confirmDelete" : "confirmLeave"), "", [
      { text: t("setCancel"), style: "cancel" },
      {
        text: t(isOwner ? "deleteRoom" : "leaveRoom"),
        style: "destructive",
        onPress: () => {
          goBack();
          removeRoom(room.id, isOwner)
            .then(() => toast.info(t(isOwner ? "toastRoomDeleted" : "toastLeftRoom")))
            .catch(() => toast.error(t("toastError")));
        },
      },
    ]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      style={{ backgroundColor: C.card }}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        online ? (
          <RefreshControl tintColor="#fff" refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
        ) : undefined
      }
    >
      {/* overscroll at the top shows the hero colour, not black */}
      <View pointerEvents="none" style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: heroTop(room.tint) }} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 40, overflow: "hidden" }}>
        <RoomHeroBg tint={room.tint} />
        <View className="flex-row items-center justify-between" style={{ height: H.sm }}>
          <GlassCircle onPress={goBack} label={t("back")}>
            <SymbolView name="chevron.left" size={19} weight="semibold" tintColor="#fff" fallback={<ChevronLeft size={20} color="#fff" />} />
          </GlassCircle>
          {/* ⋯ menu: edit / delete for the owner, leave for everyone else */}
          <GlassCircle onPress={openMenu} label={t("more")}>
            <SymbolView name="ellipsis" size={19} weight="semibold" tintColor="#fff" fallback={<Ellipsis size={20} color="#fff" />} />
          </GlassCircle>
        </View>
        <View className="items-center">
          <View style={{ marginTop: 4, width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
            <Sticker emoji={room.emoji} size={45} />
          </View>
          {/* the shadow is drawn only inside the text's own box: padding gives it room
              (it showed as a rectangle cut off around the name), the margins take it back */}
          <Txt
            className="text-center font-m800 text-[26px] text-white"
            style={{ textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 }, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: -16, marginTop: 2, marginBottom: -10 }}
          >
            {room.name}
          </Txt>
          {cd ? (
            <View className="mt-2 flex-row items-center gap-2 rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
              <CalendarDays size={15} color="#fff" />
              <Txt className="font-m600 text-[13.5px] text-white">{[room.eventTitle, cd].filter(Boolean).join(" · ")}</Txt>
            </View>
          ) : null}
          <View className="mt-3 flex-row items-center">
            {members.map((m, i) => (
              // overlapping stack; a masked gap (no ring) around the next one
              <View key={m.id} style={{ marginLeft: i ? -10 : 0 }}>
                <Avatar m={m} size={38} cut={i < members.length - 1 ? 10 : 0} />
              </View>
            ))}
          </View>
          {!coupleFull ? (
            <View className="mt-6">
              <Pill kind="glass" px={24} icon={<Share2 size={17} color="#fff" />} onPress={invite}>
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
            // centred in the space under the tabs, lifted a little (optical centre)
            <View style={{ flex: 1, paddingBottom: 72 }}>
              <Empty fill compact emoji="stk:bear" tilt={0} title={t("onlyYouTitle")} sub={t("onlyYouSub")} />
            </View>
          ) : (
            <View className="gap-6">
              {lists.map(({ member, wishes: ws }, i) => (
                <Animated.View key={member.id} entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(18)}>
                  <View className="mb-1 flex-row items-center gap-3">
                    <Avatar m={member} size={28} />
                    <Txt numberOfLines={1} className="flex-1 font-m700 text-[15.5px]">{member.name}</Txt>
                    {!online ? null : member.blocked ? (
                      <Pill size="sm" kind="ghost" onPress={() => unblock(member)}>{t("unblockUser")}</Pill>
                    ) : (
                      <Pressable onPress={() => memberMenu(member)} hitSlop={8} accessibilityLabel={t("more")} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                        <Ellipsis size={20} color={C.t3} strokeWidth={1.5} absoluteStrokeWidth />
                      </Pressable>
                    )}
                  </View>
                  {member.blocked ? (
                    <View className="rounded-card bg-bg px-5 py-4">
                      <Txt className="text-[13.5px] text-t3">{t("blockedNote")}</Txt>
                    </View>
                  ) : ws.length ? (
                    <WishList>
                      {ws.map((w) =>
                        // swipe left: "I'll get it", or "Not giving" on your own pick
                        w.taken && !w.reservedByMe ? (
                          <WishRow key={w.id} w={w} right={reserveRight(w)} onPress={online ? () => openWish(w) : undefined} onLongPress={wishMenu(w)} />
                        ) : (
                          <SwipeRow
                            key={w.id}
                            label={t(w.reservedByMe ? "swipeUntake" : "swipeTake")}
                            color={w.reservedByMe ? C.danger : C.blue}
                            icon={w.reservedByMe ? <X size={20} color="#fff" /> : <Gift size={20} color="#fff" />}
                            onAction={() => (w.reservedByMe ? untake(w) : openTake(w))}
                          >
                            <WishRow w={w} right={reserveRight(w)} onPress={online ? () => openWish(w) : undefined} onLongPress={wishMenu(w)} />
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
          <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
            {mine.length === 0 ? (
              // centred at the same height as the empty "Friends' lists": the
              // buttons below take 128pt, so it borrows 56 of them back
              // (lists: centred above 72pt of padding)
              <View style={{ flex: 1, marginBottom: -56 }}>
                <Empty fill compact emoji="stk:gift" tilt={0} title={t("nothingSharedTitle")} sub={t("nothingSharedSub")} />
              </View>
            ) : (
              <WishList>
                {mine.map((w) => (
                  <WishRow key={w.id} w={w} right={<Txt className="text-[12.5px] text-t3">{t("visibleToAll")}</Txt>} onPress={() => router.push({ pathname: "/wish/[id]", params: { id: w.id } })} />
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

      </View>
    </ScrollView>
  );
}
