// Wishpool Premium, laid out like VEED's paywall: a colour glow on black, the
// brand in the middle, plan cards at the bottom (the best one outlined, with a
// "save N%" badge), one big button, and Terms | Privacy | Restore underneath.

import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { Check, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { DAY_FORMS, plural } from "../lib/dates";
import { haptic } from "../lib/haptics";
import { PREMIUM_ENABLED } from "../subscription/featureFlags";
import type { PremiumPackage } from "../subscription/purchases";
import { useSubscription } from "../subscription/SubscriptionContext";
import { EdgeGlow } from "../components/EdgeGlow";
import { C } from "../theme/tokens";
import { useWishpool } from "../store/WishpoolContext";
import { useAccent } from "../theme/accent";

// Our terms (they point to Apple's standard EULA too).
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "https://wishpool.clickbrickk.com/terms";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "https://wishpool.clickbrickk.com/privacy";

const ORDER: Record<string, number> = { annual: 0, monthly: 1 };

export default function PaywallRoute() {
  useAccent(); // re-render in place when the app colour changes
  // Hidden while Premium is off, even if something links here.
  // admins can see it before the launch (from the locked folders in the room form)
  const { admin } = useWishpool();
  return PREMIUM_ENABLED || admin || process.env.EXPO_PUBLIC_SHOW_SKINS === "1" ? <Paywall /> : <Redirect href="/" />;
}

function Paywall() {
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, packages, purchase, restore, mock, loading } = useSubscription();
  const plans = [...packages].sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
  const [selId, setSelId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!selId && plans[0]) setSelId(plans[0].id);
  }, [plans, selId]);
  const sel = plans.find((p) => p.id === selId) || plans[0];

  const annual = plans.find((p) => p.kind === "annual");
  const monthly = plans.find((p) => p.kind === "monthly");
  const save = annual && monthly && monthly.price > 0 ? Math.round((1 - annual.price / (monthly.price * 12)) * 100) : 0;

  const days = (n: number) => (lang === "en" ? `${n}-day` : `${n} ${plural(lang, n, DAY_FORMS[lang])}`);
  const perMonth = (p: PremiumPackage) => (p.kind === "monthly" ? p.priceString : p.pricePerMonthString);
  const planName = (p: PremiumPackage) => (p.kind === "annual" ? t("planYearly") : p.kind === "monthly" ? t("planMonthly") : p.title);

  const buy = async () => {
    if (!sel || busy) return;
    setBusy(true);
    try {
      if (await purchase(sel)) {
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
    if (busy) return;
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
    <View className="flex-1 bg-bg">
      {/* the Profile card's glow, coming down from the top edge */}
      <EdgeGlow side="top" />

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} className="h-sm w-sm items-center justify-center rounded-full bg-white/15" accessibilityLabel={t("back")}>
          <X size={20} color="#fff" />
        </Pressable>

        {/* our glass star on top, the title and line under it, centred */}
        <View className="flex-1 items-center justify-center py-8">
          <Image source={require("../../assets/premium-star.png")} style={{ width: 96, height: 92, marginBottom: 16 }} contentFit="contain" />
          <Txt className="text-center font-m800 text-[40px] leading-[44px]" style={{ letterSpacing: -1.2 }}>Wishpool</Txt>
          <Txt className="text-center font-m800 text-[40px] leading-[44px]" style={{ letterSpacing: -1.2, color: "#8FC4FF" }}>Premium</Txt>
          <Txt className="mt-3 max-w-[300px] text-center text-[16px] leading-[22px] text-t2">{isPremium ? t("premiumActive") : t("premiumSub")}</Txt>
        </View>

        {isPremium ? (
          <View className="mb-4 h-lg flex-row items-center justify-center gap-2 rounded-full bg-greenSoft">
            <Check size={18} color={C.greenText} />
            <Txt className="font-m600 text-base text-greenText">{t("premiumActive")}</Txt>
          </View>
        ) : loading ? (
          <ActivityIndicator color={C.t2} className="mb-8" />
        ) : (
          <>
            <View className="gap-3">
              {plans.map((p) => {
                const on = p.id === sel?.id;
                const pm = perMonth(p);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      if (!on) haptic("select");
                      setSelId(p.id);
                    }}
                    className="flex-row items-center justify-between rounded-[24px] px-6 py-6"
                    style={{ backgroundColor: on ? "rgba(10,130,249,0.12)" : "rgba(255,255,255,0.07)", borderWidth: 2, borderColor: on ? C.blue : "transparent" }}
                  >
                    <Txt className="font-m700 text-[17px]">
                      {planName(p)}
                      <Txt className="font-m600 text-[17px]">{"  " + p.priceString}</Txt>
                    </Txt>
                    {pm ? <Txt className="text-[15px] text-t2">{t("perMonthShort", { price: pm })}</Txt> : null}
                    {p.kind === "annual" && save > 0 ? (
                      <View className="absolute -top-3 right-6 rounded-full bg-blue px-3 py-1">
                        <Txt className="font-m700 text-[12px] text-white" style={{ letterSpacing: 0.6 }}>{t("saveBadge", { n: save })}</Txt>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6">
              <Pill full disabled={!sel || busy} onPress={buy}>
                {!sel ? t("premiumUnavailable") : sel.trialDays ? t("trialCta", { days: days(sel.trialDays) }) : t("premiumBuy", { price: sel.priceString })}
              </Pill>
            </View>
            {/* one line under the button for every plan, in a box of fixed height, so nothing jumps */}
            <View style={{ minHeight: 40, marginTop: 12 }}>
              {sel ? (
                <Txt className="text-center text-[12.5px] leading-[18px] text-t3">
                  {sel.trialDays
                    ? t(sel.kind === "monthly" ? "trialThenMonth" : "trialThenYear", { price: sel.priceString })
                    : t(sel.kind === "monthly" ? "planNoteMonth" : "planNoteYear", { price: sel.priceString })}
                </Txt>
              ) : null}
              {mock && plans.length ? <Txt className="mt-1 text-center text-[12.5px] leading-[18px] text-t3">{t("premiumMock")}</Txt> : null}
            </View>
          </>
        )}

        <View className="mt-6 flex-row items-center justify-center gap-3">
          <FooterLink label={t("legalTerms")} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
          {PRIVACY_URL ? (
            <>
              <Txt className="text-t3">|</Txt>
              <FooterLink label={t("legalPrivacy")} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
            </>
          ) : null}
          <Txt className="text-t3">|</Txt>
          <FooterLink label={t("restoreShort")} onPress={onRestore} />
        </View>
      </ScrollView>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-sm justify-center">
      <Txt className="text-sm text-t2">{label}</Txt>
    </Pressable>
  );
}
