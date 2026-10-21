// A wish as a list row (room lists), like WishRow in the Mini App: a small
// photo (tap = full screen) or sticker, title, price, note, shop link, and
// whatever goes on the right (I'll get it / Taken / visible to all).

import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Link2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { linkHost } from "../services/affiliate/urlCleanup";
import { wishImages } from "../store/WishpoolContext";
import { C } from "../theme/tokens";
import type { Wish } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import { Sticker } from "./Sticker";
import { Txt } from "./ui";

export const LIST = { pad: 16, icon: 30, gap: 16 } as const;

export function WishNote({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <View className="flex-row items-start bg-card2" style={{ borderRadius: compact ? 12 : 16, paddingVertical: compact ? 8 : 12, paddingHorizontal: compact ? 12 : 16, gap: compact ? 8 : 12 }}>
      <Sticker emoji="stk:note" size={compact ? 14 : 18} style={{ margin: compact ? -5 : -6 }} />
      <Txt className="flex-1" style={{ fontSize: compact ? 13 : 14.5, lineHeight: compact ? 18 : 20 }}>{text}</Txt>
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

export function WishRow({ w, right, onLongPress }: { w: Wish; right?: React.ReactNode; onLongPress?: () => void }) {
  return (
    <Pressable onLongPress={onLongPress} disabled={!onLongPress} className="flex-row items-center py-4" style={{ gap: LIST.gap, minHeight: 64 }}>
      <WishThumb w={w} />
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
      {right}
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
