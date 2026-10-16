// Affiliate settings. Values come from env at build time (only EXPO_PUBLIC_*
// variables reach the app bundle; plain AFFILIATE_TAG works in tests/scripts).
// An empty value switches that network off: such links fall back to the plain
// subid parameter, and unknown shops are never touched.

export interface AffiliateConfig {
  /** Our sub id, added as ?subid= (or the network's own sub id field). */
  tag: string;
  /** Amazon Associates tracking id, e.g. "wishpool-20". One id works for every marketplace it is registered on. */
  amazonTag: string;
  /** Rozetka Affiliate partner id (used when Rozetka is not routed through Admitad). */
  rozetkaId: string;
  /**
   * Admitad deeplink bases per shop id from shops.ts, e.g.
   * { makeup: "https://ad.admitad.com/g/abc123/" }. The product URL goes into ?ulp=.
   * `default` is used for an Admitad shop that has no own entry.
   */
  admitad: Record<string, string>;
}

// JSON map in one variable keeps app.json/eas.json simple:
// EXPO_PUBLIC_ADMITAD_LINKS={"makeup":"https://ad.admitad.com/g/xxx/","zara":"..."}
function admitadFromEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = process.env.EXPO_PUBLIC_ADMITAD_LINKS;
    if (raw) Object.assign(out, JSON.parse(raw));
  } catch {
    /* malformed JSON: ignore, links stay unconverted */
  }
  const base = process.env.EXPO_PUBLIC_ADMITAD_BASE_URL;
  if (base) out.default = base;
  const ali = process.env.EXPO_PUBLIC_ALIEXPRESS_ADMITAD_URL;
  if (ali) out.aliexpress = ali;
  return out;
}

export function defaultAffiliateConfig(): AffiliateConfig {
  return {
    // process.env.X must be written out literally for Expo to inline it.
    tag: (process.env.EXPO_PUBLIC_AFFILIATE_TAG || process.env.AFFILIATE_TAG || "wishpool").trim(),
    amazonTag: (process.env.EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG || "").trim(),
    rozetkaId: (process.env.EXPO_PUBLIC_ROZETKA_AFFILIATE_ID || "").trim(),
    admitad: admitadFromEnv(),
  };
}
