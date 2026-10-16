// Everything about one wish: photos, price, shop link (affiliate), which rooms
// see it, "I got it", delete. Shown in the native sheet at app/wish/[id].tsx.

import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Link2, Lock, PartyPopper, Pencil, Trash2, Undo2 } from "lucide-react-native";
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import { useT } from "../i18n";
import { linkHost } from "../services/affiliate/urlCleanup";
import { wishImages } from "../store/WishpoolContext";
import { C } from "../theme/tokens";
import type { Room, Wish } from "../types";
import { Sticker } from "./Sticker";
import { Chip, Pill, Txt } from "./ui";

export function WishDetails({
  w, rooms, onToggleRoom, onEdit, onGifted, onDelete,
}: {
  w: Wish; rooms: Room[]; onToggleRoom: (id: string, roomId: string) => void;
  onEdit: () => void; onGifted: (gifted: boolean) => void; onDelete: () => void;
}) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const imgs = wishImages(w);
  const confirm = (text: string, yes: () => void) => Alert.alert("", text, [{ text: t("back"), style: "cancel" }, { text: "OK", onPress: yes }]);
  const shareable = rooms.filter((r) => r.type !== "birthday" || r.iAmCelebrant);
  return (
    <>
      {imgs.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="overflow-hidden rounded-card">
          {imgs.map((src, i) => (
            <Image key={i} source={{ uri: src }} style={{ width: width - 32, height: 260 }} contentFit="cover" />
          ))}
        </ScrollView>
      ) : (
        <View className="items-center pb-4 pt-2">
          <Sticker emoji={w.emoji} size={88} rotate={-6} />
        </View>
      )}
      <Txt className="mt-3 font-m800 text-xl leading-6">{w.title}</Txt>
      {w.price ? <Txt className="mt-1 font-m700 text-[17px] text-blueText">{w.price}</Txt> : null}
      {w.link ? (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(w.link!)} className="mt-3 h-sm flex-row items-center gap-2 self-start rounded-full bg-blueSoft px-4">
          <Link2 size={15} color={C.blueText} />
          <Txt numberOfLines={1} className="font-m600 text-sm text-blueText">{linkHost(w.link)}</Txt>
        </Pressable>
      ) : null}
      {w.note ? <Txt className="mt-4 text-[14.5px] leading-5 text-t2">{w.note}</Txt> : null}
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
