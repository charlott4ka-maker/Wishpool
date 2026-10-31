// Someone's personal friend link: https://wishpool.clickbrickk.com/friend/<code>
// (a universal link) or wishpool://friend/<code>. Shows who it is and adds them
// as a friend in one tap; a guest is asked to sign in first. Full screen, laid
// out like the room invite: close at the top, the person in the middle, the button below.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/AuthContext";
import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { toast, ToastHost } from "../../components/Toast";
import { Avatar, Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { C } from "../../theme/tokens";
import type { Member } from "../../types";

export default function FriendLink() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  const [info, setInfo] = useState<{ user: Member; self: boolean; friend: boolean } | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code || !signedIn) return;
    api.friendByCode(code).then(setInfo).catch(() => setGone(true));
  }, [code, signedIn]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const add = async () => {
    if (busy || !code) return;
    setBusy(true);
    try {
      await api.addFriendByCode(code);
      haptic("success");
      router.replace("/friends");
      toast.success(t("toastFriendsNow"), { root: true });
    } catch {
      setBusy(false);
      haptic("error");
      toast.error(t("toastError"));
    }
  };

  const title = !signedIn
    ? t("friendsSignIn")
    : gone
      ? t("friendLinkGone")
      : info
        ? info.self
          ? t("friendLinkSelf")
          : info.friend
            ? t("friendLinkAlready")
            : t("friendLinkTitle", { name: info.user.name })
        : "";

  return (
    <View className="flex-1 bg-card px-4" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <SheetHeader onClose={close} />
      <View className="flex-1 items-center justify-center" style={{ paddingBottom: 56 }}>
        {signedIn && !info && !gone ? (
          <ActivityIndicator color={C.t2} />
        ) : (
          <>
            {info && !gone ? <Avatar m={info.user} size={96} /> : <Sticker emoji={gone ? "stk:ghost" : "stk:envelope"} size={64} />}
            <Txt className="mt-4 text-center font-m800 text-[22px]">{title}</Txt>
            {info && !gone && !info.self && !info.friend ? <Txt className="mt-1 text-center text-[14.5px] leading-5 text-t2">{t("friendLinkSub")}</Txt> : null}
          </>
        )}
      </View>
      {!signedIn ? (
        <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
      ) : info && !gone && !info.self && !info.friend ? (
        <Pill full loading={busy} onPress={add}>{t("addFriend")}</Pill>
      ) : info || gone ? (
        <Pill full kind="ghost" onPress={close}>{t("back")}</Pill>
      ) : null}
      <ToastHost />
    </View>
  );
}
