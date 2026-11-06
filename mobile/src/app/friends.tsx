// Friends (Profile › Friends): room invitations and friend requests waiting for
// you, your personal link to add friends, and the friends themselves. No search
// and no public IDs: friends come from a room (⋯ › Add friend) or from your link.

import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Check, ChevronLeft, Ellipsis, UserPlus, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { Press } from "../components/Press";
import { Sticker } from "../components/Sticker";
import { toast } from "../components/Toast";
import { Avatar, Empty, GlassCircle, Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { actionSheet } from "../lib/actionSheet";
import { haptic } from "../lib/haptics";
import { usePullRefresh } from "../lib/pullRefresh";
import { api, type FriendsData } from "../services/api";
import { useWishpool } from "../store/WishpoolContext";
import { C } from "../theme/tokens";
import type { Member } from "../types";
import { BOT_APP, IN_TG, tgShare } from "../lib/telegram";

// grouped like Settings: hairline separators that start after the picture
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View className="mb-8">
      <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>{title}</Txt>
      <View className="overflow-hidden rounded-card bg-raised">
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.12)", marginLeft: 68 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Row({ m, sub, right }: { m: Member; sub?: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Avatar m={m} size={40} />
      <View className="flex-1">
        <Txt numberOfLines={1} className="font-m600 text-base">{m.name}</Txt>
        {sub ? <Txt numberOfLines={1} className="mt-0.5 text-[13px] text-t2">{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

export default function FriendsScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const { refresh } = useWishpool();
  const [data, setData] = useState<FriendsData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const signedIn = status === "signedIn";

  const load = useCallback(async () => {
    if (!signedIn) return;
    setData(await api.friends());
  }, [signedIn]);
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );
  const pull = usePullRefresh(useCallback(() => Promise.all([load(), refresh()]), [load, refresh]));

  // one action at a time, then the lists (and the profile dot) catch up
  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    if (busy) return;
    setBusy(key);
    haptic("light");
    try {
      await fn();
      if (done) toast.success(done);
      await Promise.all([load(), refresh()]).catch(() => {});
    } catch {
      toast.error(t("toastError"));
    } finally {
      setBusy(null);
    }
  };

  const shareLink = async () => {
    haptic("light");
    try {
      const { url, code } = await api.friendLink();
      // in Telegram the link opens the Mini App on the friend screen
      if (IN_TG) tgShare(`${BOT_APP}?startapp=fr_${code}`, t("inviteFriendText"));
      else await Share.share({ message: `${t("inviteFriendText")}\n${url}`, url });
    } catch {
      toast.error(t("toastError"));
    }
  };

  const friendMenu = (m: Member) => {
    haptic("select");
    actionSheet(m.name, t("setCancel"), [
      [
        t("removeFriend"),
        () =>
          Alert.alert(t("removeFriendTitle", { name: m.name }), "", [
            { text: t("setCancel"), style: "cancel" },
            { text: t("removeFriend"), style: "destructive", onPress: () => act("rm" + m.id, () => api.removeFriend(m.id)) },
          ]),
      ],
    ], 0);
  };

  // round icon buttons, so the name keeps its room: decline (x) and accept (check)
  const twoButtons = (key: string, yes: () => void, no: () => void) =>
    busy === key ? (
      <ActivityIndicator color={C.t2} />
    ) : (
      <View className="flex-row gap-2">
        <Press onPress={no} accessibilityLabel={t("decline")} className="h-sm w-sm items-center justify-center rounded-full bg-[#2D3440]">
          <X size={18} color={C.t1} strokeWidth={1.5} absoluteStrokeWidth />
        </Press>
        <Press onPress={yes} accessibilityLabel={t("accept")} className="h-sm w-sm items-center justify-center rounded-full bg-blue">
          <Check size={18} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
        </Press>
      </View>
    );

  return (
    <View className="flex-1 bg-card">
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t("friendsTitle")}</Txt>
        </View>
      </View>

      {!signedIn ? (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 40 }}>
          <Empty fill compact emoji="stk:envelope" tilt={0} title={t("friendsSignIn")} action={<View style={{ width: 220 }}><Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill></View>} />
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={C.t2} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 32, flexGrow: 1 }}
          refreshControl={<RefreshControl tintColor={C.t2} refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
        >
          {data.roomInvites.length ? (
            <Section title={t("roomInvitesTitle")}>
              {data.roomInvites.map((inv) => (
                <View key={inv.room.id} className="flex-row items-center gap-3 px-4 py-3">
                  <View className="h-10 w-10 items-center justify-center rounded-[12px]" style={{ backgroundColor: inv.room.tint || C.blue }}>
                    <Sticker emoji={inv.room.emoji || "stk:gift"} size={22} />
                  </View>
                  <View className="flex-1">
                    <Txt numberOfLines={1} className="font-m600 text-base">{inv.room.name}</Txt>
                    {inv.inviter ? <Txt numberOfLines={1} className="mt-0.5 text-[13px] text-t2">{t("invitedBy", { name: inv.inviter.name })}</Txt> : null}
                  </View>
                  {twoButtons(
                    "ri" + inv.room.id,
                    () =>
                      act("ri" + inv.room.id, async () => {
                        await api.acceptRoomInvite(inv.room.id);
                        router.push({ pathname: "/room/[id]", params: { id: inv.room.id } });
                      }, t("joinedToast")),
                    () => act("ri" + inv.room.id, () => api.declineRoomInvite(inv.room.id)),
                  )}
                </View>
              ))}
            </Section>
          ) : null}

          {data.requests.length ? (
            <Section title={t("friendRequests")}>
              {data.requests.map((r) => (
                <Row
                  key={r.user.id}
                  m={r.user}
                  right={twoButtons("fr" + r.user.id, () => act("fr" + r.user.id, () => api.acceptFriend(r.user.id), t("toastFriendsNow")), () => act("fr" + r.user.id, () => api.declineFriend(r.user.id)))}
                />
              ))}
            </Section>
          ) : null}

          <View className="mb-8">
            <Pill full icon={<UserPlus size={18} color="#fff" />} onPress={shareLink}>{t("inviteFriendLink")}</Pill>
          </View>

          {data.friends.length ? (
            <Section title={t("friendsTitle")}>
              {data.friends.map((m) => (
                <Row
                  key={m.id}
                  m={m}
                  right={
                    busy === "rm" + m.id ? (
                      <ActivityIndicator color={C.t2} />
                    ) : (
                      <Pressable onPress={() => friendMenu(m)} hitSlop={8} accessibilityLabel={t("more")} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                        <Ellipsis size={20} color={C.t3} strokeWidth={1.5} absoluteStrokeWidth />
                      </Pressable>
                    )
                  }
                />
              ))}
            </Section>
          ) : (
            <View style={{ flex: 1, paddingBottom: 40 }}>
              <Empty fill compact emoji="stk:bear" tilt={0} title={t("friendsNone")} sub={t("friendsNoneSub")} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
