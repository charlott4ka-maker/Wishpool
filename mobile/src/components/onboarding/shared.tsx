// Building blocks for the onboarding, ported from the Mini App (web/src/App.jsx):
// a typewriter line, a looping step script, and a shrunken phone that plays a
// little "screen recording" of our own UI with a finger that taps things.

import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";

import { C } from "../../theme/tokens";

export function useTypewriter(text: string): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), 38);
    return () => clearInterval(id);
  }, [text]);
  return text.slice(0, n);
}

/** Step 0..steps.length, advanced at the given ms marks, replayed every `total` ms. */
export function useScript(steps: number[], total: number): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.forEach(clearTimeout);
      timers = [];
      setStep(0);
      steps.forEach((ms, i) => timers.push(setTimeout(() => setStep(i + 1), ms)));
      timers.push(setTimeout(run, total));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return step;
}

export const OB_S = 0.74;
export const OB_W = 375;
export const OB_H = 600;
export type Spot = { x: number; y: number };
export const REST: Spot = { x: 300, y: 520 };

/** Centre of `el` in the mini screen's own (unscaled) coordinates. */
export function measureSpot(el: View | null, root: View | null): Promise<Spot | null> {
  return new Promise((resolve) => {
    if (!el || !root) return resolve(null);
    el.measureLayout(root, (x, y, w, h) => resolve({ x: x + w / 2, y: y + h / 2 }), () => resolve(null));
  });
}

function Finger({ pos, tap }: { pos: Spot; tap: number }) {
  const xy = useRef(new Animated.ValueXY(pos)).current;
  const press = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(xy, { toValue: pos, duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }).start();
  }, [pos.x, pos.y]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tap) return;
    press.setValue(1);
    ripple.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(press, { toValue: 0.8, duration: 150, useNativeDriver: true }),
        Animated.timing(press, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(ripple, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [tap]); // eslint-disable-line react-hooks/exhaustive-deps
  const dot = { position: "absolute" as const, left: -22, top: -22, width: 44, height: 44, borderRadius: 22 };
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, zIndex: 50, transform: xy.getTranslateTransform() }}>
      {tap ? (
        <Animated.View
          style={[dot, { borderWidth: 2, borderColor: "rgba(255,255,255,0.7)", opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }] }]}
        />
      ) : null}
      <Animated.View style={[dot, { backgroundColor: "rgba(255,255,255,0.35)", borderWidth: 2, borderColor: "rgba(255,255,255,0.8)", transform: [{ scale: press }] }]} />
    </Animated.View>
  );
}

/**
 * Our real UI at 375×600, scaled down into a phone outline that melts into the
 * background towards the bottom. Children are laid out in unscaled coordinates;
 * `rootRef` is the box to measure finger targets against.
 */
export function MiniPhone({ children, finger, tap, rootRef }: { children: React.ReactNode; finger: Spot; tap: number; rootRef: React.RefObject<View | null> }) {
  return (
    <View style={{ width: OB_W * OB_S, height: OB_H * OB_S, borderRadius: 34, overflow: "hidden", backgroundColor: C.bg, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
      <View
        ref={rootRef}
        collapsable={false}
        pointerEvents="none"
        style={{ position: "absolute", width: OB_W, height: OB_H, left: 0, top: 0, transform: [{ translateX: (-OB_W * (1 - OB_S)) / 2 }, { translateY: (-OB_H * (1 - OB_S)) / 2 }, { scale: OB_S }] }}
      >
        {children}
        <Finger pos={finger} tap={tap} />
      </View>
      <LinearGradient pointerEvents="none" colors={["transparent", C.bg]} locations={[0.55, 1]} style={{ position: "absolute", left: -2, right: -2, top: 0, bottom: -2 }} />
    </View>
  );
}

/** Fades and slides its content in whenever `show` turns true. */
export function Appear({ show, children, from = 10 }: { show: boolean; children: React.ReactNode; from?: number }) {
  const v = useRef(new Animated.Value(show ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: show ? 1 : 0, duration: 400, useNativeDriver: true }).start();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }}>{children}</Animated.View>;
}

/** Springs in from small when it mounts (new card, filled sticker). */
export function Pop({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ flex: 1, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>{children}</Animated.View>;
}
