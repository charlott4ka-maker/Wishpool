// "Бажання": the wish pool. Filter chips (all / private / per room / gifted),
// a two-column grid of wish cards, the wish sheet on tap.

import { useRouter } from "expo-router";
import { Lock, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { GuestBanner } from "../../components/GuestBanner";
import { Sticker } from "../../components/Sticker";
import { Chip, Empty, HeaderAdd, Pill, ScreenTitle, Txt } from "../../components/ui";
import { WishSheet } from "../../components/WishSheet";
import { WishTile } from "../../components/WishTile";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { useWishpool } from "../../store/WishpoolContext";
import { C } from "../../theme/tokens";

export default function PoolScreen() {
  const { t } = useT();
  const router = useRouter();
  const { wishes, rooms, refresh, toggleWishRoom, setGifted, deleteWish } = useWishpool();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

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
    return { tabs, shown };
  }, [wishes, rooms, filter, t]);
  const cur = tabs.some((x) => x.key === filter) ? filter : "all";
  const open = wishes.find((w) => w.id === openId) || null;
  const add = () => router.push("/wish/new");

  const rows: (typeof shown)[] = [];
  for (let i = 0; i < shown.length; i += 2) rows.push(shown.slice(i, i + 2));

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 32 }}
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
        <GuestBanner />
        <ScreenTitle title={t("poolTitle")} sub={t("poolSub")} right={<HeaderAdd onPress={add} label={t("addWish")} />} />

        {tabs.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 -mt-2 mb-4" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
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
          <Empty emoji="stk:bear" tilt={0} title={t("poolEmptyTitle")} sub={t("poolEmptySub")} />
        ) : shown.length === 0 ? (
          <Empty compact emoji={cur === "gifted" ? "stk:candle" : "stk:ghost"} tilt={0} title={t("filterEmpty")} sub={t(cur === "gifted" ? "giftedEmptySub" : "filterEmptySub")} />
        ) : (
          <View className="gap-3">
            {rows.map((row, i) => (
              <View key={i} className="flex-row gap-3">
                {row.map((w) => (
                  <WishTile key={w.id} w={w} onPress={() => setOpenId(w.id)} />
                ))}
                {row.length === 1 ? <View className="flex-1" /> : null}
              </View>
            ))}
          </View>
        )}

        <View className="mt-6">
          <Pill full icon={<Plus size={19} color="#fff" />} onPress={add}>
            {t("addWish")}
          </Pill>
        </View>
      </ScrollView>

      <WishSheet
        w={open}
        rooms={rooms}
        onClose={() => setOpenId(null)}
        onToggleRoom={toggleWishRoom}
        onEdit={() => {
          setOpenId(null);
          router.push({ pathname: "/wish/new", params: { id: open!.id } });
        }}
        onGifted={(g) => {
          setOpenId(null);
          haptic(g ? "success" : "light");
          setGifted(open!.id, g).catch(() => {});
        }}
        onDelete={() => {
          setOpenId(null);
          deleteWish(open!.id).catch(() => {});
        }}
      />
    </View>
  );
}
