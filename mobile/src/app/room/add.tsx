// Room ⋯ › Add friends: pick friends who aren't in the room yet. Each one is
// added at once or gets an invitation, as they chose in their Settings. A native
// sheet that fits its content; the room reloads when it closes.

import { useLocalSearchParams, useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendPicker, useFriendList } from "../../components/FriendPicker";
import { SheetHeader } from "../../components/SheetHeader";
import { toast, ToastHost } from "../../components/Toast";
import { Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";

export default function AddFriendsToRoom() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rooms, refresh } = useWishpool();
  const room = rooms.find((r) => r.id === id);
  const friends = useFriendList(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inRoom = (room?.members || []).map((m) => m.id);
  const left = friends ? friends.filter((f) => !inRoom.includes(f.id)) : null;
  const couple = room?.type === "couple";

  const add = async () => {
    if (!picked.length) {
      haptic("error");
      return;
    }
    if (busy || !id) return;
    setBusy(true);
    try {
      const res = await api.addToRoom(id, picked);
      await refresh().catch(() => {});
      haptic("success");
      router.back();
      toast.success(t(res.added.length ? "toastFriendsAdded" : "toastInvitesSent"), { root: true });
    } catch {
      setBusy(false);
      haptic("error");
      toast.error(t("toastError"));
    }
  };

  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("addFriendsToRoom")} />
      {left && left.length === 0 ? (
        <View className="items-center pb-4">
          <Txt className="text-center text-[14.5px] leading-5 text-t2">{t("friendsNoneSub")}</Txt>
          <View className="mt-4 w-full">
            <Pill full kind="ghost" icon={<UserPlus size={18} color={C.t1} />} onPress={() => router.replace("/friends")}>{t("friendsTitle")}</Pill>
          </View>
        </View>
      ) : (
        <>
          <View className="mb-4">
            <FriendPicker friends={left} selected={picked} onToggle={(fid) => setPicked((cur) => (cur.includes(fid) ? cur.filter((x) => x !== fid) : couple ? [fid] : [...cur, fid]))} />
          </View>
          <Txt className="mb-6 text-[12.5px] leading-[18px] text-t3">{t("roomAddHint")}</Txt>
          <Pill full loading={busy} onPress={add}>{t("addFriendsToRoom")}</Pill>
        </>
      )}
      <ToastHost inSheet />
    </View>
  );
}
