// First-run onboarding, the same three pages as the Mini App: the hero, adding
// a wish by link, and gifting in secret. Then the sign-in screen.

import { useRef, useState, useEffect } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { C } from "../../theme/tokens";
import { Pill, Txt } from "../ui";
import { ObAddScene } from "./ObAddScene";
import { ObGiftScene } from "./ObGiftScene";
import { ObHero } from "./ObHero";

const PAGES = 3;

function PageIn({ children, from = 24 }: { children: React.ReactNode; from?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }}>{children}</Animated.View>;
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [back, setBack] = useState(false); // last move was backwards: the page slides in from the left
  const last = page === PAGES - 1;
  // swipe left / right flips pages (watching touches only, the button still works)
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const go = (to: number) => {
    if (to < 0 || to >= PAGES || to === page) return;
    haptic("select");
    setBack(to < page);
    setPage(to);
  };
  return (
    <View
      className="flex-1 bg-card px-4"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
      onTouchStart={(e) => (touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() })}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const dx = e.nativeEvent.pageX - s.x, dy = e.nativeEvent.pageY - s.y;
        if (Date.now() - s.t > 500 || Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
        go(dx < 0 ? page + 1 : page - 1);
      }}
    >
      <View className="h-sm flex-row justify-end">
        {!last ? (
          <Pressable onPress={onDone} className="h-sm justify-center px-2">
            <Txt className="font-m600 text-[15px] text-t2">{t("obSkip")}</Txt>
          </Pressable>
        ) : null}
      </View>
      <PageIn key={page} from={back ? -24 : 24}>
        {page === 0 ? (
          <ObHero />
        ) : (
          <>
            <View className="flex-1 items-center justify-center">{page === 1 ? <ObAddScene /> : <ObGiftScene />}</View>
            <View className="px-1">
              <Txt className="mt-4 font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t(page === 1 ? "obAddTitle" : "obGiftTitle")}</Txt>
              <Txt className="mt-2 min-h-[44px] text-base leading-[22px] text-t2">{t(page === 1 ? "obAddTextIos" : "obGiftText")}</Txt>
            </View>
          </>
        )}
      </PageIn>
      <View className="mb-4 mt-6 flex-row justify-center gap-2">
        {Array.from({ length: PAGES }, (_, j) => (
          <View key={j} style={{ width: j === page ? 24 : 8, height: 8, borderRadius: 8, backgroundColor: j === page ? C.blue : C.bg }} />
        ))}
      </View>
      <Pill
        full
        onPress={() => {
          if (last) onDone();
          else go(page + 1);
        }}
      >
        {t(last ? "obStart" : "obNext")}
      </Pill>
    </View>
  );
}
