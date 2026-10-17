// A list row with one action behind it, like iOS Mail: swipe left to reveal
// it, tap it (or swipe all the way) to run it. PanResponder, no extra native
// module. Used in a room for "I'll get it" / "Not giving".

import { useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";
import { LIST } from "./WishRow";

const W = 96; // width of the revealed action
const FULL = 180; // past this, letting go runs the action

export function SwipeRow({ label, color, icon, onAction, children }: { label: string; color: string; icon?: React.ReactNode; onAction: () => void; children: React.ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const passed = useRef(false);
  const act = useRef(onAction);
  act.current = onAction;

  const to = (v: number) => {
    open.current = v !== 0;
    Animated.spring(x, { toValue: v, useNativeDriver: true, speed: 18, bounciness: 0 }).start();
  };
  const run = () => {
    to(0);
    act.current();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // horizontal swipes only, so the list still scrolls
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          passed.current = false;
        },
        onPanResponderMove: (_, g) => {
          const v = Math.min(0, (open.current ? -W : 0) + g.dx);
          x.setValue(v);
          if (v < -FULL !== passed.current) {
            passed.current = v < -FULL;
            haptic("select");
          }
        },
        onPanResponderRelease: (_, g) => {
          const v = (open.current ? -W : 0) + g.dx;
          if (v < -FULL) run();
          else to(v < -W / 2 ? -W : 0);
        },
        onPanResponderTerminate: () => to(open.current ? -W : 0),
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    // spans the card's padding so the action reaches its edge
    <View style={{ marginHorizontal: -LIST.pad, overflow: "hidden" }}>
      {/* the action fills the row behind it; the row slides off to show its right end */}
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: color, alignItems: "flex-end" }}>
        <Pressable onPress={run} style={{ width: W, height: "100%", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {icon}
          <Txt className="font-m700 text-[13px] text-white">{label}</Txt>
        </Pressable>
      </View>
      <Animated.View {...pan.panHandlers} style={{ paddingHorizontal: LIST.pad, backgroundColor: C.bg, transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
