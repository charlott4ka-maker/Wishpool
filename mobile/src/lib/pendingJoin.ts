// An invite opened before signing in: kept until the account exists, then the
// invite sheet comes back by itself (sign-in can reset the screens under it).

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "wp_pending_join";
export type PendingJoin = { id: string; from?: string };

/** The invite sheet is on screen, so nothing needs to reopen it. */
export const joinSheet = { open: false };

export const savePendingJoin = (p: PendingJoin) => AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
export const clearPendingJoin = () => AsyncStorage.removeItem(KEY).catch(() => {});
export async function takePendingJoin(): Promise<PendingJoin | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return null;
  await clearPendingJoin();
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
