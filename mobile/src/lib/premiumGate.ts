// Where Premium things show at all: never in 1.0.1 (the picker came with the
// 1.0.2 build), always in dev and in the web preview with EXPO_PUBLIC_SHOW_SKINS.
import Constants from "expo-constants";

import { PREMIUM_ENABLED } from "../subscription/featureFlags";

export const PREVIEW_PREMIUM = process.env.EXPO_PUBLIC_SHOW_SKINS === "1";
export const premiumBuild = (Constants.expoConfig?.version || "0") >= "1.0.2";

export const showPremium = (admin?: boolean) => __DEV__ || PREVIEW_PREMIUM || (premiumBuild && (PREMIUM_ENABLED || !!admin));
