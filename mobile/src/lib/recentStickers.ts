// "Recent" stickers (the chip in the wish form and the room look sheet): a
// sticker joins the list only once a wish or a room is saved with it, not on
// a tap in the picker. Kept on the phone, newest first.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const RECENT_KEY = "wp_recent_stickers";
const MAX = 21;

export function rememberStickers(list: (string | null | undefined)[]) {
  // the same sticker twice in one save (a room's main sticker also put on as a charm) went in twice
  const add = uniqueStickers(list.filter((e): e is string => !!e && e.startsWith("stk:")));
  if (!add.length) return;
  AsyncStorage.getItem(RECENT_KEY)
    .then((raw) => {
      const cur: string[] = raw ? JSON.parse(raw) : [];
      return AsyncStorage.setItem(RECENT_KEY, JSON.stringify([...add, ...cur.filter((x) => !add.includes(x))].slice(0, MAX)));
    })
    .catch(() => {});
}

/** one of each, first one wins (older lists saved with doubles are cleaned when read) */
export function uniqueStickers(list: string[]): string[] {
  return list.filter((e, i) => list.indexOf(e) === i);
}
