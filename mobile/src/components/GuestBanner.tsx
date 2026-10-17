import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Press } from "./Press";
import { Txt } from "./ui";

const KEY = "wp_guest_banner_hidden_until";
const SNOOZE = 3 * 24 * 60 * 60 * 1000; // closed: back in 3 days

/** Guest mode reminder: data stays on this phone until the user signs in. Closable. */
export function GuestBanner() {
  const { status } = useAuth();
  const router = useRouter();
  const { t } = useT();
  const [hidden, setHidden] = useState(true); // until we know, so it doesn't flash
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setHidden(!!v && Number(v) > Date.now()))
      .catch(() => setHidden(false));
  }, []);
  if (status !== "guest" || hidden) return null;
  const close = () => {
    haptic("light");
    setHidden(true);
    AsyncStorage.setItem(KEY, String(Date.now() + SNOOZE)).catch(() => {});
  };
  return (
    <Press scaleTo={0.98} onPress={() => router.push("/sign-in-options")} className="mb-4 flex-row items-center gap-3 rounded-tile bg-card py-3 pl-4 pr-2">
      <Txt className="flex-1 text-[12.5px] leading-[17px] text-t2">{t("guestBanner")}</Txt>
      <Txt className="font-m600 text-[13px] text-blueText">{t("guestSignIn")}</Txt>
      <Pressable onPress={close} hitSlop={8} accessibilityLabel={t("closeBtn")} className="h-8 w-8 items-center justify-center rounded-full">
        <X size={16} color={C.t3} />
      </Pressable>
    </Press>
  );
}
