// The share extension opens the app with wishpool://dataUrl=<key>; that isn't
// a screen, so send it to the home route and let <ShareIntentHandler/> take it.

import { getShareExtensionKey } from "expo-share-intent";

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return "/";
    return path;
  } catch {
    return "/";
  }
}
