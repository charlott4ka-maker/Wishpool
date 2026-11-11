// Emoji are always drawn as outlined stickers, never as plain text.
// "stk:<name>" is an image sticker with the white rim and soft shadow baked
// into the WebP (assets/stickers). Like the web <Sticker>, the image box is
// larger than `size` and pulled back with a negative margin, because the file
// has a 20% transparent margin around the sticker for the shadow. Stickers
// uploaded on the admin page aren't bundled and load from the site instead.

import { Image } from "expo-image";
import { Platform, Text, View, ViewStyle } from "react-native";

import { remoteStickerUrl } from "../lib/remoteConfig";
import { STICKER_ASSETS, StickerName } from "./stickerAssets";

export function Sticker({ emoji, size, rotate = 0, style }: { emoji: string; size: number; rotate?: number; style?: ViewStyle }) {
  const name = emoji.startsWith("stk:") ? (emoji.slice(4) as StickerName) : null;
  const box = size * 1.24 * 1.4;
  const transform = rotate ? [{ rotate: `${rotate}deg` }] : undefined;
  if (name) {
    // bundled with the app, or added later on the admin page (served by the site)
    const source = STICKER_ASSETS[name] || { uri: remoteStickerUrl(name) };
    return (
      <View style={[{ width: box, height: box, margin: -size * 1.24 * 0.2, transform }, style]} pointerEvents="none">
        <Image source={source} style={{ width: box, height: box }} contentFit="contain" cachePolicy="disk" />
      </View>
    );
  }
  // Older wishes keep a plain emoji (and "utya:" ducks from the Mini App, which
  // are Lottie and not bundled here): fall back to the gift sticker for those.
  if (emoji.startsWith("utya:") || !emoji) return <Sticker emoji="stk:gift" size={size} rotate={rotate} style={style} />;
  // the web build (Telegram, admin preview): a View shadow is a box there, and one
  // blurred text shadow reads as a glow; a ring of hard white drop-shadows
  // follows the emoji's own outline instead, then a soft shadow under it
  if (Platform.OS === "web") {
    // thin: the eight shadows stack on each other, so each one is half the rim we want
    const w = Math.max(1, size * 0.03);
    const rim = [0, 45, 90, 135, 180, 225, 270, 315]
      .map((a) => `drop-shadow(${(Math.cos((a * Math.PI) / 180) * w).toFixed(1)}px ${(Math.sin((a * Math.PI) / 180) * w).toFixed(1)}px 0 #fff)`)
      .join(" ");
    return (
      <View style={[{ transform }, style]}>
        <Text style={{ fontSize: size, lineHeight: size * 1.15, filter: `${rim} drop-shadow(0 ${(size * 0.05).toFixed(1)}px ${(size * 0.12).toFixed(1)}px rgba(0,0,0,0.24))` } as object}>{emoji}</Text>
      </View>
    );
  }
  return (
    <View style={[{ transform, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: size * 0.16, shadowOffset: { width: 0, height: size * 0.05 } }, style]}>
      <Text style={{ fontSize: size, lineHeight: size * 1.15, textShadowColor: "#fff", textShadowRadius: Math.max(2, size * 0.07) }}>{emoji}</Text>
    </View>
  );
}
