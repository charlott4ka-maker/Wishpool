// iOS large titles for the Wishes and Rooms tabs: a big title that shrinks
// into the bar as you scroll (like Settings or Mail), a blurred bar once
// content is under it, and room for a native search field.

import { Stack } from "expo-router";
import { Plus } from "lucide-react-native";
import { Pressable } from "react-native";

import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";

export const LARGE_TITLE_OPTIONS = {
  headerLargeTitle: true,
  headerTransparent: true,
  headerBlurEffect: "systemChromeMaterialDark",
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerTintColor: C.blue,
  headerTitleStyle: { color: C.t1 },
  headerLargeTitleStyle: { color: C.t1 },
  contentStyle: { backgroundColor: C.bg },
} as const;

export function LargeTitleStack() {
  return <Stack screenOptions={LARGE_TITLE_OPTIONS} />;
}

/** "+" in the bar's right corner. */
export function HeaderPlus({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        haptic("light");
        onPress();
      }}
      accessibilityLabel={label}
      hitSlop={8}
      className="h-sm w-sm items-center justify-center"
    >
      <Plus size={24} color={C.t1} />
    </Pressable>
  );
}
