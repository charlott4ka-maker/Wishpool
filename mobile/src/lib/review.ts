// Asking for an App Store rating: the system prompt (Apple decides whether it
// actually shows, at most 3 times a year), at a happy moment: right after the
// 3rd wish is added, and once more after the 10th if 4 months have passed.
// No "do you like the app?" pre-question: App Review doesn't allow filtering.
// Settings also has "Rate Wishpool", which opens the review page directly.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";

const KEY = "wp_review";
const ASK_AT = [3, 10];
const GAP = 120 * 24 * 60 * 60 * 1000;
export const REVIEW_URL = "itms-apps://apps.apple.com/app/id6825104468?action=write-review";

type State = { added: number; askedAt: number; asks: number };

/** Call after a new wish was added (not edits, not undo). */
export async function wishAdded(demo: boolean) {
  if (demo || Platform.OS !== "ios") return;
  try {
    const s: State = { added: 0, askedAt: 0, asks: 0, ...JSON.parse((await AsyncStorage.getItem(KEY)) || "{}") };
    s.added++;
    const due = s.asks < ASK_AT.length && s.added >= ASK_AT[s.asks] && Date.now() - s.askedAt > (s.asks ? GAP : 0);
    if (due) {
      s.asks++;
      s.askedAt = Date.now();
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
    if (!due) return;
    // a build without the native module (an update over an older build) just skips it
    const StoreReview = require("expo-store-review") as typeof import("expo-store-review");
    if (!(await StoreReview.hasAction())) return;
    // after the sheet has closed and the "added" toast has shown
    setTimeout(() => StoreReview.requestReview().catch(() => {}), 1500);
  } catch {
    // never in the way of adding a wish
  }
}

export const openReviewPage = () => Linking.openURL(REVIEW_URL).catch(() => {});
