// Building blocks matching the Mini App's atoms (Pill, Chip, Segmented, Card,
// Sheet, Empty, Field, Avatar). Rules from CLAUDE.md apply here too:
// SF Pro (system font), never Regular; controls are 52 or 40 high; 4/8/12/16/24/32 spacing;
// no outlines on blocks; modals are bottom sheets.

import { Image } from "expo-image";
import { Lock, Plus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TextProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptic } from "../lib/haptics";
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
  ghost: { box: "bg-white/10", text: "text-t1" },
  // on the coloured room hero
  glass: { box: "bg-white/20", text: "text-white" },
  soft: { box: "bg-blueSoft", text: "text-blueText" },
  green: { box: "bg-greenSoft", text: "text-greenText" },
  gold: { box: "bg-gold", text: "text-black" },
};

// soft / green carry a thin border, as in the Mini App's Pill
const PILL_BORDER: Partial<Record<PillKind, { borderWidth: number; borderColor: string }>> = {
  soft: { borderWidth: 1, borderColor: C.blueLine },
  green: { borderWidth: 1, borderColor: "rgba(52,199,89,0.4)" },
  glass: { borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
};

export function Pill({
  children, onPress, kind = "primary", icon, disabled, full, size = "lg",
}: { children?: React.ReactNode; onPress?: () => void; kind?: PillKind; icon?: React.ReactNode; disabled?: boolean; full?: boolean; size?: "lg" | "sm" }) {
  const k = PILL[kind];
  return (
    <Press
      disabled={disabled}
      onPress={() => {
        haptic("light");
        onPress?.();
      }}
      className={`${k.box} ${size === "lg" ? "h-lg" : "h-sm"} ${full ? "w-full" : size === "lg" ? "px-6" : "px-4"} flex-row items-center justify-center gap-2 rounded-full`}
      style={{ opacity: disabled ? 0.45 : 1, ...PILL_BORDER[kind] }}
    >
      {icon}
      {typeof children === "string" ? <Txt className={`font-m600 ${k.text} ${size === "lg" ? "text-base" : "text-sm"}`}>{children}</Txt> : children}
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

// The selected segment is a pill that slides (spring) to the tapped option.
export function Segmented<K extends string>({ options, value, onChange, neutral, className = "" }: { options: [K, string][]; value: K; onChange: (k: K) => void; neutral?: boolean; className?: string }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex(([k]) => k === value));
  const x = useSharedValue(0);
  const segW = w ? (w - 12 - 4 * (options.length - 1)) / options.length : 0;
  useEffect(() => {
    x.value = withSpring(idx * (segW + 4), { damping: 18, stiffness: 220, mass: 0.7 });
  }, [idx, segW]); // eslint-disable-line react-hooks/exhaustive-deps
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View className={`h-lg flex-row gap-1 rounded-full bg-card p-1.5 ${className}`} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {segW ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 6, top: 6, bottom: 6, width: segW, borderRadius: 999, backgroundColor: neutral ? "#3A3A3E" : C.blue }, pill]} />
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
  const cls = `rounded-card bg-card ${className}`;
  return onPress ? <Press onPress={onPress} scaleTo={0.98} className={cls} style={style}>{children}</Press> : <View className={cls} style={style}>{children}</View>;
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} scaleTo={0.88} className="h-sm w-sm items-center justify-center rounded-full bg-card2" accessibilityLabel="Close">
      <X size={18} color={C.t2} />
    </Press>
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
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
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
      <Txt className={`mt-4 text-center font-m700 ${compact ? "text-base" : "text-lg"}`}>{title}</Txt>
      {sub ? <Txt className="mt-2 max-w-[280px] text-center text-[14.5px] leading-5 text-t2">{sub}</Txt> : null}
      {action ? <View className={fill ? "mt-8 self-stretch" : compact ? "mt-4" : "mt-6"}>{action}</View> : null}
    </View>
    </Animated.View>
  );
}

export function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, autoFocus,
}: {
  label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean;
  keyboardType?: "default" | "email-address" | "url" | "number-pad"; autoCapitalize?: "none" | "sentences"; autoFocus?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View className="mb-4">
      {label ? <Txt className="mb-2 font-m600 text-[13px] text-t2">{label}</Txt> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.t3}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={keyboardType ? false : undefined}
        autoFocus={autoFocus}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className={`bg-card2 px-4 font-m500 text-[16px] text-t1 ${multiline ? "min-h-[76px] rounded-[20px]" : "h-lg rounded-full"}`}
        // fontSize only: a line height (text-base sets 24) pushes iOS input text down
        style={{ borderWidth: 1, borderColor: focus ? C.blueLine : "transparent", textAlignVertical: multiline ? "top" : "center", paddingTop: multiline ? 14 : 0, paddingBottom: multiline ? 14 : 0 }}
      />
    </View>
  );
}

export type AvatarMember = { name: string; color: string; photo?: string | null };
export function Avatar({ m, size = 34 }: { m: AvatarMember; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: m.color, overflow: "hidden" }} className="items-center justify-center">
      {m.photo && !failed ? (
        <Image source={{ uri: m.photo }} style={{ width: size, height: size }} onError={() => setFailed(true)} />
      ) : (
        <Txt className="font-m700 text-white" style={{ fontSize: size * 0.4 }}>{(m.name || "?").slice(0, 1)}</Txt>
      )}
    </View>
  );
}

/** Round "+" next to a screen title. */
export function HeaderAdd({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Press scaleTo={0.9}
      onPress={() => {
        haptic("light");
        onPress();
      }}
      accessibilityLabel={label}
      className="h-lg w-lg items-center justify-center rounded-full bg-card2"
    >
      <Plus size={24} color={C.t1} />
    </Press>
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
