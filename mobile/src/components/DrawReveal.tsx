// The first time you see who you got in a draw: a gift box shakes, opens and
// shows the person. Once per room and person (remembered on the phone).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import type { Member } from "../types";
import { Sticker } from "./Sticker";
import { Avatar, Pill, Txt } from "./ui";

export function DrawReveal({ roomId, target }: { roomId: string; target: Member }) {
  const { t } = useT();
  const key = `wp_reveal_${roomId}_${target.id}`;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((v) => {
        if (!v) setOpen(true);
      })
      .catch(() => {});
  }, [key]);

  const shake = useSharedValue(0);
  const box = useSharedValue(1); // the gift: 1 shown, 0 gone
  const who = useSharedValue(0); // the person: 0 hidden, 1 shown
  useEffect(() => {
    if (!open) return;
    // a shake, a pause, a bigger shake, then the box pops away and the person shows
    shake.value = withSequence(
      withDelay(300, withRepeat(withSequence(withTiming(-8, { duration: 70 }), withTiming(8, { duration: 70 })), 3, true)),
      withTiming(0, { duration: 70 }),
      withDelay(250, withRepeat(withSequence(withTiming(-14, { duration: 60 }), withTiming(14, { duration: 60 })), 4, true)),
      withTiming(0, { duration: 60 }),
    );
    box.value = withDelay(1900, withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }));
    who.value = withDelay(2150, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(haptic)("success");
    }));
  }, [open, shake, box, who]);

  const boxStyle = useAnimatedStyle(() => ({ opacity: box.value, transform: [{ rotate: `${shake.value}deg` }, { scale: 1 + (1 - box.value) * 0.6 }] }));
  const whoStyle = useAnimatedStyle(() => ({ opacity: who.value, transform: [{ scale: 0.85 + who.value * 0.15 }] }));
  const close = () => {
    setOpen(false);
    AsyncStorage.setItem(key, "1").catch(() => {});
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,10,14,0.92)", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[{ position: "absolute" }, boxStyle]}>
            <Sticker emoji="stk:gift" size={120} />
          </Animated.View>
          <Animated.View style={[{ position: "absolute", alignItems: "center" }, whoStyle]}>
            <Avatar m={target} size={112} />
          </Animated.View>
        </View>
        <Animated.View style={[{ alignItems: "center", marginTop: 24 }, whoStyle]}>
          <Txt className="text-[15px] text-t2">{t("youGot")}</Txt>
          <Txt className="mt-1 text-center font-m800 text-[30px]">{target.name}</Txt>
          <Txt className="mt-2 text-center text-[14px] leading-[20px] text-t2">{t("revealSecret")}</Txt>
          <View className="mt-8" style={{ width: 260 }}>
            <Pill full onPress={close}>{t("revealOk")}</Pill>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
