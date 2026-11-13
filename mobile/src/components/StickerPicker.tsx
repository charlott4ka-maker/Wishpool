// Sticker list grouped by pack, like Telegram's: Recent first (stickers of
// saved wishes and rooms, lib/recentStickers), then each pack under its title, all in one scroll.
// The look sheet in New room puts the pack chips above it and keeps them in
// step with the scroll (`onSectionY` tells where each section starts).
// Premium stickers aren't dimmed: a tap opens the paywall instead.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useT } from "../i18n";
import { useRemoteConfig } from "../lib/remoteConfig";
import { haptic } from "../lib/haptics";
import { orderedNames, orderedPacks, PREMIUM_ENABLED, stickerId } from "../subscription/featureFlags";
import type { StickerName } from "./stickerAssets";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import { PremiumBadge, Txt } from "./ui";

import { RECENT_KEY } from "../lib/recentStickers";

export type StickerSection = { id: string; title: string; premium: boolean; locked: boolean; names: string[] };

/** the sections in order: Recent (once you have picked some), then each pack; `only` puts that pack first */
export function useStickerSections(only?: string): { sections: StickerSection[] } {
  const { t } = useT();
  const { isPremium } = useSubscription();
  // the admin page can hide stickers from the picker and add new ones to the first pack
  const { stickers } = useRemoteConfig();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => setRecent(raw ? JSON.parse(raw) : []))
      .catch(() => {});
  }, []);
  const hidden = new Set(stickers.hidden);
  const extra = stickers.extra.map((s) => s.name);
  const packs: StickerSection[] = orderedPacks(stickers.packOrder)
    .sort((a, b) => Number(b.id === only) - Number(a.id === only))
    .filter((p) => PREMIUM_ENABLED || !p.isPremiumOnly)
    .map((p) => ({
      id: p.id,
      title: t(p.titleKey),
      premium: !!p.isPremiumOnly,
      locked: !!p.isPremiumOnly && !isPremium,
      names: orderedNames([...(p.stickers as string[]), ...(p.id === "classic" ? extra : [])].filter((n, k, a) => !hidden.has(n) && a.indexOf(n) === k), stickers.order?.[p.id]),
    }));
  // only stickers you can still put on (a hidden or locked one drops out of Recent)
  const shown = recent.map((e) => e.slice(4)).filter((n) => packs.some((p) => p.names.includes(n) && !p.locked));
  const sections = shown.length ? [{ id: "recent", title: t("stickersRecent"), premium: false, locked: false, names: shown }, ...packs] : packs;
  return { sections };
}

export function StickerPicker({ sections, value, onChange, size = 28, onLocked, onSectionY }: {
  sections: StickerSection[];
  value: string;
  onChange: (emoji: string) => void;
  size?: number;
  /** how to open the paywall (inside a Modal: close it first) */
  onLocked?: () => void;
  /** where each section starts, from the top of the picker */
  onSectionY?: (id: string, y: number) => void;
}) {
  const router = useRouter();
  return (
    <View className="gap-4">
      {sections.map((s) => (
        <View key={s.id} onLayout={(e) => onSectionY?.(s.id, e.nativeEvent.layout.y)}>
          <View className="mb-2 flex-row items-center gap-2">
            <Txt className="font-m600 text-[13px] text-t2">{s.title}</Txt>
            {s.premium ? <PremiumBadge /> : null}
          </View>
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
            {s.names.map((n) => {
              const e = stickerId(n as StickerName);
              const on = value === e;
              return (
                <View key={n} style={{ width: `${100 / 7}%`, padding: 4 }}>
                  <Press
                    scaleTo={0.85}
                    onPress={() => {
                      if (s.locked) return onLocked ? onLocked() : router.push("/paywall");
                      haptic("select");
                      onChange(e);
                    }}
                    className="aspect-square items-center justify-center rounded-full"
                    style={{ backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: on ? C.blue : "transparent" }}
                  >
                    <Sticker emoji={e} size={size} />
                  </Press>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
