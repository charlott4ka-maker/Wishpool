// Onboarding page 2: inside a mini phone, a finger taps "+", the add sheet
// slides up, a shop link types itself in, the name/price/photo fill in, the
// finger taps Save and the new card pops into the grid.

import { Check, ImageIcon, Plus, RefreshCw, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";

import { useT } from "../../i18n";
import { C, H } from "../../theme/tokens";
import type { Wish } from "../../types";
import { Sticker } from "../Sticker";
import { Pill, Txt } from "../ui";
import { WishTile } from "../WishTile";
import { measureSpot, MiniBlock, MiniGlass, MiniHeader, MiniPhone, OB_H, Pop, REST, Spot, useScript, useTypewriter } from "./shared";

const wish = (id: string, title: string, price: string, emoji: string, rooms: string[]): Wish => ({
  id, title, price, emoji, rooms, image: null, images: [], link: null, note: "", giftedAt: null,
});
const GRID = [wish("g1", "Свічка", "650 ₴", "stk:candle", ["x"]), wish("g2", "Matcha set", "", "stk:matcha", []), wish("g3", "Книга", "450 ₴", "stk:book", ["x"])];
const SHEET_H = 470;

function Field({ value, placeholder }: { value: string; placeholder: string }) {
  return (
    <View className="mb-3 h-lg justify-center overflow-hidden rounded-full bg-card2 px-4">
      <Txt numberOfLines={1} className="text-base" style={{ color: value ? C.t1 : C.hint }}>{value || placeholder}</Txt>
    </View>
  );
}

export function ObAddScene() {
  const { t, lang } = useT();
  // 1 finger to +, 2 tap, 3 sheet up, 4 link typed, 5 filled in, 6 finger to save, 7 tap, 8 sheet down + new card
  const step = useScript([500, 1200, 1400, 1700, 3000, 3700, 4300, 4500], 7600);
  const root = useRef<View>(null), plus = useRef<View>(null), save = useRef<View>(null);
  const [pos, setPos] = useState<Spot>(REST);
  const sheet = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 0) setPos(REST);
    if (step === 1) measureSpot(plus.current, root.current).then((p) => p && setPos(p));
    if (step === 6) measureSpot(save.current, root.current).then((p) => p && setPos(p));
    if (step === 8) setPos(REST);
    Animated.timing(sheet, { toValue: step >= 3 && step < 8 ? 1 : 0, duration: 450, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = step >= 7 ? 2 : step >= 2 ? 1 : 0;
  const link = useTypewriter(step >= 4 ? "rozetka.com.ua/headphones" : "");
  const filled = step >= 5;
  const newCard = wish("n", lang === "en" ? "Headphones" : lang === "ru" ? "Наушники" : "Навушники", lang === "en" ? "$99" : "4 200 ₴", "stk:headphones", []);
  const items = step >= 8 ? [newCard, ...GRID] : GRID;
  const rows = [items.slice(0, 2), items.slice(2, 4)];

  return (
    <MiniPhone rootRef={root} finger={pos} tap={tap}>
      {/* the Wishes tab as it is now: header block with the search, then the content block */}
      <View style={{ flex: 1 }}>
        <MiniHeader>
          <View className="flex-row items-center justify-between px-1 pb-3 pt-1.5">
            <Txt className="font-m800 text-[26px]" style={{ letterSpacing: -0.5 }}>{t("poolTitle")}</Txt>
            <View ref={plus} collapsable={false}>
              <MiniGlass size={H.lg}>
                <Plus size={24} color={C.t1} />
              </MiniGlass>
            </View>
          </View>
          <View className="h-sm flex-row items-center gap-2 rounded-full bg-card2 px-4">
            <Search size={17} color={C.hint} />
            <Txt className="text-[16px]" style={{ color: C.hint }}>{t("searchWishes")}</Txt>
          </View>
        </MiniHeader>
        <MiniBlock>
        <View className="gap-3">
          {rows.map((row, i) => (
            <View key={i} className="flex-row gap-3">
              {row.map((w) => (w.id === "n" ? <Pop key={w.id}><WishTile w={w} onPress={() => {}} /></Pop> : <WishTile key={w.id} w={w} onPress={() => {}} />))}
              {row.length === 1 ? <View className="flex-1" /> : null}
            </View>
          ))}
        </View>
        </MiniBlock>
      </View>

      <Animated.View
        style={{
          position: "absolute", left: 0, right: 0, top: OB_H - SHEET_H, height: SHEET_H, zIndex: 10,
          backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 16, paddingTop: 8,
          transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [SHEET_H * 1.05, 0] }) }],
        }}
      >
        <View className="mx-auto mb-4 mt-1.5 h-1 w-10 rounded bg-card2" />
        <View className="mb-4 flex-row items-center justify-between">
          <Txt className="font-m800 text-xl">{t("newWish")}</Txt>
          <MiniGlass>
            <X size={18} color={C.t1} />
          </MiniGlass>
        </View>
        <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-tile bg-card2">
          {filled ? <Pop><View className="flex-1 items-center justify-center"><Sticker emoji="stk:headphones" size={44} /></View></Pop> : <ImageIcon size={26} color={C.t3} />}
        </View>
        <Field value={link && "https://" + link} placeholder="https://…" />
        <View className="-mt-1 mb-3 flex-row items-center gap-2">
          {filled ? <Check size={13} color={C.greenText} /> : step >= 4 ? <RefreshCw size={13} color={C.t3} /> : null}
          <Txt className={`text-[12.5px] ${filled ? "text-greenText" : "text-t3"}`}>{filled ? t("linkDone") : step >= 4 ? t("linkLoading") : t("linkHint")}</Txt>
        </View>
        <Field value={filled ? newCard.title : ""} placeholder={t("whatYouWantPh")} />
        <Field value={filled ? newCard.price : ""} placeholder={lang === "en" ? "$50" : "4 200 ₴"} />
        <View ref={save} collapsable={false} style={{ height: H.lg }}>
          <Pill full onPress={() => {}}>{t("saveWish")}</Pill>
        </View>
      </Animated.View>
    </MiniPhone>
  );
}
