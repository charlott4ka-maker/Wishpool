// Emoji are always drawn as outlined stickers, never as plain text.
// "stk:<name>" is an image sticker with the white rim and soft shadow baked
// into the WebP (assets/stickers). Like the web <Sticker>, the image box is
// larger than `size` and pulled back with a negative margin, because the file
// has a 20% transparent margin around the sticker for the shadow.

import { Image } from "expo-image";
import { Text, View, ViewStyle } from "react-native";

import { STICKER_ASSETS, StickerName } from "./stickerAssets";

export function Sticker({ emoji, size, rotate = 0, style }: { emoji: string; size: number; rotate?: number; style?: ViewStyle }) {
  const name = emoji.startsWith("stk:") ? (emoji.slice(4) as StickerName) : null;
  const box = size * 1.24 * 1.4;
  const transform = rotate ? [{ rotate: `${rotate}deg` }] : undefined;
  if (name && STICKER_ASSETS[name]) {
    return (
      <View style={[{ width: box, height: box, margin: -size * 1.24 * 0.2, transform }, style]} pointerEvents="none">
        <Image source={STICKER_ASSETS[name]} style={{ width: box, height: box }} contentFit="contain" />
      </View>
    );
  }
  // Older wishes keep a plain emoji (and "utya:" ducks from the Mini App, which
  // are Lottie and not bundled here): fall back to the gift sticker for those.
  if (emoji.startsWith("utya:") || !emoji) return <Sticker emoji="stk:gift" size={size} rotate={rotate} style={style} />;
  return (
    <View style={[{ transform, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: size * 0.16, shadowOffset: { width: 0, height: size * 0.05 } }, style]}>
      <Text style={{ fontSize: size, lineHeight: size * 1.15, textShadowColor: "#fff", textShadowRadius: Math.max(2, size * 0.07) }}>{emoji}</Text>
    </View>
  );
}
