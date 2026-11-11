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
import { Txt } from "./ui";

export function PremiumCard() {
  const { t } = useT();
  const router = useRouter();
  const open = () => {
    haptic("select");
    router.push("/paywall");
  };
  return (
    <View className="overflow-hidden rounded-card p-6">
      <LinearGradient colors={["#0A6CF0", "#4F5BFF", "#9B5CF6"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      {/* a soft light in the top corner */}
      <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.45, y: 0.6 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View className="flex-row items-center gap-2">
        <Crown size={18} color="#fff" fill="#fff" strokeWidth={1.5} />
        <Txt className="font-m800 text-[17px] text-white">{t("premium")}</Txt>
      </View>
      <Txt className="mt-2 text-[14px] leading-[20px]" style={{ color: "rgba(255,255,255,0.85)" }}>{t("premiumCardSub")}</Txt>
      <View className="mt-4 flex-row">
        <Press onPress={open} className="h-sm items-center justify-center rounded-full bg-white px-5">
          <Txt className="font-m700 text-[15px]" style={{ color: "#0A5BD6" }}>{t("premiumTry")}</Txt>
        </Press>
      </View>
    </View>
  );
}
