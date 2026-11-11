// "Профіль": who you are, stats, Premium, language, sign out.

import { useRouter } from "expo-router";
import { Crown, Gift, Heart, Pencil, Settings, Users } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMe } from "../../lib/me";
import { useAuth } from "../../auth/AuthContext";
import { BirthdayCard } from "../../components/BirthdayCard";
import { Press } from "../../components/Press";
import { SettingsCell, SettingsGroup } from "../../components/SettingsList";
import { StatusBarBackdrop } from "../../components/StatusBarBackdrop";
import { TabBarFade } from "../../components/TabBarFade";
import { Avatar, AvatarBadge, Card, Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { usePrefs } from "../../settings/prefs";
import { useWishpool } from "../../store/WishpoolContext";
import { PREVIEW_PREMIUM, showPremium } from "../../lib/premiumGate";
import { PremiumCard } from "../../components/PremiumCard";
import { IN_TG } from "../../lib/telegram";
import { PREMIUM_ENABLED } from "../../subscription/featureFlags";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { C } from "../../theme/tokens";

export default function ProfileScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, status } = useAuth();
  const { wishes, rooms, inbox, admin } = useWishpool();
  const { isPremium } = useSubscription();
  const prefs = usePrefs();
  // your own name / photo from the profile editor win over the account's
  // the same name, photo and colour your avatar has in rooms
  const me = useMe();
  const shared = wishes.reduce((n, w) => n + w.rooms.length, 0);
  const gifting = rooms.reduce((n, r) => n + (r.demoLists || []).reduce((k, l) => k + l.wishes.filter((x) => x.reservedByMe).length, 0), 0);


  return (
    <View className="flex-1 bg-card">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-card" contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        <View className="items-center">
          {/* tap: edit name and photo */}
          <Press scaleTo={0.95} onPress={() => router.push("/profile-edit")} accessibilityLabel={t("editProfile")}>
            <Avatar m={me} size={92} />
            <AvatarBadge bg={C.raised} ring={C.card} style={{ right: -3, bottom: -3 }}>
              <Pencil size={14} color={C.t1} />
            </AvatarBadge>
          </Press>
          <Txt className="mt-4 font-m800 text-2xl">{me.name}</Txt>
          <Txt className="mt-1 text-[14.5px] text-t2">{t("statsLine", { w: wishes.length, r: rooms.length })}</Txt>
        </View>

        <View className="mt-6 flex-row gap-3">
          <Card className="flex-1 items-center bg-raised p-5">
            <Gift size={22} color={C.blue} />
            <Txt className="mt-2 font-m800 text-[22px]">{shared}</Txt>
            <Txt className="text-[12.5px] text-t2">{t("sharedStat")}</Txt>
          </Card>
          <Card className="flex-1 items-center bg-raised p-5">
            <Heart size={22} color="#FF4D8D" />
            {/* gifts you took in rooms (only known from demo content until the backend sends it) */}
            <Txt className="mt-2 font-m800 text-[22px]">{gifting}</Txt>
            <Txt className="text-[12.5px] text-t2">{t("giftingStat")}</Txt>
          </Card>
        </View>

        <View className="mt-3">
          <BirthdayCard />
        </View>

        {/* Premium: the offer under the birthday until you have it; in Telegram a
            pointer to the iPhone app, shown once Premium is on sale (admins see it now) */}
        {(IN_TG ? PREMIUM_ENABLED || admin || PREVIEW_PREMIUM : showPremium(admin)) && !isPremium ? (
          <View className="mt-3">
            <PremiumCard />
          </View>
        ) : null}


        <View className="mt-8">
          <SettingsGroup>
            {/* friends, with a red count while requests / room invitations wait */}
            <SettingsCell
              icon={Users}
              tint="#34C759"
              label={t("friendsTitle")}
              onPress={() => router.push(status === "signedIn" ? "/friends" : "/friends-guest")}
              chevron
              right={
                inbox ? (
                  <View className="ml-2 h-6 min-w-6 items-center justify-center rounded-full px-2" style={{ backgroundColor: "#FF3B30" }}>
                    <Txt className="font-m700 text-[13px] text-white">{inbox}</Txt>
                  </View>
                ) : null
              }
            />
            {/* once you have Premium: its own page (colour, icon, subscription) */}
            {showPremium(admin) && (isPremium || admin || PREVIEW_PREMIUM) ? <SettingsCell icon={Crown} tint={C.blue} label="Premium" onPress={() => router.push("/premium")} /> : null}
            <SettingsCell icon={Settings} tint="#8E8E93" label={t("settings")} onPress={() => router.push("/settings")} />
          </SettingsGroup>
        </View>
        {/* guest: just the button, the data-on-this-phone note lives on Wishes */}
        {status === "guest" && !prefs.demo ? (
          <View>
            <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
          </View>
        ) : null}
      </ScrollView>
      <TabBarFade />
      <StatusBarBackdrop color={C.card} />
    </View>
  );
}
