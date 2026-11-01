// New room, or with ?id= editing one (name, sticker, colour, a birthday room's
// date / name; the type stays). Laid out like CreateRoomSheet in the Mini App,
// with the room folder as a live preview whose sticker can be dragged. Full
// screen rather than a sheet: dragging the sticker used to drag the sheet along.

import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateRow } from "../../components/DateRow";
import { FriendPicker, useFriendList } from "../../components/FriendPicker";
import { RoomFolder } from "../../components/RoomFolder";
import { SheetFooter, SHEET_FOOTER_SPACE } from "../../components/SheetFooter";
import { FormHeader, formHeaderSpace } from "../../components/SheetHeader";
import { Press } from "../../components/Press";
import { Sticker } from "../../components/Sticker";
import { StickerPicker } from "../../components/StickerPicker";
import { Chip, Field, Pill, Segmented, Txt } from "../../components/ui";
import { ToastHost, toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { C, ROOM_COLORS } from "../../theme/tokens";
import { NEW_YEAR_STICKERS } from "../../subscription/featureFlags";
import type { RoomType } from "../../types";

// Secret Santa is a friends room (so it has the draw) with its own name,
// sticker and colour, and an optional gift swap date with a countdown
// each type starts with its own sticker and colour (changed under "Change look")
const PRESETS: { type: RoomType; key: string; hint: string; emoji: string; tint: string; santa?: boolean }[] = [
  { type: "friends", key: "roomFriends", hint: "friendsRoomHint", emoji: "stk:uno", tint: "#0A82F9" },
  { type: "friends", key: "roomSanta", hint: "santaRoomHint", emoji: "stk:santa", tint: "#FF4D8D", santa: true },
  { type: "couple", key: "roomCouple", hint: "coupleRoomHint", emoji: "stk:ring", tint: "#AF52DE" },
  { type: "birthday", key: "roomBirthday", hint: "birthdayRoomHint", emoji: "stk:cake", tint: "#34C759" },
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
  const { rooms, createRoom, updateRoom, online, refresh } = useWishpool();
  const editing = id ? rooms.find((r) => r.id === id) : undefined;
  const { isStickerLocked } = useSubscription();
  const [preset, setPreset] = useState(PRESETS.find((p) => p.type === editing?.type) || PRESETS[0]);
  const [scrolled, setScrolled] = useState(false);
  // a new room: first the type (four cards), then a short form for it
  const [step, setStep] = useState<"type" | "form">(editing ? "form" : "type");
  const [look, setLook] = useState(false); // sticker and colour, folded away
  const [emoji, setEmoji] = useState(editing?.emoji || "stk:candle");
  const [tint, setTint] = useState(editing?.tint || ROOM_COLORS[0]);
  const [name, setName] = useState(editing?.name || "");
  const [mode, setMode] = useState<"self" | "other">(editing?.bdayMode === "other" ? "other" : "self"); // birthday: mine or someone else's
  const [celName, setCelName] = useState(editing?.celebrantName || "");
  const [date, setDate] = useState<string | null>(editing?.eventDate || null);
  const [busy, setBusy] = useState(false);
  const friends = useFriendList(online && !id);
  const [picked, setPicked] = useState<string[]>([]);
  // the sticker's spot on the folder, dragged on the preview
  const [stickerPos, setStickerPos] = useState(editing?.stickerPos || "");
  const [dragging, setDragging] = useState(false);
  const bday = preset.type === "birthday";
  // a Secret Santa (new, or one being edited: it wears a New Year sticker)
  const santa = !!preset.santa || (!!editing && NEW_YEAR_STICKERS.includes(editing.emoji));
  // the swap date: a new Secret Santa, or a friends room that already has a date
  const swapDate = !bday && (!!preset.santa || (!!editing && editing.type === "friends" && !!editing.eventDate));
  const pickPreset = (p: (typeof PRESETS)[number]) => {
    haptic("select");
    setPreset(p);
    setEmoji(p.emoji);
    setTint(p.tint);
    setStickerPos("");
    setStep("form");
  };
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
    const extra = bday ? { eventDate: date || undefined, eventTitle: "", bdayMode: mode, celebrantName: mode === "other" ? celName.trim() : "" } : swapDate && date ? { eventDate: date } : {};
    try {
      if (editing) {
        await updateRoom(editing.id, { name: title, emoji, tint, stickerPos, ...(bday ? { eventDate: date || undefined, ...(mode === "other" ? { celebrantName: celName.trim() } : {}) } : swapDate ? { eventDate: date || "" } : {}) });
        haptic("success");
        router.back();
        toast.success(t("toastSaved"), { root: true });
        return;
      }
      const id = await createRoom({ name: title, type: preset.type, emoji, tint, stickerPos, ...extra } as Parameters<typeof createRoom>[0]);
      // friends picked below: in at once or invited, as each of them prefers
      const res = picked.length ? await api.addToRoom(id, picked).catch(() => null) : null;
      if (res && res.added.length) await refresh().catch(() => {});
      haptic("success");
      router.replace({ pathname: "/room/[id]", params: { id } });
      toast.success(t(res && res.invited.length && !res.added.length ? "toastInvitesSent" : "toastRoomCreated"), { root: true });
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
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-card" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets scrollEnabled={!dragging} scrollEventThrottle={16} onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)} contentContainerStyle={{ padding: 16, paddingTop: formHeaderSpace(insets.top), paddingBottom: insets.bottom + 16 + SHEET_FOOTER_SPACE }}>
      {step === "type" ? (
        <View className="gap-3">
          {PRESETS.map((p) => (
            <Press key={p.key} onPress={() => pickPreset(p)} className="flex-row items-center gap-4 rounded-card bg-raised p-4">
              <View className="h-14 w-14 items-center justify-center rounded-[16px]" style={{ backgroundColor: p.tint }}>
                <Sticker emoji={p.emoji} size={34} />
              </View>
              <View className="flex-1">
                <Txt className="font-m700 text-[17px]">{t(p.key)}</Txt>
                <Txt className="mt-1 text-[13px] leading-[18px] text-t2">{t(p.hint)}</Txt>
              </View>
            </Press>
          ))}
        </View>
      ) : (
      <>
      {/* live preview: the room as a folder, like on the Rooms tab */}
      <View className="mx-auto w-1/2">
        <RoomFolder
          room={{ id: "preview", name: title, type: preset.type, emoji, tint, stickerPos, members: editing?.members || [], eventDate: (bday || swapDate) && date ? date : undefined }}
          wishes={[]}
          onPress={() => {}}
          onStickerMove={setStickerPos}
          onStickerDrag={setDragging}
        />
      </View>
      {/* sticker and colour fold away under the preview */}
      <View className="mb-6 mt-3 items-center">
        <Pill size="sm" kind="ghost" onPress={() => { haptic("select"); setLook((v) => !v); }}>{t(look ? "lookDone" : "changeLook")}</Pill>
      </View>
      {look ? (
        <>
          <Label>{t("roomSticker")}</Label>
          <View className="mb-4">
            <StickerPicker value={emoji} onChange={setEmoji} pack={santa ? "newyear" : undefined} />
          </View>
          <Label>{t("roomColor")}</Label>
          <ColorPicker value={tint} onChange={setTint} />
          <Txt className="mb-6 text-[12.5px] text-t3">{t("stickerDragHint")}</Txt>
        </>
      ) : null}

      {/* the type, chosen on the first step (fixed once the room exists) */}
      {!editing ? (
        <Press onPress={() => setStep("type")} className="mb-4 flex-row items-center justify-between rounded-tile bg-card2 px-4" style={{ height: 52 }}>
          <Txt className="text-[15px] text-t2">{t("roomType")}</Txt>
          <View className="flex-row items-center gap-2">
            <Txt className="font-m600 text-[15px]">{t(preset.key)}</Txt>
            <Txt className="font-m600 text-[15px] text-blueText">{t("changeShort")}</Txt>
          </View>
        </Press>
      ) : null}

      {swapDate ? <DateRow label={t("santaDate")} value={date} onChange={setDate} hint={t("santaDateHint")} minimumDate={new Date()} /> : null}

      {bday ? (
        <View>
          {!editing ? (
            <>
              <Label>{t("bdayWhose")}</Label>
              <Segmented options={[["self", t("bdayMine")], ["other", t("bdayOther")]]} value={mode} onChange={setMode} neutral fill={C.bg} className="mb-2" />
              <Txt className="mb-4 text-[12.5px] leading-[18px] text-t3">{t(mode === "self" ? "bdayMineNote" : "bdayOtherNote")}</Txt>
            </>
          ) : null}
          {mode === "other" ? <Field label={t("bdayNameLabel")} value={celName} onChangeText={setCelName} placeholder={t("bdayNamePh")} error={tried && !celName.trim() && t("requiredField")} /> : null}
          <DateRow label={t("bdayDateLabel")} value={date} onChange={setDate} hint={t("evHint")} minimumDate={new Date()} error={tried && !date && t("requiredDate")} />
        </View>
      ) : null}

      <Field label={t("name")} value={name} onChangeText={setName} placeholder={autoName} />

      {/* bring friends in right away (signed in, new room) */}
      {!editing && online && friends && friends.length ? (
        <View className="mt-2">
          <Label>{t("inviteFriendsHere")}</Label>
          <FriendPicker
            friends={friends}
            selected={picked}
            onToggle={(fid) =>
              setPicked((cur) => (cur.includes(fid) ? cur.filter((x) => x !== fid) : preset.type === "couple" ? [fid] : [...cur, fid]))
            }
          />
        </View>
      ) : null}
      </>
      )}

    </ScrollView>
    {/* the action stays at the bottom of the screen */}
    {step === "form" ? (
      <SheetFooter>
        <Pill full loading={busy} icon={editing ? undefined : <Plus size={18} color="#fff" />} onPress={submit}>
          {editing ? t("saveChanges") : t("createRoom")}
        </Pill>
      </SheetFooter>
    ) : null}
    {/* full screen: the title and close stay pinned while the form scrolls under them */}
    <FormHeader title={t(editing ? "editRoom" : "newRoom")} scrolled={scrolled} />
    <ToastHost />
    </>
  );
}
