// One notification: an optional banner picture (then the title sits in the
// bar), else a big title and the date; text with **bold**, bullet lists,
// info plates; a button pinned at the bottom.
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import { ChevronLeft } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetFooter } from "../../components/SheetFooter";
import { GlassCircle, Pill, Txt } from "../../components/ui";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useMe } from "../../lib/me";
import { markRead, pick, useNews } from "../../lib/news";
import { useAccent } from "../../theme/accent";
import { C } from "../../theme/tokens";

const LOCALE = { uk: "uk-UA", ru: "ru-RU", en: "en-US" } as const;

// **bold** inside a line
function Rich({ text, className }: { text: string; className: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Txt className={className}>
      {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <Txt key={i} className="font-m800 text-white">{p.slice(2, -2)}</Txt> : p))}
    </Txt>
  );
}

export default function NewsItemScreen() {
  const acc = useAccent();
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useNews();
  const me = useMe();
  const n = items.find((x) => x.id === id);
  useEffect(() => {
    if (n) markRead(n.id);
  }, [n]);
  if (!n) return <View className="flex-1 bg-card" />;
  const title = pick(n.title, lang);
  const label = pick(n.button.label, lang);
  const date = new Date(n.date + "T12:00:00").toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
  const go = () => {
    haptic("light");
    const a = n.button.action;
    if (a === "link" && n.button.url) WebBrowser.openBrowserAsync(n.button.url).catch(() => {});
    else if (a === "santa") router.push({ pathname: "/room/new", params: { preset: "santa" } });
    else if (a === "newRoom") router.push("/room/new");
    else if (a === "newWish") router.push("/wish/new");
    else if (a === "signin") router.push("/sign-in-options");
    else if (a === "premium") router.push("/paywall");
  };
  const hasButton = n.button.action !== "none" && !!label;
  return (
    <View className="flex-1 bg-card">
      {/* the bar: back, and the title in it when there's a picture */}
      <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <GlassCircle onPress={() => router.back()} label={t("back")}>
          <SymbolView name="chevron.left" size={19} weight="semibold" tintColor={C.t1} fallback={<ChevronLeft size={22} color={C.t1} />} />
        </GlassCircle>
        {n.image ? (
          <View pointerEvents="none" className="absolute bottom-2 left-16 right-16 h-sm items-center justify-center">
            <Txt numberOfLines={1} className="font-m700 text-[17px]">{title}</Txt>
          </View>
        ) : null}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (hasButton ? 110 : 32) }}>
        {n.image ? <Image source={{ uri: n.image }} style={{ width: "100%", aspectRatio: 1.43 }} contentFit="cover" /> : null}
        <View className="px-4 pt-5">
          {!n.image ? (
            <View className="mb-4">
              <Txt className="font-m800 text-[30px] leading-[36px]" style={{ letterSpacing: -0.6 }}>{title}</Txt>
              <Txt className="mt-1 text-[14px] text-t3">{date}</Txt>
            </View>
          ) : null}
          {n.blocks.map((b, i) => {
            // {name}: the person's own name, like a bank greeting
            const text = pick(b.text, lang).replace(/\{name\}/g, me.name);
            if (!text) return null;
            if (b.type === "list")
              return (
                <View key={i} className="mb-4 gap-3">
                  {text.split("\n").filter((l) => l.trim()).map((line, k) => (
                    <View key={k} className="flex-row gap-3 pl-1">
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: acc.base, marginTop: 8 }} />
                      <Rich text={line.trim()} className="flex-1 text-[16px] leading-[23px] text-t1" />
                    </View>
                  ))}
                </View>
              );
            if (b.type === "info")
              return (
                <View key={i} className="mb-4 rounded-tile bg-raised px-5 py-4">
                  <Rich text={text} className="text-center text-[15px] leading-[21px] text-blueText" />
                </View>
              );
            return (
              <View key={i} className="mb-4">
                {text.split("\n\n").map((para, k) => (
                  <Rich key={k} text={para} className={`${k ? "mt-3 " : ""}text-[16px] leading-[24px] text-t1`} />
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
      {hasButton ? (
        <SheetFooter>
          <Pill full onPress={go}>{label}</Pill>
        </SheetFooter>
      ) : null}
    </View>
  );
}
