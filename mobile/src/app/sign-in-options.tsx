// "Sign in" sheet from the welcome screen: Sign in with Apple, or e-mail.
// Signing in for the first time creates the account, so there is no separate "register".

import * as AppleAuthentication from "expo-apple-authentication";
import { Mail } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { EmailSheet } from "../components/EmailSheet";
import { SheetHeader } from "../components/SheetHeader";
import { Press } from "../components/Press";
import { Txt } from "../components/ui";
import { useT } from "../i18n";
import { api, SITE_URL } from "../services/api";
import { C, H } from "../theme/tokens";

export default function SignInOptions() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, appleAvailable, signInWithApple } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(false);
  // Signed in: this sheet has done its job. Over the app (a guest signing in)
  // it just closes; from the welcome screen that screen is gone by now and the
  // sheet would be left alone on top, so the app's home takes its place.
  useEffect(() => {
    if (status !== "signedIn") return;
    setEmail(false);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [status, router]);
  const ready = api.configured();

  const run = (fn: () => Promise<unknown>) => async () => {
    // No backend in this build yet: say so instead of failing.
    if (!ready) return Alert.alert(t("signInSoon"));
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
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("signInHow")} />
      <Txt className="-mt-2 mb-6 text-[14.5px] leading-5 text-t2">{t("signInHowSub")}</Txt>
      <View className="gap-3">
        {Platform.OS === "ios" && appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={H.lg / 2}
            style={{ height: H.lg, width: "100%" }}
            onPress={run(signInWithApple)}
          />
        ) : null}
        {/* the same size, shape and type as Apple's button above it */}
        <Press onPress={run(async () => setEmail(true))} className="w-full flex-row items-center justify-center gap-2 bg-blue" style={{ height: H.lg, borderRadius: H.lg / 2 }}>
          <Mail size={20} color="#fff" />
          <Txt className="font-m600 text-white" style={{ fontSize: 19 }}>{t("signInEmail")}</Txt>
        </Press>
      </View>
      <Pressable onPress={() => WebBrowser.openBrowserAsync(SITE_URL + "/terms").catch(() => {})} hitSlop={8} className="mt-4 self-center">
        <Txt className="text-center text-[12.5px] text-t3">{t("signInAgree")}</Txt>
      </Pressable>
      <EmailSheet visible={email} onClose={() => setEmail(false)} />
    </View>
  );
}
