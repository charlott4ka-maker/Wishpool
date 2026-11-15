// The body of a fit-to-content sheet (wish, take, member, draw...). On iPhone the
// sheet grows with its content; on the web (Telegram) the screen has a fixed height,
// so a long wish was cut off with no way to scroll: there the body scrolls.
import type { ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SheetBody({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") {
    return (
      <ScrollView className="bg-card" style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 16 }}>
        {children}
      </ScrollView>
    );
  }
  return (
    <View className="bg-card px-4 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
      {children}
    </View>
  );
}
