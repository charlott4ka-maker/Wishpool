// "Бажання": the wish pool. Filter chips (all / private / per room / gifted),
// a two-column grid of wish cards, the wish sheet on tap.

import { useRouter } from "expo-router";
import { Lock, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuestBanner } from "../../../components/GuestBanner";
import { Sticker } from "../../../components/Sticker";
import { SearchField } from "../../../components/SearchField";
import { Chip, Empty, HeaderAdd, Pill, Txt } from "../../../components/ui";
import { WishCard } from "../../../components/WishCard";
import { TabBarFade } from "../../../components/TabBarFade";
import { TabHeader } from "../../../components/TabHeader";
import { useT } from "../../../i18n";
import { haptic } from "../../../lib/haptics";
import { useKeyboardHeight } from "../../../lib/useKeyboardHeight";
import { useWishpool } from "../../../store/WishpoolContext";
import { C } from "../../../theme/tokens";

export default function PoolScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wishes, rooms, refresh, toggleWishRoom, setGifted, deleteWish } = useWishpool();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const kb = useKeyboardHeight();

  const { tabs, shown } = useMemo(() => {
    const active = wishes.filter((w) => !w.giftedAt);
    const gifted = wishes.filter((w) => w.giftedAt).sort((a, b) => (b.giftedAt || 0) - (a.giftedAt || 0));
    const priv = active.filter((w) => !w.rooms.length);
    const roomTabs = rooms.filter((r) => active.some((w) => w.rooms.includes(r.id)));
    const tabs: { key: string; label: string; n: number; emoji?: string }[] = [
      { key: "all", label: t("filterAll"), n: active.length },
      ...(priv.length && roomTabs.length ? [{ key: "private", label: t("privateShort"), n: priv.length }] : []),
      ...roomTabs.map((r) => ({ key: r.id, label: r.name, n: active.filter((w) => w.rooms.includes(r.id)).length, emoji: r.emoji })),
      ...(gifted.length ? [{ key: "gifted", label: t("filterGifted"), n: gifted.length, emoji: "stk:gift" }] : []),
    ];
    const cur = tabs.some((x) => x.key === filter) ? filter : "all";
    const shown = cur === "all" ? active : cur === "gifted" ? gifted : cur === "private" ? priv : active.filter((w) => w.rooms.includes(cur));
    const q = query.trim().toLowerCase();
    return { tabs, shown: q ? shown.filter((w) => w.title.toLowerCase().includes(q) || (w.note || "").toLowerCase().includes(q)) : shown };
  }, [wishes, rooms, filter, query, t]);
  const cur = tabs.some((x) => x.key === filter) ? filter : "all";
  const add = () => router.push("/wish/new");

  const searchMiss = !!query.trim() && shown.length === 0;
  const rows: (typeof shown)[] = [];
  for (let i = 0; i < shown.length; i += 2) rows.push(shown.slice(i, i + 2));

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title={t("poolTitle")} right={<HeaderAdd onPress={add} label={t("addWish")} />}>
        {/* search only once there is something to search */}
        {wishes.length ? <SearchField value={query} onChangeText={setQuery} placeholder={t("searchWishes")} /> : null}
      </TabHeader>
      <View className="flex-1">
        <ScrollView
          // remounted when the list empties so it starts at the top
          key={wishes.length ? "list" : "empty"}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={wishes.length > 0 && !searchMiss}
          contentContainerStyle={{ flexGrow: wishes.length ? 0 : 1, paddingTop: 16, paddingHorizontal: 16, paddingBottom: wishes.length ? 120 : insets.bottom + 90 }}
          refreshControl={
            <RefreshControl
              tintColor={C.t2}
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refresh().catch(() => {});
                setRefreshing(false);
              }}
            />
          }
        >
          {!searchMiss ? <GuestBanner /> : null}

          {tabs.length > 1 && !searchMiss ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-4" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {tabs.map((x) => (
                <Chip key={x.key} active={cur === x.key} onPress={() => setFilter(x.key)}>
                  {x.emoji ? <Sticker emoji={x.emoji} size={15} /> : x.key === "private" ? <Lock size={14} color={cur === x.key ? C.blueText : C.t2} /> : null}
                  {x.label}
                  <Txt className={`font-m600 text-sm opacity-60 ${cur === x.key ? "text-blueText" : "text-t2"}`}>{x.n}</Txt>
                </Chip>
              ))}
            </ScrollView>
          ) : null}

          {wishes.length === 0 ? (
            <Empty
              fill
              emoji="stk:bear"
              tilt={0}
              title={t("poolEmptyTitle")}
              sub={t("poolEmptySub")}
              action={
                <Pill full icon={<Plus size={19} color="#fff" />} onPress={add}>
                  {t("addWish")}
                </Pill>
              }
            />
          ) : searchMiss ? null : shown.length === 0 ? (
            <Empty compact emoji={cur === "gifted" ? "stk:candle" : "stk:ghost"} tilt={0} title={t("filterEmpty")} sub={t(cur === "gifted" ? "giftedEmptySub" : "filterEmptySub")} />
          ) : (
            <View className="gap-3">
              {rows.map((row, i) => (
                <View key={i} className="flex-row gap-3">
                  {row.map((w) => (
                    <View key={w.id} style={{ flex: 1 }}>
                      <WishCard w={w} />
                    </View>
                  ))}
                  {row.length === 1 ? <View className="flex-1" /> : null}
                </View>
              ))}
            </View>
          )}

        </ScrollView>

        {/* nothing matches the search: text and a button, centred between the
            header and the keyboard (or the tab bar once it's hidden) */}
        {searchMiss ? (
          <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 items-center justify-center px-8" style={{ bottom: Math.max(kb, insets.bottom + 49) }}>
            <Txt className="text-center font-m700 text-lg">{t("searchEmptyTitle")}</Txt>
            <Txt className="mt-2 max-w-[280px] text-center text-[14.5px] leading-5 text-t2">{t("searchEmptySub")}</Txt>
            <View className="mt-6 self-stretch">
              <Pill full icon={<Plus size={19} color="#fff" />} onPress={add}>
                {t("addWish")}
              </Pill>
            </View>
          </View>
        ) : null}
      </View>
      <TabBarFade />
    </View>
  );
}
