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

function PageIn({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>{children}</Animated.View>;
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const last = page === PAGES - 1;
  return (
    <View className="flex-1 bg-card px-4" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="h-sm flex-row justify-end">
        {!last ? (
          <Pressable onPress={onDone} className="h-sm justify-center px-2">
            <Txt className="font-m600 text-[15px] text-t2">{t("obSkip")}</Txt>
          </Pressable>
        ) : null}
      </View>
      <PageIn key={page}>
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
          else {
            haptic("select");
            setPage(page + 1);
          }
        }}
      >
        {t(last ? "obStart" : "obNext")}
      </Pill>
    </View>
  );
}
