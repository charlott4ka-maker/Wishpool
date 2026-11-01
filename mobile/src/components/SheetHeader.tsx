// Header for native iOS sheets (formSheet routes): the title and a round close
// button. The system draws the grabber; swiping down closes the sheet too.

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, H, hex } from "../theme/tokens";
import { CloseButton, Txt } from "./ui";

export function SheetHeader({ title, onClose }: { title?: string; onClose?: () => void }) {
  const router = useRouter();
  return (
    <View className="mb-4 flex-row items-center justify-between gap-3">
      <Txt className="flex-1 font-m800 text-xl">{title || ""}</Txt>
      <CloseButton onPress={onClose || (() => router.back())} />
    </View>
  );
}

// The full-screen forms (new/edit wish and room): the same header pinned to the
// top while the form scrolls under it, fading out under it once something has
// scrolled there. The ScrollView pads its content by formHeaderSpace(top).
export const formHeaderSpace = (top: number) => top + 16 + H.sm + 16;

export function FormHeader({ title, scrolled }: { title: string; scrolled: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
      <View style={{ backgroundColor: C.card, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <SheetHeader title={title} />
      </View>
      {scrolled ? <LinearGradient pointerEvents="none" colors={[C.card, hex(C.card, 0)]} style={{ height: 24, marginTop: -16 }} /> : null}
    </View>
  );
}
