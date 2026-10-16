// First launch: the onboarding, then this screen. The logo sits in the middle
// on a blue glow, with one line under it; at the bottom "Sign in" (opens the
// sign-in-options sheet) and "Continue without an account".

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { useAuth } from "../auth/AuthContext";
import { Onboarding } from "../components/onboarding/Onboarding";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { C } from "../theme/tokens";

const ONBOARDED_KEY = "wp_onboarded";
const LOGO = 112;
const GLOW = 360;

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

function Logo() {
  return (
    <View style={{ width: GLOW, height: GLOW, alignItems: "center", justifyContent: "center" }}>
      <Svg width={GLOW} height={GLOW} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.blue} stopOpacity={0.55} />
            <Stop offset="0.45" stopColor={C.blue} stopOpacity={0.18} />
            <Stop offset="1" stopColor={C.blue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={GLOW} height={GLOW} fill="url(#glow)" />
      </Svg>
      <View style={{ width: LOGO, height: LOGO, borderRadius: LOGO * 0.23, overflow: "hidden", shadowColor: C.blue, shadowOpacity: 0.7, shadowRadius: 32, shadowOffset: { width: 0, height: 8 } }}>
        <Image source={require("../../assets/icon.png")} style={{ width: LOGO, height: LOGO }} />
      </View>
    </View>
  );
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
        <Txt className="-mt-16 font-m800 text-[34px] leading-[40px]" style={{ letterSpacing: -1 }}>Wishpool</Txt>
        <Txt className="mt-2 max-w-[280px] text-center text-base leading-[22px] text-t2">{t("signInTitle")}</Txt>
      </View>
      <View className="gap-3">
        <Pill full onPress={() => router.push("/sign-in-options")}>{t("signInLogin")}</Pill>
        <Pill full kind="ghost" disabled={busy} onPress={guest}>{t("signInGuestBtn")}</Pill>
      </View>
    </View>
  );
}
