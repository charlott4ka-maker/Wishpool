// Settings, laid out like iOS Settings: notifications, general, about, account.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { Bell, Cake, ChevronLeft, FileText, Gift, Globe, LogIn, LogOut, Send, Shield, Sparkles, Trash2, UserPlus, Vibrate } from "lucide-react-native";
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { DatePill } from "../components/DateRow";
import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { Txt } from "../components/ui";
import { LANG_SHORT, LANGS, useT, type Lang } from "../i18n";
import { api } from "../services/api";
import { setPref, usePrefs } from "../settings/prefs";
import { useWishpool } from "../store/WishpoolContext";
import { C } from "../theme/tokens";

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";
const LANG_NAME: Record<Lang, string> = { uk: "Українська", ru: "Русский", en: "English" };

export default function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const { status, signOut } = useAuth();
  const { refresh } = useWishpool();
  const version = Constants.expoConfig?.version || "1.0.0";

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
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        <Pressable onPress={() => router.back()} className="h-sm w-sm items-center justify-center rounded-full bg-card2" accessibilityLabel={t("back")}>
          <ChevronLeft size={22} color={C.t1} />
        </Pressable>
        <Txt className="mb-6 mt-4 px-1 font-m800 text-[34px]" style={{ letterSpacing: -0.5 }}>{t("settings")}</Txt>

        <SettingsGroup title={t("setNotifications")} footer={t("setNotifFooter")}>
          <SettingsCell icon={Bell} tint="#FF3B30" label={t("setAllowNotif")} toggle={{ value: prefs.notifications, onChange: toggleNotifications }} />
          <SettingsCell icon={Cake} tint="#FF9500" label={t("setBirthdays")} toggle={{ value: prefs.notifyBirthdays && !sub, disabled: sub, onChange: (v) => setPref("notifyBirthdays", v) }} />
          <SettingsCell icon={Gift} tint="#2E7DF6" label={t("setNewWishes")} toggle={{ value: prefs.notifyNewWishes && !sub, disabled: sub, onChange: (v) => setPref("notifyNewWishes", v) }} />
          <SettingsCell icon={UserPlus} tint="#34C759" label={t("setRoomJoins")} toggle={{ value: prefs.notifyRoomJoins && !sub, disabled: sub, onChange: (v) => setPref("notifyRoomJoins", v) }} />
          <SettingsCell icon={Sparkles} tint="#AF52DE" label={t("setGiftReminders")} toggle={{ value: prefs.notifyGiftReminders && !sub, disabled: sub, onChange: (v) => setPref("notifyGiftReminders", v) }} />
        </SettingsGroup>

        <SettingsGroup title={t("setGeneral")}>
          <SettingsCell icon={Globe} tint="#5856D6" label={t("language")} value={LANG_SHORT[lang]} onPress={pickLanguage} />
          <SettingsCell icon={Cake} tint="#FF9500" label={t("myBday")} right={<DatePill value={prefs.birthday} onChange={(d) => setPref("birthday", d)} maximumDate={new Date()} />} />
          <SettingsCell icon={Vibrate} tint="#FF2D55" label={t("setHaptics")} toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }} />
        </SettingsGroup>

        <SettingsGroup title={t("setAbout")}>
          <SettingsCell icon={Send} tint="#2AABEE" label={t("channel")} onPress={() => WebBrowser.openBrowserAsync("https://t.me/charlot4k_ui")} />
          <SettingsCell icon={FileText} tint="#8E8E93" label={t("legalTerms")} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
          {PRIVACY_URL ? <SettingsCell icon={Shield} tint="#8E8E93" label={t("legalPrivacy")} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} /> : null}
        </SettingsGroup>

        <SettingsGroup title={t("setAccount")}>
          {status === "signedIn" ? (
            <>
              <SettingsCell icon={LogOut} tint="#8E8E93" label={t("signOut")} onPress={signOut} chevron={false} />
              <SettingsCell icon={Trash2} tint="#FF3B30" label={t("setDeleteAccount")} onPress={deleteAccount} destructive />
            </>
          ) : (
            <>
              <SettingsCell icon={LogIn} tint="#2E7DF6" label={t("signInLogin")} onPress={signOut} />
              <SettingsCell icon={Trash2} tint="#FF3B30" label={t("setClearData")} onPress={clearLocal} destructive />
            </>
          )}
        </SettingsGroup>

        <Txt className="text-center text-[12.5px] text-t3">Wishpool · {t("setVersion", { v: version })}</Txt>
      </ScrollView>
    </View>
  );
}
