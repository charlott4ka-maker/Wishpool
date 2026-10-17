// Wishpool Premium, laid out like VEED's paywall: a colour glow on black, the
// brand in the middle, plan cards at the bottom (the best one outlined, with a
// "save N%" badge), one big button, and Terms | Privacy | Restore underneath.

import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, Images, Smartphone, Sparkles, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sticker } from "../components/Sticker";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { DAY_FORMS, plural } from "../lib/dates";
import { haptic } from "../lib/haptics";
import { PLAN_LIMITS, PREMIUM_ENABLED } from "../subscription/featureFlags";
import type { PremiumPackage } from "../subscription/purchases";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C, hex } from "../theme/tokens";

// Apple's standard EULA unless we publish our own terms.
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "https://wishpool.clickbrickk.com/privacy";

const ORDER: Record<string, number> = { annual: 0, monthly: 1 };

export default function PaywallRoute() {
  // Hidden while Premium is off, even if something links here.
  return PREMIUM_ENABLED ? <Paywall /> : <Redirect href="/" />;
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

  const perks = [
    { Icon: Images, text: t("premiumPhotos", { n: PLAN_LIMITS.premium.photosPerWish }) },
    { Icon: Sparkles, text: t("premiumStickers") },
    { Icon: Smartphone, text: t("premiumIcons") },
  ];

  return (
    <View className="flex-1 bg-bg">
      {/* the glow: brand blue from the top left, a pink haze on the right, fading into black */}
      <LinearGradient colors={[hex(C.blue, 0.75), hex(C.blue, 0.18), "transparent"]} locations={[0, 0.35, 0.65]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "75%" }} />
      <LinearGradient colors={["transparent", hex("#FF4D8D", 0.35), "transparent"]} locations={[0, 0.45, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 0.6 }} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "70%" }} />
      <LinearGradient colors={["transparent", C.bg]} locations={[0.35, 0.75]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} className="h-sm w-sm items-center justify-center rounded-full bg-white/15" accessibilityLabel={t("back")}>
          <X size={20} color="#fff" />
        </Pressable>

        <View className="flex-1 items-center justify-center py-8">
          <View className="mb-6 flex-row items-end">
            <Sticker emoji="stk:ring" size={52} rotate={-12} />
            <Sticker emoji="stk:gift" size={76} style={{ marginHorizontal: -4 }} />
            <Sticker emoji="stk:gift" size={52} rotate={12} />
          </View>
          <View className="flex-row items-start">
            <Txt className="font-m800 text-[44px] leading-[48px]" style={{ letterSpacing: -1.5 }}>Wishpool</Txt>
            <View className="ml-1 mt-1 rounded-md bg-blue px-1.5 py-0.5">
              <Txt className="font-m800 text-[11px] text-white" style={{ letterSpacing: 0.5 }}>PREMIUM</Txt>
            </View>
          </View>
          <Txt className="mt-3 max-w-[300px] text-center text-[17px] leading-[23px]">{isPremium ? t("premiumActive") : t("premiumSub")}</Txt>
          <View className="mt-6 gap-3">
            {perks.map(({ Icon, text }) => (
              <View key={text} className="flex-row items-center gap-3">
                <Icon size={18} color={C.blueText} />
                <Txt className="font-m600 text-[14.5px] text-t2">{text}</Txt>
              </View>
            ))}
          </View>
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
            {sel?.trialDays ? (
              <Txt className="mt-3 text-center text-[12.5px] text-t3">{t(sel.kind === "monthly" ? "trialThenMonth" : "trialThenYear", { price: sel.priceString })}</Txt>
            ) : null}
            {mock && plans.length ? <Txt className="mt-2 text-center text-[12.5px] text-t3">{t("premiumMock")}</Txt> : null}
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
