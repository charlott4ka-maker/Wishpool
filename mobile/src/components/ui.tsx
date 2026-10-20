// Building blocks matching the Mini App's atoms (Pill, Chip, Segmented, Card,
// Sheet, Empty, Field, Avatar). Rules from CLAUDE.md apply here too:
// SF Pro (system font), never Regular; controls are 52 or 40 high; 4/8/12/16/24/32 spacing;
// no outlines on blocks; modals are bottom sheets.

import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Plus, X } from "lucide-react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import React, { useEffect, useId, useRef, useState } from "react";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TextProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Mask, Rect } from "react-native-svg";

import { haptic } from "../lib/haptics";
import { LiquidGlass } from "../lib/liquidGlass";
import { C, H } from "../theme/tokens";
import { Press } from "./Press";
import { Sticker } from "./Sticker";

/** Text in SF Pro Medium by default. Pass a font-m600/700/800 class for heavier weights. */
export function Txt({ className = "", ...p }: TextProps & { className?: string }) {
  const hasFont = /\bfont-m\d00\b/.test(className);
  const hasColor = /\btext-(t1|t2|t3|blue|blueText|green|greenText|danger|gold|white)\b/.test(className);
  return <Text {...p} className={`${hasFont ? "" : "font-m500"} ${hasColor ? "" : "text-t1"} ${className}`} />;
}

type PillKind = "primary" | "ghost" | "glass" | "soft" | "green" | "gold";
const PILL: Record<PillKind, { box: string; text: string }> = {
  primary: { box: "bg-blue", text: "text-white" },
  // secondary button: the cool slate of the selected segment, not a neutral grey
  ghost: { box: "bg-[#2D3440]", text: "text-t1" },
  // on the coloured room hero
  glass: { box: "overflow-hidden", text: "text-white" },
  soft: { box: "bg-blueSoft", text: "text-blueText" },
  green: { box: "bg-greenSoft", text: "text-greenText" },
  gold: { box: "bg-gold", text: "text-black" },
};

// soft / green carry a thin border, as in the Mini App's Pill
const PILL_BORDER: Partial<Record<PillKind, ViewStyle>> = {
  soft: { borderWidth: 1, borderColor: C.blueLine },
  green: { borderWidth: 1, borderColor: "rgba(52,199,89,0.4)" },
};

// spinner colour per kind, matching the label
const PILL_SPIN: Record<PillKind, string> = { primary: "#fff", ghost: C.t1, glass: "#fff", soft: C.blueText, green: C.greenText, gold: "#000" };

export function Pill({
  children, onPress, kind = "primary", icon, disabled, full, size = "lg", px, loading,
}: { children?: React.ReactNode; onPress?: () => void; kind?: PillKind; icon?: React.ReactNode; disabled?: boolean; full?: boolean; size?: "lg" | "sm"; /** side padding instead of the default */ px?: number;
  /** waiting on the server: a spinner in place of the label (same size, not greyed out), taps ignored */ loading?: boolean }) {
  const k = PILL[kind];
  return (
    <Press
      disabled={disabled}
      onPress={() => {
        if (loading) return;
        haptic("light");
        onPress?.();
      }}
      className={`${k.box} ${size === "lg" ? "h-lg" : "h-sm"} ${full ? "w-full" : px != null ? "" : size === "lg" ? "px-6" : "px-4"} flex-row items-center justify-center gap-2 rounded-full`}
      style={{ opacity: disabled ? 0.45 : 1, ...(px != null && !full ? { paddingHorizontal: px } : null), ...PILL_BORDER[kind] }}
    >
      {/* glass: the system Liquid Glass (its own light rim) on iOS 26, else a
          white 10% frost over a blur with a soft top sheen */}
      {kind === "glass" && LiquidGlass ? (
        <LiquidGlass glassEffectStyle="clear" colorScheme="dark" isInteractive style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, zIndex: -1 }} />
      ) : kind === "glass" ? (
        <>
          <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.10)", zIndex: -1 }} />
          <LinearGradient colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />
        </>
      ) : null}
      {/* the label keeps its place while loading, so the button doesn't change size */}
      <View className="flex-row items-center justify-center gap-2" style={{ opacity: loading ? 0 : 1 }}>
        {icon}
        {typeof children === "string" ? <Txt className={`font-m600 ${k.text} ${size === "lg" ? "text-base" : "text-sm"}`}>{children}</Txt> : children}
      </View>
      {loading ? <ActivityIndicator color={PILL_SPIN[kind]} style={{ position: "absolute" }} /> : null}
    </Press>
  );
}

export function Chip({ children, active, onPress, color }: { children: React.ReactNode; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Press
      onPress={() => {
        haptic("select");
        onPress?.();
      }}
      className={`h-sm flex-row items-center gap-2 rounded-full px-4 ${active ? "bg-blueSoft" : "bg-transparent"}`}
      style={{ borderWidth: 1, borderColor: active ? C.blueLine : C.line }}
    >
      {color ? <View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: color }} /> : null}
      {React.Children.map(children, (c) => (typeof c === "string" || typeof c === "number" ? <Txt className={`font-m600 text-sm ${active ? "text-blueText" : "text-t2"}`}>{c}</Txt> : c))}
    </Press>
  );
}

// The selected segment is a pill that slides (spring) to the tapped option and,
// like the iOS tab bar's selection, stretches along the way and squeezes a
// little before it settles.
/** The neutral selected segment: a cool slate that fits the blue-grey surfaces. */
export const SEG_ON = "#353C49";

export function Segmented<K extends string>({ options, value, onChange, neutral, className = "", fill = C.card }: { options: [K, string][]; value: K; onChange: (k: K) => void; neutral?: boolean; className?: string; /** track colour (set it when the screen itself is the block fill) */ fill?: string }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex(([k]) => k === value));
  const x = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const first = useRef(true);
  const segW = w ? (w - 12 - 4 * (options.length - 1)) / options.length : 0;
  useEffect(() => {
    const to = idx * (segW + 4);
    if (first.current || !segW) {
      x.value = to;
      first.current = !segW;
      return;
    }
    // a smooth glide (about 0.4 s) with a soft stretch on the way, no snap
    x.value = withSpring(to, { damping: 26, stiffness: 240, mass: 1 });
    sx.value = withSequence(withTiming(1.08, { duration: 160 }), withSpring(1, { damping: 18, stiffness: 260 }));
    sy.value = withSequence(withTiming(0.94, { duration: 160 }), withSpring(1, { damping: 18, stiffness: 260 }));
  }, [idx, segW]); // eslint-disable-line react-hooks/exhaustive-deps
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scaleX: sx.value }, { scaleY: sy.value }] }));
  return (
    <View className={`h-lg flex-row gap-1 rounded-full p-1.5 ${className}`} style={{ backgroundColor: fill }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {segW ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 6, top: 6, bottom: 6, width: segW, borderRadius: 999, backgroundColor: neutral ? SEG_ON : C.blue }, pill]} />
      ) : null}
      {options.map(([k, l]) => {
        const on = value === k;
        return (
          <Pressable
            key={k}
            onPress={() => {
              if (!on) haptic("select");
              onChange(k);
            }}
            className="flex-1 items-center justify-center rounded-full px-2"
          >
            <Txt className={`font-m600 text-sm ${on ? "text-white" : "text-t2"}`}>{l}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, className = "", style, onPress }: { children: React.ReactNode; className?: string; style?: ViewStyle; onPress?: () => void }) {
  // a bg-* in className replaces the default fill (two bg classes would fight)
  const cls = `rounded-card ${/(^|\s)bg-/.test(className) ? "" : "bg-card "}${className}`;
  return onPress ? <Press onPress={onPress} scaleTo={0.98} className={cls} style={style}>{children}</Press> : <View className={cls} style={style}>{children}</View>;
}

/**
 * Round icon button in iOS glass: the system Liquid Glass on iOS 26 (its own
 * edge light, reacts to touch), else white 10% over a blur. Used for the "+"
 * next to titles, back and close.
 */
export function GlassCircle({ size = H.sm, onPress, label, children, system = true }: { size?: number; onPress: () => void; label: string; children: React.ReactNode; /** false: always the drawn glass (used inside native sheets) */ system?: boolean }) {
  const round = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, borderRadius: size / 2 };
  // In fit-to-content sheets the glass mounted before the sheet had a size and
  // came out flat; it's mounted after the first layout instead.
  const [laidOut, setLaidOut] = useState(false);
  return (
    <Press onPress={onPress} scaleTo={0.9} accessibilityLabel={label} onLayout={() => setLaidOut(true)} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {LiquidGlass && system ? (
        laidOut ? <LiquidGlass glassEffectStyle="regular" colorScheme="dark" isInteractive style={[round, { zIndex: -1 }]} /> : null
      ) : (
        <>
          <BlurView intensity={30} tint="dark" style={[round, { zIndex: -1 }]} />
          <View style={[round, { backgroundColor: "rgba(255,255,255,0.06)", zIndex: -1 }]} />
          {/* drawn glass: a faint light from the top, kept subtle */}
          <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0)"]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[round, { zIndex: -1 }]} />
        </>
      )}
      {children}
    </Press>
  );
}

// The same glass as the round buttons on the screens.
export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <GlassCircle onPress={onPress} label="Close">
      <X size={18} color={C.t1} />
    </GlassCircle>
  );
}

/**
 * Bottom sheet for modals that aren't their own route (e.g. e-mail sign-in).
 * On iOS it is the system page sheet (swipe down to close, the screen behind
 * shrinks back); elsewhere a sliding panel. Route sheets use SheetHeader instead.
 */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title?: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "ios") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View className="flex-1 bg-card px-4 pt-2.5">
          <View className="mx-auto mb-3.5 mt-1.5 h-1 w-10 rounded bg-card2" />
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Txt className="flex-1 font-m800 text-xl">{title || ""}</Txt>
            <CloseButton onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
            {children}
          </ScrollView>
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute inset-0 bg-black/60" />
        <View className="max-h-[88%] rounded-t-sheet bg-card px-4 pt-2.5" style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
          <View className="mx-auto mb-3.5 mt-1.5 h-1 w-10 rounded bg-card2" />
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Txt className="flex-1 font-m800 text-xl">{title || ""}</Txt>
            <CloseButton onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Empty lists and errors: a tilted sticker, a title, a line of text and an optional action.
 * `fill`: takes all the space left on the screen and sits in its middle, with a
 * full-width action 32 below the text (the screen's own CTA moves in here).
 */
export function Empty({ emoji, title, sub, action, compact, fill, tilt = -8 }: { emoji: string; title: string; sub?: string; action?: React.ReactNode; compact?: boolean; fill?: boolean; tilt?: number }) {
  return (
    <Animated.View entering={FadeIn.duration(350)} style={fill ? { flex: 1 } : undefined}>
    <View className={`items-center ${fill ? "flex-1 justify-center py-8" : compact ? "p-2" : "px-6 py-12"}`}>
      <Sticker emoji={emoji} size={compact ? 56 : 88} rotate={tilt} />
      {/* the same space above the text (from the sticker) and below it (to the button); the sub sits close to the title */}
      <Txt className={`${compact && !fill ? "mt-4" : "mt-6"} text-center font-m700 ${compact ? "text-base" : "text-lg"}`}>{title}</Txt>
      {sub ? <Txt className="mt-1 max-w-[280px] text-center text-[14.5px] leading-5 text-t2">{sub}</Txt> : null}
      {action ? <View className={fill ? "mt-6 self-stretch" : compact ? "mt-4" : "mt-6"}>{action}</View> : null}
    </View>
    </Animated.View>
  );
}

export function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, autoFocus, error, textContentType,
}: {
  label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean;
  keyboardType?: "default" | "email-address" | "url" | "number-pad"; autoCapitalize?: "none" | "sentences"; autoFocus?: boolean;
  /** Required and still empty after a tap on the action: a red outline and this text under it. */
  error?: string | false;
  /** iOS autofill, e.g. "oneTimeCode" to offer the code from Mail. */
  textContentType?: "oneTimeCode" | "emailAddress" | "name";
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View className="mb-4">
      {label ? <Txt className="mb-2 font-m600 text-[13px] text-t2">{label}</Txt> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.hint}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={keyboardType ? false : undefined}
        autoFocus={autoFocus}
        textContentType={textContentType}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className={`bg-card2 px-4 font-m500 text-[16px] text-t1 ${multiline ? "min-h-[76px] rounded-[20px]" : "h-lg rounded-full"}`}
        // fontSize only: a line height (text-base sets 24) pushes iOS input text down
        style={{ borderWidth: 1, borderColor: error ? C.danger : focus ? C.blueLine : "transparent", textAlignVertical: multiline ? "top" : "center", paddingTop: multiline ? 14 : 0, paddingBottom: multiline ? 14 : 0 }}
      />
      {error ? <Txt className="mt-1.5 px-4 text-[12.5px] text-danger">{error}</Txt> : null}
    </View>
  );
}

export type AvatarMember = { name: string; color: string; photo?: string | null };
/**
 * `cut` = how much the next avatar in a stack overlaps this one: a crescent is
 * masked out of this avatar's right side (a see-through gap, not a painted
 * ring), like the Mini App, so the stack reads cleanly on any background.
 */
export function Avatar({ m, size = 34, cut = 0 }: { m: AvatarMember; size?: number; cut?: number }) {
  const [failed, setFailed] = useState(false);
  const maskId = useId().replace(/:/g, "");
  const face = (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: m.color, overflow: "hidden" }} className="items-center justify-center">
      {m.photo && !failed ? (
        <Image source={{ uri: m.photo }} style={{ width: size, height: size }} onError={() => setFailed(true)} />
      ) : (
        <Txt className="font-m700 text-white" style={{ fontSize: size * 0.4 }}>{(m.name || "?").slice(0, 1)}</Txt>
      )}
    </View>
  );
  if (!cut) return face;
  const gap = Math.max(2, size * 0.07);
  const cx = size * 1.5 - cut; // centre of the next avatar, in this one's box
  if (Platform.OS === "web") {
    const css = `radial-gradient(circle at ${cx}px 50%, transparent ${size / 2 + gap}px, #000 ${size / 2 + gap + 0.5}px)`;
    return <View style={{ width: size, height: size, ...({ maskImage: css, WebkitMaskImage: css } as object) }}>{face}</View>;
  }
  return (
    <MaskedView
      style={{ width: size, height: size }}
      maskElement={
        <Svg width={size} height={size}>
          <Defs>
            <Mask id={maskId}>
              <Rect width={size} height={size} fill="#fff" />
              <Circle cx={cx} cy={size / 2} r={size / 2 + gap} fill="#000" />
            </Mask>
          </Defs>
          <Rect width={size} height={size} fill="#000" mask={`url(#${maskId})`} />
        </Svg>
      }
    >
      {face}
    </MaskedView>
  );
}

/** Round "+" next to a screen title. */
export function HeaderAdd({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <GlassCircle
      size={H.lg}
      onPress={() => {
        haptic("light");
        onPress();
      }}
      label={label}
    >
      <Plus size={24} color={C.t1} />
    </GlassCircle>
  );
}

export function ScreenTitle({ title, sub, right, compact }: { title: string; sub?: string; right?: React.ReactNode; compact?: boolean }) {
  return (
    <View className={`flex-row ${sub ? "items-end" : "items-center"} justify-between gap-3 px-1 ${compact ? "pb-3" : "pb-6"} pt-1.5`}>
      <View className="flex-1">
        <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{title}</Txt>
        {sub ? <Txt className="mt-1 text-sm text-t2">{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

/** Small "Premium only" badge for locked options. */
export function PremiumBadge({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-gold/20 px-2 py-1">
      <Lock size={11} color={C.gold} />
      <Txt className="font-m600 text-[11.5px] text-gold">{label}</Txt>
    </View>
  );
}
