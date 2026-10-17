import { BlurView } from "expo-blur";
import { Image, ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, PartyPopper, Users } from "lucide-react-native";
import { PressableProps, StyleSheet, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { wishImages } from "../store/WishpoolContext";
import type { Wish } from "../types";
import { C, hex } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import { STICKER_ASSETS } from "./stickerAssets";
import { Txt } from "./ui";

// Wishlist card: square picture (photo, or the sticker on a soft tile), two
// lines of title, price in the accent colour, a small "where" badge. These cards
// keep the thin light outline (the one exception to "no outlines on blocks"),
// on a glass fill (GlassFill), inside the content block with the chips.
/**
 * The card's glass, in layers: the #222831 underlay with the wish's own
 * picture, big and faint, as something for the glass to frost; then the glass
 * itself (a blur with the block fill #15181D at 50%); then the rim light,
 * brighter along the top-left edges like light catching glass.
 */
function GlassFill({ source }: { source: ImageSource | number | null }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {source ? (
        <Image source={source} contentFit="cover" style={{ position: "absolute", left: "-20%", top: "-10%", width: "140%", height: "90%", opacity: 0.35 }} />
      ) : null}
      <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hex(C.card, 0.5) }]} />
      <LinearGradient colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 24, borderWidth: 1, borderTopColor: "rgba(255,255,255,0.18)", borderLeftColor: "rgba(255,255,255,0.12)", borderRightColor: "rgba(255,255,255,0.06)", borderBottomColor: "rgba(255,255,255,0.04)" },
        ]}
      />
    </View>
  );
}

const stickerSource = (emoji?: string) => {
  const name = emoji?.startsWith("stk:") ? (emoji.slice(4) as keyof typeof STICKER_ASSETS) : null;
  return name && STICKER_ASSETS[name] ? STICKER_ASSETS[name] : null;
};

// `onPress` and any other props (e.g. from <Link asChild>) go to the Pressable.
export function WishTile({ w, onPress, ...rest }: { w: Wish; onPress?: (e?: unknown) => void } & Omit<PressableProps, "onPress" | "children">) {
  const { t } = useT();
  const img = wishImages(w)[0];
  const shared = w.rooms ? w.rooms.length : 0;
  return (
    <Press
      {...rest}
      scaleTo={0.97}
      onPress={(e) => {
        haptic("light");
        onPress?.(e);
      }}
      className="flex-1 overflow-hidden rounded-[24px] p-2"
      style={{ backgroundColor: C.bg }}
    >
      <GlassFill source={img ? { uri: img } : stickerSource(w.emoji)} />
      <View className="aspect-square items-center justify-center overflow-hidden rounded-2xl bg-card2">
        {img ? <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} /> : <Sticker emoji={w.emoji} size={56} rotate={-6} />}
        <BlurView intensity={30} tint="dark" className="absolute bottom-2 left-2 h-6 flex-row items-center gap-1 overflow-hidden rounded-full bg-black/40 px-2">
          {w.giftedAt ? (
            <>
              <PartyPopper size={12} color="#fff" />
              <Txt className="font-m600 text-[11.5px] text-white">{t("giftedBadge")}</Txt>
            </>
          ) : shared ? (
            <>
              <Users size={12} color="#fff" />
              <Txt className="font-m600 text-[11.5px] text-white">{shared}</Txt>
            </>
          ) : (
            <>
              <Lock size={11} color="#fff" />
              <Txt className="font-m600 text-[11.5px] text-white">{t("privateShort")}</Txt>
            </>
          )}
        </BlurView>
      </View>
      <View className="px-1 pb-1 pt-3">
        <Txt numberOfLines={2} className="min-h-[37px] font-m600 text-[14.5px] leading-[19px]">{w.title}</Txt>
        <Txt className={`mt-1 font-m700 text-sm ${w.price ? "text-blueText" : "text-t3"}`}>{w.price || " "}</Txt>
      </View>
    </Press>
  );
}
