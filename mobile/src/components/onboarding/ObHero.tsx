// Onboarding page 1: stickers drop into a blue folder (it squishes on each
// catch), then the folder shrinks and the stickers orbit around it. Below:
// the name and a typed-out line. Same scene as ObHero in the Mini App.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useT } from "../../i18n";
import { C, hex } from "../../theme/tokens";
import { folderPath } from "../RoomFolder";
import { Sticker } from "../Sticker";
import { Txt } from "../ui";
import { useTypewriter } from "./shared";

const DROP = ["stk:headphones", "stk:gift"];
const RING1 = ["stk:ring", "stk:plane", "stk:gamepad"];
const RING2 = ["stk:matcha", "stk:book", "stk:picture", "stk:lipstick"];
const W = 236;
const FH = Math.round(236 / 1.12);
const FRONT = folderPath(W, FH);

function Ring({ items, r, dur, rev, show }: { items: string[]; r: number; dur: number; rev?: boolean; show: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const vis = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: dur * 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    Animated.timing(vis, { toValue: show ? 1 : 0, duration: 600, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  const turn = spin.interpolate({ inputRange: [0, 1], outputRange: rev ? ["360deg", "0deg"] : ["0deg", "360deg"] });
  const back = spin.interpolate({ inputRange: [0, 1], outputRange: rev ? ["0deg", "360deg"] : ["360deg", "0deg"] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: r,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", opacity: vis,
        transform: [{ scale: vis.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}
    >
      <Animated.View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, transform: [{ rotate: turn }] }}>
        {items.map((e, i) => {
          const a = (i / items.length) * Math.PI * 2;
          return (
            <View key={e} style={{ position: "absolute", left: r + Math.cos(a) * r - 40, top: r + Math.sin(a) * r - 40, width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
              <Animated.View style={{ transform: [{ rotate: back }] }}>
                <Sticker emoji={e} size={48} />
              </Animated.View>
            </View>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}

export function ObHero() {
  const { t } = useT();
  const [orbit, setOrbit] = useState(false);
  const [drop, setDrop] = useState(0); // which sticker is falling now (1-based)
  const fall = useRef(new Animated.Value(0)).current;
  const squish = useRef(new Animated.Value(1)).current;
  const folder = useRef(new Animated.Value(0)).current; // 0 = big, 1 = small in the orbit

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const run = () => {
      setOrbit(false);
      DROP.forEach((_, i) => {
        later(() => setDrop(i + 1), 600 + i * 820);
        later(() => {
          squish.setValue(0.88);
          Animated.spring(squish, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
        }, 600 + i * 820 + 560);
      });
      const toOrbit = 600 + DROP.length * 820 + 300;
      later(() => {
        setOrbit(true);
        setDrop(0);
      }, toOrbit);
      later(run, toOrbit + 5200);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!drop) return;
    fall.setValue(0);
    Animated.timing(fall, { toValue: 1, duration: 780, easing: Easing.bezier(0.45, 0, 0.6, 1), useNativeDriver: true }).start();
  }, [drop]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Animated.timing(folder, { toValue: orbit ? 1 : 0, duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [orbit]); // eslint-disable-line react-hooks/exhaustive-deps

  const line = useTypewriter(t("obLine1"));
  const folderTransform = [
    { scale: folder.interpolate({ inputRange: [0, 1], outputRange: [1, 0.62] }) },
    { rotate: folder.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "-6deg"] }) },
  ];
  // the back and the front bounce together; anchored at the bottom like the web one
  const bounce = [{ translateY: FH / 2 }, { scaleY: squish }, { translateY: -FH / 2 }];

  return (
    <>
      <View className="flex-1 overflow-hidden">
        <Ring items={RING2} r={162} dur={40} rev show={orbit} />
        <Ring items={RING1} r={100} dur={30} show={orbit} />
        <Animated.View style={{ position: "absolute", left: "50%", top: "50%", width: W, height: FH, marginLeft: -W / 2, marginTop: -FH / 2, transform: folderTransform }}>
          <Animated.View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, transform: bounce }}>
            <View style={{ position: "absolute", left: "8%", right: "8%", top: "16%", bottom: "10%", borderRadius: 18, backgroundColor: hex(C.blue, 0.32) }} />
          </Animated.View>
          {drop > 0 && !orbit ? (
            <Animated.View
              style={{
                position: "absolute", left: W / 2 - 60, top: FH * 0.22 - 60, width: 120, height: 120, alignItems: "center", justifyContent: "center",
                opacity: fall.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0.9] }),
                transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-260, 30] }) }, { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["-14deg", "6deg"] }) }],
              }}
            >
              <Sticker emoji={DROP[drop - 1]} size={84} />
            </Animated.View>
          ) : null}
          <Animated.View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, transform: bounce }}>
            <Svg width={W} height={FH}>
              <Defs>
                <LinearGradient id="obFront" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#1C3F7A" stopOpacity={0.96} />
                  <Stop offset="1" stopColor="#14305E" stopOpacity={0.96} />
                </LinearGradient>
              </Defs>
              <Path d={FRONT} fill="url(#obFront)" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
      <View className="px-1">
        <Txt className="font-m800 text-[38px] leading-[44px]" style={{ letterSpacing: -1 }}>Wishpool</Txt>
        <Txt className="mt-2 min-h-[48px] text-[17px] leading-6 text-t2">
          {line}
          <Txt className="text-[17px]">_</Txt>
        </Txt>
      </View>
    </>
  );
}
