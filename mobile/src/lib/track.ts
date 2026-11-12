// A few picks counted on the admin page (Аналитика › Популярное): the app colour,
// the icon, the paywall. Signed-in people only, batched, never in the way.
import { api } from "../services/api";

let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let signedIn = false;
export const setTrackSignedIn = (v: boolean) => {
  signedIn = v;
};

export function track(name: string) {
  if (!signedIn || !api.configured() || !/^[a-z0-9_]{2,40}$/.test(name)) return;
  queue.push(name);
  if (timer) return;
  timer = setTimeout(() => {
    const names = queue.slice(0, 30);
    queue = [];
    timer = null;
    api.ev(names).catch(() => {});
  }, 1500);
}
