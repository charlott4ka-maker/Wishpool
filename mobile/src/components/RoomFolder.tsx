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
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, PanResponder, Platform, StyleSheet, View } from "react-native";
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

/** Soft shadow along the front's top edge: many thin, faint strokes standing in
 *  for a blur (four thick ones showed as bands, like waves, over the photos). */
const SHADOW_WIDTHS = Array.from({ length: 12 }, (_, i) => 24 - i * 2);
function EdgeShadow({ d }: { d: string }) {
  return (
    <>
      {SHADOW_WIDTHS.map((sw) => (
        <Path key={sw} d={d} fill="none" stroke="#000" strokeOpacity={0.035} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
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

// The sticker's default spot and how far it may go: on the front, inside the folder.
const STICKER = 34;
const STICKER_BOX = STICKER * 1.24 * 1.4; // the Sticker's own box (rim and rotation room)
const DEFAULT_POS = { x: 0.14, y: 0.46 };
export function parseStickerPos(v?: string) {
  const m = v && v.match(/^([\d.]+),([\d.]+)$/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : DEFAULT_POS;
}
const clampPos = (p: { x: number; y: number }, w: number, h: number) => ({
  x: Math.min(Math.max(p.x, 0), Math.max(0, 1 - STICKER_BOX / w)),
  y: Math.min(Math.max(p.y, 0.3), Math.max(0.3, 0.98 - STICKER_BOX / h)),
});
const posText = (p: { x: number; y: number }) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
// The sticker never covers the members' avatars (bottom right, right 11% / bottom 12%):
// when it would, it's pushed out the shortest way, to the left of them or above them.
function avoidAvatars(p: { x: number; y: number }, w: number, h: number, avatars: number) {
  const inset = (STICKER_BOX - STICKER * 1.24) / 2 - 4; // the visible sticker plus a little air
  const n = Math.max(1, avatars); // a new room still gets its owner's avatar
  const right = w * 0.89, bottom = h * 0.88;
  const left = right - (AV + (n - 1) * (AV - OV)), top = bottom - AV;
  const sx = p.x * w + inset, sy = p.y * h + inset, sw = STICKER_BOX - inset * 2;
  if (sx >= right || sx + sw <= left || sy >= bottom || sy + sw <= top) return p;
  const toLeft = sx + sw - left, toTop = sy + sw - top;
  return toLeft < toTop ? { x: (left - sw - inset) / w, y: p.y } : { x: p.x, y: (top - sw - inset) / h };
}

/**
 * The sticker on the folder. With `onMove` (the new / edit room preview) it can
 * be dragged anywhere on the front; the spot is saved as fractions of the folder.
 */
function FolderSticker({ emoji, pos, dim, avatars, onMove, onDrag }: { emoji: string; pos?: string; dim: { w: number; h: number } | null; avatars: number; onMove?: (pos: string) => void; onDrag?: (on: boolean) => void }) {
  const at = parseStickerPos(pos);
  const xy = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const start = useRef(at);
  const live = useRef({ dim, avatars, onMove, onDrag });
  live.current = { dim, avatars, onMove, onDrag };
  const [lifted, setLifted] = useState(false);
  // placed by pixels once the folder has a size (percentages before that)
  useEffect(() => {
    if (dim) xy.setValue({ x: at.x * dim.w, y: at.y * dim.h });
  }, [dim, at.x, at.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!live.current.onMove,
        onStartShouldSetPanResponderCapture: () => !!live.current.onMove,
        onMoveShouldSetPanResponderCapture: () => !!live.current.onMove,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const d = live.current.dim;
          if (!d) return;
          start.current = { x: (xy.x as any)._value / d.w, y: (xy.y as any)._value / d.h };
          setLifted(true);
          live.current.onDrag?.(true);
          haptic("light");
        },
        onPanResponderMove: (_, g) => {
          const d = live.current.dim;
          if (!d) return;
          const p = clampPos(avoidAvatars({ x: start.current.x + g.dx / d.w, y: start.current.y + g.dy / d.h }, d.w, d.h, live.current.avatars), d.w, d.h);
          xy.setValue({ x: p.x * d.w, y: p.y * d.h });
        },
        onPanResponderRelease: () => drop(),
        onPanResponderTerminate: () => drop(),
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  function drop() {
    const d = live.current.dim;
    setLifted(false);
    live.current.onDrag?.(false);
    if (!d) return;
    haptic("select");
    live.current.onMove?.(posText({ x: (xy.x as any)._value / d.w, y: (xy.y as any)._value / d.h }));
  }
  return (
    <Animated.View
      {...(onMove ? pan.panHandlers : {})}
      style={
        dim
          ? { position: "absolute", left: 0, top: 0, zIndex: 5, transform: [...xy.getTranslateTransform(), { scale: lifted ? 1.12 : 1 }] }
          : { position: "absolute", left: `${at.x * 100}%`, top: `${at.y * 100}%`, zIndex: 5 }
      }
    >
      <Sticker emoji={emoji} size={STICKER} rotate={-8} />
    </Animated.View>
  );
}

export function RoomFolder({ room, wishes, onPress, onStickerMove, onStickerDrag }: {
  room: Room; wishes: Wish[]; onPress: () => void;
  /** Preview in the new / edit room sheet: the sticker can be dragged to a new spot. */
  onStickerMove?: (pos: string) => void;
  onStickerDrag?: (dragging: boolean) => void;
}) {
  const { lang, t } = useT();
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const cd = countdownLabel(lang, t, room.eventDate);
  // everyone's photos from the server; a guest's rooms (or an older server) have only your own
  const own = wishes.filter((w) => w.rooms.includes(room.id)).map((w) => wishImages(w)[0]).filter(Boolean);
  const photos = (room.photos && room.photos.length ? room.photos : own).slice(0, 3);
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
        <FolderSticker emoji={room.emoji} pos={room.stickerPos} dim={dim} avatars={shown.length + (extra > 0 ? 1 : 0)} onMove={onStickerMove} onDrag={onStickerDrag} />
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
