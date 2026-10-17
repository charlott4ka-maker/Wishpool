// Guest mode: a blue strip that peeks out from behind the content block below
// it (the block overlaps its lower part). Text on the left, a chevron on the
// right; a tap opens the sign-in sheet.

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { BLOCK_GAP, BLOCK_R } from "./TabHeader";
import { Txt } from "./ui";

/** How much of the strip the next block covers (its corner radius). */
export const GUEST_OVERLAP = BLOCK_R;

/** True while the strip shows (the next block then pulls up by GUEST_OVERLAP). */
export function useGuestBanner(): boolean {
  return useAuth().status === "guest";
}

export function GuestBanner() {
  const router = useRouter();
  const { t } = useT();
  return (
    <Pressable
      onPress={() => {
        haptic("light");
        router.push("/sign-in-options");
      }}
      style={{ marginTop: BLOCK_GAP }}
    >
      <LinearGradient
        colors={[C.brand, C.brand2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderTopLeftRadius: BLOCK_R, borderTopRightRadius: BLOCK_R, paddingTop: 14, paddingBottom: 14 + GUEST_OVERLAP, paddingLeft: 16, paddingRight: 12 }}
      >
        <View className="flex-row items-center gap-3">
          <Txt numberOfLines={1} className="flex-1 font-m700 text-[15px] text-white">{t("guestBanner")}</Txt>
          <ChevronRight size={20} color="#fff" strokeWidth={1.5} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
