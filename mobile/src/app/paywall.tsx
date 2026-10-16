// Wishpool Premium: what it unlocks, the plans from RevenueCat, restore.

import { useRouter } from "expo-router";
import { Crown, Images, Smartphone, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sticker } from "../components/Sticker";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { PLAN_LIMITS } from "../subscription/featureFlags";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";

export default function Paywall() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, packages, purchase, restore, mock } = useSubscription();
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const pkg = packages[sel];

  const perks = [
    { Icon: Images, text: t("premiumPhotos", { n: PLAN_LIMITS.premium.photosPerWish }) },
    { Icon: Sparkles, text: t("premiumStickers") },
    { Icon: Smartphone, text: t("premiumIcons") },
  ];

  const buy = async () => {
    if (!pkg || busy) return;
    setBusy(true);
    try {
      if (await purchase(pkg)) {
        haptic("success");
        Alert.alert(t("premiumThanks"));
        router.back();
      }
    } catch {
      Alert.alert(t("premiumUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      Alert.alert((await restore()) ? t("premiumRestored") : t("premiumNothing"));
    } catch {
      Alert.alert(t("premiumUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-card" contentContainerStyle={{ padding: 16, paddingTop: 32, paddingBottom: insets.bottom + 32 }}>
      <View className="mb-6 flex-row justify-center">
        <Sticker emoji="stk:ring" size={56} rotate={-10} />
        <Sticker emoji="stk:gift" size={72} rotate={0} style={{ marginTop: -8 }} />
        <Sticker emoji="stk:kitty" size={56} rotate={10} />
      </View>
      <View className="flex-row items-center justify-center gap-2">
        <Crown size={22} color={C.gold} />
        <Txt className="font-m800 text-[26px]">{t("premium")}</Txt>
      </View>
      <Txt className="mt-2 text-center text-[14.5px] text-t2">{isPremium ? t("premiumActive") : t("premiumSub")}</Txt>

      <View className="mt-6 gap-3 rounded-card bg-card2 p-4">
        {perks.map(({ Icon, text }) => (
          <View key={text} className="flex-row items-center gap-3">
            <View className="h-sm w-sm items-center justify-center rounded-full bg-gold/15">
              <Icon size={19} color={C.gold} />
            </View>
            <Txt className="flex-1 font-m600 text-[14.5px]">{text}</Txt>
          </View>
        ))}
      </View>

      {!isPremium ? (
        <>
          <View className="mt-6 gap-3">
            {packages.map((p, i) => {
              const on = i === sel;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    haptic("select");
                    setSel(i);
                  }}
                  className="h-lg flex-row items-center justify-between rounded-full px-6"
                  style={{ backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1, borderColor: on ? C.blueLine : "transparent" }}
                >
                  <Txt className={`font-m600 text-[15px] ${on ? "text-blueText" : "text-t1"}`}>{p.priceString}</Txt>
                  <Txt className="text-[13px] text-t2">{p.kind === "annual" ? t("perYear") : p.kind === "monthly" ? t("perMonth") : p.title}</Txt>
                </Pressable>
              );
            })}
          </View>
          <View className="mt-6">
            <Pill full kind="gold" disabled={!pkg || busy} onPress={buy}>
              {pkg ? t("premiumBuy", { price: pkg.priceString }) : t("premiumUnavailable")}
            </Pill>
          </View>
          {mock && packages.length ? <Txt className="mt-3 text-center text-[12.5px] text-t3">{t("premiumMock")}</Txt> : null}
        </>
      ) : null}

      <Pressable onPress={onRestore} disabled={busy} className="mt-4 h-sm items-center justify-center">
        <Txt className="font-m600 text-sm text-t2">{t("premiumRestore")}</Txt>
      </Pressable>
    </ScrollView>
  );
}
