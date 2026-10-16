// Sticker grid grouped by pack. Premium-only packs show a lock and open the
// paywall instead of selecting.

import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { STICKER_PACKS, stickerId } from "../subscription/featureFlags";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";
import { Sticker } from "./Sticker";
import { PremiumBadge, Txt } from "./ui";

export function StickerPicker({ value, onChange, size = 28 }: { value: string; onChange: (emoji: string) => void; size?: number }) {
  const { t } = useT();
  const { isPremium } = useSubscription();
  const router = useRouter();
  return (
    <View className="gap-4">
      {STICKER_PACKS.map((pack) => {
        const locked = pack.isPremiumOnly && !isPremium;
        return (
          <View key={pack.id}>
            {STICKER_PACKS.length > 1 ? (
              <View className="mb-2 flex-row items-center gap-2">
                <Txt className="font-m600 text-[13px] text-t2">{t(pack.titleKey)}</Txt>
                {pack.isPremiumOnly ? <PremiumBadge label={t("premiumOnly")} /> : null}
              </View>
            ) : null}
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              {pack.stickers.map((n) => {
                const e = stickerId(n);
                const on = value === e;
                return (
                  <View key={n} style={{ width: `${100 / 7}%`, padding: 4 }}>
                    <Pressable
                      onPress={() => {
                        if (locked) return router.push("/paywall");
                        haptic("select");
                        onChange(e);
                      }}
                      className="aspect-square items-center justify-center rounded-full"
                      style={{ backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: on ? C.blue : "transparent", opacity: locked ? 0.45 : 1 }}
                    >
                      <Sticker emoji={e} size={size} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
