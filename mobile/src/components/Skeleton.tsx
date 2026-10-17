// Grey placeholders that softly pulse while something loads (instead of a
// spinner): blocks, the wish grid, room folders and room list rows.

import { useEffect } from "react";
import { DimensionValue, View, ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { C } from "../theme/tokens";

/** One pulsing block; plain style only (no className on Reanimated views). */
export function Bone({ w = "100%", h, r = 12, style }: { w?: DimensionValue; h?: DimensionValue; r?: number; style?: ViewStyle }) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.card2 }, style, anim]} />;
}

/** Wishlist grid: cards with a square picture, a title and a price line. */
export function WishGridSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="flex-row gap-3">
          {[0, 1].map((j) => (
            <View key={j} className="flex-1 rounded-[20px] bg-card p-2">
              <Bone style={{ aspectRatio: 1 }} r={12} />
              <View className="gap-2 px-1 pb-1 pt-3">
                <Bone w="80%" h={14} r={7} />
                <Bone w="40%" h={14} r={7} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Rooms grid: folder shapes with a name under them. */
export function RoomGridSkeleton() {
  return (
    <View className="flex-row gap-3">
      {[0, 1].map((j) => (
        <View key={j} className="flex-1 items-center">
          <Bone style={{ aspectRatio: 1.3 }} r={20} />
          <Bone w="50%" h={16} r={8} style={{ marginTop: 16 }} />
        </View>
      ))}
    </View>
  );
}

/** A friend's list in a room: avatar + name, then rows in a card. */
export function RoomListSkeleton() {
  return (
    <View className="gap-6">
      {[3, 2].map((n, i) => (
        <View key={i}>
          <View className="mb-1 flex-row items-center gap-3">
            <Bone w={28} h={28} r={14} />
            <Bone w={110} h={15} r={8} />
          </View>
          <View className="rounded-card bg-card px-4">
            {Array.from({ length: n }, (_, k) => (
              <View key={k} className="flex-row items-center gap-4 py-4">
                <Bone w={30} h={30} r={8} />
                <View className="flex-1 gap-2">
                  <Bone w="70%" h={14} r={7} />
                  <Bone w="30%" h={12} r={6} />
                </View>
                <Bone w={76} h={40} r={20} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
