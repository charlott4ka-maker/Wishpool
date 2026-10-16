// RevenueCat (react-native-purchases) behind a small interface, so screens
// never import the SDK directly and the app still runs where it can't work:
// Expo Go, simulators without StoreKit config, a build without an API key.
// In those cases a mock store is used: in dev builds (or with
// EXPO_PUBLIC_REVENUECAT_MOCK=1) "buying" flips Premium on locally; in a release
// build without a key it offers nothing, so Premium can't be unlocked for free.
//
// RevenueCat setup (dashboard):
//   Entitlement id: "premium"
//   Offering: "default" with monthly + annual packages
//   Products: App Store Connect auto-renewable subscriptions, e.g.
//     app.wishpool.premium.monthly, app.wishpool.premium.annual

import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export const ENTITLEMENT_ID = "premium";

export type PremiumPackage = {
  id: string;
  /** "monthly" | "annual" | ... from RevenueCat's packageType. */
  kind: string;
  title: string;
  priceString: string;
  /** Numeric price, for "per month" and "save N%". */
  price: number;
  currencyCode: string;
  /** "2,50 $" for an annual plan; null when the store doesn't give it. */
  pricePerMonthString: string | null;
  /** Free trial length in days (0 = no trial). */
  trialDays: number;
  /** SDK object, passed back to purchase(). */
  raw?: unknown;
};

export interface PurchasesAdapter {
  mock: boolean;
  init(appUserId: string | null): Promise<void>;
  isPremium(): Promise<boolean>;
  packages(): Promise<PremiumPackage[]>;
  purchase(pkg: PremiumPackage): Promise<boolean>;
  restore(): Promise<boolean>;
  onChange(cb: (isPremium: boolean) => void): () => void;
}

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";
const FORCE_MOCK = process.env.EXPO_PUBLIC_REVENUECAT_MOCK === "1";
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function createMock(fakePurchases: boolean): PurchasesAdapter {
  let premium = false;
  const subs = new Set<(v: boolean) => void>();
  const set = (v: boolean) => {
    premium = v;
    subs.forEach((cb) => cb(v));
  };
  return {
    mock: true,
    async init() {},
    async isPremium() {
      return premium;
    },
    async packages() {
      if (!fakePurchases) return [];
      return [
        { id: "mock_annual", kind: "annual", title: "Wishpool Premium", priceString: "19,99 $", price: 19.99, currencyCode: "USD", pricePerMonthString: "1,67 $", trialDays: 7 },
        { id: "mock_monthly", kind: "monthly", title: "Wishpool Premium", priceString: "2,99 $", price: 2.99, currencyCode: "USD", pricePerMonthString: "2,99 $", trialDays: 0 },
      ];
    },
    async purchase() {
      if (!fakePurchases) throw new Error("purchases_unavailable");
      set(true);
      return true;
    },
    async restore() {
      return premium;
    },
    onChange(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
  };
}

const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
function trialDays(intro: { price: number; periodUnit: string; periodNumberOfUnits: number } | null): number {
  if (!intro || intro.price > 0) return 0;
  return (UNIT_DAYS[intro.periodUnit] || 0) * intro.periodNumberOfUnits;
}

function createRevenueCat(): PurchasesAdapter {
  // Required lazily: the native module isn't there in Expo Go.
  const Purchases = require("react-native-purchases").default as typeof import("react-native-purchases").default;
  const active = (info: { entitlements: { active: Record<string, unknown> } }) => !!info.entitlements.active[ENTITLEMENT_ID];
  return {
    mock: false,
    async init(appUserId) {
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey: IOS_KEY, appUserID: appUserId || undefined });
      } else if (appUserId) {
        await Purchases.logIn(appUserId);
      }
    },
    async isPremium() {
      return active(await Purchases.getCustomerInfo());
    },
    async packages() {
      const offerings = await Purchases.getOfferings();
      return (offerings.current?.availablePackages || []).map((p) => ({
        id: p.identifier,
        kind: String(p.packageType).toLowerCase(),
        title: p.product.title,
        priceString: p.product.priceString,
        price: p.product.price,
        currencyCode: p.product.currencyCode,
        pricePerMonthString: p.product.pricePerMonthString,
        trialDays: trialDays(p.product.introPrice),
        raw: p,
      }));
    },
    async purchase(pkg) {
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg.raw as any);
        return active(customerInfo);
      } catch (e: any) {
        if (e && e.userCancelled) return false;
        throw e;
      }
    },
    async restore() {
      return active(await Purchases.restorePurchases());
    },
    onChange(cb) {
      const listener = (info: any) => cb(active(info));
      Purchases.addCustomerInfoUpdateListener(listener);
      return () => {
        Purchases.removeCustomerInfoUpdateListener(listener);
      };
    },
  };
}

export const purchases: PurchasesAdapter =
  Platform.OS === "ios" && IOS_KEY && !FORCE_MOCK && !IN_EXPO_GO ? createRevenueCat() : createMock(__DEV__ || FORCE_MOCK);
