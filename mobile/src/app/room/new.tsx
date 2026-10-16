// New room: type (friends / couple / birthday), name, sticker (Premium packs
// locked), colour, with a live folder preview.

import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoomFolder } from "../../components/RoomFolder";
import { StickerPicker } from "../../components/StickerPicker";
import { Field, Pill, Segmented, Txt } from "../../components/ui";
import { SheetHeader } from "../../components/SheetHeader";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { ROOM_COLORS } from "../../theme/tokens";
import type { RoomType } from "../../types";

const HINT: Record<RoomType, string> = { friends: "friendsRoomHint", couple: "coupleRoomHint", birthday: "birthdayRoomHint" };

export default function CreateRoomScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createRoom } = useWishpool();
  const { isStickerLocked } = useSubscription();
  const [type, setType] = useState<RoomType>("friends");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("stk:cake");
  const [tint, setTint] = useState(ROOM_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const label = name.trim() || t(type === "couple" ? "roomCouple" : type === "birthday" ? "roomBirthday" : "roomFriends");

  const submit = async () => {
    if (busy || isStickerLocked(emoji)) return;
    setBusy(true);
    try {
      const id = await createRoom({ name: label, type, emoji, tint, ...(type === "birthday" ? { bdayMode: "self" } : {}) } as any);
      haptic("success");
      router.replace({ pathname: "/room/[id]", params: { id } });
    } catch {
      setBusy(false);
      haptic("error");
    }
  };

  return (
    <ScrollView className="flex-1 bg-card" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: insets.bottom + 32 }}>
      <SheetHeader title={t("newRoom")} />
      <View className="mx-auto mb-4 w-1/2">
        <RoomFolder room={{ id: "preview", name: label, type, emoji, tint, members: [] }} wishes={[]} onPress={() => {}} />
      </View>

      <Txt className="mb-2 font-m600 text-[13px] text-t2">{t("roomType")}</Txt>
      <Segmented
        options={[["friends", t("roomFriends")], ["couple", t("roomCouple")], ["birthday", t("roomBirthday")]]}
        value={type}
        onChange={setType}
        neutral
        className="bg-card2"
      />
      <Txt className="mb-4 mt-2 text-[12.5px] leading-[17px] text-t3">{t(HINT[type])}</Txt>

      <Field label={t("name")} value={name} onChangeText={setName} placeholder={label} />

      <Txt className="mb-2 font-m600 text-[13px] text-t2">{t("roomSticker")}</Txt>
      <View className="mb-4">
        <StickerPicker value={emoji} onChange={setEmoji} />
      </View>

      <Txt className="mb-2 font-m600 text-[13px] text-t2">{t("roomColor")}</Txt>
      <View className="mb-6 flex-row gap-3">
        {ROOM_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              haptic("select");
              setTint(c);
            }}
            className="h-sm w-sm items-center justify-center rounded-full"
            style={{ backgroundColor: c }}
          >
            {tint === c ? <Check size={18} color="#fff" /> : null}
          </Pressable>
        ))}
      </View>

      <Pill full disabled={busy} onPress={submit}>
        {busy ? t("creating") : t("createRoom")}
      </Pill>
    </ScrollView>
  );
}
