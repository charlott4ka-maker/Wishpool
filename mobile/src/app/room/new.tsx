// New room (or, with ?id=, editing one: name, sticker, colour and a birthday
// room's date / name; the type stays), laid out like CreateRoomSheet in the Mini App (but with the room
// folder as the live preview), sticker, colour, type chips with a hint, for a birthday
// "Whose birthday?" + name + date, then the room name.

import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateRow } from "../../components/DateRow";
import { RoomFolder } from "../../components/RoomFolder";
import { SheetHeader } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { StickerPicker } from "../../components/StickerPicker";
import { Chip, Field, Pill, Segmented, Txt } from "../../components/ui";
import { ToastHost, toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { C, ROOM_COLORS } from "../../theme/tokens";
import type { RoomType } from "../../types";

const PRESETS: { type: RoomType; key: string; hint: string }[] = [
  { type: "friends", key: "roomFriends", hint: "friendsRoomHint" },
  { type: "couple", key: "roomCouple", hint: "coupleRoomHint" },
  { type: "birthday", key: "roomBirthday", hint: "birthdayRoomHint" },
];

const Label = ({ children }: { children: string }) => <Txt className="mb-2 font-m600 text-[13px] text-t2">{children}</Txt>;

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View className="mb-4 flex-row justify-between">
      {ROOM_COLORS.map((c) => {
        const on = value === c;
        return (
          // selected: the colour ringed by a gap, like the web's double box-shadow
          <Pressable
            key={c}
            onPress={() => {
              haptic("select");
              onChange(c);
            }}
            accessibilityLabel={c}
            className="items-center justify-center rounded-full"
            style={{ width: 50, height: 50, borderWidth: 2, borderColor: on ? c : "transparent", margin: -5 }}
          >
            <View className="h-sm w-sm items-center justify-center rounded-full" style={{ backgroundColor: c }}>
              {on ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CreateRoomScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rooms, createRoom, updateRoom } = useWishpool();
  const editing = id ? rooms.find((r) => r.id === id) : undefined;
  const { isStickerLocked } = useSubscription();
  const [preset, setPreset] = useState(PRESETS.find((p) => p.type === editing?.type) || PRESETS[0]);
  const [emoji, setEmoji] = useState(editing?.emoji || "stk:candle");
  const [tint, setTint] = useState(editing?.tint || ROOM_COLORS[0]);
  const [name, setName] = useState(editing?.name || "");
  const [mode, setMode] = useState<"self" | "other">(editing?.bdayMode === "other" ? "other" : "self"); // birthday: mine or someone else's
  const [celName, setCelName] = useState(editing?.celebrantName || "");
  const [date, setDate] = useState<string | null>(editing?.eventDate || null);
  const [busy, setBusy] = useState(false);
  const bday = preset.type === "birthday";
  const autoName = bday ? (mode === "self" ? t("bdayRoomNameMine") : celName.trim() ? t("bdayRoomNameOf", { name: celName.trim() }) : t("roomBirthday")) : t(preset.key);
  const title = name.trim() || autoName;
  const [tried, setTried] = useState(false);
  const ready = !bday || (!!date && (mode === "self" || !!celName.trim()));

  const submit = async () => {
    if (busy || isStickerLocked(emoji)) return;
    // no greyed-out Create: a tap with a missing field outlines it in red
    if (!ready) {
      setTried(true);
      return haptic("error");
    }
    setBusy(true);
    const extra = bday ? { eventDate: date || undefined, eventTitle: "", bdayMode: mode, celebrantName: mode === "other" ? celName.trim() : "" } : {};
    try {
      if (editing) {
        await updateRoom(editing.id, { name: title, emoji, tint, ...(bday ? { eventDate: date || undefined, ...(mode === "other" ? { celebrantName: celName.trim() } : {}) } : {}) });
        haptic("success");
        router.back();
        toast.success(t("toastSaved"), { root: true });
        return;
      }
      const id = await createRoom({ name: title, type: preset.type, emoji, tint, ...extra } as Parameters<typeof createRoom>[0]);
      haptic("success");
      router.replace({ pathname: "/room/[id]", params: { id } });
      toast.success(t("toastRoomCreated"), { root: true });
    } catch {
      setBusy(false);
      haptic("error");
      toast.error(t("toastError"));
    }
  };

  return (
    // a fragment, not a wrapping View: a formSheet lays out its root child
    // itself, and a flex-1 View around the ScrollView came out empty
    <>
    <ScrollView className="flex-1 bg-card" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: insets.bottom + 32 }}>
      <SheetHeader title={t(editing ? "editRoom" : "newRoom")} />
      {/* live preview: the room as a folder, like on the Rooms tab */}
      <View className="mx-auto mb-6 w-1/2">
        <RoomFolder room={{ id: "preview", name: title, type: preset.type, emoji, tint, members: editing?.members || [], eventDate: bday && date ? date : undefined }} wishes={[]} onPress={() => {}} />
      </View>

      <Label>{t("roomSticker")}</Label>
      <View className="mb-4">
        <StickerPicker value={emoji} onChange={setEmoji} />
      </View>

      <Label>{t("roomColor")}</Label>
      <ColorPicker value={tint} onChange={setTint} />

      {/* the type is set when the room is made */}
      {!editing ? (
        <>
          <Label>{t("roomType")}</Label>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Chip key={p.type} active={preset.type === p.type} onPress={() => setPreset(p)}>
                {t(p.key)}
              </Chip>
            ))}
          </View>
          <Txt className="mb-4 text-[13px] leading-[19px] text-t2">{t(preset.hint)}</Txt>
        </>
      ) : null}

      {bday ? (
        <View>
          {!editing ? (
            <>
              <Label>{t("bdayWhose")}</Label>
              <Segmented options={[["self", t("bdayMine")], ["other", t("bdayOther")]]} value={mode} onChange={setMode} neutral fill={C.card2} className="mb-2" />
              <Txt className="mb-4 text-[12.5px] leading-[18px] text-t3">{t(mode === "self" ? "bdayMineNote" : "bdayOtherNote")}</Txt>
            </>
          ) : null}
          {mode === "other" ? <Field label={t("bdayNameLabel")} value={celName} onChangeText={setCelName} placeholder={t("bdayNamePh")} error={tried && !celName.trim() && t("requiredField")} /> : null}
          <DateRow label={t("bdayDateLabel")} value={date} onChange={setDate} hint={t("evHint")} minimumDate={new Date()} error={tried && !date && t("requiredDate")} />
        </View>
      ) : null}

      <Field label={t("name")} value={name} onChangeText={setName} placeholder={autoName} />

      <Pill full icon={editing ? undefined : <Plus size={18} color="#fff" />} onPress={submit}>
        {editing ? t("saveChanges") : busy ? t("creating") : t("createRoom")}
      </Pill>
    </ScrollView>
    <ToastHost inSheet />
    </>
  );
}
