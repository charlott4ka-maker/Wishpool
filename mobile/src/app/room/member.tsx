// A room member's mini profile: tap their picture in a room. Their photo and
// name, and "Add friend" (a request they accept, or friends at once if they
// asked first). Once asked or already friends, a quiet status line instead.

import { useLocalSearchParams } from "expo-router";
import { Check, Clock, UserPlus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../../components/SheetHeader";
import { toast, ToastHost } from "../../components/Toast";
import { Avatar, Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";

type State = "loading" | "none" | "sent" | "friends";

export default function RoomMember() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { id, user } = useLocalSearchParams<{ id: string; user: string }>();
  const { rooms } = useWishpool();
  const room = rooms.find((r) => r.id === id);
  const m = room?.members.find((x) => x.id === user);
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .friends()
      .then((f) => setState(f.friends.some((x) => x.id === user) ? "friends" : f.outgoing.includes(user) ? "sent" : "none"))
      .catch(() => setState("none"));
  }, [user]);

  const add = async () => {
    if (busy || !user) return;
    setBusy(true);
    try {
      const r = await api.friendRequest(user);
      haptic("success");
      setState(r.status === "friends" ? "friends" : "sent");
      toast.success(t(r.status === "friends" ? "toastFriendsNow" : "toastRequestSent"));
    } catch {
      haptic("error");
      toast.error(t("toastError"));
    } finally {
      setBusy(false);
    }
  };

  if (!m) return null;
  const status = (icon: React.ReactNode, text: string) => (
    <View className="h-lg flex-row items-center justify-center gap-2">
      {icon}
      <Txt className="font-m600 text-[15px] text-t2">{text}</Txt>
    </View>
  );

  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader />
      <View className="items-center pb-6" style={{ marginTop: -40 }}>
        <Avatar m={m} size={88} />
        <Txt numberOfLines={1} className="mt-4 text-center font-m800 text-[22px]">{m.name}</Txt>
        {room ? <Txt numberOfLines={1} className="mt-1 text-center text-[14px] text-t2">{t("memberInRoom", { room: room.name })}</Txt> : null}
      </View>
      {state === "loading" ? (
        <View className="h-lg items-center justify-center"><ActivityIndicator color={C.t2} /></View>
      ) : state === "friends" ? (
        status(<Check size={18} color={C.greenText} strokeWidth={1.5} absoluteStrokeWidth />, t("friendsAlready"))
      ) : state === "sent" ? (
        status(<Clock size={18} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth />, t("toastRequestSent"))
      ) : (
        <Pill full loading={busy} icon={<UserPlus size={18} color="#fff" />} onPress={add}>{t("addFriend")}</Pill>
      )}
      <ToastHost inSheet />
    </View>
  );
}
