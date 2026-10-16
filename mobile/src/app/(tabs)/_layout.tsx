// System iOS tab bar (UITabBarController): on iOS 26 it is Liquid Glass out of
// the box, with SF Symbols. Бажання / Кімнати / Профіль.

import { NativeTabs } from "expo-router/native-tabs";

import { useT } from "../../i18n";
import { C } from "../../theme/tokens";

export default function TabsLayout() {
  const { t } = useT();
  return (
    <NativeTabs tintColor={C.blue}>
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
