// "Share → Wishpool" from Safari or a shop app: the shared product link opens
// the new-wish sheet with the link filled in, so the preview pulls the name,
// price and photo. Needs a development / store build (not Expo Go).

import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect } from "react";

export function ShareIntentHandler({ ready }: { ready: boolean }) {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  useEffect(() => {
    if (!ready || !hasShareIntent) return;
    const link = shareIntent.webUrl || (shareIntent.text || "").match(/https?:\/\/\S+/)?.[0] || "";
    resetShareIntent();
    if (link) router.push({ pathname: "/wish/new", params: { link } });
  }, [ready, hasShareIntent]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
