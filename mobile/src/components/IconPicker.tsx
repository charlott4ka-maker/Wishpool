// Settings › App icon: the default star or the Premium glass one. Going back
// to the default is always allowed, with or without Premium.
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useT } from "../i18n";
import { haptic } from "../lib/haptics";
import { APP_ICONS, changeAppIcon, currentAppIcon, type AppIconOption } from "../subscription/appIcon";
import { C } from "../theme/tokens";
import { Txt } from "./ui";
import { track } from "../lib/track";

export function IconPicker({ unlocked }: { unlocked: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [icon, setIcon] = useState<AppIconOption["name"]>(currentAppIcon());
  const pick = async (name: AppIconOption["name"]) => {
    if (name === icon) return;
    if (name && !unlocked) return router.push("/paywall");
    haptic("select");
    if (await changeAppIcon(name, true).catch(() => false)) {
      setIcon(name);
      track("icon_" + String(name).toLowerCase());
    }
  };
  return (
    <View className="mb-8">
      <Txt className="mb-3 px-4 font-m600 text-[13px] uppercase text-t2" style={{ letterSpacing: 0.4 }}>{t("appIcon")}</Txt>
      <View className="flex-row gap-4 rounded-card bg-raised p-4">
        {APP_ICONS.map((o) => {
          const on = icon === o.name;
          return (
            <Pressable key={o.name || "default"} onPress={() => pick(o.name)} className="items-center" accessibilityLabel={t(o.titleKey)}>
              <View style={{ width: 72, height: 72 }}>
                <Image source={o.image} style={{ width: 72, height: 72, borderRadius: 16 }} contentFit="cover" />
                {on ? (
                  <View style={{ position: "absolute", right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: C.blue, borderWidth: 2, borderColor: C.raised, alignItems: "center", justifyContent: "center" }}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                ) : null}
              </View>
              <Txt className={`mt-2 font-m600 text-[12.5px] ${on ? "text-white" : "text-t2"}`}>{t(o.titleKey)}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
