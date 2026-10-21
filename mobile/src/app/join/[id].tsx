// An invite link: https://wishpool.clickbrickk.com/join/<roomId>?from=<inviterId>
// (a universal link) or wishpool://join/<roomId>. Signed in: a look at the room
// and "Join". Otherwise: sign in first; the invite waits (lib/pendingJoin).
// A surprise birthday room asks whether it's your birthday, like the Mini App.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/AuthContext";
import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { toast, ToastHost } from "../../components/Toast";
import { Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { clearPendingJoin, joinSheet, savePendingJoin } from "../../lib/pendingJoin";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";
import type { Room } from "../../types";

type Peek = Room & { member: boolean; memberCount: number; hasCelebrant: boolean };

export default function JoinRoom() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { status } = useAuth();
  const { refresh } = useWishpool();
  const signedIn = status === "signedIn";
  const [room, setRoom] = useState<Peek | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    joinSheet.open = true;
    return () => {
      joinSheet.open = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    if (!signedIn) {
      savePendingJoin({ id, from });
      return;
    }
    clearPendingJoin();
    api
      .peekRoom(id)
      .then((r) => (r.room.member ? open(id) : setRoom(r.room)))
      .catch(() => setGone(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signedIn]);

  // the room takes this screen's place, so Back from the room never lands on
  // the invite again (back() + push left it underneath, still spinning)
  const open = (roomId: string) => router.replace(`/room/${roomId}`);

  const join = async (asCelebrant = false) => {
    if (busy || !id) return;
    setBusy(true);
    try {
      await api.joinRoom(id, { inviterId: from && from !== id ? from : undefined, asCelebrant });
      await refresh().catch(() => {});
      haptic("success");
      open(id);
      toast.success(t("joinedToast"), { root: true });
    } catch (e) {
      setBusy(false);
      const m = (e as Error)?.message;
      toast.error(t(m === "room_full" ? "roomFull" : m === "room_not_found" ? "joinGone" : "joinFailed"));
    }
  };

  // a surprise for someone else, and they haven't come in yet
  const surprise = !!room && room.type === "birthday" && room.bdayMode === "other" && !room.hasCelebrant;

  // full screen: the close button at the top, the room in the middle, the main
  // button at the bottom (like the new wish / new room forms)
  const body = !signedIn
    ? { sticker: <Sticker emoji="stk:envelope" size={64} />, title: t("joinInvited"), sub: t("joinSignIn") }
    : gone
      ? { sticker: <Sticker emoji="stk:ghost" size={64} />, title: t("joinGone"), sub: "" }
      : room
        ? {
            sticker: (
              <View className="h-24 w-24 items-center justify-center rounded-[28px]" style={{ backgroundColor: room.tint || C.blue }}>
                <Sticker emoji={room.emoji || "stk:gift"} size={52} />
              </View>
            ),
            title: surprise ? t("bdayGateTitle", { name: room.celebrantName || room.name }) : room.name,
            sub: surprise ? t("bdayGateSub") : t("membersColon", { n: room.memberCount }),
          }
        : null;

  return (
    <View className="flex-1 bg-card px-4" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <SheetHeader />
      <View className="flex-1 items-center justify-center" style={{ paddingBottom: 56 }}>
        {body ? (
          <>
            {body.sticker}
            <Txt className="mt-4 text-center font-m800 text-[22px]">{body.title}</Txt>
            {body.sub ? <Txt className="mt-1 text-center text-[14.5px] leading-5 text-t2">{body.sub}</Txt> : null}
          </>
        ) : (
          <ActivityIndicator color={C.t2} />
        )}
      </View>
      <View className="w-full gap-3">
        {!signedIn ? (
          <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
        ) : gone ? (
          <Pill full kind="ghost" onPress={() => router.back()}>{t("back")}</Pill>
        ) : room ? (
          <>
            <Pill full loading={busy} onPress={() => join(false)}>{surprise ? t("bdayGateIn") : t("joinRoomCta")}</Pill>
            {surprise ? (
              <Pill full kind="ghost" onPress={() => join(true)}>{t("bdayGateMe")}</Pill>
            ) : null}
          </>
        ) : null}
      </View>
      <ToastHost />
    </View>
  );
}
