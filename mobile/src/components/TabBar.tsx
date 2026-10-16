// Floating pill tab bar from the Mini App: Бажання / Кімнати / Профіль.

import type { BottomTabBarProps } from "expo-router/tabs";
import { BlurView } from "expo-blur";
import { Gift, User, Users } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { C } from "../theme/tokens";
import { Txt } from "./ui";

const ITEMS = [
  { route: "index", label: "tabWishes", Icon: Gift },
  { route: "rooms", label: "tabRooms", Icon: Users },
  { route: "profile", label: "tabProfile", Icon: User },
] as const;

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 items-center" style={{ bottom: Math.max(insets.bottom, 12) + 8 }}>
      <BlurView intensity={40} tint="dark" className="flex-row gap-2 overflow-hidden rounded-full p-1.5" style={{ backgroundColor: "rgba(28,28,30,0.85)", borderWidth: 1, borderColor: C.line }}>
        {ITEMS.map(({ route, label, Icon }) => {
          const on = current === route;
          const key = state.routes.find((r) => r.name === route)?.key;
          return (
            <Pressable
              key={route}
              onPress={() => {
                if (!on) haptic("select");
                if (key) navigateToTab(key);
              }}
              className="h-lg items-center justify-center gap-0.5 rounded-full px-5"
              style={{ backgroundColor: on ? C.blueSoft : "transparent" }}
            >
              <Icon size={21} color={on ? C.blueText : C.t2} />
              <Txt className={`font-m600 text-[11.5px] ${on ? "text-blueText" : "text-t2"}`}>{t(label)}</Txt>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
