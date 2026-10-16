// First launch: the onboarding, then this screen. The logo sits in the middle
// on a blue glow, with one line under it; the ways in are at the bottom:
// Sign in with Apple first (as App Review expects next to other social logins),
// Telegram, e-mail, or trying it without an account.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import { Image } from "expo-image";
import { Mail, Send } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { useAuth } from "../auth/AuthContext";
import { EmailSheet } from "../components/EmailSheet";
import { Onboarding } from "../components/onboarding/Onboarding";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { api } from "../services/api";
import { C, H } from "../theme/tokens";

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
  const insets = useSafeAreaInsets();
  const { appleAvailable, signInWithApple, signInWithTelegram, continueAsGuest } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(false);
  const canServer = api.configured();

  const run = (fn: () => Promise<unknown>) => async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch {
      Alert.alert(t("signInFailed"));
    } finally {
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
        {canServer ? (
          <>
            {Platform.OS === "ios" && appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={H.lg / 2}
                style={{ height: H.lg, width: "100%" }}
                onPress={run(signInWithApple)}
              />
            ) : null}
            <Pill full icon={<Send size={18} color="#fff" />} disabled={busy} onPress={run(signInWithTelegram)}>
              {t("signInTelegram")}
            </Pill>
            <Pill full kind="ghost" icon={<Mail size={18} color={C.t1} />} disabled={busy} onPress={() => setEmail(true)}>
              {t("signInEmail")}
            </Pill>
            <Pressable onPress={run(continueAsGuest)} className="h-sm items-center justify-center">
              <Txt className="font-m600 text-sm text-t2">{t("signInGuest")}</Txt>
            </Pressable>
          </>
        ) : (
          // No backend yet (the current builds): one button straight in, data on the phone.
          <Pill full disabled={busy} onPress={run(continueAsGuest)}>
            {t("signInStart")}
          </Pill>
        )}
      </View>
      <EmailSheet visible={email} onClose={() => setEmail(false)} />
    </View>
  );
}
