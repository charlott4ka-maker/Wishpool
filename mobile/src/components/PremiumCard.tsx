// Profile: the Premium offer right under your picture and name (until you
// have it): a card on a lively blue-to-violet gradient (it stands out from the
// dark blocks), a line on what it gives, and "Try for free" (the 7-day trial
// on the yearly plan) to the paywall.
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Crown } from "lucide-react-native";
import { View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { Press } from "./Press";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

// TEMP: two looks while she picks (EXPO_PUBLIC_CARD_LOOK=glow in a test build)
const LOOK = process.env.EXPO_PUBLIC_CARD_LOOK === "glow" ? "glow" : "gradient";

export function PremiumCard() {
  const { t } = useT();
  const router = useRouter();
  const open = () => {
    haptic("select");
    router.push("/paywall");
  };
  return (
    <View className="overflow-hidden rounded-card p-6" style={LOOK === "glow" ? { backgroundColor: C.raised } : undefined}>
      {LOOK === "glow" ? (
        <>
          {/* our block colour with a glow rising from the bottom edge, in layers
              like stacked inner shadows: deep blue, then lighter, then a thin light lip */}
          <LinearGradient colors={["rgba(20,76,205,0)", "rgba(20,76,205,0.55)", "rgba(20,76,205,0.95)"]} locations={[0.35, 0.8, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={["rgba(102,148,255,0)", "rgba(102,148,255,0.55)"]} locations={[0.72, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={["rgba(255,255,255,0)", "rgba(200,220,255,0.45)"]} locations={[0.93, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </>
      ) : (
        <>
          <LinearGradient colors={["#0747B8", "#3340D0", "#6A3BD4"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          {/* a soft light in the top corner */}
          <LinearGradient colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.45, y: 0.6 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </>
      )}
      <View className="flex-row items-center gap-2">
        <Crown size={18} color="#fff" fill="#fff" strokeWidth={1.5} />
        <Txt className="font-m800 text-[17px] text-white">{t("premium")}</Txt>
      </View>
      <Txt className="mt-2 text-[14px] leading-[20px]" style={{ color: "rgba(255,255,255,0.85)" }}>{t("premiumCardSub")}</Txt>
      <View className="mt-4 flex-row">
        <Press onPress={open} className="h-sm items-center justify-center rounded-full bg-white px-5">
          <Txt className="font-m700 text-[15px]" style={{ color: LOOK === "glow" ? "#15181D" : "#0A4FC4" }}>{t("premiumTry")}</Txt>
        </Press>
      </View>
    </View>
  );
}
