// Profile: the Premium offer right under your picture and name (until you
// have it): our block colour with a blue glow rising from the bottom, a line
// on what it gives, and "Try for free" (the 7-day trial
// on the yearly plan) to the paywall.
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Crown } from "lucide-react-native";
import { Linking, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { IN_TG } from "../lib/telegram";

// in Telegram Premium can't be bought (it's an Apple purchase): the card says
// it lives in the iPhone app and links to the App Store
const APP_STORE = "https://apps.apple.com/app/id6825104468";
import { Press } from "./Press";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

export function PremiumCard() {
  const { t } = useT();
  const router = useRouter();
  const open = () => {
    haptic("select");
    if (IN_TG) Linking.openURL(APP_STORE);
    else router.push("/paywall");
  };
  return (
    <View className="overflow-hidden rounded-card p-6" style={{ backgroundColor: C.raised }}>
      {/* our block colour with a glow rising from the bottom edge, in layers
          like stacked inner shadows: deep blue, then lighter, then a thin light lip */}
      <LinearGradient colors={["rgba(20,76,205,0)", "rgba(20,76,205,0.55)", "rgba(20,76,205,0.95)"]} locations={[0.35, 0.8, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient colors={["rgba(102,148,255,0)", "rgba(102,148,255,0.55)"]} locations={[0.72, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient colors={["rgba(255,255,255,0)", "rgba(200,220,255,0.45)"]} locations={[0.93, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View className="flex-row items-center gap-2">
        {/* lifted 1.5pt: measured, its middle then meets the letters' cap middle */}
        <View style={{ marginTop: -3 }}>
          <Crown size={18} color="#fff" fill="#fff" strokeWidth={1.5} />
        </View>
        <Txt className="font-m800 text-[17px] text-white">{t("premium")}</Txt>
      </View>
      <Txt className="mt-2 text-[14px] leading-[20px]" style={{ color: "rgba(255,255,255,0.85)" }}>{t(IN_TG ? "premiumTgSub" : "premiumCardSub")}</Txt>
      <View className="mt-4 flex-row">
        <Press onPress={open} className="h-sm items-center justify-center rounded-full bg-white px-5">
          <Txt className="font-m700 text-[15px]" style={{ color: "#15181D" }}>{t(IN_TG ? "premiumGetApp" : "premiumTry")}</Txt>
        </Press>
      </View>
    </View>
  );
}
