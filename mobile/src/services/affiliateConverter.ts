// Turns a product link into our affiliate link when the shop is one we know.
//
//   toAffiliateUrl("https://rozetka.com.ua/ua/apple-airpods/p123/?utm_source=x")
//     -> { url: "https://ad.admitad.com/g/<hash>/?ulp=...&subid=wishpool", network: "admitad", ... }
//
// Rules:
//  - unknown shop, bad URL, non-http(s): the link is returned exactly as given;
//  - a link that is already wrapped by someone's Admitad / Google / Facebook
//    redirect is unwrapped first, and foreign affiliate markers are replaced by ours;
//  - converting an already converted link gives the same link (idempotent), so
//    re-saving a wish never stacks parameters.
//
// Call it when the wish is saved, not while the user is typing: the preview
// (title, price, photo) is always fetched from the clean shop URL.

import { AffiliateConfig, defaultAffiliateConfig } from "./affiliate/config";
import { AffiliateNetwork, findShop, Shop } from "./affiliate/shops";
import { cleanUrl, unwrapLink } from "./affiliate/urlCleanup";

export type AffiliateResult = {
  /** The link to store and open. Equals `original` when nothing applied. */
  url: string;
  /** What the user pasted. */
  original: string;
  /** The shop's own product URL without tracking and foreign affiliate params. */
  clean: string;
  shop: Shop | null;
  /** Which mechanism was applied; "none" for unknown shops. */
  network: AffiliateNetwork | "none";
  changed: boolean;
};

const AMAZON_FOREIGN = /^(tag|ascsubtag|linkcode|linkid|creative|creativeasin|camp|ref_)$/i;

function withParams(u: URL, params: Record<string, string>): string {
  const x = new URL(u.href);
  for (const [k, v] of Object.entries(params)) if (v) x.searchParams.set(k, v);
  return x.href;
}

function admitadDeeplink(base: string, target: URL, subid: string): string {
  const b = new URL(base);
  b.searchParams.set("ulp", target.href);
  if (subid) b.searchParams.set("subid", subid);
  return b.href;
}

export function toAffiliateUrl(raw: string, cfg: AffiliateConfig = defaultAffiliateConfig()): AffiliateResult {
  const original = raw;
  const keep = (clean = raw): AffiliateResult => ({ url: raw, original, clean, shop: null, network: "none", changed: false });

  let target: URL;
  try {
    target = unwrapLink(raw);
  } catch {
    return keep();
  }
  if (!/^https?:$/.test(target.protocol)) return keep();

  const shop = findShop(target.hostname);
  if (!shop) return keep(cleanUrl(target).href);

  const clean = cleanUrl(target, { dropAffiliate: true });
  const result = (url: string, network: AffiliateNetwork): AffiliateResult => ({
    url, original, clean: clean.href, shop, network, changed: url !== raw,
  });
  const subidOnly = () => result(withParams(clean, { subid: cfg.tag }), "subid");
  const admitadBase = cfg.admitad[shop.id] || cfg.admitad.default;

  switch (shop.network) {
    case "amazon": {
      if (!cfg.amazonTag) return { ...keep(clean.href), shop };
      const x = new URL(clean.href);
      for (const k of [...x.searchParams.keys()]) if (AMAZON_FOREIGN.test(k)) x.searchParams.delete(k);
      return result(withParams(x, { tag: cfg.amazonTag, ascsubtag: cfg.tag }), "amazon");
    }
    case "rozetka":
      if (cfg.admitad.rozetka) return result(admitadDeeplink(cfg.admitad.rozetka, clean, cfg.tag), "admitad");
      if (cfg.rozetkaId) return result(withParams(clean, { utm_source: "affiliate", utm_medium: "cpa", utm_campaign: cfg.rozetkaId, subid: cfg.tag }), "rozetka");
      return subidOnly();
    case "admitad":
      return admitadBase ? result(admitadDeeplink(admitadBase, clean, cfg.tag), "admitad") : subidOnly();
    case "subid":
      return subidOnly();
  }
}

/** Shortcut when only the final link is needed. */
export function convertAffiliateLink(raw: string, cfg?: AffiliateConfig): string {
  return toAffiliateUrl(raw, cfg).url;
}
