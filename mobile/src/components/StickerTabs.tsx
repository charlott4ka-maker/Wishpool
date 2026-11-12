// The wish form's stickers, like Telegram's: chips on top (Recent, then each
// pack; Premium with a crown) and one pack's grid under them, in a box two and
// a half rows tall, so the half row shows there's more to scroll, with a soft
// fade at the bottom while there is.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Crown } from "lucide-react-native";
import { useEffect, useState } from "react";
import { type LayoutChangeEvent, Pressable, ScrollView, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { useRemoteConfig } from "../lib/remoteConfig";
import { orderedNames, orderedPacks, PREMIUM_ENABLED, stickerId } from "../subscription/featureFlags";
import { useSubscription } from "../subscription/SubscriptionContext";
import { C, hex } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import type { StickerName } from "./stickerAssets";
import { PremiumBadge, Txt } from "./ui";

const RECENT_KEY = "wp_recent_stickers";
const COLS = 7;
const GAP = 8;

export function StickerTabs({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const { t } = useT();
  const router = useRouter();
  const { isPremium } = useSubscription();
  const { stickers } = useRemoteConfig();
  const hidden = new Set(stickers.hidden);
  const extra = stickers.extra.map((s) => s.name);
  const [recent, setRecent] = useState<string[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [w, setW] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => setRecent(raw ? JSON.parse(raw) : []))
      .catch(() => setRecent([]));
  }, []);

  const packs = orderedPacks(stickers.packOrder).filter((p) => PREMIUM_ENABLED || !p.isPremiumOnly).map((p) => ({
    ...p,
    names: orderedNames([...(p.stickers as string[]), ...(p.id === "classic" ? extra : [])].filter((n, k, a) => !hidden.has(n) && a.indexOf(n) === k), stickers.order?.[p.id]),
  }));
  const tabs = [...(recent && recent.length ? [{ id: "recent", title: t("stickersRecent"), premium: false }] : []), ...packs.map((p) => ({ id: p.id, title: t(p.titleKey), premium: p.isPremiumOnly }))];
  const cur = tab && tabs.some((x) => x.id === tab) ? tab : tabs[0]?.id;
  const pack = packs.find((p) => p.id === cur);
  const names = cur === "recent" ? (recent || []).map((e) => e.slice(4)) : pack?.names || [];
  const locked = !!pack?.isPremiumOnly && !isPremium;

  const pick = (e: string) => {
    if (locked) return router.push("/paywall");
    haptic("select");
    onChange(e);
    const next = [e, ...(recent || []).filter((x) => x !== e)].slice(0, COLS * 3);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
    // the Recent tab keeps its order until next time, so the grid doesn't jump
    if (cur !== "recent") setRecent(next);
  };

  const cell = w ? (w - GAP * (COLS - 1)) / COLS : 0;
  const boxH = cell ? cell * 2.5 + GAP * 2 : 0;
  const rows = Math.ceil(names.length / COLS);
  const scrolls = rows > 2;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {/* the sections */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {tabs.map((x) => {
          const on = x.id === cur;
          return (
            <Pressable
              key={x.id}
              onPress={() => {
                if (on) return;
                haptic("select");
                setTab(x.id);
                setAtEnd(false);
              }}
              className="h-sm flex-row items-center gap-1.5 rounded-full px-4"
              style={{ backgroundColor: on ? C.blueSoft : "transparent", borderWidth: 1, borderColor: on ? C.blueLine : C.line }}
            >
              {x.premium ? <Crown size={14} color={on ? C.blueText : C.t2} fill={on ? C.blueText : C.t2} strokeWidth={1.5} /> : null}
              <Txt className={`font-m600 text-sm ${on ? "text-blueText" : "text-t2"}`}>{x.title}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      {locked ? (
        <Pressable onPress={() => router.push("/paywall")} className="mb-3 self-start">
          <PremiumBadge label={t("premiumOnly")} />
        </Pressable>
      ) : null}
      {/* the grid: two and a half rows, the rest scrolls */}
      {cell ? (
        <View style={{ height: scrolls ? boxH : rows * cell + Math.max(0, rows - 1) * GAP }}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrolls}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 4);
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {names.map((n) => {
                const e = stickerId(n as StickerName);
                const on = value === e;
                return (
                  <Press
                    key={n}
                    scaleTo={0.85}
                    onPress={() => pick(e)}
                    className="items-center justify-center rounded-full"
                    style={{ width: cell, height: cell, backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: on ? C.blue : "transparent", opacity: locked ? 0.45 : 1 }}
                  >
                    <Sticker emoji={e} size={cell * 0.6} />
                  </Press>
                );
              })}
            </View>
          </ScrollView>
          {scrolls && !atEnd ? (
            <LinearGradient pointerEvents="none" colors={[hex(C.card, 0), C.card]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: cell * 0.6 }} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
