// "Search is open" flag shared by the Wishes screen and the tab layout: while
// it's on, the tab bar hides (like search in Apple's apps) until the search is
// closed with the round × next to the field.

import { useSyncExternalStore } from "react";

let on = false;
const subs = new Set<() => void>();

export function setSearchMode(v: boolean) {
  if (v === on) return;
  on = v;
  subs.forEach((cb) => cb());
}

export function useSearchMode(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => on,
  );
}
