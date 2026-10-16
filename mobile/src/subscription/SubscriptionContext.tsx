import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { photoLimit, isStickerLocked, canUse, PremiumFeature } from "./featureFlags";
import { PremiumPackage, purchases } from "./purchases";

type SubscriptionValue = {
  isPremium: boolean;
  loading: boolean;
  /** True when purchases are simulated (Expo Go, dev build without a RevenueCat key). */
  mock: boolean;
  packages: PremiumPackage[];
  purchase: (pkg: PremiumPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  // feature flags, already bound to the current plan
  photoLimit: number;
  can: (feature: PremiumFeature) => boolean;
  isStickerLocked: (emoji: string) => boolean;
};

const SubscriptionCtx = createContext<SubscriptionValue | null>(null);

export function SubscriptionProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const [isPremium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PremiumPackage[]>([]);

  const refresh = useCallback(async () => {
    try {
      setPremium(await purchases.isPremium());
    } catch {
      /* offline: keep the last known status */
    }
  }, []);

  // Re-identify with RevenueCat whenever the signed-in user changes, so a
  // subscription follows the Wishpool account, not the device.
  useEffect(() => {
    let live = true;
    setLoading(true);
    (async () => {
      try {
        await purchases.init(userId);
        const [p, pk] = await Promise.all([purchases.isPremium(), purchases.packages().catch(() => [])]);
        if (!live) return;
        setPremium(p);
        setPackages(pk);
      } catch {
        /* store unreachable: stay on Free */
      } finally {
        if (live) setLoading(false);
      }
    })();
    const off = purchases.onChange(setPremium);
    return () => {
      live = false;
      off();
    };
  }, [userId]);

  const purchase = useCallback(async (pkg: PremiumPackage) => {
    const ok = await purchases.purchase(pkg);
    if (ok) setPremium(true);
    return ok;
  }, []);

  const restore = useCallback(async () => {
    const ok = await purchases.restore();
    setPremium(ok);
    return ok;
  }, []);

  const value = useMemo<SubscriptionValue>(
    () => ({
      isPremium,
      loading,
      mock: purchases.mock,
      packages,
      purchase,
      restore,
      refresh,
      photoLimit: photoLimit(isPremium),
      can: (f) => canUse(f, isPremium),
      isStickerLocked: (e) => isStickerLocked(e, isPremium),
    }),
    [isPremium, loading, packages, purchase, restore, refresh],
  );

  return <SubscriptionCtx.Provider value={value}>{children}</SubscriptionCtx.Provider>;
}

export function useSubscription(): SubscriptionValue {
  const v = useContext(SubscriptionCtx);
  if (!v) throw new Error("useSubscription must be used inside <SubscriptionProvider>");
  return v;
}
