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
// top while the form scrolls under it. Like the footer's fade above the main
// button: a solid strip only as tall as the header row, then a soft 32pt fade
// (once something has scrolled under it), nothing overlapping the close button.
// The ScrollView pads its content by formHeaderSpace(top).
const FORM_FADE = 32;
export const formHeaderSpace = (top: number) => top + 16 + H.sm + 16;

export function FormHeader({ title, scrolled }: { title: string; scrolled: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
      <View className="flex-row items-center justify-between gap-3" style={{ backgroundColor: C.card, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 4 }}>
        <Txt className="flex-1 font-m800 text-xl">{title}</Txt>
        <CloseButton onPress={() => router.back()} />
      </View>
      {scrolled ? <LinearGradient pointerEvents="none" colors={[C.card, hex(C.card, 0)]} style={{ height: FORM_FADE }} /> : null}
    </View>
  );
}
