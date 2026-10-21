// Sticker grid grouped by pack. Premium-only packs show a lock and open the
// paywall instead of selecting.

import { useRouter } from "expo-router";
import { View } from "react-native";

import { useT } from "../i18n";
import { useRemoteConfig } from "../lib/remoteConfig";
import { haptic } from "../lib/haptics";
import { PREMIUM_ENABLED, STICKER_PACKS, stickerId } from "../subscription/featureFlags";
import type { StickerName } from "./stickerAssets";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import { PremiumBadge, Txt } from "./ui";

export function StickerPicker({ value, onChange, size = 28 }: { value: string; onChange: (emoji: string) => void; size?: number }) {
  const { t } = useT();
  const { isPremium } = useSubscription();
  const router = useRouter();
  // the admin page can hide stickers from the picker and add new ones to the first pack
  const { stickers } = useRemoteConfig();
  const hidden = new Set(stickers.hidden);
  const extra = stickers.extra.map((s) => s.name);
  return (
    <View className="gap-4">
      {STICKER_PACKS.filter((p) => PREMIUM_ENABLED || !p.isPremiumOnly).map((pack, i, packs) => {
        const locked = pack.isPremiumOnly && !isPremium;
        const names = [...(pack.stickers as string[]), ...(i === 0 ? extra : [])].filter((n, k, a) => !hidden.has(n) && a.indexOf(n) === k);
        return (
          <View key={pack.id}>
            {packs.length > 1 ? (
              <View className="mb-2 flex-row items-center gap-2">
                <Txt className="font-m600 text-[13px] text-t2">{t(pack.titleKey)}</Txt>
                {pack.isPremiumOnly ? <PremiumBadge label={t("premiumOnly")} /> : null}
              </View>
            ) : null}
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              {names.map((n) => {
                const e = stickerId(n as StickerName);
                const on = value === e;
                return (
                  <View key={n} style={{ width: `${100 / 7}%`, padding: 4 }}>
                    <Press
                      scaleTo={0.85}
                      onPress={() => {
                        if (locked) return router.push("/paywall");
                        haptic("select");
                        onChange(e);
                      }}
                      className="aspect-square items-center justify-center rounded-full"
                      style={{ backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: on ? C.blue : "transparent", opacity: locked ? 0.45 : 1 }}
                    >
                      <Sticker emoji={e} size={size} />
                    </Press>
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
