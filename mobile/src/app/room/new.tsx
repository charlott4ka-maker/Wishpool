// New room, or with ?id= editing one (name, sticker, colour, a birthday room's
// date / name; the type stays). Laid out like CreateRoomSheet in the Mini App,
// with the room folder as a live preview whose sticker can be dragged. Full
// screen rather than a sheet: dragging the sticker used to drag the sheet along.

import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import Svg, { Circle, Rect } from "react-native-svg";
import { Check, ImagePlus, Lock, Paintbrush, Plus, Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateRow } from "../../components/DateRow";
import { FriendPicker, useFriendList } from "../../components/FriendPicker";
import { LookTabs } from "../../components/LookTabs";
import { RoomFolder } from "../../components/RoomFolder";
import { CustomColor } from "../../components/CustomColor";
import { SantaChip } from "../../components/SantaChip";
import { SheetFooter, SHEET_FOOTER_SPACE } from "../../components/SheetFooter";
import { FormHeader, formHeaderSpace, SheetHeader } from "../../components/SheetHeader";
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
import { orderedSkins } from "../../lib/folderSkins";
import { useRemoteConfig } from "../../lib/remoteConfig";
import type { RoomType } from "../../types";
import { useAccent } from "../../theme/accent";

// Secret Santa is a friends room (so it has the draw) with its own name,
// sticker and colour, and an optional gift swap date with a countdown
const SEG_ON_BG = "#353C49";

const PRESETS: { type: RoomType; key: string; hint: string; santa?: boolean }[] = [
  { type: "friends", key: "roomFriends", hint: "friendsRoomHint" },
  { type: "birthday", key: "roomBirthday", hint: "birthdayRoomHint" },
  { type: "couple", key: "roomCouple", hint: "coupleRoomHint" },
  { type: "friends", key: "roomSanta", hint: "santaRoomHint", santa: true },
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
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, preset: presetParam } = useLocalSearchParams<{ id?: string; preset?: string }>();
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
  // premium folders in the order set on the admin page
  const skins = orderedSkins(useRemoteConfig().folders);
  const [lookOpen, setLookOpen] = useState(false);
  const [lookScrolled, setLookScrolled] = useState(false);
  // the look sheet is an RN Modal: a screen pushed over it (the paywall) left it
  // stuck on top after closing, so close the sheet first, then open the paywall
  const { width: screenW } = useWindowDimensions();
  const foldersLocked = !isPremium;
  // the locked Folders grid: three and a half rows of tiles (1.12 wide per tall, 8pt gaps)
  const lockedGridH = Math.round((((screenW - 32 + 8) / 3 - 8) / 1.12 + 8) * 3.5);
  const openPaywall = () => {
    setLookOpen(false);
    setTimeout(() => router.push("/paywall"), 300);
  };
  // premium decorations: two more stickers
  const [charms, setCharms] = useState<{ e: string; pos: string }[]>(editing?.charms || []);
  const [stickerSlot, setStickerSlot] = useState<"main" | "c0" | "c1">("main");
  // your own photo on the folder (premium): a fresh pick waits here until the room is saved
  const [coverDraft, setCoverDraft] = useState<string | null>(null);
  const coverShown = coverDraft || editing?.cover || null;
  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    const r = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 900 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    haptic("success");
    setCoverDraft(`data:image/jpeg;base64,${r.base64}`);
    setSkin("photo");
  };
  const [lookTab, setLookTab] = useState<"sticker" | "color" | "folders">("sticker");
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
  // opened from the Secret Santa banner: start as a Santa room
  useEffect(() => {
    if (!editing && presetParam === "santa") pickPreset(PRESETS.find((p) => p.santa)!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
        await updateRoom(editing.id, { name: title, emoji, tint, stickerPos, skin, charms, ...(online ? {} : { cover: coverDraft || editing.cover }), ...(bday ? { eventDate: date || undefined, ...(mode === "other" ? { celebrantName: celName.trim() } : {}) } : swapDate ? { eventDate: date || "" } : {}) });
        if (online && coverDraft) await api.setRoomCover(editing.id, coverDraft).then(() => refresh()).catch(() => toast.error(t("toastError")));
        haptic("success");
        router.back();
        toast.success(t("toastSaved"), { root: true });
        return;
      }
      const id = await createRoom({ name: title, type: preset.type, emoji, tint, stickerPos, skin, charms, ...(online ? {} : { cover: coverDraft || undefined }), ...extra } as Parameters<typeof createRoom>[0]);
      // the own photo goes up once the room exists
      if (online && coverDraft) await api.setRoomCover(id, coverDraft).then(() => refresh()).catch(() => toast.error(t("toastError")));
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
          room={{ id: "preview", name: title, type: preset.type, emoji, tint, stickerPos, skin, cover: coverShown || undefined, charms, members: editing?.members || [], eventDate: (bday || swapDate) && date ? date : undefined }}
          wishes={[]}
          onPress={() => {}}
          onStickerMove={setStickerPos}
          onStickerDrag={setDragging}
          onCharmMove={(i, pos) => setCharms((cur) => cur.map((c, j) => (j === i ? { ...c, pos } : c)))}
        />
      </View>
      <Txt className="mt-2 text-center text-[12.5px] text-t3">{t("stickerDragHint")}</Txt>
      {/* sticker, colour and premium folders live in a sheet: the form stays about the room */}
      <View className="mb-6 mt-3 items-center">
        <Pill size="sm" kind="ghost" px={16} icon={<Paintbrush size={16} color={C.t1} strokeWidth={1.5} absoluteStrokeWidth />} onPress={() => { haptic("light"); setLookOpen(true); }}>
          {t("changeLook")}
        </Pill>
      </View>

      {/* the name first, then the type */}
      <Field label={t("name")} value={name} onChangeText={setName} placeholder={autoName} />

      {/* the type is set when the room is made */}
      {!editing ? (
        <>
          <Label>{t("roomType")}</Label>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {PRESETS.map((p) =>
              p.santa ? (
                <SantaChip key={p.key} active={preset.key === p.key} label={t(p.key)} onPress={() => pickPreset(p)} />
              ) : (
                <Chip key={p.key} active={preset.key === p.key} onPress={() => pickPreset(p)}>
                  {t(p.key)}
                </Chip>
              ),
            )}
          </View>
          {/* what this type is for: an info plate */}
          <View className="mb-4 mt-1 flex-row items-start gap-3 rounded-tile bg-raised px-4 py-3">
            {/* a filled blue circle, the "i" cut out in the plate's own colour (her example) */}
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.blue, alignItems: "center", justifyContent: "center", marginTop: -0.5 }}>
              <Svg width={20} height={20} viewBox="0 0 20 20">
                <Circle cx={10} cy={5.9} r={1.45} fill={C.raised} />
                <Rect x={8.9} y={8.4} width={2.2} height={7} rx={1.1} fill={C.raised} />
              </Svg>
            </View>
            <Txt className="flex-1 text-[13.5px] leading-[19px] text-t1">{t(preset.hint)}</Txt>
          </View>
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
    {/* the look sheet: Sticker / Colour / Folders over the form, the preview still visible above */}
    <Modal visible={lookOpen} transparent animationType="fade" onRequestClose={() => setLookOpen(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setLookOpen(false)} />
      <Animated.View entering={SlideInDown.duration(260)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "62%", backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 8 }}>
        <View style={{ alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 }} />
        <View className="px-4">
          <SheetHeader title={t("roomLook")} onClose={() => setLookOpen(false)} />
          <LookTabs
            options={showSkins ? [["sticker", t("lookSticker")], ["color", t("lookColor")], ["folders", t("lookFolders")]] : [["sticker", t("lookSticker")], ["color", t("lookColor")]]}
            value={lookTab}
            onChange={(k) => { setLookTab(k); setLookScrolled(false); }}
            premium="folders"
          />
        </View>
        <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!(lookTab === "folders" && foldersLocked)} scrollEventThrottle={16} onScroll={(e) => setLookScrolled(e.nativeEvent.contentOffset.y > 4)} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          {lookTab === "sticker" ? (
            <View>
              {/* which sticker the picker sets: the main one, or (premium) one of two more */}
              {showSkins ? (
                <View className="mb-4 flex-row items-center gap-2">
                  {(isPremium || admin ? (["main", "c0", "c1"] as const) : (["main"] as const)).map((slot, i) => {
                    const e = slot === "main" ? emoji : charms[i - 1]?.e;
                    const on = stickerSlot === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => {
                          haptic("select");
                          setStickerSlot(slot);
                        }}
                        className="h-sm flex-row items-center gap-1.5 rounded-full px-3.5"
                        style={{ backgroundColor: on ? SEG_ON_BG : C.bg }}
                      >
                        {e ? <Sticker emoji={e} size={20} /> : <Plus size={16} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth />}
                        <Txt className={`font-m600 text-[13px] ${on ? "text-white" : "text-t2"}`}>{slot === "main" ? t("stickerMain") : t("stickerMore")}</Txt>
                      </Pressable>
                    );
                  })}
                  {/* without Premium: one locked chip instead of the two extra slots */}
                  {!isPremium && !admin ? (
                    <Pressable onPress={openPaywall} className="h-sm flex-row items-center gap-1.5 rounded-full px-3.5" style={{ backgroundColor: C.bg }}>
                      <Lock size={16} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth />
                      <Txt className="font-m600 text-[13px] text-t2">Premium</Txt>
                    </Pressable>
                  ) : null}
                  {stickerSlot !== "main" && charms[stickerSlot === "c0" ? 0 : 1] ? (
                    <Pressable onPress={() => { haptic("select"); setCharms((cur) => cur.filter((_, j) => j !== (stickerSlot === "c0" ? 0 : 1))); setStickerSlot("main"); }} hitSlop={8}>
                      <Txt className="font-m600 text-[13px] text-t2">{t("setDelete")}</Txt>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <StickerPicker
                onLocked={openPaywall}
                value={stickerSlot === "main" ? emoji : charms[stickerSlot === "c0" ? 0 : 1]?.e || ""}
                onChange={(e) => {
                  if (stickerSlot === "main") return setEmoji(e);
                  const i = stickerSlot === "c0" ? 0 : Math.min(1, charms.length);
                  setCharms((cur) => {
                    const next = [...cur];
                    if (next[i]) next[i] = { ...next[i], e };
                    else next.push({ e, pos: "" });
                    return next.slice(0, 2);
                  });
                }}
                pack={santa ? "newyear" : undefined}
              />
            </View>
          ) : lookTab === "color" ? (
            // a colour means the plain folder again
            <View>
              <ColorPicker value={skin ? "" : tint} onChange={(c) => { setTint(c); setSkin(""); }} />
              {/* any colour at all (Premium): the iPhone's own picker */}
              {showSkins ? (
                <CustomColor
                  value={tint}
                  picked={!skin && !ROOM_COLORS.includes(tint)}
                  label={t("customColor")}
                  unlocked={isPremium || !!admin}
                  onChange={(c) => { setTint(c); setSkin(""); }}
                  onLocked={openPaywall}
                />
              ) : null}
            </View>
          ) : (
            <View>
            {/* locked: three and a half rows, so the next row peeks out (there are more than nine) */}
            <View className="mb-4" style={foldersLocked ? { height: lockedGridH, overflow: "hidden" } : undefined}>
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              {/* your own photo on the folder */}
              <View style={{ width: "33.333%", padding: 4 }}>
                <Pressable
                  onPress={() => (isPremium ? pickCover() : openPaywall())}
                  onLongPress={admin ? pickCover : undefined}
                  className="items-center justify-center overflow-hidden rounded-2xl"
                  style={{ aspectRatio: 1.12, backgroundColor: skin === "photo" ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: skin === "photo" ? C.blue : "transparent" }}
                >
                  {coverShown ? <Image source={{ uri: coverShown }} style={{ position: "absolute", width: "86%", height: "77%", borderRadius: 12 }} contentFit="cover" /> : null}
                  <View className="items-center justify-center rounded-full" style={{ width: 34, height: 34, backgroundColor: "rgba(0,0,0,0.45)" }}>
                    <ImagePlus size={18} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
                  </View>
                  {!coverShown ? <Txt className="mt-1 font-m600 text-[11.5px] text-t2">{t("ownPhoto")}</Txt> : null}
                </Pressable>
              </View>
              {(isPremium ? skins : skins.slice(0, 14)).map((k) => {
                const on = skin === k.id;
                const locked = !isPremium;
                return (
                  <View key={k.id} style={{ width: "33.333%", padding: 4 }}>
                    <Pressable
                      onPress={() => {
                        if (locked) return openPaywall();
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
                <LinearGradient pointerEvents="none" colors={[hex(C.card, 0.2), hex(C.card, 0.88), hex(C.card, 0.82)]} locations={[0, 0.3, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                <View pointerEvents="box-none" className="flex-1 items-center justify-center px-4">
                  {/* a frosted round behind the lock */}
                  <View className="mb-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                    <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.08)" }} />
                    <View style={{ zIndex: 2 }}>
                      <SymbolView name="lock.fill" size={20} tintColor="#fff" fallback={<Lock size={20} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />} />
                    </View>
                  </View>
                  <Txt className="text-center font-m800 text-[20px]">{t("premiumFoldersTitle")}</Txt>
                  <Txt className="mt-1 text-center text-[14px] leading-[20px] text-white">{t("premiumFoldersSub", { n: skins.length })}</Txt>
                  <View className="mt-4">
                    <Pill px={24} icon={<Star size={17} color="#fff" fill="#fff" strokeWidth={1.5} />} onPress={() => openPaywall()}>{t("premiumOpen")}</Pill>
                  </View>
                </View>
              </View>
            ) : null}
            </View>
            </View>
          )}
        </ScrollView>
        {/* a soft fade under the tabs once the list scrolls under them, like everywhere else */}
        {lookScrolled ? <LinearGradient pointerEvents="none" colors={[C.card, hex(C.card, 0)]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} /> : null}
        </View>
      </Animated.View>
    </Modal>
    <ToastHost />
    </>
  );
}
