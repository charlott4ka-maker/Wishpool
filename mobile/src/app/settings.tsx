// Settings, laid out like iOS Settings: notifications, general, about, account.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { Bell, Cake, ChevronLeft, FileText, Gift, Globe, LifeBuoy, LogIn, LogOut, Send, Shield, Sparkles, Trash2, UserPlus, Vibrate, Wand2 } from "lucide-react-native";
import { useState } from "react";
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { toast } from "../components/Toast";
import { clearDemo, fillDemo } from "../lib/demo";
import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { GlassCircle, Txt } from "../components/ui";
import { LANG_SHORT, LANGS, useT, type Lang } from "../i18n";
import { api, SITE_URL } from "../services/api";
import { setPref, usePrefs } from "../settings/prefs";
import { useWishpool } from "../store/WishpoolContext";
import { C, hex } from "../theme/tokens";

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || `${SITE_URL}/privacy`;
const LANG_NAME: Record<Lang, string> = { uk: "Українська", ru: "Русский", en: "English" };

export default function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const { status, signOut } = useAuth();
  const { refresh } = useWishpool();
  const version = Constants.expoConfig?.version || "1.0.0";
  const [scrolled, setScrolled] = useState(false);

  const toggleNotifications = async (on: boolean) => {
    if (!on) return setPref("notifications", false);
    const cur = await Notifications.getPermissionsAsync();
    const res = cur.granted ? cur : await Notifications.requestPermissionsAsync();
    if (res.granted) return setPref("notifications", true);
    Alert.alert(t("setNotifDenied"), "", [
      { text: t("setCancel"), style: "cancel" },
      { text: t("setOpenSettings"), onPress: () => Linking.openSettings() },
    ]);
  };

  const pickLanguage = () => {
    const names = LANGS.map((l) => LANG_NAME[l]);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...names, t("setCancel")], cancelButtonIndex: names.length, userInterfaceStyle: "dark" }, (i) => {
        if (i < LANGS.length) setLang(LANGS[i]);
      });
    } else {
      Alert.alert(t("language"), "", [...LANGS.map((l) => ({ text: LANG_NAME[l], onPress: () => setLang(l) })), { text: t("setCancel"), style: "cancel" as const }]);
    }
  };

  const confirm = (text: string, onYes: () => void) =>
    Alert.alert(text, "", [
      { text: t("setCancel"), style: "cancel" },
      { text: t("setDelete"), style: "destructive", onPress: onYes },
    ]);

  const deleteAccount = () =>
    confirm(t("setDeleteAccountConfirm"), async () => {
      try {
        await api.deleteAccount();
        await signOut();
      } catch {
        Alert.alert(t("setDeleteFailed"));
      }
    });

  const clearLocal = () =>
    confirm(t("setClearDataConfirm"), async () => {
      await AsyncStorage.removeItem("wp_local_state").catch(() => {});
      await refresh().catch(() => {});
    });

  const sub = !prefs.notifications;

  return (
    <View className="flex-1 bg-card">
      {/* the header stays put; the list scrolls under a fade below it */}
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          {/* the system SF Symbol back chevron; lucide on web previews */}
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        {/* title centred on the screen, the back button stays on the left */}
        <View pointerEvents="none" className="absolute bottom-2 left-0 right-0 h-sm items-center justify-center">
          <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t("settings")}</Txt>
        </View>
      </View>
      <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        scrollEventThrottle={16}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)}
      >

        <SettingsGroup title={t("setNotifications")} footer={t("setNotifFooter")}>
          <SettingsCell icon={Bell} tint="#FF3B30" label={t("setAllowNotif")} toggle={{ value: prefs.notifications, onChange: toggleNotifications }} />
          <SettingsCell icon={Cake} tint="#FF9500" label={t("setBirthdays")} toggle={{ value: prefs.notifyBirthdays && !sub, disabled: sub, onChange: (v) => setPref("notifyBirthdays", v) }} />
          <SettingsCell icon={Gift} tint="#0A82F9" label={t("setNewWishes")} toggle={{ value: prefs.notifyNewWishes && !sub, disabled: sub, onChange: (v) => setPref("notifyNewWishes", v) }} />
          <SettingsCell icon={UserPlus} tint="#34C759" label={t("setRoomJoins")} toggle={{ value: prefs.notifyRoomJoins && !sub, disabled: sub, onChange: (v) => setPref("notifyRoomJoins", v) }} />
          <SettingsCell icon={Sparkles} tint="#AF52DE" label={t("setGiftReminders")} toggle={{ value: prefs.notifyGiftReminders && !sub, disabled: sub, onChange: (v) => setPref("notifyGiftReminders", v) }} />
        </SettingsGroup>

        <SettingsGroup title={t("setGeneral")}>
          <SettingsCell icon={Globe} tint="#5856D6" label={t("language")} value={LANG_SHORT[lang]} onPress={pickLanguage} />
          <SettingsCell icon={Vibrate} tint="#FF2D55" label={t("setHaptics")} toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }} />
        </SettingsGroup>

        <SettingsGroup title={t("setAbout")}>
          <SettingsCell icon={Sparkles} tint="#0A82F9" label={t("howItWorks")} onPress={() => router.push("/onboarding")} />
          {/* dev builds only: sample content for App Store screenshots */}
          {__DEV__ ? (
            <SettingsCell
              icon={Wand2}
              tint="#AF52DE"
              label={prefs.demo ? "Demo: clear" : "Demo: fill"}
              onPress={async () => {
                if (prefs.demo) await clearDemo();
                else await fillDemo(lang);
                await refresh().catch(() => {});
                toast.success(prefs.demo ? "Demo cleared" : "Demo loaded");
              }}
            />
          ) : null}
          <SettingsCell icon={Send} tint="#2AABEE" label={t("channel")} onPress={() => WebBrowser.openBrowserAsync("https://t.me/charlot4k_ui")} />
          <SettingsCell icon={FileText} tint="#8E8E93" label={t("legalTerms")} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
          <SettingsCell icon={Shield} tint="#8E8E93" label={t("legalPrivacy")} onPress={() => WebBrowser.openBrowserAsync(`${PRIVACY_URL}?lang=${lang}`)} />
          <SettingsCell icon={LifeBuoy} tint="#34C759" label={t("support")} onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/support?lang=${lang}`)} />
        </SettingsGroup>

        <SettingsGroup title={t("setAccount")}>
          {status === "signedIn" ? (
            <>
              <SettingsCell icon={LogOut} tint="#8E8E93" label={t("signOut")} onPress={signOut} chevron={false} />
              <SettingsCell icon={Trash2} tint="#FF3B30" label={t("setDeleteAccount")} onPress={deleteAccount} destructive />
            </>
          ) : (
            <>
              <SettingsCell icon={LogIn} tint="#0A82F9" label={t("signInLogin")} onPress={() => router.push("/sign-in-options")} />
              <SettingsCell icon={Trash2} tint="#FF3B30" label={t("setClearData")} onPress={clearLocal} destructive />
            </>
          )}
        </SettingsGroup>

        <Txt className="text-center text-[12.5px] text-t3">Wishpool · {t("setVersion", { v: version })}</Txt>
      </ScrollView>
      {/* the fade under the header only once something has scrolled under it */}
      {scrolled ? <LinearGradient pointerEvents="none" colors={[C.card, hex(C.card, 0)]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 32 }} /> : null}
      </View>
    </View>
  );
}
