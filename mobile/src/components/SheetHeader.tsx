// Header for native iOS sheets (formSheet routes): the title and a round close
// button. The system draws the grabber; swiping down closes the sheet too.

import { useRouter } from "expo-router";
import { View } from "react-native";

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
