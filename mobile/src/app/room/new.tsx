// New room, or with ?id= editing one (name, sticker, colour, a birthday room's
// date / name; the type stays). Laid out like CreateRoomSheet in the Mini App,
// with the room folder as a live preview whose sticker can be dragged. Full
// screen rather than a sheet: dragging the sticker used to drag the sheet along.

import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Lock, Plus, Star } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateRow } from "../../components/DateRow";
import { FriendPicker, useFriendList } from "../../components/FriendPicker";
import { RoomFolder } from "../../components/RoomFolder";
import { SheetFooter, SHEET_FOOTER_SPACE } from "../../components/SheetFooter";
import { FormHeader, formHeaderSpace } from "../../components/SheetHeader";
import { Sticker } from "../../components/Sticker";
import { StickerPicker } from "../../components/StickerPicker";
import { Chip, Field, Pill, Segmented, Txt } from "../../components/ui";
import { ToastHost, toast } from "../../components/Toast";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { api } from "../../services/api";
import { useWishpool } from "../../store/WishpoolContext";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { C, hex, ROOM_COLORS } from "../../theme/tokens";
import { NEW_YEAR_STICKERS, PREMIUM_ENABLED } from "../../subscription/featureFlags";
import { FOLDER_SKINS } from "../../lib/folderSkins";
import type { RoomType } from "../../types";

// Secret Santa is a friends room (so it has the draw) with its own name,
// sticker and colour, and an optional gift swap date with a countdown
const PRESETS: { type: RoomType; key: string; hint: string; santa?: boolean }[] = [
  { type: "friends", key: "roomFriends", hint: "friendsRoomHint" },
  { type: "friends", key: "roomSanta", hint: "santaRoomHint", santa: true },
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
  const { rooms, createRoom, updateRoom, online, refresh, admin } = useWishpool();
  const editing = id ? rooms.find((r) => r.id === id) : undefined;
  const { isStickerLocked, isPremium } = useSubscription();
  // premium folder looks: open to subscribers; before the launch only admins (and dev builds) see them
  // the folder picker arrives with the premium build (1.0.2+), not in 1.0.1 even for admins
  const premiumBuild = (Constants.expoConfig?.version || "0") >= "1.0.2";
  const showSkins = __DEV__ || process.env.EXPO_PUBLIC_SHOW_SKINS === "1" || (premiumBuild && (PREMIUM_ENABLED || !!admin));
  const skinLocked = PREMIUM_ENABLED && !isPremium && !admin;
  const [preset, setPreset] = useState(PRESETS.find((p) => p.type === editing?.type) || PRESETS[0]);
  const [scrolled, setScrolled] = useState(false);
  const [emoji, setEmoji] = useState(editing?.emoji || "stk:candle");
  const [tint, setTint] = useState(editing?.tint || ROOM_COLORS[0]);
  const [skin, setSkin] = useState(editing?.skin || "");
  const [folderTab, setFolderTab] = useState<"plain" | "premium">(editing?.skin ? "premium" : "plain");
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
    setPreset(p);
    // Secret Santa gets its own look unless a sticker or colour was already chosen
    // and only New Year stickers; leaving it puts back an ordinary one
    if (p.santa && !NEW_YEAR_STICKERS.includes(emoji)) setEmoji("stk:santa");
    if (!p.santa && NEW_YEAR_STICKERS.includes(emoji)) setEmoji("stk:candle");
    if (p.santa && tint === ROOM_COLORS[0]) setTint("#FF4D8D");
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
        await updateRoom(editing.id, { name: title, emoji, tint, stickerPos, skin, ...(bday ? { eventDate: date || undefined, ...(mode === "other" ? { celebrantName: celName.trim() } : {}) } : swapDate ? { eventDate: date || "" } : {}) });
        haptic("success");
        router.back();
        toast.success(t("toastSaved"), { root: true });
        return;
      }
      const id = await createRoom({ name: title, type: preset.type, emoji, tint, stickerPos, skin, ...extra } as Parameters<typeof createRoom>[0]);
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
      {/* live preview: the room as a folder, like on the Rooms tab */}
      <View className="mx-auto w-1/2">
        <RoomFolder
          room={{ id: "preview", name: title, type: preset.type, emoji, tint, stickerPos, skin, members: editing?.members || [], eventDate: (bday || swapDate) && date ? date : undefined }}
          wishes={[]}
          onPress={() => {}}
          onStickerMove={setStickerPos}
          onStickerDrag={setDragging}
        />
      </View>
      <Txt className="mb-6 mt-2 text-center text-[12.5px] text-t3">{t("stickerDragHint")}</Txt>

      <Label>{t("roomSticker")}</Label>
      <View className="mb-4">
        <StickerPicker value={emoji} onChange={setEmoji} pack={santa ? "newyear" : undefined} />
      </View>

      <Label>{t("roomColor")}</Label>
      <ColorPicker value={tint} onChange={setTint} />

      {/* premium folder looks in their own tab: muted, with a lock in the middle until you have premium */}
      {showSkins ? (
        <>
          <Label>{t("roomFolderLook")}</Label>
          <Segmented
            options={[["plain", t("folderPlain")], ["premium", t("folderPremium")]]}
            icons={{ premium: (c) => <Star size={15} color={c} fill={c} strokeWidth={1.5} /> }}
            value={folderTab}
            onChange={(k) => {
              setFolderTab(k);
              if (k === "plain") setSkin("");
            }}
            neutral
            fill={C.bg}
            className="mb-4"
          />
          {folderTab === "premium" ? (
            // not premium yet: a 3x3 peek, dimmed, with the pitch in the middle of it
            <View className="mb-4">
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              {(isPremium ? FOLDER_SKINS : FOLDER_SKINS.slice(0, 9)).map((k) => {
                const on = skin === k.id;
                const locked = !isPremium;
                return (
                  <View key={k.id} style={{ width: "33.333%", padding: 4 }}>
                    <Pressable
                      onPress={() => {
                        if (locked) return router.push("/paywall");
                        haptic("select");
                        setSkin(k.id);
                      }}
                      // admins can still try a locked one: a long press puts it on
                      onLongPress={admin ? () => { haptic("select"); setSkin(k.id); } : undefined}
                      className="items-center justify-center overflow-hidden rounded-2xl"
                      style={{ aspectRatio: 1.12, backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: on ? C.blue : "transparent" }}
                    >
                      <Image source={k.back} style={{ position: "absolute", width: "86%", height: "77%" }} contentFit="fill" />
                      <Image source={k.front} style={{ position: "absolute", width: "86%", height: "77%" }} contentFit="fill" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {/* not premium yet: the grid fades into the dark from the bottom, with one lock, a title,
                a line and a button to the paywall over it (the folders still open it too) */}
            {!isPremium ? (
              <View pointerEvents="box-none" style={{ position: "absolute", left: -4, right: -4, top: 0, bottom: 0 }}>
                <LinearGradient pointerEvents="none" colors={[hex(C.card, 0.55), hex(C.card, 0.88), hex(C.card, 0.88), hex(C.card, 0.55)]} locations={[0, 0.3, 0.7, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 18 }} />
                <View pointerEvents="box-none" className="flex-1 items-center justify-center px-4">
                  {/* a frosted round behind the lock */}
                  <View className="mb-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                    <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.08)" }} />
                    <View style={{ zIndex: 2 }}>
                      <Lock size={22} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
                    </View>
                  </View>
                  <Txt className="text-center font-m800 text-[20px]">{t("premiumFoldersTitle")}</Txt>
                  <Txt className="mt-1 text-center text-[14px] leading-[20px] text-t2">{t("premiumFoldersSub", { n: FOLDER_SKINS.length })}</Txt>
                  <View className="mt-4">
                    <Pill px={24} icon={<Star size={17} color="#fff" fill="#fff" strokeWidth={1.5} />} onPress={() => router.push("/paywall")}>{t("premiumOpen")}</Pill>
                  </View>
                </View>
              </View>
            ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {/* the type is set when the room is made */}
      {!editing ? (
        <>
          <Label>{t("roomType")}</Label>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Chip key={p.key} active={preset.key === p.key} onPress={() => pickPreset(p)}>
                {t(p.key)}
              </Chip>
            ))}
          </View>
          <Txt className="mb-4 text-[13px] leading-[19px] text-t2">{t(preset.hint)}</Txt>
        </>
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

    </ScrollView>
    {/* the action stays at the bottom of the screen */}
    <SheetFooter>
      <Pill full loading={busy} icon={editing ? undefined : <Plus size={18} color="#fff" />} onPress={submit}>
        {editing ? t("saveChanges") : t("createRoom")}
      </Pill>
    </SheetFooter>
    {/* full screen: the title and close stay pinned while the form scrolls under them */}
    <FormHeader title={t(editing ? "editRoom" : "newRoom")} scrolled={scrolled} />
    <ToastHost />
    </>
  );
}
