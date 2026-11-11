// Profile › bell: the notifications list, like a bank app's: a coloured round
// icon, the title and a line; unread ones bright, read ones grey.
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Empty, GlassCircle, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { markAllRead, NEWS_ICON, pick, useNews } from "../../lib/news";
import { useAccent } from "../../theme/accent";
import { C } from "../../theme/tokens";

export default function NewsList() {
  useAccent(); // re-render in place when the app colour changes
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, read, unread } = useNews();
  return (
    <View className="flex-1 bg-card">
      <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        <Txt className="mt-4 font-m800 text-[30px]" style={{ letterSpacing: -0.6 }}>{t("newsTitle")}</Txt>
      </View>
      {items.length ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <View className="mb-2 flex-row items-center justify-between">
            <Txt className="text-[14px] text-t2">{unread ? t("newsUnread", { n: unread }) : t("newsAllRead")}</Txt>
            {unread ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  haptic("light");
                  markAllRead(items.map((n) => n.id));
                }}
              >
                <Txt className="font-m600 text-[14px]">{t("newsReadAll")}</Txt>
              </Pressable>
            ) : null}
          </View>
          {items.map((n) => {
            const Icon = NEWS_ICON[n.icon] || NEWS_ICON.bell;
            const fresh = !read.includes(n.id);
            const sub = pick(n.sub, lang);
            return (
              <Pressable key={n.id} onPress={() => router.push({ pathname: "/news/[id]", params: { id: n.id } })} className="flex-row items-center gap-4 py-3">
                <View className="items-center justify-center rounded-full" style={{ width: 48, height: 48, backgroundColor: n.color, opacity: fresh ? 1 : 0.75 }}>
                  <Icon size={22} color="#fff" strokeWidth={1.75} absoluteStrokeWidth />
                </View>
                <View className="flex-1">
                  <Txt numberOfLines={1} className={`text-[16px] ${fresh ? "font-m700 text-white" : "font-m600 text-t2"}`}>{pick(n.title, lang)}</Txt>
                  {sub ? <Txt numberOfLines={2} className={`mt-0.5 text-[14px] leading-[19px] ${fresh ? "text-t1" : "text-t3"}`}>{sub}</Txt> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        // centred on the whole screen (not just under the title), lifted a little
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 80 }}>
          <Empty fill emoji="stk:bulb" tilt={0} title={t("newsEmpty")} sub={t("newsEmptySub")} />
        </View>
      )}
    </View>
  );
}
