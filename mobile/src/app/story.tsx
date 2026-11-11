// Profile › "Wishlist for stories": your wishes on a 9:16 card (a New Year look
// in the holiday season), saved as a picture and shared from the share sheet
// (Instagram, Telegram...). Native only: it needs view-shot and expo-sharing.
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ChevronLeft, Share2, Snowflake } from "lucide-react-native";
import { useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sticker } from "../components/Sticker";
import { toast } from "../components/Toast";
import { GlassCircle, Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { useMe } from "../lib/me";
import { useWishpool, wishImages } from "../store/WishpoolContext";
import { useAccent } from "../theme/accent";
import { C } from "../theme/tokens";

const holiday = (d = new Date()) => (d.getMonth() === 10 && d.getDate() >= 10) || d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 7);

// snowflakes scattered over the card (fixed, so every picture looks the same)
const FLAKES = [[0.08, 0.06, 14], [0.86, 0.09, 18], [0.7, 0.2, 10], [0.18, 0.24, 9], [0.92, 0.42, 12], [0.05, 0.55, 16], [0.8, 0.7, 11], [0.14, 0.82, 10], [0.6, 0.9, 14], [0.38, 0.04, 10]];

export default function StoryScreen() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const me = useMe();
  const { wishes } = useWishpool();
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const ny = holiday();
  // my wishes, the ones with photos first, six at most
  const list = [...wishes].filter((w) => !w.giftedAt).sort((a, b) => Number(!!wishImages(b)[0]) - Number(!!wishImages(a)[0])).slice(0, 6);
  const W = Math.min(width - 32, 380);
  const H = (W * 16) / 9;

  const share = async () => {
    if (busy || !card.current) return;
    setBusy(true);
    try {
      const { captureRef } = require("react-native-view-shot") as typeof import("react-native-view-shot");
      const Sharing = require("expo-sharing") as typeof import("expo-sharing");
      const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
      haptic("success");
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
    } catch {
      haptic("error");
      toast.error(t("toastError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-card">
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m800 text-[20px]">{t("storyTitle")}</Txt>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ alignItems: "center", paddingTop: 8, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* the picture */}
        <View ref={card} collapsable={false} style={{ width: W, height: H, borderRadius: 28, overflow: "hidden", padding: 20 }}>
          <LinearGradient colors={ny ? ["#5E1B2A", "#2A1530", "#0B1433"] : ["#0B1433", "#15181D"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          {ny
            ? FLAKES.map(([x, y, s], i) => (
                <View key={i} style={{ position: "absolute", left: x * W, top: y * H, opacity: 0.35 }}>
                  <Snowflake size={s} color="#fff" strokeWidth={1.5} absoluteStrokeWidth />
                </View>
              ))
            : null}
          <View className="flex-row items-center gap-2">
            <Sticker emoji={ny ? "stk:tree" : "stk:gift"} size={30} />
            <View className="flex-1">
              <Txt className="font-m800 text-[22px] text-white" style={{ letterSpacing: -0.4 }}>{t(ny ? "storyHeadNy" : "storyHead")}</Txt>
              <Txt className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{me.name}</Txt>
            </View>
          </View>
          {/* the wishes: two columns */}
          <View className="mb-3 mt-4 flex-1 flex-row flex-wrap content-start overflow-hidden" style={{ marginHorizontal: -5 }}>
            {list.map((w) => {
              const img = wishImages(w)[0];
              return (
                <View key={w.id} style={{ width: "50%", padding: 5 }}>
                  <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <View style={{ aspectRatio: 1.55, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" }}>
                      {img ? <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Sticker emoji={w.emoji} size={40} />}
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                      <Txt numberOfLines={1} className="font-m700 text-[12px] text-white">{w.title}</Txt>
                      {w.price ? <Txt numberOfLines={1} className="text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>{w.price}</Txt> : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          {/* our name at the bottom, so friends know where it's from */}
          <View className="flex-row items-center justify-center gap-2">
            <Image source={require("../../assets/logo.png")} style={{ width: 22, height: 22 }} contentFit="contain" />
            <Txt className="font-m700 text-[13px] text-white">Wishpool</Txt>
          </View>
        </View>
        <Txt className="mt-4 px-8 text-center text-[13px] leading-[19px] text-t2">{t("storyHint")}</Txt>
      </ScrollView>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}>
        <Pill full loading={busy} icon={<Share2 size={18} color="#fff" />} onPress={share}>{t("storyShare")}</Pill>
      </View>
    </View>
  );
}
