// On the web (Telegram) react-native-web's Alert.alert does nothing, so every
// confirm and menu built on it (delete a wish, the room's ⋯, block, leave...)
// silently failed. Here Alert.alert is replaced on the web with our own sheet:
// a dark backdrop and a bottom card with the title, the line and the buttons
// (destructive ones red, Cancel last). On iPhone nothing changes.
import { useEffect, useState } from "react";
import { Alert, type AlertButton, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

type Item = { title: string; message?: string; buttons: AlertButton[] };
let show: ((i: Item | null) => void) | null = null;

if (Platform.OS === "web") {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    show?.({ title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] });
  };
}

export function WebAlertHost() {
  const [item, setItem] = useState<Item | null>(null);
  const insets = useSafeAreaInsets();
  const { t } = useT();
  useEffect(() => {
    show = setItem;
    return () => {
      show = null;
    };
  }, []);
  if (Platform.OS !== "web" || !item) return null;
  const cancel = item.buttons.find((b) => b.style === "cancel");
  const rest = item.buttons.filter((b) => b !== cancel);
  const press = (b?: AlertButton) => {
    setItem(null);
    haptic("light");
    b?.onPress?.();
  };
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, justifyContent: "flex-end" }}>
      <Pressable onPress={() => press(cancel)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" }} accessibilityLabel={t("setCancel")} />
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 16, gap: 8 }}>
        {item.title ? <Txt className="text-center font-m700 text-[17px]">{item.title}</Txt> : null}
        {item.message ? <Txt className="text-center text-[14.5px] leading-5 text-t2">{item.message}</Txt> : null}
        <View style={{ height: 8 }} />
        {rest.map((b, i) => (
          <Pressable
            key={i}
            onPress={() => press(b)}
            className="h-lg items-center justify-center rounded-full"
            style={{ backgroundColor: b.style === "destructive" ? "rgba(255,90,90,0.16)" : "#2D3440" }}
          >
            <Txt className="font-m600 text-base" style={{ color: b.style === "destructive" ? C.danger : C.t1 }}>{b.text}</Txt>
          </Pressable>
        ))}
        {cancel ? (
          <Pressable onPress={() => press(cancel)} className="h-lg items-center justify-center rounded-full">
            <Txt className="font-m600 text-base text-t2">{cancel.text || t("setCancel")}</Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
