// Room as a frosted folder, like RoomFolder in the Mini App (web/src/App.jsx):
// a tinted back panel, wish photos shared into the room peeking out of it, cut
// off exactly at the front's edge with a soft shadow along that edge (so they
// read as tucked in), and a translucent tinted front frosted over what's
// behind it. Sticker and avatars on the front; name and countdown / member
// count underneath. No outline anywhere.

import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";
import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { LayoutChangeEvent, Platform, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useT } from "../i18n";
import { countdownLabel } from "../lib/dates";
import { haptic } from "../lib/haptics";
import { wishImages } from "../store/WishpoolContext";
import { C, hex, mixHex } from "../theme/tokens";
import type { Room, Wish } from "../types";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import { Avatar, Txt } from "./ui";

/** The front's top edge (tab + step) and the whole front outline. */
export function folderPaths(w: number, h: number) {
  const R0 = Math.round;
  const x0 = R0(w * 0.04), x1 = R0(w * 0.96), yT = R0(h * 0.28), yB = R0(h * 0.37), y1 = R0(h * 0.96), xt = R0(w * 0.5), r = 18, rt = 14;
  const top = `M ${x0} ${yT + rt} Q ${x0} ${yT} ${x0 + rt} ${yT} L ${xt - 10} ${yT} C ${xt} ${yT} ${xt} ${yB} ${xt + 12} ${yB} L ${x1 - r} ${yB} Q ${x1} ${yB} ${x1} ${yB + r}`;
  return { top, full: `${top} L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r} Z` };
}

export function folderPath(w: number, h: number) {
  return folderPaths(w, h).full;
}

/** Soft shadow along the front's top edge: stacked strokes standing in for a blur. */
function EdgeShadow({ d }: { d: string }) {
  return (
    <>
      {[16, 11, 7, 4].map((sw, i) => (
        <Path key={sw} d={d} fill="none" stroke="#000" strokeOpacity={0.07 + i * 0.03} strokeWidth={sw} strokeLinecap="round" />
      ))}
    </>
  );
}

const SPOTS = [
  { left: "33%", top: "2%", rot: 0, z: 2 },
  { left: "9%", top: "16%", rot: -10, z: 1 },
  { left: "57%", top: "12%", rot: 9, z: 1 },
] as const;
const MAX_AVATARS = 5;
const AV = 24, OV = 8;

export function RoomFolder({ room, wishes, onPress }: { room: Room; wishes: Wish[]; onPress: () => void }) {
  const { lang, t } = useT();
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const cd = countdownLabel(lang, t, room.eventDate);
  const photos = wishes.filter((w) => w.rooms.includes(room.id)).map((w) => wishImages(w)[0]).filter(Boolean).slice(0, 3);
  const members = room.members || [];
  const extra = members.length > MAX_AVATARS ? members.length - (MAX_AVATARS - 1) : 0;
  const shown = extra ? members.slice(0, MAX_AVATARS - 1) : members;
  const paths = dim ? folderPaths(dim.w, dim.h) : null;
  const web = Platform.OS === "web"; // no MaskedView there: a flat gradient front instead

  return (
    <Press
      scaleTo={0.96}
      onPress={() => {
        haptic("light");
        onPress();
      }}
      className="flex-1 items-center"
    >
      <View className="w-full" style={{ aspectRatio: 1.12 }} onLayout={(e: LayoutChangeEvent) => setDim({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <View className="absolute rounded-2xl" style={{ left: "8%", right: "8%", top: "16%", bottom: "10%", backgroundColor: hex(room.tint, 0.32) }} />
        {dim && paths && photos.length > 0 && !web ? (
          // photos (and the edge shadow) only outside the front: nothing under the frost to smear
          <MaskedView
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, width: dim.w, height: dim.h, zIndex: 2 }}
            maskElement={
              <Svg width={dim.w} height={dim.h}>
                <Path d={`M -60 -60 H ${dim.w + 60} V ${dim.h + 60} H -60 Z ${paths.full}`} fillRule="evenodd" fill="#000" />
              </Svg>
            }
          >
            {photos.map((src, i) => {
              const sp = SPOTS[i];
              return (
                <View
                  key={i}
                  className="absolute overflow-hidden rounded-[10px] bg-card2"
                  style={{ left: sp.left, top: sp.top, width: "34%", aspectRatio: 0.82, zIndex: sp.z, borderWidth: 3, borderColor: "#fff", transform: [{ rotate: `${sp.rot}deg` }] }}
                >
                  <Image source={{ uri: src as string }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                </View>
              );
            })}
            <Svg width={dim.w} height={dim.h} style={{ position: "absolute", zIndex: 3 }}>
              <EdgeShadow d={paths.top} />
            </Svg>
          </MaskedView>
        ) : null}
        {dim && web ? (
          // web previews: the photos simply sit under the flat front
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width: dim.w, height: dim.h, zIndex: 2 }}>
            {photos.map((src, i) => {
              const sp = SPOTS[i];
              return (
                <View
                  key={i}
                  className="absolute overflow-hidden rounded-[10px] bg-card2"
                  style={{ left: sp.left, top: sp.top, width: "34%", aspectRatio: 0.82, zIndex: sp.z, borderWidth: 3, borderColor: "#fff", transform: [{ rotate: `${sp.rot}deg` }] }}
                >
                  <Image source={{ uri: src as string }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                </View>
              );
            })}
          </View>
        ) : null}
        {dim && paths ? (
          web ? (
            <Svg width={dim.w} height={dim.h} style={{ position: "absolute", zIndex: 3 }}>
              <Defs>
                <LinearGradient id={`fg-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={mixHex(C.card, room.tint, 0.5)} />
                  <Stop offset="1" stopColor={mixHex(C.card, room.tint, 0.34)} />
                </LinearGradient>
              </Defs>
              <Path d={paths.full} fill={`url(#fg-${room.id})`} />
            </Svg>
          ) : (
            // the frosted front: a blur of the back panel, tinted, cut to the folder shape
            <MaskedView
              pointerEvents="none"
              style={{ position: "absolute", top: 0, left: 0, width: dim.w, height: dim.h, zIndex: 3 }}
              maskElement={
                <Svg width={dim.w} height={dim.h}>
                  <Path d={paths.full} fill="#000" />
                </Svg>
              }
            >
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
              <ExpoGradient colors={[hex(room.tint, 0.42), hex(room.tint, 0.26)]} style={StyleSheet.absoluteFill} />
            </MaskedView>
          )
        ) : null}
        <View className="absolute" style={{ left: "14%", top: "46%", zIndex: 4 }}>
          <Sticker emoji={room.emoji} size={34} rotate={-8} />
        </View>
        <View className="absolute flex-row" style={{ right: "11%", bottom: "12%", zIndex: 4 }}>
          {shown.map((m, i) => (
            <View key={m.id} style={{ marginLeft: i ? -OV : 0 }}>
              <Avatar m={m} size={AV} cut={i < shown.length - 1 || extra > 0 ? OV : 0} />
            </View>
          ))}
          {extra > 0 ? (
            <View className="items-center justify-center bg-white/20" style={{ marginLeft: -OV, width: AV, height: AV, borderRadius: AV }}>
              <Txt className="font-m700 text-[10.5px] text-white">+{extra}</Txt>
            </View>
          ) : null}
        </View>
      </View>
      <Txt numberOfLines={1} className="mt-3 font-m700 text-[15px]">{room.name}</Txt>
      {cd != null ? (
        <View className="mt-2 flex-row items-center gap-1 rounded-full px-3 py-1" style={{ backgroundColor: hex(room.tint, 0.22) }}>
          <CalendarDays size={13} color="#fff" />
          <Txt className="font-m600 text-[12.5px] text-white">{cd}</Txt>
        </View>
      ) : (
        <View className="mt-2 rounded-full bg-card2 px-3 py-1">
          <Txt className="text-[12.5px] text-t2">{t("membersColon", { n: members.length })}</Txt>
        </View>
      )}
    </Press>
  );
}
