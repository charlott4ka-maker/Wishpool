// Settings › App colour (Premium): six accents in a row. Blue is free; the
// others open the paywall unless Premium is on (admins can try them).
import { Check, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";

import { PREVIEW_PREMIUM } from "../lib/premiumGate";
import { useWishpool } from "../store/WishpoolContext";
import { useSubscription } from "../subscription/SubscriptionContext";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { ACCENTS, accent, setAccent, useAccent } from "../theme/accent";
import { Txt } from "./ui";

export function AccentPicker({ unlocked }: { unlocked: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const cur = useAccent().id;
  return (
    <View className="mb-8">
      <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>{t("accentTitle")}</Txt>
      <View className="flex-row justify-between rounded-card bg-raised px-4 py-4">
        {ACCENTS.map((a) => {
          const locked = !unlocked && a.id !== "blue";
          const on = cur === a.id;
          return (
            <Pressable
              key={a.id}
              accessibilityLabel={a.id}
              onPress={() => {
                if (locked) return router.push("/paywall");
                if (on) return;
                haptic("select");
                setAccent(a.id);
              }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.base, alignItems: "center", justifyContent: "center", opacity: locked ? 0.55 : 1 }}
            >
              {on ? <Check size={20} color="#fff" strokeWidth={2.5} /> : locked ? <Lock size={16} color="#fff" strokeWidth={1.5} absoluteStrokeWidth /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Back to blue once Premium is gone (not for admins or the web preview). */
export function AccentGuard() {
  const { ready, admin, online } = useWishpool();
  const { isPremium, loading } = useSubscription();
  useEffect(() => {
    if (__DEV__ || PREVIEW_PREMIUM || loading || !ready || !online || admin || isPremium) return;
    if (accent().id !== "blue") setAccent("blue");
  }, [ready, admin, online, isPremium, loading]);
  return null;
}
