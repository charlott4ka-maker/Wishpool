// Onboarding page 3 ("Даруй таємно"): the finger opens a room folder, taps
// "I'll get it" on a friend's wish, confetti, and an "it stays a secret" toast.

import { Check, ChevronLeft, Ellipsis, Lock, Plus, Share2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";

import { useT } from "../../i18n";
import { C, H } from "../../theme/tokens";
import type { Room } from "../../types";
import { RoomFolder } from "../RoomFolder";
import { RoomHeroBg } from "../RoomHeroBg";
import { Sticker } from "../Sticker";
import { Avatar, Card, Pill, SEG_ON, Txt } from "../ui";
import { Appear, measureSpot, MiniBlock, MiniGlass, MiniHeader, MiniPhone, REST, Spot, useScript } from "./shared";

const CONFETTI = ["#0A82F9", "#FFD36E", "#FF7AB6", "#7CE0C3", "#FFFFFF"];

function Burst() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: "50%" }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute", width: 7, height: 4, borderRadius: 1, backgroundColor: CONFETTI[i % 5],
              opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * 60] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * 60 + 20] }) },
                { rotate: `${(i * 47) % 360}deg` },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

export function ObGiftScene() {
  const { t, lang } = useT();
  // 1 finger to folder, 2 tap, 3 room opens, 4 finger to Take, 5 tap -> gifting + confetti, 6 secret badge, 7 back
  const step = useScript([500, 1200, 1400, 2500, 3100, 3600], 7400);
  const root = useRef<View>(null), folder = useRef<View>(null), take = useRef<View>(null);
  const [pos, setPos] = useState<Spot>(REST);
  const opening = useRef(new Animated.Value(0)).current;

  const anya = { id: "a", name: lang === "en" ? "Anya" : "Аня", color: "#FF4D8D" };
  const me = { id: "you", name: lang === "en" ? "Me" : "Я", color: "#7B61FF" };
  const room: Room = { id: "obr", name: lang === "en" ? "Friends" : lang === "uk" ? "Друзі" : "Друзья", type: "friends", emoji: "stk:uno", tint: "#38BDF8", members: [me, anya, { id: "b", name: lang === "en" ? "Ben" : "Богдан", color: "#34C759" }] };
  const room2: Room = { id: "obr2", name: lang === "en" ? "Us two" : lang === "uk" ? "Двоє" : "Двое", type: "couple", emoji: "stk:flower", tint: "#FF4D8D", members: [me, anya] };
  const wishTitle = lang === "en" ? "Scented candle" : lang === "uk" ? "Аромасвічка" : "Аромасвеча";

  useEffect(() => {
    if (step === 0) setPos(REST);
    if (step === 1) measureSpot(folder.current, root.current).then((p) => p && setPos(p));
    if (step === 4) measureSpot(take.current, root.current).then((p) => p && setPos(p));
    if (step === 7) setPos(REST);
    if (step >= 3) Animated.timing(opening, { toValue: 1, duration: 450, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
    else opening.setValue(0);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = step >= 5 ? 2 : step >= 2 ? 1 : 0;
  const open = step >= 3;
  const gifting = step >= 5;

  return (
    <MiniPhone rootRef={root} finger={pos} tap={tap}>
      {/* the Rooms tab as it is now: header block, then the folders in the content block */}
      <View style={{ flex: 1 }}>
        <MiniHeader>
          <View className="flex-row items-center justify-between px-1 pt-1.5">
            <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t("roomsTitle")}</Txt>
            <MiniGlass size={H.lg}>
              <Plus size={24} color={C.t1} />
            </MiniGlass>
          </View>
        </MiniHeader>
        <MiniBlock style={{ paddingTop: 28 }}>
          <View className="flex-row gap-4">
            <View ref={folder} collapsable={false} className="flex-1">
              <RoomFolder room={room} wishes={[]} onPress={() => {}} />
            </View>
            <RoomFolder room={room2} wishes={[]} onPress={() => {}} />
          </View>
        </MiniBlock>
      </View>

      {/* the room, growing out of the first folder */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: C.card,
          opacity: open ? opening : 0,
          transform: [
            { translateX: opening.interpolate({ inputRange: [0, 1], outputRange: [-95, 0] }) },
            { translateY: opening.interpolate({ inputRange: [0, 1], outputRange: [-110, 0] }) },
            { scale: opening.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
          ],
        }}
      >
        {/* the same mesh hero and rounded content sheet as the real room screen */}
        <View style={{ paddingTop: 40, paddingBottom: 40, alignItems: "center", overflow: "hidden" }}>
          <RoomHeroBg tint={room.tint} />
          <View className="-mb-2 w-full flex-row justify-between px-4">
            <MiniGlass>
              <ChevronLeft size={20} color="#fff" />
            </MiniGlass>
            <MiniGlass>
              <Ellipsis size={20} color="#fff" />
            </MiniGlass>
          </View>
          <Sticker emoji={room.emoji} size={40} />
          <Txt className="mt-2 font-m800 text-[24px] text-white">{room.name}</Txt>
          <View className="mt-2 flex-row">
            {room.members.map((m, i) => (
              <View key={m.id} style={{ marginLeft: i ? -8 : 0 }}>
                <Avatar m={m} size={32} cut={i < room.members.length - 1 ? 8 : 0} />
              </View>
            ))}
          </View>
          {/* the glass Invite pill under the avatars */}
          <View className="mt-3 h-sm flex-row items-center gap-2 rounded-full px-6" style={{ backgroundColor: "rgba(255,255,255,0.16)" }}>
            <Share2 size={16} color="#fff" />
            <Txt className="font-m600 text-[14.5px] text-white">{t("invite")}</Txt>
          </View>
        </View>
        <View style={{ marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: C.card, paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Friends' lists / My items here, as on the room screen */}
          <View className="mb-3 h-lg flex-row gap-1 rounded-full bg-bg p-1.5">
            <View className="flex-1 items-center justify-center rounded-full" style={{ backgroundColor: SEG_ON }}>
              <Txt className="font-m600 text-sm text-white">{t("segLists")}</Txt>
            </View>
            <View className="flex-1 items-center justify-center">
              <Txt className="font-m600 text-sm text-t2">{t("segMine")}</Txt>
            </View>
          </View>
          <View className="mb-2 flex-row items-center gap-2">
            <Avatar m={anya} size={24} />
            <Txt className="font-m700 text-[15px]">{anya.name}</Txt>
          </View>
          <Card className="flex-row items-center gap-3 bg-bg px-4 py-3">
            <View className="h-lg w-lg items-center justify-center rounded-xl bg-card2">
              <Sticker emoji="stk:candle" size={26} />
            </View>
            <View className="flex-1">
              <Txt className="font-m600 text-[14.5px]">{wishTitle}</Txt>
              <Txt className="mt-0.5 font-m700 text-[13px] text-blueText">650 ₴</Txt>
            </View>
            <View ref={take} collapsable={false}>
              {gifting ? (
                <Pill size="sm" kind="green" icon={<Check size={16} color={C.greenText} />} onPress={() => {}}>{t("youGift")}</Pill>
              ) : (
                <Pill size="sm" kind="soft" onPress={() => {}}>{t("take")}</Pill>
              )}
              {gifting ? <Burst /> : null}
            </View>
          </Card>

        </View>
        {/* "it stays a secret" drops in from the top like the app's toasts */}
        <View pointerEvents="none" style={{ position: "absolute", top: 44, left: 0, right: 0, alignItems: "center", zIndex: 20 }}>
          <Appear show={step >= 6} from={-12}>
            <View className="h-10 flex-row items-center gap-2 rounded-full pl-2 pr-4" style={{ backgroundColor: "#1E2228", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
              {/* a filled round icon, like the app's toasts */}
              <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: "#636366" }}>
                <Lock size={13} color="#fff" />
              </View>
              <Txt className="font-m600 text-[14px]">{t("obSecret")}</Txt>
            </View>
          </Appear>
        </View>
      </Animated.View>
    </MiniPhone>
  );
}
