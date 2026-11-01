// A wish as a list row (room lists), like WishRow in the Mini App: a small
// photo (tap = full screen) or sticker, title, price, note, shop link, and
// whatever goes on the right (I'll get it / Taken / visible to all).

import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Link2 } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { linkHost } from "../services/affiliate/urlCleanup";
import { wishImages } from "../store/WishpoolContext";
import { C } from "../theme/tokens";
import type { Wish } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import { Sticker } from "./Sticker";
import { Txt } from "./ui";

export const LIST = { pad: 16, icon: 30, gap: 16 } as const;

// a filled grey circle with an "i" cut out (coolicons circle-info-fill-round)
function NoteIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={C.t3}
        fillRule="evenodd"
        d="M2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12ZM12 7C11.448 7 11 7.448 11 8C11 8.552 11.448 9 12 9H12.01C12.562 9 13.01 8.552 13.01 8C13.01 7.448 12.562 7 12.01 7H12ZM13 11C13 10.448 12.552 10 12 10C11.448 10 11 10.448 11 11V16C11 16.552 11.448 17 12 17C12.552 17 13 16.552 13 16V11Z"
      />
    </Svg>
  );
}

export function WishNote({ text, compact }: { text: string; compact?: boolean }) {
  // 6pt from the icon's circle to the text: the svg has ~1.5pt of air around
  // the circle, so the gap is 5.
  // one line: the icon and the text centred on each other; longer notes keep the
  // icon at the top, by the first line
  const [multi, setMulti] = useState(false);
  return (
    // in a list row it sits flush with the title above (no box); in the wish sheet it's a block
    <View className={`flex-row ${multi ? "items-start" : "items-center"} ${compact ? "" : "bg-card2"}`} style={compact ? { gap: 5 } : { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, gap: 5 }}>
      {/* centred on the first line of text. iOS puts a line's extra height (lineHeight
          over the font's own) above the glyphs, so the text sits ~2pt lower there */}
      <View style={{ marginTop: !multi ? 0 : Platform.OS === "ios" ? 2 : compact ? 0 : 1 }}><NoteIcon size={compact ? 16 : 18} /></View>
      <Txt className="flex-1" style={{ fontSize: compact ? 13 : 14.5, lineHeight: multi ? (compact ? 18 : 20) : undefined }} onTextLayout={(e) => setMulti(e.nativeEvent.lines.length > 1)}>{text}</Txt>
    </View>
  );
}

export function WishThumb({ w, size = LIST.icon }: { w: Wish; size?: number }) {
  const imgs = wishImages(w);
  const [open, setOpen] = useState(false);
  if (!imgs.length) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Sticker emoji={w.emoji} size={size * 0.82} />
      </View>
    );
  }
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ width: size, height: size, borderRadius: size * 0.26, overflow: "hidden", backgroundColor: C.card2 }}>
        <Image source={{ uri: imgs[0] }} style={{ width: size, height: size }} contentFit="cover" />
      </Pressable>
      {open ? <ImageLightbox images={imgs} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function WishRow({ w, right, onPress, onLongPress }: { w: Wish; right?: React.ReactNode; onPress?: () => void; onLongPress?: () => void }) {
  // a note (or a link) makes the row tall: the picture and the button then line
  // up with the title and price instead of floating in the middle of the row
  const tall = !!(w.note || w.link);
  const head = w.price ? 44 : 22; // title (22) + gap and price line
  const side = (node: React.ReactNode) => (tall ? <View style={{ height: head, justifyContent: "center" }}>{node}</View> : node);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!onPress && !onLongPress} className={`flex-row py-4 ${tall ? "items-start" : "items-center"}`} style={{ gap: LIST.gap, minHeight: 64 }}>
      {side(<WishThumb w={w} />)}
      <View className="flex-1">
        <Txt numberOfLines={1} className="font-m600 text-base">{w.title}</Txt>
        {w.price ? <Txt className="mt-1 text-[13.5px] text-t2">{w.price}</Txt> : null}
        {w.note ? <View className="mt-2"><WishNote compact text={w.note} /></View> : null}
        {w.link ? (
          <Pressable onPress={() => WebBrowser.openBrowserAsync(w.link!)} className="mt-1 flex-row items-center gap-1 self-start">
            <Link2 size={12} color={C.blueText} />
            <Txt numberOfLines={1} className="font-m600 text-[12.5px] text-blueText">{linkHost(w.link)}</Txt>
          </Pressable>
        ) : null}
      </View>
      {right ? side(right) : null}
    </Pressable>
  );
}

/** Rows in a card; separators start after the icon (sepBelow in the Mini App). */
export function WishList({ children }: { children: React.ReactNode[] }) {
  const rows = children.filter(Boolean);
  return (
    <View className="overflow-hidden rounded-card bg-bg" style={{ paddingHorizontal: LIST.pad }}>
      {rows.map((row, i) => (
        <View key={i}>
          {row}
          {i < rows.length - 1 ? <View style={{ height: 1, backgroundColor: C.line, marginLeft: LIST.icon + LIST.gap }} /> : null}
        </View>
      ))}
    </View>
  );
}
