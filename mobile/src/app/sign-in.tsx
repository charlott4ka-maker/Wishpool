// First launch: the onboarding, then this screen. The logo sits in the middle
// with one line under it; at the bottom "Sign in" (opens the
// sign-in-options sheet) and "Continue without an account".

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { Onboarding } from "../components/onboarding/Onboarding";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";

const ONBOARDED_KEY = "wp_onboarded";
const LOGO = 112;

export default function SignIn() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((v) => setOnboarded(v === "1"))
      .catch(() => setOnboarded(false));
  }, []);
  if (onboarded === null) return <View className="flex-1 bg-bg" />;
  if (!onboarded) {
    return (
      <Onboarding
        onDone={() => {
          AsyncStorage.setItem(ONBOARDED_KEY, "1").catch(() => {});
          setOnboarded(true);
        }}
      />
    );
  }
  return <Welcome />;
}

// The star logo, cut out (no background, no glow).
function Logo() {
  return <Image source={require("../../assets/logo.png")} style={{ width: LOGO * 1.4, height: LOGO * 1.4 }} contentFit="contain" />;
}

function Welcome() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();
  const [busy, setBusy] = useState(false);

  const guest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await continueAsGuest();
    } catch {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-bg px-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-1 items-center justify-center">
        <Logo />
        <Txt className="mt-4 font-m800 text-[34px] leading-[40px]" style={{ letterSpacing: -1 }}>Wishpool</Txt>
        <Txt className="mt-2 max-w-[280px] text-center text-base leading-[22px] text-t2">{t("signInTitle")}</Txt>
      </View>
      <View className="gap-3">
        <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
        <Pill full kind="ghost" disabled={busy} onPress={guest}>{t("signInGuestBtn")}</Pill>
      </View>
    </View>
  );
}
