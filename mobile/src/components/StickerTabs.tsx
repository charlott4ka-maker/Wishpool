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
import { useAccent } from "../theme/accent";
import { C, hex, mixHex } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";
import type { StickerName } from "./stickerAssets";
import { Txt } from "./ui";

import { RECENT_KEY } from "../lib/recentStickers";
const COLS = 7;
const GAP = 8;

export function StickerTabs({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const { t } = useT();
  const acc = useAccent();
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
    // Recent fills in once the wish is saved (lib/recentStickers), not on a tap here
  };

  const cell = w ? (w - GAP * (COLS - 1)) / COLS : 0;
  const boxH = cell ? cell * 2.5 + GAP * 2 : 0;
  const rows = Math.ceil(names.length / COLS);
  const scrolls = rows > 2;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {/* the sections: the row runs to the screen edges, so the last chip scrolls in whole */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        {tabs.map((x) => {
          const on = x.id === cur;
          // the Premium pack, picked: the raised blue pill of the Folders tab in New room
          const lit = on && x.premium;
          return (
            <Pressable
              key={x.id}
              onPress={() => {
                if (on) return;
                haptic("select");
                setTab(x.id);
                setAtEnd(false);
              }}
              className="h-sm flex-row items-center gap-1.5 overflow-hidden rounded-full px-4"
              style={{ backgroundColor: on && !lit ? C.blueSoft : "transparent", borderWidth: 1, borderColor: lit ? "transparent" : on ? C.blueLine : C.line }}
            >
              {lit ? (
                <>
                  <LinearGradient colors={[acc.base, mixHex(acc.base, "#ffffff", 0.3)]} start={{ x: 0.2, y: 1 }} end={{ x: 0.8, y: 0 }} style={{ position: "absolute", top: -1, left: -1, right: -1, bottom: -1 }} />
                  <LinearGradient colors={[hex(mixHex(acc.base, "#ffffff", 0.2), 0), hex(mixHex(acc.base, "#ffffff", 0.2), 0.52)]} start={{ x: 0.88, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: -1, left: -1, right: -1, bottom: -1 }} />
                  <LinearGradient colors={[hex(mixHex(acc.base, "#ffffff", 0.45), 0.7), hex(mixHex(acc.base, "#ffffff", 0.45), 0)]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.22 }} style={{ position: "absolute", top: -1, left: -1, right: -1, bottom: -1 }} />
                </>
              ) : null}
              {x.premium ? <Crown size={14} color={lit ? "#fff" : C.blueText} fill={lit ? "#fff" : "transparent"} strokeWidth={1.5} absoluteStrokeWidth /> : null}
              <Txt className={`font-m600 text-sm ${lit ? "text-white" : on || x.premium ? "text-blueText" : "text-t2"}`}>{x.title}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
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
                    style={{ width: cell, height: cell, backgroundColor: on ? C.blueSoft : C.card2, borderWidth: 1.5, borderColor: on ? C.blue : "transparent" }}
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
