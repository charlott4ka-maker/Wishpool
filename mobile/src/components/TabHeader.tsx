// Header block of a tab screen: our 26pt title with the round "+" and, on
// Wishes, the search field. It's the top block of the screen: flush with the
// top edge, rounded only at the bottom, on the block fill. It stays put; the
// blocks below scroll under it with a 4pt gap.

import { SymbolView } from "expo-symbols";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../theme/tokens";
import { ScreenTitle, Txt } from "./ui";

export const BLOCK_R = 24;
export const BLOCK_GAP = 4;

export function TabHeader({ title, right, children, onBack, backLabel }: { title: string; right?: React.ReactNode; children?: React.ReactNode; onBack?: () => void; backLabel?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: onBack ? 12 : 4, backgroundColor: C.card, borderBottomLeftRadius: BLOCK_R, borderBottomRightRadius: BLOCK_R, zIndex: 2 }}>
      {onBack ? (
        // pushed screens: system back chevron on the left, the title centred
        <View className="h-sm flex-row items-center">
          <Pressable onPress={onBack} className="h-sm w-sm items-center justify-center rounded-full bg-card2" accessibilityLabel={backLabel}>
            <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
          </Pressable>
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Txt className="font-m800 text-[20px]" style={{ letterSpacing: -0.3 }}>{title}</Txt>
          </View>
        </View>
      ) : (
        <ScreenTitle title={title} right={right} compact />
      )}
      {children}
    </View>
  );
}

/** A content block: the block fill, rounded corners, 16 inside. */
export function Block({ children, grow, style }: { children: React.ReactNode; grow?: boolean; style?: object }) {
  return <View style={[{ backgroundColor: C.card, borderRadius: BLOCK_R, padding: 16 }, grow ? { flexGrow: 1 } : null, style]}>{children}</View>;
}
