// The "adding your wish" bar at the bottom, like Threads' "Posting…": the
// form closes at once, a grey star outline with a white stretch running round it while the
// wish uploads, then a check and "Wish added". On the right the photos, held
// by a paperclip (one photo or a little stack), or the sticker.
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Check, RotateCw, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Sticker } from "./Sticker";
import { Txt } from "./ui";

type Job = { thumbs: string[]; emoji?: string; run: () => Promise<void>; onDone?: () => void };
let host: ((j: Job) => void) | null = null;

/** Runs `run` in the background with the bar showing how it goes. */
export function startUpload(job: Job) {
  if (host) host(job);
  else job.run().then(job.onDone, () => {});
}

// lucide's star, drawn here so its outline can take a gradient
const STAR = "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";
// Threads' "Posting…" mark: the star outline in grey with a short white
// stretch of it running round and round
const STAR_LEN = 68.34; // the path's length, measured
const APath = Animated.createAnimatedComponent(Path);

function ShimmerStar() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const run = useAnimatedProps(() => ({ strokeDashoffset: -t.value * STAR_LEN }));
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d={STAR} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <APath animatedProps={run} d={STAR} fill="none" stroke="#fff" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[16, STAR_LEN - 16]} />
    </Svg>
  );
}

// a paperclip clipped over the top edge of the photo, like Threads': the
// whole wire sits behind the photo (only its top shows above the edge), and the
// inner leg is drawn again in front, lying on the photo
const CLIP = "M10 30 V13 a2.5 2.5 0 0 1 5 0 V36 a5 5 0 0 1 -10 0 V9 a7 7 0 0 1 14 0 V32";
const CLIP_FRONT = "M10 30 V13 a2.5 2.5 0 0 1 5 0 V30";
const CLIP_W = 19.8, CLIP_H = 39.6; // viewBox 22x44 at 0.9
function Clip({ front }: { front?: boolean }) {
  return (
    <Svg width={CLIP_W} height={CLIP_H} viewBox="0 0 22 44" style={{ position: "absolute", top: -10, right: 4 }} pointerEvents="none">
      {/* a dark hairline under the wire so it reads on light photos */}
      <Path d={front ? CLIP_FRONT : CLIP} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={front ? CLIP_FRONT : CLIP} fill="none" stroke="#E8ECF2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// the photos on the right: a little stack (up to three), the top one held by a paperclip
function Thumbs({ thumbs, emoji }: { thumbs: string[]; emoji?: string }) {
  if (!thumbs.length) return emoji ? <Sticker emoji={emoji} size={36} /> : null;
  const pics = thumbs.slice(0, 3).reverse();
  const tilt = [[-7, -6], [6, 5], [0, 0]].slice(3 - pics.length);
  return (
    <View style={{ width: 52, height: 48, alignItems: "center", justifyContent: "center" }}>
      <Clip />
      {pics.map((u, i) => (
        <View key={u + i} style={{ position: "absolute", width: 42, height: 42, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", backgroundColor: C.raised, transform: [{ translateX: tilt[i][0] * 0.6 }, { rotate: `${tilt[i][1]}deg` }] }}>
          <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>
      ))}
      <Clip front />
    </View>
  );
}

export function UploadBarHost() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [state, setState] = useState<"busy" | "done" | "fail">("busy");
  const y = useSharedValue(140);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = () => {
    clearTimeout(timer.current);
    y.value = withTiming(140, { duration: 240, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) runOnJS(setJob)(null);
    });
  };

  const go = (j: Job) => {
    clearTimeout(timer.current);
    setJob(j);
    setState("busy");
    y.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    j.run().then(
      () => {
        haptic("success");
        setState("done");
        j.onDone?.();
        timer.current = setTimeout(hide, 2200);
      },
      () => {
        haptic("error");
        setState("fail");
      },
    );
  };

  useEffect(() => {
    host = go;
    return () => {
      host = null;
      clearTimeout(timer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  if (!job) return null;
  // just above the tab bar
  const bottom = Platform.OS === "web" ? 64 + insets.bottom + 8 : insets.bottom + 64;
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: "absolute", left: 12, right: 12, bottom }, style]}>
      <Pressable
        onPress={state === "fail" ? () => go(job) : hide}
        style={{ height: 64, borderRadius: 22, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 12, gap: 16, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
      >
        <BlurView intensity={40} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(36,40,48,0.88)" }} />
        <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
          {state === "busy" ? <ShimmerStar /> : state === "done" ? <Check size={22} color="#fff" strokeWidth={2} /> : <X size={22} color={C.danger} strokeWidth={2} />}
        </View>
        <Txt numberOfLines={1} className="flex-1 font-m600 text-[15px]">
          {t(state === "busy" ? "wishUploading" : state === "done" ? "toastWishAdded" : "wishUploadFail")}
        </Txt>
        {state === "fail" ? <RotateCw size={18} color={C.t2} strokeWidth={1.5} absoluteStrokeWidth /> : <Thumbs thumbs={job.thumbs} emoji={job.emoji} />}
      </Pressable>
    </Animated.View>
  );
}

// the web test build (EXPO_PUBLIC_SHOW_SKINS) can show the bar from the console
if (process.env.EXPO_PUBLIC_SHOW_SKINS === "1") (globalThis as { __wpUpload?: typeof startUpload }).__wpUpload = startUpload;
