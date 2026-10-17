// Guest mode: a blue strip that peeks out from behind the content block below
// it (the block overlaps its lower part). Tap = sign in; × hides it for 3 days.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { BLOCK_GAP, BLOCK_R } from "./TabHeader";
import { Txt } from "./ui";

const KEY = "wp_guest_banner_hidden_until";
const SNOOZE = 3 * 24 * 60 * 60 * 1000;
/** How much of the strip the next block covers (its corner radius). */
export const GUEST_OVERLAP = BLOCK_R;

/** True while the strip shows (the next block then pulls up by GUEST_OVERLAP). */
export function useGuestBanner(): [boolean, () => void] {
  const { status } = useAuth();
  const [hidden, setHidden] = useState(true); // until we know, so it doesn't flash
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setHidden(!!v && Number(v) > Date.now()))
      .catch(() => setHidden(false));
  }, []);
  const close = () => {
    haptic("light");
    setHidden(true);
    AsyncStorage.setItem(KEY, String(Date.now() + SNOOZE)).catch(() => {});
  };
  return [status === "guest" && !hidden, close];
}

export function GuestBanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <Pressable onPress={() => router.push("/sign-in-options")} style={{ marginTop: BLOCK_GAP }}>
      <LinearGradient
        colors={[C.brand, C.brand2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderTopLeftRadius: BLOCK_R, borderTopRightRadius: BLOCK_R, paddingTop: 14, paddingBottom: 14 + GUEST_OVERLAP, paddingHorizontal: 16 }}
      >
        {/* centred, clear of the close button on the right */}
        <View className="flex-row items-center justify-center gap-2 px-10">
          <Txt numberOfLines={1} className="shrink font-m700 text-[15px] text-white">{t("guestBanner")}</Txt>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel={t("closeBtn")}
          style={{ position: "absolute", right: 12, top: 10, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <X size={16} color="#fff" strokeWidth={1.5} />
        </Pressable>
      </LinearGradient>
    </Pressable>
  );
}
