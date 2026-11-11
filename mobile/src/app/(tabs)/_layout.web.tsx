// The web build's tab bar (the Telegram Mini App and the admin preview): the
// native iOS tabs don't exist on the web, so a bottom bar in the same spirit,
// with lucide icons, our blue for the selected tab and a dark, opaque fill.

import { Tabs } from "expo-router";
import { CircleUserRound, Gift, Users } from "lucide-react-native";

import { useT } from "../../i18n";
import { useSearchMode } from "../../lib/searchMode";
import { C } from "../../theme/tokens";
import { useAccent } from "../../theme/accent";

export default function TabsLayout() {
  useAccent(); // re-render in place when the app colour changes
  const { t } = useT();
  const searching = useSearchMode();
  const icon = (I: typeof Gift) => ({ color }: { color: unknown }) => <I size={24} color={String(color)} strokeWidth={1.75} absoluteStrokeWidth />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.t2,
        tabBarStyle: { display: searching ? "none" : "flex", backgroundColor: C.card, borderTopColor: "rgba(255,255,255,0.06)", height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="(wishes)" options={{ title: t("tabWishes"), tabBarIcon: icon(Gift) }} />
      <Tabs.Screen name="rooms" options={{ title: t("tabRooms"), tabBarIcon: icon(Users) }} />
      <Tabs.Screen name="profile" options={{ title: t("tabProfile"), tabBarIcon: icon(CircleUserRound) }} />
    </Tabs>
  );
}
