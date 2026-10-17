// "Профіль": who you are, stats, Premium, app icon, language, sign out.

import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronRight, Crown, Gift, Heart, Settings, Smartphone } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/AuthContext";
import { BirthdayCard } from "../../components/BirthdayCard";
import { SettingsCell, SettingsGroup } from "../../components/SettingsList";
import { StatusBarBackdrop } from "../../components/StatusBarBackdrop";
import { TabBarFade } from "../../components/TabBarFade";
import { Avatar, Card, Pill, PremiumBadge, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";
import { APP_ICONS, appIconsSupported, changeAppIcon, currentAppIcon } from "../../subscription/appIcon";
import { PREMIUM_ENABLED } from "../../subscription/featureFlags";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { STICKER_ASSETS } from "../../components/stickerAssets";
import { C } from "../../theme/tokens";

export default function ProfileScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, status } = useAuth();
  const { wishes, rooms } = useWishpool();
  const { isPremium } = useSubscription();
  const [icon, setIcon] = useState(currentAppIcon);
  const me = { name: user?.name || t("guest"), color: "#7B61FF", photo: user?.photo };
  const shared = wishes.reduce((n, w) => n + w.rooms.length, 0);

  const pickIcon = async (name: (typeof APP_ICONS)[number]["name"]) => {
    if (name && !isPremium) return router.push("/paywall");
    haptic("select");
    if (await changeAppIcon(name, isPremium).catch(() => false)) setIcon(name);
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        <View className="items-center">
          <Avatar m={me} size={92} />
          <Txt className="mt-4 font-m800 text-2xl">{me.name}</Txt>
          <Txt className="mt-1 text-[14.5px] text-t2">{t("statsLine", { w: wishes.length, r: rooms.length })}</Txt>
        </View>

        <View className="mt-6 flex-row gap-3">
          <Card className="flex-1 items-center p-5">
            <Gift size={22} color={C.blue} />
            <Txt className="mt-2 font-m800 text-[22px]">{shared}</Txt>
            <Txt className="text-[12.5px] text-t2">{t("sharedStat")}</Txt>
          </Card>
          <Card className="flex-1 items-center p-5">
            <Heart size={22} color="#FF4D8D" />
            {/* gifts you took in rooms; needs reservations from the backend, 0 for now */}
            <Txt className="mt-2 font-m800 text-[22px]">{0}</Txt>
            <Txt className="text-[12.5px] text-t2">{t("giftingStat")}</Txt>
          </Card>
        </View>

        <View className="mt-3">
          <BirthdayCard />
        </View>

        {PREMIUM_ENABLED ? (
        <Card className="mt-3 flex-row items-center gap-4 p-4" onPress={() => router.push("/paywall")}>
          <View className="h-sm w-sm items-center justify-center rounded-full bg-gold/20">
            <Crown size={20} color={C.gold} />
          </View>
          <View className="flex-1">
            <Txt className="font-m700 text-base">{t("premium")}</Txt>
            <Txt className="mt-0.5 text-[12.5px] text-t2">{isPremium ? t("premiumActive") : t("premiumSub")}</Txt>
          </View>
          <ChevronRight size={20} color={C.t3} />
        </Card>
        ) : null}

        {PREMIUM_ENABLED && appIconsSupported() ? (
          <View className="mt-6">
            <View className="mb-2 flex-row items-center gap-2">
              <Smartphone size={15} color={C.t2} />
              <Txt className="font-m600 text-[13px] text-t2">{t("appIcon")}</Txt>
              {!isPremium ? <PremiumBadge label={t("premiumOnly")} /> : null}
            </View>
            <View className="flex-row gap-3">
              {APP_ICONS.map((o) => {
                const on = icon === o.name;
                return (
                  <Pressable key={o.name || "default"} onPress={() => pickIcon(o.name)} className="flex-1 items-center">
                    <View className="aspect-square w-full items-center justify-center overflow-hidden rounded-tile" style={{ backgroundColor: o.tint, borderWidth: 2, borderColor: on ? C.blue : "transparent", opacity: o.name && !isPremium ? 0.5 : 1 }}>
                      <Image source={STICKER_ASSETS[o.sticker]} style={{ width: "80%", height: "80%" }} contentFit="contain" />
                    </View>
                    <Txt className={`mt-2 font-m600 text-[12px] ${on ? "text-blueText" : "text-t2"}`}>{t(o.titleKey)}</Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View className="mt-8">
          <SettingsGroup>
            <SettingsCell icon={Settings} tint="#8E8E93" label={t("settings")} onPress={() => router.push("/settings")} />
          </SettingsGroup>
        </View>
        {/* guest: just the button, the data-on-this-phone note lives on Wishes */}
        {status === "guest" ? (
          <View>
            <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
          </View>
        ) : null}
      </ScrollView>
      <TabBarFade />
      <StatusBarBackdrop />
    </View>
  );
}
