// First screen: sticker hero, then Sign in with Apple (shown first, as App
// Review expects next to other social logins), Telegram, e-mail, or a guest try.

import * as AppleAuthentication from "expo-apple-authentication";
import { Mail, Send } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { EmailSheet } from "../components/EmailSheet";
import { Sticker } from "../components/Sticker";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { api } from "../services/api";
import { C, H } from "../theme/tokens";

const HERO = [
  { e: "stk:headphones", size: 64, x: "8%", y: 0, r: -12 },
  { e: "stk:gift", size: 96, x: "34%", y: 24, r: 0 },
  { e: "stk:kitty", size: 64, x: "70%", y: 4, r: 12 },
  { e: "stk:ring", size: 48, x: "14%", y: 132, r: 8 },
  { e: "stk:sneakers", size: 56, x: "66%", y: 128, r: -8 },
] as const;

export default function SignIn() {
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
    <View className="flex-1 bg-bg px-4" style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }}>
      <View style={{ height: 220 }}>
        {HERO.map((s) => (
          <View key={s.e} className="absolute" style={{ left: s.x, top: s.y }}>
            <Sticker emoji={s.e} size={s.size} rotate={s.r} />
          </View>
        ))}
      </View>
      <Txt className="mt-6 text-center font-m800 text-[28px] leading-[34px]" style={{ letterSpacing: -0.5 }}>Wishpool</Txt>
      <Txt className="mt-2 text-center font-m600 text-base">{t("signInTitle")}</Txt>
      <Txt className="mx-auto mt-2 max-w-[300px] text-center text-[14.5px] leading-5 text-t2">{t("obGiftText")}</Txt>

      <View className="flex-1" />

      <View className="gap-3">
        {Platform.OS === "ios" && appleAvailable && canServer ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={H.lg / 2}
            style={{ height: H.lg, width: "100%" }}
            onPress={run(signInWithApple)}
          />
        ) : null}
        {canServer ? (
          <>
            <Pill full icon={<Send size={18} color="#fff" />} disabled={busy} onPress={run(signInWithTelegram)}>
              {t("signInTelegram")}
            </Pill>
            <Pill full kind="ghost" icon={<Mail size={18} color={C.t1} />} disabled={busy} onPress={() => setEmail(true)}>
              {t("signInEmail")}
            </Pill>
          </>
        ) : null}
        <Pressable onPress={run(continueAsGuest)} className="h-sm items-center justify-center">
          <Txt className="font-m600 text-sm text-t2">{t("signInGuest")}</Txt>
        </Pressable>
      </View>
      <EmailSheet visible={email} onClose={() => setEmail(false)} />
    </View>
  );
}
