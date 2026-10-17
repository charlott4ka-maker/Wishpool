// New / edit wish. Paste a product link and the title, price and photo are
// filled in from the page (OG tags). On save the link is turned into our
// affiliate link when the shop is a known one (services/affiliateConverter).
// Photo count follows the plan: 1 on Free, more with Premium.

import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Crown, ImageIcon, Lock, Plus, RefreshCw, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Press } from "../../components/Press";
import { Sticker } from "../../components/Sticker";
import { StickerPicker } from "../../components/StickerPicker";
import { Chip, Field, Pill, Segmented, Txt } from "../../components/ui";
import { SheetHeader } from "../../components/SheetHeader";
import { useT } from "../../i18n";
import { haptic } from "../../lib/haptics";
import { priceRangeText, RANGE_RE, withCurrency } from "../../lib/price";
import { toAffiliateUrl } from "../../services/affiliateConverter";
import { fetchLinkPreview } from "../../services/linkPreview";
import { useWishpool, wishImages } from "../../store/WishpoolContext";
import { PLAN_LIMITS, PREMIUM_ENABLED } from "../../subscription/featureFlags";
import { useSubscription } from "../../subscription/SubscriptionContext";
import { C } from "../../theme/tokens";

type LinkState = null | "loading" | "done" | "guess" | "fail";

// Same size/quality as compressImage() in the Mini App: keeps request bodies small.
async function toDataUrl(uri: string): Promise<string> {
  const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1000 } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${r.base64}`;
}

export default function AddWishScreen() {
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // link: shared into Wishpool from another app (ShareIntentHandler)
  // room: "New wish" from inside a room puts it in that room right away
  const { id, link: sharedLink, room: presetRoom } = useLocalSearchParams<{ id?: string; link?: string; room?: string }>();
  const { wishes, rooms, addWish, updateWish } = useWishpool();
  const { photoLimit, isPremium } = useSubscription();
  const initial = id ? wishes.find((w) => w.id === id) : undefined;

  const [title, setTitle] = useState(initial?.title || "");
  // "Price" or "From / to", like the Mini App; an existing range is split back
  const initRange = initial?.price ? initial.price.match(RANGE_RE) : null;
  const [price, setPrice] = useState(initRange ? "" : initial?.price || "");
  const [priceMode, setPriceMode] = useState<"one" | "range">(initRange ? "range" : "one");
  const [priceA, setPriceA] = useState(initRange ? initRange[1] : "");
  const [priceB, setPriceB] = useState(initRange ? initRange[2] : "");
  const [note, setNote] = useState(initial?.note || "");
  // Editing: show the shop's own URL, not our affiliate redirect.
  const initialLink = initial?.link ? toAffiliateUrl(initial.link).clean : "";
  const [link, setLink] = useState(initialLink || sharedLink || "");
  const [emoji, setEmoji] = useState(initial?.emoji?.startsWith("stk:") ? initial.emoji : "stk:candle");
  const [images, setImages] = useState<string[]>(initial ? wishImages(initial) : []);
  const [cover, setCover] = useState<"photo" | "emoji">(initial && !wishImages(initial).length ? "emoji" : "photo");
  const [inRooms, setInRooms] = useState<string[]>(presetRoom ? [presetRoom] : []);
  const [busy, setBusy] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>(null);
  const [gridW, setGridW] = useState(0);
  const tile = gridW ? (gridW - 16) / 3 : "31%";

  // The product name from a link replaces the title even if something was
  // typed (only a guessed one leaves typed text alone); price and photo only
  // replace what an earlier link filled in, never what the user typed.
  const lastLink = useRef(initialLink.trim());
  const resolved = useRef<string | null>(null);
  const auto = useRef({ title: "", price: "", image: null as string | null });
  const fill = useRef({ title, price });
  fill.current = { title, price };

  useEffect(() => {
    const url = link.trim();
    if (!/^https?:\/\/[^\s/]+\.[^\s]+/i.test(url) || url === lastLink.current) return;
    const timer = setTimeout(async () => {
      lastLink.current = url;
      setLinkState("loading");
      try {
        const p = await fetchLinkPreview(url);
        if (lastLink.current !== url) return;
        resolved.current = p.url;
        const a = auto.current, cur = fill.current;
        const mine = (v: string, prev: string) => !v.trim() || v === prev;
        if (p.title && (!p.guess || mine(cur.title, a.title))) {
          setTitle(p.title);
          a.title = p.title;
        }
        if (p.price && mine(cur.price, a.price)) {
          setPrice(p.price);
          a.price = p.price;
        }
        const prev = a.image;
        a.image = p.image;
        setImages((xs) => {
          const rest = prev ? xs.filter((x) => x !== prev) : xs;
          return p.image && rest.length < photoLimit ? [p.image, ...rest] : rest;
        });
        if (p.image) setCover("photo");
        setLinkState(p.guess ? "guess" : "done");
        haptic(p.guess ? "warning" : "success");
      } catch {
        if (lastLink.current === url) setLinkState("fail");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [link, photoLimit]);

  const pickPhotos = async () => {
    const left = photoLimit - images.length;
    if (left <= 0) return;
    haptic("light");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: left > 1, selectionLimit: left, quality: 1 });
    if (res.canceled) return;
    setImages((xs) => [...xs, ...res.assets.map((a) => a.uri)].slice(0, photoLimit));
  };

  const submit = async () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    try {
      const pics = cover === "photo" ? await Promise.all(images.slice(0, photoLimit).map((u) => (/^(https?|data):/.test(u) ? u : toDataUrl(u)))) : [];
      // Convert the shop's final URL (short links resolved by the preview) when we have it.
      const raw = link.trim();
      const affiliate = raw ? toAffiliateUrl(resolved.current && raw === lastLink.current ? resolved.current : raw).url : null;
      const data = { emoji, images: pics, image: pics[0] || null, link: affiliate, title: title.trim(), price: priceMode === "range" ? priceRangeText(priceA.trim(), priceB.trim(), lang, t) : withCurrency(price, lang), note: note.trim(), rooms: inRooms };
      if (initial) await updateWish(initial.id, data);
      else await addWish(data);
      haptic("success");
      router.back();
    } catch {
      setBusy(false);
      haptic("error");
    }
  };

  const hintColor = linkState === "fail" ? "#FF8A80" : linkState === "guess" ? "#FFB27A" : linkState === "done" ? C.greenText : C.t3;
  const hint = linkState === "loading" ? t("linkLoading") : linkState === "done" ? t("linkDone") : linkState === "fail" ? t("linkFail") : linkState === "guess" ? t("linkGuess") : t("linkHint");
  const shareable = rooms.filter((r) => r.type !== "birthday" || r.iAmCelebrant);

  return (
    <ScrollView className="flex-1 bg-card" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: insets.bottom + 32 }}>
      <SheetHeader title={t(initial ? "editWish" : "newWish")} />

      <Segmented options={[["photo", t("photo")], ["emoji", t("emojiTab")]]} value={cover} onChange={setCover} neutral className="mb-4 bg-card2" />

      {cover === "photo" ? (
        <View className="mb-4">
          {images.length ? (
            // 3-column grid; photos fade in and out, the rest slide over (no bounce)
            <View className="flex-row gap-2" onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
              {images.map((src) => (
                <Animated.View
                  key={src}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(160)}
                  layout={LinearTransition.duration(200)}
                  style={{ width: tile, aspectRatio: 1, overflow: "hidden", borderRadius: 18, backgroundColor: C.card2 }}
                >
                  <Image source={{ uri: src }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
                  <Press
                    scaleTo={0.85}
                    onPress={() => {
                      haptic("light");
                      setImages((xs) => xs.filter((x) => x !== src));
                    }}
                    className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/60"
                    accessibilityLabel={t("remove")}
                  >
                    <X size={15} color="#fff" />
                  </Press>
                </Animated.View>
              ))}
              {images.length < photoLimit ? (
                <Animated.View layout={LinearTransition.duration(200)} style={{ width: tile }}>
                  <Press scaleTo={0.92} onPress={pickPhotos} className="aspect-square items-center justify-center rounded-tile bg-card2" accessibilityLabel={t("uploadPhoto")}>
                    <Plus size={24} color={C.t2} />
                  </Press>
                </Animated.View>
              ) : PREMIUM_ENABLED && !isPremium ? (
                <Press onPress={() => router.push("/paywall")} className="aspect-square items-center justify-center gap-1 rounded-tile bg-gold/10" style={{ width: tile }}>
                  <Lock size={18} color={C.gold} />
                  <Txt className="font-m600 text-[11.5px] text-gold">Premium</Txt>
                </Press>
              ) : null}
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(220)}>
              <Press scaleTo={0.97} onPress={pickPhotos} className="items-center gap-2 rounded-card bg-card2 p-6">
                <ImageIcon size={26} color={C.t2} />
                <Txt className="font-m600 text-sm text-t2">{t("uploadPhoto")}</Txt>
                <Txt className="text-[12.5px] text-t3">{t("photosHint")}</Txt>
              </Press>
            </Animated.View>
          )}
          {PREMIUM_ENABLED ? (
          <View className="mt-2 flex-row items-center gap-1">
            {!isPremium ? <Crown size={12} color={C.t3} /> : null}
            <Txt className="text-[12.5px] text-t3">
              {isPremium ? `${t("photosHint")} · ${images.length}/${photoLimit}` : t("photosLimitFree", { n: PLAN_LIMITS.premium.photosPerWish })}
            </Txt>
          </View>
          ) : images.length ? (
            <Txt className="mt-2 text-[12.5px] text-t3">{`${t("photosHint")} · ${images.length}/${photoLimit}`}</Txt>
          ) : null}
        </View>
      ) : (
        <View className="mb-4">
          <StickerPicker value={emoji} onChange={setEmoji} />
        </View>
      )}

      <Field label={t("linkLabel")} value={link} onChangeText={setLink} placeholder="https://…" keyboardType="url" autoCapitalize="none" />
      <View className="-mt-2 mb-4 flex-row items-center gap-2">
        {linkState === "loading" ? <RefreshCw size={13} color={hintColor} /> : linkState === "done" ? <Check size={13} color={hintColor} /> : !linkState ? <Sticker emoji="stk:tag" size={14} style={{ margin: -5 }} /> : null}
        <Txt className="flex-1 text-[12.5px]" style={{ color: hintColor }}>{hint}</Txt>
      </View>
      <Field label={t("whatYouWant")} value={title} onChangeText={setTitle} placeholder={t("whatYouWantPh")} />
      <View className="mb-2 flex-row items-center justify-between">
        <Txt className="font-m600 text-[13px] text-t2">{t("priceOpt")}</Txt>
        <View className="h-sm flex-row gap-1 rounded-full bg-card2 p-1">
          {([["one", t("priceOne")], ["range", t("priceRangeTab")]] as const).map(([k, l]) => (
            <Pressable
              key={k}
              onPress={() => {
                if (k === priceMode) return;
                haptic("select");
                // carry what was typed over to the other mode
                if (k === "range") {
                  setPriceA(price);
                  setPriceB("");
                } else setPrice(priceB || priceA);
                setPriceMode(k);
              }}
              className="justify-center rounded-full px-3"
              style={{ backgroundColor: priceMode === k ? "#3A3A3E" : "transparent" }}
            >
              <Txt className={`font-m600 text-[12.5px] ${priceMode === k ? "text-white" : "text-t2"}`}>{l}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
      {priceMode === "one" ? (
        <Field value={price} onChangeText={setPrice} placeholder={lang === "en" ? "$50" : "4 200 ₴"} />
      ) : (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Field value={priceA} onChangeText={setPriceA} placeholder={t("priceFrom") + (lang === "en" ? " $20" : " 1 000")} />
          </View>
          <View className="flex-1">
            <Field value={priceB} onChangeText={setPriceB} placeholder={t("priceTo") + (lang === "en" ? " $50" : " 2 000 ₴")} />
          </View>
        </View>
      )}
      <Field label={t("noteLabel")} value={note} onChangeText={setNote} placeholder={t("notePh")} multiline />

      {!initial ? (
        <>
          <Txt className="mb-2 mt-1.5 font-m600 text-[13px] text-t2">{t("showInRooms")}</Txt>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {shareable.map((r) => (
              <Chip key={r.id} active={inRooms.includes(r.id)} color={r.tint} onPress={() => setInRooms((x) => (x.includes(r.id) ? x.filter((i) => i !== r.id) : [...x, r.id]))}>
                <Sticker emoji={r.emoji} size={15} />
                {r.name}
              </Chip>
            ))}
          </View>
          <View className="mb-6 flex-row items-center gap-2">
            <Lock size={13} color={C.t3} />
            <Txt className="text-[12.5px] text-t3">{t("nothingSelectedPrivate")}</Txt>
          </View>
        </>
      ) : (
        <View className="h-2" />
      )}

      <Pill full disabled={!title.trim() || busy} onPress={submit}>
        {busy ? t("savingWish") : t(initial ? "saveChanges" : "saveWish")}
      </Pill>
    </ScrollView>
  );
}
