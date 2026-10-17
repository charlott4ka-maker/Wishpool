import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Lock, PartyPopper, Users } from "lucide-react-native";
import { PressableProps, StyleSheet, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { wishImages } from "../store/WishpoolContext";
import type { Wish } from "../types";
import { C } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import { Txt } from "./ui";

// Wishlist card: square picture (photo, or the sticker on a soft tile), two
// lines of title, price in the accent colour, a small "where" badge. These cards
// keep a thin light outline on a plain fill, inside the content block with the chips.
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
      style={{ backgroundColor: C.raised, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}
    >
      <View className="w-full items-center justify-center overflow-hidden rounded-2xl bg-card2" style={{ aspectRatio: 1 }}>
        {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <Sticker emoji={w.emoji} size={56} rotate={-6} />}
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
