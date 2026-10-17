// A photo tile in a single row that can be reordered: hold it, it lifts, drag
// it along the row and drop it in another slot. RN's PanResponder (no extra
// native module, works in Expo Go); the parent turns off its ScrollView while
// a tile is lifted so the drag isn't taken over by scrolling.

import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";

import { haptic } from "../lib/haptics";

type Props = {
  index: number;
  count: number;
  /** Distance between two slots (tile width + gap). */
  step: number;
  onLift: (lifted: boolean) => void;
  onDrop: (from: number, to: number) => void;
  children: React.ReactNode;
};

export function DragTile({ index, count, step, onLift, onDrop, children }: Props) {
  const x = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const active = useRef(false);
  const granted = useRef(false);
  const [up, setUp] = useState(false);
  const props = useRef({ index, count, step, onLift, onDrop });
  props.current = { index, count, step, onLift, onDrop };

  const clampX = (dx: number) => {
    const p = props.current;
    return Math.max(-p.index * p.step, Math.min((p.count - 1 - p.index) * p.step, dx));
  };
  const reset = () => {
    active.current = false;
    granted.current = false;
    setUp(false);
    props.current.onLift(false);
    Animated.spring(lift, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  };
  const finish = (dx: number) => {
    const p = props.current;
    const to = Math.max(0, Math.min(p.count - 1, p.index + Math.round(clampX(dx) / p.step)));
    x.setValue(0);
    reset();
    if (to !== p.index) {
      haptic("select");
      p.onDrop(p.index, to);
    }
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: () => active.current,
        onMoveShouldSetPanResponder: () => active.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          granted.current = true;
        },
        onPanResponderMove: (_, g) => x.setValue(clampX(g.dx)),
        onPanResponderRelease: (_, g) => finish(g.dx),
        onPanResponderTerminate: (_, g) => finish(g.dx),
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View {...pan.panHandlers} style={{ flex: 1, zIndex: up ? 10 : 0 }}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: x }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
          shadowColor: "#000", shadowOpacity: up ? 0.5 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          delayLongPress={250}
          disabled={count < 2}
          onLongPress={() => {
            active.current = true;
            setUp(true);
            props.current.onLift(true);
            haptic("light");
            Animated.spring(lift, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
          }}
          onPressOut={() => {
            // let go without moving: the pan never started, so put it down here
            setTimeout(() => {
              if (active.current && !granted.current) reset();
            }, 60);
          }}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
