// Settings, laid out like iOS Settings: notifications, general, about, account.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { Bell, Cake, Crown, Snowflake, ChevronLeft, CircleHelp, FileText, Gift, Globe, LifeBuoy, LogIn, LogOut, Send, Shield, Sparkles, Star, Trash2, UserPlus, Users, Vibrate, Wand2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthContext";
import { toast } from "../components/Toast";
import { actionSheet } from "../lib/actionSheet";
import { haptic } from "../lib/haptics";
import { clearDemo, fillDemo } from "../lib/demo";
import { openReviewPage } from "../lib/review";
import { SUPPORT_EMAIL, writeSupport } from "../lib/support";
import { SettingsCell, SettingsGroup } from "../components/SettingsList";
import { GlassCircle, Txt } from "../components/ui";
import { LANG_SHORT, LANGS, useT, type Lang } from "../i18n";
import { api, SITE_URL } from "../services/api";
import { setPref, usePrefs } from "../settings/prefs";
import { useWishpool } from "../store/WishpoolContext";
import { useRemoteConfig } from "../lib/remoteConfig";

// the New Year season: mid-November to 7 January
const nySeason = (d = new Date()) => (d.getMonth() === 10 && d.getDate() >= 10) || d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 7);
import { purchases } from "../subscription/purchases";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C, hex } from "../theme/tokens";
import { IN_TG } from "../lib/telegram";
import { useAccent } from "../theme/accent";

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "https://wishpool.clickbrickk.com/terms";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || `${SITE_URL}/privacy`;
const LANG_NAME: Record<Lang, string> = { uk: "Українська", ru: "Русский", en: "English" };

export default function SettingsScreen() {
  useAccent(); // re-render in place when the app colour changes
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const { status, signOut } = useAuth();
  const { refresh } = useWishpool();
  const { season: { newYear } } = useRemoteConfig();
  const { isPremium } = useSubscription();
  const version = Constants.expoConfig?.version || "1.0.0";
  const [scrolled, setScrolled] = useState(false);
  // the demo row (sample content for App Store screenshots): always in dev
  // builds; in TestFlight/App Store builds it's unlocked by tapping the version
  // line 7 times, and stays while a guest demo is loaded. Signed in, it refills
  // the App Review account on the server (the server refuses anyone else).
  const [versionTaps, setVersionTaps] = useState(0);
  const showDemo = __DEV__ || prefs.demo || versionTaps >= 7;
  const signedIn = status === "signedIn";
  // how friends add you to rooms (signed in): read from the server, changed in an action sheet
  const [roomAdd, setRoomAdd] = useState<"invite" | "instant" | null>(null);
  useEffect(() => {
    if (status === "signedIn") api.friends().then((d) => setRoomAdd(d.roomAdd)).catch(() => {});
  }, [status]);
  const pickRoomAdd = () => {
    haptic("select");
    const set = (v: "invite" | "instant") => {
      const was = roomAdd;
      setRoomAdd(v);
      api.setRoomAdd(v).catch(() => {
        setRoomAdd(was);
        toast.error(t("toastError"));
      });
    };
    actionSheet(t("roomAddSetting"), t("setCancel"), [
      [t("roomAddInvite"), () => set("invite")],
      [t("roomAddInstant"), () => set("instant")],
    ]);
  };

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

  // with the demo loaded, a new language refills it, so names and prices follow
  const changeLang = (l: Lang) => {
    setLang(l);
    if (signedIn && prefs.reviewDemo) {
      api.reviewDemo(l).then(() => refresh()).catch(() => setPref("reviewDemo", false));
    } else if (!signedIn && prefs.demo) {
      fillDemo(l).then(() => refresh()).catch(() => {});
    }
  };

  const pickLanguage = () => {
    const names = LANGS.map((l) => LANG_NAME[l]);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...names, t("setCancel")], cancelButtonIndex: names.length, userInterfaceStyle: "dark" }, (i) => {
        if (i < LANGS.length) changeLang(LANGS[i]);
      });
    } else {
      Alert.alert(t("language"), "", [...LANGS.map((l) => ({ text: LANG_NAME[l], onPress: () => changeLang(l) })), { text: t("setCancel"), style: "cancel" as const }]);
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

        {/* in Telegram the bot sends the reminders; these switches are the phone's own */}
        {IN_TG ? null : (
        <SettingsGroup title={t("setNotifications")} footer={t("setNotifFooter")}>
          <SettingsCell icon={Bell} tint="#FF3B30" label={t("setAllowNotif")} toggle={{ value: prefs.notifications, onChange: toggleNotifications }} />
          <SettingsCell icon={Cake} tint="#FF9500" label={t("setBirthdays")} toggle={{ value: prefs.notifyBirthdays && !sub, disabled: sub, onChange: (v) => setPref("notifyBirthdays", v) }} />
          <SettingsCell icon={Gift} tint="#0A82F9" label={t("setNewWishes")} toggle={{ value: prefs.notifyNewWishes && !sub, disabled: sub, onChange: (v) => setPref("notifyNewWishes", v) }} />
          <SettingsCell icon={UserPlus} tint="#34C759" label={t("setRoomJoins")} toggle={{ value: prefs.notifyRoomJoins && !sub, disabled: sub, onChange: (v) => setPref("notifyRoomJoins", v) }} />
          <SettingsCell icon={Sparkles} tint="#AF52DE" label={t("setGiftReminders")} toggle={{ value: prefs.notifyGiftReminders && !sub, disabled: sub, onChange: (v) => setPref("notifyGiftReminders", v) }} />
        </SettingsGroup>
        )}

        {status === "signedIn" ? (
          <SettingsGroup title={t("privacy")} footer={t("roomAddHint")}>
            <SettingsCell icon={Users} tint="#34C759" label={t("roomAddShort")} value={roomAdd ? t(roomAdd === "instant" ? "roomAddInstant" : "roomAddAsk") : ""} onPress={pickRoomAdd} />
          </SettingsGroup>
        ) : null}

        {/* TEST BUILDS ONLY (mock purchases): take Premium away to try it again. Remove for the release. */}
        {purchases.mock && isPremium ? (
          <SettingsGroup title="Test">
            <SettingsCell icon={Crown} tint="#FF3B30" label="Убрать Premium (тест)" onPress={() => purchases.resetMock?.()} />
          </SettingsGroup>
        ) : null}

        {/* seasonal: only while the New Year season is on (the admin page can switch it off) */}
        {newYear && nySeason() ? (
          <SettingsGroup title={t("setSeasonal")} footer={t("setSeasonalHint")}>
            <SettingsCell icon={Snowflake} tint="#5AC8FA" label={t("setSnow")} toggle={{ value: prefs.snow, onChange: (v) => setPref("snow", v) }} />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title={t("setGeneral")}>
          <SettingsCell icon={Globe} tint="#5856D6" label={t("language")} value={LANG_SHORT[lang]} onPress={pickLanguage} />
          <SettingsCell icon={Vibrate} tint="#FF2D55" label={t("setHaptics")} toggle={{ value: prefs.haptics, onChange: (v) => setPref("haptics", v) }} />
        </SettingsGroup>

        <SettingsGroup title={t("setAbout")}>
          <SettingsCell icon={CircleHelp} tint="#FF9500" label={t("faq")} onPress={() => router.push("/faq")} />
          {Platform.OS === "ios" ? <SettingsCell icon={Star} tint="#FFCC00" label={t("rateApp")} onPress={openReviewPage} /> : null}
          {/* sample content for App Store screenshots (see showDemo) */}
          {showDemo ? (
            <SettingsCell
              icon={Wand2}
              tint="#AF52DE"
              label={signedIn ? "Demo: fill this account" : prefs.demo ? "Demo: clear" : "Demo: fill"}
              onPress={async () => {
                if (signedIn) {
                  try {
                    await api.reviewDemo(lang);
                    setPref("reviewDemo", true);
                    await refresh().catch(() => {});
                    toast.success("Demo loaded");
                  } catch {
                    toast.error(t("toastError"));
                  }
                  return;
                }
                if (prefs.demo) {
                  await clearDemo();
                  setVersionTaps(0);
                } else await fillDemo(lang);
                await refresh().catch(() => {});
                toast.success(prefs.demo ? "Demo cleared" : "Demo loaded");
              }}
            />
          ) : null}
          <SettingsCell icon={Send} tint="#2AABEE" label={t("channel")} onPress={() => WebBrowser.openBrowserAsync("https://t.me/charlot4k_ui")} />
          <SettingsCell icon={FileText} tint="#8E8E93" label={t("legalTerms")} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
          <SettingsCell icon={Shield} tint="#8E8E93" label={t("legalPrivacy")} onPress={() => WebBrowser.openBrowserAsync(`${PRIVACY_URL}?lang=${lang}`)} />
          <SettingsCell icon={LifeBuoy} tint="#34C759" label={t("support")} onPress={() => writeSupport(t("supportCopied", { email: SUPPORT_EMAIL }))} />
        </SettingsGroup>

        <SettingsGroup title={t("setAccount")}>
          {status === "signedIn" ? (
            <>
              {/* Telegram signs you in: nothing to sign out of */}
              {IN_TG ? null : <SettingsCell icon={LogOut} tint="#8E8E93" label={t("signOut")} onPress={signOut} chevron={false} />}
              <SettingsCell icon={Trash2} tint="#FF3B30" label={t("setDeleteAccount")} onPress={deleteAccount} destructive />
            </>
          ) : (
            <>
              <SettingsCell icon={LogIn} tint="#0A82F9" label={t("signInLogin")} onPress={() => router.push("/sign-in-options")} />
              <SettingsCell icon={Trash2} tint="#FF3B30" label={t("setClearData")} onPress={clearLocal} destructive />
            </>
          )}
        </SettingsGroup>

        <Pressable onPress={() => setVersionTaps((n) => n + 1)} hitSlop={8}>
          <Txt className="text-center text-[12.5px] text-t3">Wishpool · {t("setVersion", { v: version })}</Txt>
        </Pressable>
      </ScrollView>
      {/* the fade under the header only once something has scrolled under it */}
      {scrolled ? <LinearGradient pointerEvents="none" colors={[C.card, hex(C.card, 0)]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 32 }} /> : null}
      </View>
    </View>
  );
}
