// A new over-the-air update shows up on this launch, not the next one: while
// the splash screen is still up, check for an update and, if it downloads
// within a few seconds, restart into it. On a slow connection the app opens as
// it is and the update (still downloading in the background) applies next time.

import * as Updates from "expo-updates";

const WAIT_MS = 3000;

let started: Promise<void> | null = null;

export function quickUpdate(): Promise<void> {
  if (started) return started;
  started = (async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    const attempt = (async () => {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return false;
      const got = await Updates.fetchUpdateAsync();
      return got.isNew;
    })();
    const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), WAIT_MS));
    try {
      if (await Promise.race([attempt, timeout])) await Updates.reloadAsync();
    } catch {
      // offline or the server is down: open what we have
    }
  })();
  return started;
}
