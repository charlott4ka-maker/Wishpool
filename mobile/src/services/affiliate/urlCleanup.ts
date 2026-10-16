// URL helpers shared by the affiliate converter and the link preview.
// unwrapLink / cleanUrl / titleFromPath are ports of server/preview.js.

// Links copied from search results, ads or social apps wrap the real shop URL:
// google.com/aclk?...&adurl=, google.com/url?q=, l.facebook.com/l.php?u=, ...
const WRAP_PARAMS = ["adurl", "url", "q", "u", "to", "target", "redirect", "redirect_url", "dest", "ulp"];
const WRAPPER_HOST =
  /(^|\.)google\.|(^|\.)facebook\.com$|(^|\.)instagram\.com$|(^|\.)vk\.com$|(^|\.)t\.me$|doubleclick\.net$|googleadservices\.com$|(^|\.)admitad\.com$|(^|\.)ad\.admitad\.com$|(^|\.)alitems\.com$|(^|\.)aliclick\.com$|(^|\.)lenkmio\.com$|(^|\.)ojrq\.net$/i;

export function unwrapLink(raw: string): URL {
  let u = new URL(raw.trim());
  for (let i = 0; i < 4; i++) {
    const inner = WRAP_PARAMS.map((k) => u.searchParams.get(k)).find((v) => v && /^https?:\/\//i.test(v));
    if (!inner || !WRAPPER_HOST.test(u.hostname)) break;
    u = new URL(inner);
  }
  return u;
}

// Ad and analytics tags never change the page.
const TRACKING =
  /^(utm_\w+|gclid|gclsrc|gad_source|gad_campaignid|gbraid|wbraid|dclid|fbclid|msclkid|yclid|ysclid|_gl|_ga|srsltid|mc_cid|mc_eid|igshid|ttclid)$/i;

// Someone else's affiliate markers: replaced by ours, never stacked on top.
// Amazon's own markers (tag, ascsubtag, ...) are handled in the converter, since
// `tag` means something else on other shops.
const FOREIGN_AFFILIATE = /^(subid|sub_id|subid\d|aff_id|aff_sub\d?|affid|admitad_uid|tagtag_uid|aff_platform|aff_trace_key|aff_fcid|aff_fsk|terminal_id)$/i;

export function cleanUrl(u: URL, opts: { dropAffiliate?: boolean } = {}): URL {
  const x = new URL(u.href);
  for (const k of [...x.searchParams.keys()]) {
    if (TRACKING.test(k) || (opts.dropAffiliate && FOREIGN_AFFILIATE.test(k))) x.searchParams.delete(k);
  }
  x.hash = "";
  return x;
}

// Last resort: a readable name from the URL itself (/ua/apple-airpods-pro-2/p123/ -> "Apple airpods pro 2").
export function titleFromPath(u: URL): string {
  const parts = decodeURIComponent(u.pathname)
    .split("/")
    .filter(Boolean)
    .filter((p) => /[a-zа-яіїєґ]{3}/i.test(p) && !/^(ua|ru|en|uk|p|product|products|item|goods|catalog|dp)$/i.test(p));
  const best = parts.sort((a, b) => b.length - a.length)[0] || "";
  const t = best
    .replace(/\.(html?|php)$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\b(?=[a-z\d]*\d)[a-z\d]{7,}\b|\b[a-z]+\d{5,}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length >= 4 ? (t[0].toUpperCase() + t.slice(1)).slice(0, 120) : "";
}

/** "rozetka.com.ua" for any link, including our own affiliate redirects. */
export function linkHost(raw: string): string {
  try {
    return unwrapLink(raw).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
