// Premium handed out on the admin page (a gift: for a while or forever, no
// purchase). It comes with /state; the subscription context adds it to the
// store's own status, so a gift unlocks everything a purchase does.
import { useEffect, useState } from "react";

export type Gift = { until: number; forever: boolean } | null;

let gift: Gift = null;
const subs = new Set<(g: Gift) => void>();

export function setGift(g: Gift | undefined) {
  const next = g && typeof g.until === "number" ? { until: g.until, forever: !!g.forever } : null;
  if (next?.until === gift?.until && next?.forever === gift?.forever) return;
  gift = next;
  subs.forEach((cb) => cb(next));
}

export const giftActive = (g: Gift) => !!g && g.until > Date.now();

export function useGift(): Gift {
  const [g, setG] = useState(gift);
  useEffect(() => {
    subs.add(setG);
    setG(gift);
    return () => {
      subs.delete(setG);
    };
  }, []);
  return g;
}
