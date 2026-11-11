// Profile › Premium (once you have it): the app colour, the app icon and the
// subscription. The offer itself is the card on Profile and the paywall.
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ChevronLeft, CreditCard } from "lucide-react-native";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccentPicker } from "../components/AccentPicker";
import { IconPicker } from "../components/IconPicker";
import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { GlassCircle, Txt } from "../components/ui";
import { useT } from "../i18n";
import { PREVIEW_PREMIUM } from "../lib/premiumGate";
import { useWishpool } from "../store/WishpoolContext";
import { appIconsSupported } from "../subscription/appIcon";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";

export default function PremiumScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { admin } = useWishpool();
  const { isPremium } = useSubscription();
  const unlocked = isPremium || !!admin || PREVIEW_PREMIUM;
  return (
    <View className="flex-1 bg-card">
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>Premium</Txt>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        <View className="mb-8 items-center">
          <Image source={require("../../assets/icons/glow.png")} style={{ width: 88, height: 88, borderRadius: 20 }} contentFit="cover" />
          <Txt className="mt-4 font-m800 text-[20px]">{t("premiumActive")}</Txt>
          <Txt className="mt-1 px-6 text-center text-[14px] leading-[20px] text-t2">{t("premiumThanksSub")}</Txt>
        </View>
        <AccentPicker unlocked={unlocked} />
        {appIconsSupported() || PREVIEW_PREMIUM ? <IconPicker unlocked={unlocked} /> : null}
        <SettingsGroup>
          <SettingsCell icon={CreditCard} tint="#8E8E93" label={t("premiumManage")} onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")} />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}
