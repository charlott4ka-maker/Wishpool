// "Бажання": the wish pool. Filter chips (all / private / per room / gifted),
// a two-column grid of wish cards, the wish sheet on tap.

import { useRouter } from "expo-router";
import { Lock, Plus } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GUEST_OVERLAP, GuestBanner, useGuestBanner } from "../../../components/GuestBanner";
import { RemoteBanner, useRemoteBanner } from "../../../components/RemoteBanner";
import { Sticker } from "../../../components/Sticker";
import { SearchField } from "../../../components/SearchField";
import { Chip, Empty, HeaderAdd, Pill, Txt } from "../../../components/ui";
import { WishGridSkeleton } from "../../../components/Skeleton";
import { WishCard } from "../../../components/WishCard";
import { TabBarFade } from "../../../components/TabBarFade";
import { Block, BLOCK_GAP, BLOCK_R, TabHeader } from "../../../components/TabHeader";
import { useT } from "../../../i18n";
import { useGridColumns } from "../../../lib/gridColumns";
import { usePullRefresh } from "../../../lib/pullRefresh";
import { setSearchMode } from "../../../lib/searchMode";
import { useKeyboardHeight } from "../../../lib/useKeyboardHeight";
import { useWishpool } from "../../../store/WishpoolContext";
import { C } from "../../../theme/tokens";

export default function PoolScreen() {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wishes, rooms, ready, refresh } = useWishpool();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searching, setSearchingState] = useState(false);
  // the tab layout hides the tab bar while the search is open
  const setSearching = (v: boolean) => {
    setSearchingState(v);
    setSearchMode(v);
  };
  useEffect(() => () => setSearchMode(false), []);
  const pull = usePullRefresh(refresh);
  const kb = useKeyboardHeight();
  // Where the content frame really ends on screen, so the "nothing found"
  // state centres between the header and whatever covers the frame's bottom:
  // the keyboard, or the tab bar once it's down.
  const frame = useRef<View>(null);
  const { height: winH } = useWindowDimensions();
  const [frameBottom, setFrameBottom] = useState(winH);
  const measureFrame = () => frame.current?.measureInWindow((_x, y, _w, h) => setFrameBottom(y + h));
  const covered = winH - (kb > 0 ? kb : searching ? insets.bottom : insets.bottom + 49); // top edge of what covers the screen (no tab bar while searching)
  const missBottom = Math.max(0, frameBottom - covered);
  // the sign-in strip steps aside while searching
  // one strip under the header: a banner from the admin page if there is one
  // for this user, else the guest sign-in strip; none while searching
  const { banner, close: closeBanner } = useRemoteBanner();
  const remote = !searching && banner ? banner : null;
  const guest = useGuestBanner() && !searching && !remote;
  const strip = guest || !!remote;

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
  const cols = useGridColumns();
  const rows: (typeof shown)[] = [];
  for (let i = 0; i < shown.length; i += cols) rows.push(shown.slice(i, i + cols));

  return (
    <View className="flex-1 bg-bg">
      <TabHeader title={t("poolTitle")} right={<HeaderAdd onPress={add} label={t("addWish")} />} searching={searching && wishes.length > 0}>
        {/* search only once there is something to search; while it's active the title folds away */}
        {wishes.length ? (
          <SearchField value={query} onChangeText={setQuery} placeholder={t("searchWishes")} active={searching} onFocusChange={setSearching} />
        ) : null}
      </TabHeader>
      {/* the guest strip stays put; the content block below overlaps its lower part */}
      {remote ? <RemoteBanner banner={remote} onClose={() => closeBanner(remote.id)} /> : guest ? <GuestBanner /> : null}
      {/* The content block is a fixed frame (rounded top, block fill down to the
          bottom) and the list scrolls inside it, so the 4pt gap under the header
          and the block's fill under the tab bar stay put while scrolling. */}
      <View
        ref={frame}
        onLayout={measureFrame}
        style={{ flex: 1, marginTop: strip ? -GUEST_OVERLAP : BLOCK_GAP, backgroundColor: C.card, borderTopLeftRadius: BLOCK_R, borderTopRightRadius: BLOCK_R, overflow: "hidden" }}
      >
        <ScrollView showsVerticalScrollIndicator={false}
          // remounted when the list empties so it starts at the top
          key={wishes.length ? "list" : "empty"}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={wishes.length > 0 && !searchMiss}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl tintColor={C.t2} refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
          }
        >
          <Block grow style={{ paddingBottom: wishes.length ? 120 : insets.bottom + 90 }}>
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

          {!ready ? (
            <WishGridSkeleton />
          ) : wishes.length === 0 ? (
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
                  {Array.from({ length: cols - row.length }, (_, k) => <View key={"pad" + k} className="flex-1" />)}
                </View>
              ))}
            </View>
          )}
          </Block>
        </ScrollView>

        {/* nothing matches the search: eyes, text and a button, centred between the
            header and the keyboard (or the tab bar once it's hidden) */}
        {searchMiss ? (
          <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 items-center justify-center px-8" style={{ bottom: missBottom }}>
            {/* looking around and finding nothing */}
            <Sticker emoji="stk:eyes" size={72} />
            <Txt className="mt-6 text-center font-m700 text-lg">{t("searchEmptyTitle")}</Txt>
            <Txt className="mt-1 max-w-[280px] text-center text-[14.5px] leading-5 text-t2">{t("searchEmptySub")}</Txt>
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
