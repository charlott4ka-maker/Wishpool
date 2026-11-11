// Profile › Premium (once you have it), in the spirit of Telegram Premium's
// page: the glass star cut out, then the app colour,
// the app icon, everything Premium gives, and the subscription.
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ChevronLeft, CreditCard, Folder, ImagePlus, type LucideIcon, Palette, Smartphone, Sticker as StickerIcon, Wallpaper } from "lucide-react-native";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccentPicker } from "../components/AccentPicker";
import { IconPicker } from "../components/IconPicker";
import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { GlassCircle, Txt } from "../components/ui";
import { useT } from "../i18n";
import { FOLDER_SKINS } from "../lib/folderSkins";
import { PREVIEW_PREMIUM } from "../lib/premiumGate";
import { useWishpool } from "../store/WishpoolContext";
import { appIconsSupported } from "../subscription/appIcon";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";
import { useAccent } from "../theme/accent";

const PERKS: [LucideIcon, string, string, string][] = [
  [Folder, "#0A82F9", "perkFolders", "perkFoldersSub"],
  [ImagePlus, "#FF4D8D", "perkCover", "perkCoverSub"],
  [StickerIcon, "#FF9500", "perkStickers", "perkStickersSub"],
  [Wallpaper, "#5856D6", "perkRoomBg", "perkRoomBgSub"],
  [Palette, "#AF52DE", "perkAccent", "perkAccentSub"],
  [Smartphone, "#34C759", "perkIcon", "perkIconSub"],
];

export default function PremiumScreen() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { admin } = useWishpool();
  const { isPremium } = useSubscription();
  const unlocked = isPremium || !!admin || PREVIEW_PREMIUM;
  return (
    <View className="flex-1 bg-card">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* the header: the star, the thanks */}
        <View style={{ paddingTop: insets.top + 8 }}>
          <View className="items-center px-4">
            <Image source={require("../../assets/premium-star.png")} style={{ width: 100, height: 96, marginTop: 40 }} contentFit="contain" />
            <Txt className="mt-6 font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t("premiumActive")}</Txt>
            <Txt className="mt-2 px-6 text-center text-[15px] leading-[21px] text-t2">{t("premiumThanksSub")}</Txt>
          </View>
        </View>

        <View className="px-4 pt-8">
          <AccentPicker unlocked={unlocked} />
          {appIconsSupported() || PREVIEW_PREMIUM ? <IconPicker unlocked={unlocked} /> : null}

          {/* everything Premium gives, like Telegram's list */}
          <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>{t("premiumPerks")}</Txt>
          <View className="mb-8 overflow-hidden rounded-card bg-raised">
            {PERKS.map(([Icon, tint, title, sub], i) => (
              <View key={title}>
                <View className="flex-row gap-4 px-4 py-4">
                  <View className="items-center justify-center" style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: tint }}>
                    <Icon size={18} color="#fff" strokeWidth={2.2} />
                  </View>
                  <View className="flex-1">
                    <Txt className="font-m600 text-[16px]">{t(title)}</Txt>
                    <Txt className="mt-1 text-[13.5px] leading-[19px] text-t2">{t(sub, { n: FOLDER_SKINS.length })}</Txt>
                  </View>
                </View>
                {i < PERKS.length - 1 ? <View style={{ height: 0.5, backgroundColor: "rgba(255,255,255,0.12)", marginLeft: 64 }} /> : null}
              </View>
            ))}
          </View>

          <SettingsGroup>
            <SettingsCell icon={CreditCard} tint="#8E8E93" label={t("premiumManage")} onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")} />
          </SettingsGroup>
        </View>
      </ScrollView>
      {/* back stays on top while the page scrolls */}
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 16 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
      </View>
    </View>
  );
}
