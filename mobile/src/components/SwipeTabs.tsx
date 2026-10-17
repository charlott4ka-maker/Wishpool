// Swipe left / right on a tab screen to go to the next / previous tab (the
// system tab bar has no swipe of its own). Watches touches without taking
// them, so taps and vertical scrolling work as usual; only a quick, mostly
// horizontal flick switches. Horizontal lists inside sit in <SwipeGuard> so
// scrolling them doesn't flip the tab.

import { Href, useRouter } from "expo-router";
import { createContext, useContext, useRef } from "react";
import { GestureResponderEvent, View } from "react-native";

import { haptic } from "../lib/haptics";

const Guard = createContext<() => void>(() => {});

/** Wrap a horizontal list: a swipe that starts on it scrolls it, not the tabs. */
export function SwipeGuard({ children }: { children: React.ReactNode }) {
  const guard = useContext(Guard);
  return <View onTouchStart={guard}>{children}</View>;
}

export function SwipeTabs({ prev, next, disabled, children }: { prev?: Href; next?: Href; disabled?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const guarded = useRef(false);

  const onTouchStart = (e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length > 1) return;
    start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() };
    guarded.current = false;
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || disabled || guarded.current) return;
    const dx = e.nativeEvent.pageX - s.x, dy = e.nativeEvent.pageY - s.y;
    if (Date.now() - s.t > 450 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
    const to = dx < 0 ? next : prev;
    if (!to) return;
    haptic("select");
    router.navigate(to);
  };

  return (
    <Guard.Provider value={() => (guarded.current = true)}>
      <View style={{ flex: 1 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {children}
      </View>
    </Guard.Provider>
  );
}
