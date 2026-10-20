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

  // the sheet closes and the room opens in its place
  const open = (roomId: string) => {
    router.back();
    setTimeout(() => router.push(`/room/${roomId}`), 50);
  };

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

  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader />
      {!signedIn ? (
        <View className="items-center">
          <Sticker emoji="stk:envelope" size={64} />
          <Txt className="mt-4 text-center font-m800 text-[22px]">{t("joinInvited")}</Txt>
          <Txt className="mt-1 text-center text-[14.5px] leading-5 text-t2">{t("joinSignIn")}</Txt>
          <View className="mt-6 w-full">
            <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
          </View>
        </View>
      ) : gone ? (
        <View className="items-center">
          <Sticker emoji="stk:ghost" size={64} />
          <Txt className="mt-4 text-center font-m800 text-[22px]">{t("joinGone")}</Txt>
          <View className="mt-6 w-full">
            <Pill full kind="ghost" onPress={() => router.back()}>{t("back")}</Pill>
          </View>
        </View>
      ) : !room ? (
        <View className="h-[220px] items-center justify-center">
          <ActivityIndicator color={C.t2} />
        </View>
      ) : (
        <View className="items-center">
          <View className="h-24 w-24 items-center justify-center rounded-[28px]" style={{ backgroundColor: room.tint || C.blue }}>
            <Sticker emoji={room.emoji || "stk:gift"} size={52} />
          </View>
          <Txt className="mt-4 text-center font-m800 text-[22px]">{surprise ? t("bdayGateTitle", { name: room.celebrantName || room.name }) : room.name}</Txt>
          <Txt className="mt-1 text-center text-[14.5px] leading-5 text-t2">
            {surprise ? t("bdayGateSub") : t("membersColon", { n: room.memberCount })}
          </Txt>
          <View className="mt-6 w-full gap-3">
            <Pill full loading={busy} onPress={() => join(false)}>{surprise ? t("bdayGateIn") : t("joinRoomCta")}</Pill>
            {surprise ? (
              <Pill full kind="ghost" onPress={() => join(true)}>{t("bdayGateMe")}</Pill>
            ) : null}
          </View>
        </View>
      )}
      <ToastHost inSheet />
    </View>
  );
}
