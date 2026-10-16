// Full-screen photo viewer, like ImageLightbox in the Mini App: dark backdrop,
// "1 / 2" counter at the top, a round close button, round arrows on the sides,
// swipe to flip, tap the backdrop to close.

import { Image } from "expo-image";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Txt } from "./ui";

function RoundButton({ onPress, children, label, style }: { onPress: () => void; children: React.ReactNode; label: string; style?: object }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={6} className="h-sm w-sm items-center justify-center rounded-full" style={[{ backgroundColor: "rgba(255,255,255,0.12)" }, style]}>
      {children}
    </Pressable>
  );
}

export function ImageLightbox({ images, start = 0, onClose }: { images: string[]; start?: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(Math.min(start, images.length - 1));
  const list = useRef<FlatList<string>>(null);
  const n = images.length;
  useEffect(() => {
    if (start) setTimeout(() => list.current?.scrollToIndex({ index: start, animated: false }), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (d: number) => {
    const next = (i + d + n) % n;
    setI(next);
    list.current?.scrollToIndex({ index: next, animated: true });
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}>
        <FlatList
          ref={list}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(src, k) => src + k}
          getItemLayout={(_, k) => ({ length: width, offset: width * k, index: k })}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, alignItems: "center", justifyContent: "center" }}>
              <Pressable onPress={() => {}}>
                <Image source={{ uri: item }} style={{ width: width * 0.92, height: height * 0.8, borderRadius: 16 }} contentFit="contain" />
              </Pressable>
            </Pressable>
          )}
        />
        {n > 1 ? (
          <View pointerEvents="none" className="absolute left-0 right-0 items-center" style={{ top: insets.top + 18 }}>
            <Txt className="font-m600 text-sm text-t2">
              {i + 1} / {n}
            </Txt>
          </View>
        ) : null}
        <RoundButton onPress={onClose} label="Close" style={{ position: "absolute", top: insets.top + 8, right: 16 }}>
          <X size={18} color="#fff" />
        </RoundButton>
        {n > 1 ? (
          <>
            <RoundButton onPress={() => go(-1)} label="Previous" style={{ position: "absolute", left: 12, top: height / 2 - 20 }}>
              <ChevronLeft size={20} color="#fff" />
            </RoundButton>
            <RoundButton onPress={() => go(1)} label="Next" style={{ position: "absolute", right: 12, top: height / 2 - 20 }}>
              <ChevronRight size={20} color="#fff" />
            </RoundButton>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
