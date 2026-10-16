// System iOS tab bar (UITabBarController, Liquid Glass on iOS 26) with SF Symbols.
// So cards scrolling under it don't blend into the bar: a thick dark material
// that never goes transparent, plus a dark fade at the bottom of each tab
// screen (<TabBarFade/>), which also works under the iOS 26 glass.

import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useT } from "../../i18n";
import { C } from "../../theme/tokens";

export default function TabsLayout() {
  const { t } = useT();
  return (
    <NativeTabs tintColor={C.blue} blurEffect="systemThickMaterialDark" disableTransparentOnScrollEdge minimizeBehavior="never">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "gift", selected: "gift.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabWishes")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rooms">
        <NativeTabs.Trigger.Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabRooms")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabProfile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
