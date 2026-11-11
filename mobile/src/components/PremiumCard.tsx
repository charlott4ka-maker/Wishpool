// Profile: the Premium offer right under your picture and name (until you
// have it): the glow icon with a PREMIUM tag, a line on what it gives, and
// "Try for free" (the 7-day trial on the yearly plan) to the paywall.
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { useT } from "../i18n";
import { Pill, Txt } from "./ui";

export function PremiumCard() {
  const { t } = useT();
  const router = useRouter();
  return (
    <View className="rounded-card bg-raised p-6">
      <View style={{ width: 64, height: 64 }}>
        <Image source={require("../../assets/icons/glow.png")} style={{ width: 56, height: 56, borderRadius: 14, marginTop: 8 }} contentFit="cover" />
        <View style={{ position: "absolute", top: 0, left: 30, paddingHorizontal: 6, height: 20, borderRadius: 6, backgroundColor: "#fff", justifyContent: "center" }}>
          <Txt className="font-m800 text-[10px]" style={{ color: "#15181D", letterSpacing: 0.4 }}>PREMIUM</Txt>
        </View>
      </View>
      <Txt className="mt-4 font-m700 text-[17px]">{t("premium")}</Txt>
      <Txt className="mt-1 text-[14px] leading-[20px] text-t2">{t("premiumCardSub")}</Txt>
      <View className="mt-4 flex-row">
        <Pill size="sm" px={20} onPress={() => router.push("/paywall")}>{t("premiumTry")}</Pill>
      </View>
    </View>
  );
}
