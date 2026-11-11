// Profile › Friends for a guest: a sheet asking to sign in (friends live on the
// server) instead of a whole empty screen. The button opens the sign-in sheet.

import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeader } from "../components/SheetHeader";
import { Sticker } from "../components/Sticker";
import { Pill, Txt } from "../components/ui";
import { useT } from "../i18n";
import { useAccent } from "../theme/accent";

export default function FriendsGuest() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <SheetHeader title={t("friendsTitle")} />
      <View className="items-center pb-6">
        <Sticker emoji="stk:envelope" size={64} />
        <Txt className="mt-4 text-center text-[14.5px] leading-5 text-t2">{t("friendsSignIn")}</Txt>
      </View>
      <Pill full onPress={() => router.replace("/sign-in-options")}>{t("signInLogin")}</Pill>
    </View>
  );
}
