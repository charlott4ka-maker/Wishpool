// Everything about one wish: photos, price, shop link (affiliate), which rooms
// see it, "I got it", delete. Shown in the native sheet at app/wish/[id].tsx.

import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Link2, Lock, PartyPopper, Pencil, Trash2, Undo2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import { useT } from "../i18n";
import { linkHost } from "../services/affiliate/urlCleanup";
import { wishImages } from "../store/WishpoolContext";
import { C } from "../theme/tokens";
import type { Room, Wish } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import { Sticker } from "./Sticker";
import { WishNote } from "./WishRow";
import { Chip, Pill, Txt } from "./ui";

const PHOTO_H = 260;

export function WishDetails({
  w, rooms, onToggleRoom, onEdit, onGifted, onDelete,
}: {
  w: Wish; rooms: Room[]; onToggleRoom: (id: string, roomId: string) => void;
  onEdit: () => void; onGifted: (gifted: boolean) => void; onDelete: () => void;
}) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const imgs = wishImages(w);
  const [cur, setCur] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null); // full-screen photo
  const [stripW, setStripW] = useState(0);
  const photoW = stripW || width - 32;
  const confirm = (text: string, yes: () => void) => Alert.alert("", text, [{ text: t("back"), style: "cancel" }, { text: "OK", onPress: yes }]);
  const shareable = rooms.filter((r) => r.type !== "birthday" || r.iAmCelebrant);
  return (
    <>
      {imgs.length ? (
        // fixed height: in a fit-to-content sheet a horizontal ScrollView
        // otherwise mis-measures and pushes everything around
        // photos are as wide as the strip itself (measured), so they fill it edge to edge
        <View onLayout={(e) => setStripW(e.nativeEvent.layout.width)} style={{ height: PHOTO_H, marginTop: -8, borderRadius: 26, overflow: "hidden", backgroundColor: C.card2 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ height: PHOTO_H, flexGrow: 0 }}
            onScroll={(e) => setCur(Math.round(e.nativeEvent.contentOffset.x / photoW))}
            scrollEventThrottle={32}
          >
            {imgs.map((src, i) => (
              <Pressable key={i} onPress={() => setViewer(i)}>
                <Image source={{ uri: src }} style={{ width: photoW, height: PHOTO_H }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
          {imgs.length > 1 ? (
            <>
              <View pointerEvents="none" className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1">
                <Txt className="font-m600 text-[12.5px] text-white">{cur + 1}/{imgs.length}</Txt>
              </View>
              <View pointerEvents="none" className="absolute bottom-2.5 left-0 right-0 flex-row justify-center gap-2">
                {imgs.map((_, i) => (
                  <View key={i} style={{ width: i === cur ? 18 : 6, height: 6, borderRadius: 6, backgroundColor: i === cur ? "#fff" : "rgba(255,255,255,0.5)" }} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <View className="items-center pb-4 pt-2">
          <Sticker emoji={w.emoji} size={88} rotate={-6} />
        </View>
      )}
      <Txt className="mt-4 font-m800 text-xl leading-6">{w.title}</Txt>
      {w.price ? <Txt className="mt-1 font-m700 text-[17px] text-blueText">{w.price}</Txt> : null}
      {w.link ? (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(w.link!)} className="mt-3 h-sm flex-row items-center gap-2 self-start rounded-full bg-blueSoft px-4">
          <Link2 size={15} color={C.blueText} />
          <Txt numberOfLines={1} className="font-m600 text-sm text-blueText">{linkHost(w.link)}</Txt>
        </Pressable>
      ) : null}
      {w.note ? <View className="mt-4"><WishNote text={w.note} /></View> : null}
      {viewer != null ? <ImageLightbox images={imgs} start={viewer} onClose={() => setViewer(null)} /> : null}
      <View className="mt-6 flex-row gap-2">
        {!w.giftedAt ? <Pill size="sm" kind="ghost" icon={<Pencil size={15} color={C.t1} />} onPress={onEdit}>{t("editShort")}</Pill> : null}
        {w.giftedAt ? (
          <Pill size="sm" kind="ghost" icon={<Undo2 size={15} color={C.t1} />} onPress={() => onGifted(false)}>{t("ungift")}</Pill>
        ) : (
          <Pill size="sm" kind="green" onPress={() => confirm(t("giftedHint"), () => onGifted(true))}>
            <Txt className="font-m600 text-sm text-greenText">{t("gotIt")}</Txt>
            <Sticker emoji="stk:gift" size={18} style={{ margin: -8 }} />
          </Pill>
        )}
      </View>
      {w.giftedAt ? (
        <View className="mt-4 flex-row items-center gap-2">
          <PartyPopper size={14} color={C.t2} />
          <Txt className="text-[13px] text-t2">{t("giftedBadge")}</Txt>
        </View>
      ) : (
        <>
          <Txt className="mb-2 mt-6 font-m600 text-[13px] text-t2">{t("showInRooms")}</Txt>
          <View className="flex-row flex-wrap gap-2">
            {shareable.length === 0 ? (
              <Txt className="text-[12.5px] text-t3">{t("noRoomsHint")}</Txt>
            ) : (
              shareable.map((r) => (
                <Chip key={r.id} active={w.rooms.includes(r.id)} color={r.tint} onPress={() => onToggleRoom(w.id, r.id)}>
                  <Sticker emoji={r.emoji} size={15} />
                  {r.name}
                </Chip>
              ))
            )}
          </View>
          {w.rooms.length === 0 && rooms.length > 0 ? (
            <View className="mt-3 flex-row items-center gap-2">
              <Lock size={13} color={C.t3} />
              <Txt className="text-[12.5px] text-t3">{t("privateNote")}</Txt>
            </View>
          ) : null}
        </>
      )}
      <Pressable onPress={() => confirm(t("confirmDeleteWish"), onDelete)} className="mt-4 h-sm flex-row items-center gap-2">
        <Trash2 size={16} color={C.danger} />
        <Txt className="font-m600 text-sm text-danger">{t("deleteWish")}</Txt>
      </Pressable>
    </>
  );
}
