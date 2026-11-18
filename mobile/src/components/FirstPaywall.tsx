// Most trials start on the day of the install (RevenueCat: 82% the same day), so
// the paywall shows once by itself: the first time someone is inside the app
// after the onboarding (and once for people coming from an older version).
// Its × closes it as usual; nothing free is locked behind it.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { PREMIUM_ENABLED } from "../subscription/featureFlags";
import { useSubscription } from "../subscription/SubscriptionContext";

const KEY = "wp_first_paywall";

export function FirstPaywall() {
  const router = useRouter();
  const { isPremium, loading } = useSubscription();
  // only over the Wishes tab: not on top of an invite, a shared link or another screen
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  useEffect(() => {
    if (Platform.OS === "web" || !PREMIUM_ENABLED || loading || isPremium) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    AsyncStorage.getItem(KEY)
      .then((seen) => {
        if (seen) return;
        // a moment after the Wishes tab is up, so it slides in over the app
        timer = setTimeout(() => {
          if (pathRef.current !== "/") return; // next launch then
          AsyncStorage.setItem(KEY, "1").catch(() => {});
          router.push({ pathname: "/paywall", params: { src: "onboarding" } });
        }, 1200);
      })
      .catch(() => {});
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, isPremium]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
