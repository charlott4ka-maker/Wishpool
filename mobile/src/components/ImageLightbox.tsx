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

// The photo at its own proportions, as large as fits (92% wide, 80% tall) and
// centred, with rounded corners on the picture itself (like max-width/max-height
// + border-radius on the web), not on an empty letterbox around it.
function FittedImage({ uri, maxW, maxH }: { uri: string; maxW: number; maxH: number }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const w = ratio ? Math.min(maxW, maxH * ratio) : maxW;
  const h = ratio ? w / ratio : maxW;
  return (
    <Pressable onPress={() => {}}>
      <Image
        source={{ uri }}
        onLoad={(e) => e.source.width && e.source.height && setRatio(e.source.width / e.source.height)}
        style={{ width: w, height: h, borderRadius: 16, opacity: ratio ? 1 : 0 }}
        contentFit="cover"
        transition={150}
      />
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
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, alignItems: "center", justifyContent: "center" }}>
              <FittedImage uri={item} maxW={width * 0.92} maxH={height * 0.8} />
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
