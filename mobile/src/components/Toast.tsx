// Toasts: a dark pill that slides down from the top with a filled round icon.
// success = blue check with a blue glow, error = red cross with a red glow,
// info = grey "i" without a glow. Optional action ("Undo"). Call from
// anywhere: toast.success("Saved"), toast.error(...), toast.info(...).
// The root layout has a host, and so do sheets (a native sheet covers the
// root one): a toast goes to the topmost host, or to the root with
// { root: true } when the sheet is closing anyway (e.g. "Wish added").
// No haptic here: the caller already plays the one that fits.

import { Check, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../theme/tokens";
import { Txt } from "./ui";

type Kind = "success" | "error" | "info";
type Opts = { action?: { label: string; onPress: () => void }; duration?: number; root?: boolean };
type Item = { id: number; kind: Kind; text: string } & Opts;

const hosts: ((t: Item) => void)[] = [];
let seq = 0;
const show = (kind: Kind) => (text: string, opts: Opts = {}) => {
  const host = opts.root ? hosts[0] : hosts[hosts.length - 1];
  host?.({ id: ++seq, kind, text, ...opts });
};
export const toast = { success: show("success"), error: show("error"), info: show("info") };

const LOOK: Record<Kind, { bg: string; glow: string | null; Icon: typeof Check | null }> = {
  success: { bg: C.blue, glow: C.blue, Icon: Check },
  error: { bg: "#FF453A", glow: "#FF453A", Icon: X },
  info: { bg: "#636366", glow: null, Icon: null }, // a bold "i" on the filled circle
};

export function ToastHost({ inSheet }: { inSheet?: boolean }) {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<Item | null>(null);
  const y = useSharedValue(-120);
  const o = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = () => {
    clearTimeout(timer.current);
    o.value = withTiming(0, { duration: 180 });
    y.value = withTiming(-120, { duration: 220, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) runOnJS(setItem)(null);
    });
  };

  useEffect(() => {
    const listener = (t: Item) => {
      clearTimeout(timer.current);
      setItem(t);
      y.value = -120;
      o.value = 0;
      y.value = withSpring(0, { damping: 18, stiffness: 220 });
      o.value = withTiming(1, { duration: 160 });
      timer.current = setTimeout(hide, t.duration ?? (t.action ? 4000 : 2600));
    };
    hosts.push(listener);
    return () => {
      hosts.splice(hosts.indexOf(listener), 1);
      clearTimeout(timer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  if (!item) return null;
  const { bg, glow, Icon } = LOOK[item.kind];
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: "absolute", top: inSheet ? 12 : insets.top + 8, left: 16, right: 16, zIndex: 1000, alignItems: "center" }, anim]}>
      <Pressable
        onPress={hide}
        style={{
          flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, maxWidth: "100%", paddingLeft: 12, paddingRight: item.action ? 8 : 20, borderRadius: 26,
          backgroundColor: "#1C1C1E", borderWidth: 1, borderColor: glow ? glow + "59" : "rgba(255,255,255,0.08)",
          shadowColor: glow || "#000", shadowOpacity: glow ? 0.28 : 0.4, shadowRadius: glow ? 18 : 12, shadowOffset: { width: 0, height: 4 },
        }}
      >
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bg, alignItems: "center", justifyContent: "center", shadowColor: glow || "transparent", shadowOpacity: glow ? 0.45 : 0, shadowRadius: 8 }}>
          {Icon ? <Icon size={16} color="#fff" strokeWidth={3} /> : <Txt className="font-m800 text-[16px] text-white">i</Txt>}
        </View>
        <Txt numberOfLines={2} className="shrink font-m600 text-[15px]">{item.text}</Txt>
        {item.action ? (
          <Pressable
            onPress={() => {
              item.action!.onPress();
              hide();
            }}
            className="h-9 justify-center rounded-full bg-card2 px-3.5"
          >
            <Txt className="font-m700 text-[14px] text-blueText">{item.action.label}</Txt>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
