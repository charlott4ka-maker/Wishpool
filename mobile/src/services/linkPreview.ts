// Product preview for a pasted link: title, price and main photo from the
// page's Open Graph / schema.org markup, to prefill the wish card.
//
// On a phone there is no CORS, so the page is read directly first. Shops that
// refuse a phone (bot walls) are retried through our backend's /api/preview,
// which tries crawler user agents and fallback services (server/preview.js).
// The parsing below is a port of parseProduct() from server/preview.js.

import { api } from "./api";
import { cleanUrl, titleFromPath, unwrapLink } from "./affiliate/urlCleanup";

export type LinkPreview = {
  title: string;
  /** Formatted for display, e.g. "4 199 ₴". */
  price: string;
  /** Absolute https URL of the main photo, or a data: URL from the backend. */
  image: string | null;
  /** Final URL after redirects (short links resolved), without tracking params. */
  url: string;
  /** True when the shop let nobody in and the title was guessed from the URL. */
  guess: boolean;
};

const CUR: Record<string, string> = { UAH: "₴", USD: "$", EUR: "€", GBP: "£", PLN: "zł", RUB: "₽" };

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

function meta(html: string, names: string[]): string {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m && m[1].trim()) return decode(m[1]);
  }
  return "";
}

function itemprop(html: string, name: string): string {
  const m =
    html.match(new RegExp(`<[a-z]+[^>]+itemprop=["']${name}["'][^>]*content=["']([^"']+)["']`, "i")) ||
    html.match(new RegExp(`<[a-z]+[^>]+content=["']([^"']+)["'][^>]*itemprop=["']${name}["']`, "i"));
  return m ? decode(m[1]) : "";
}

type Ld = { title?: string; image?: string; price?: string; currency?: string };
function fromJsonLd(html: string): Ld {
  const out: Ld = {};
  const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const walk = (x: any): void => {
        if (!x || typeof x !== "object") return;
        if (Array.isArray(x)) return x.forEach(walk);
        const t = ([] as string[]).concat(x["@type"] || []).join(",");
        if (/Product/i.test(t)) {
          if (!out.title && x.name) out.title = String(x.name);
          if (!out.image && x.image) {
            const img = x.image;
            out.image = typeof img === "string" ? img : Array.isArray(img) ? (typeof img[0] === "string" ? img[0] : img[0]?.url) : img.url;
          }
          for (const o of ([] as any[]).concat(x.offers || [])) {
            const p = o.price ?? o.lowPrice ?? o.priceSpecification?.price;
            if (!out.price && p != null) {
              out.price = String(p);
              out.currency = o.priceCurrency || out.currency;
            }
          }
        }
        Object.values(x).forEach((v) => typeof v === "object" && walk(v));
      };
      walk(JSON.parse(m[1]));
    } catch {
      /* broken JSON-LD block: skip it */
    }
  }
  return out;
}

export function formatPrice(amount: string, currency: string): string {
  const n = Number(String(amount).replace(/[^\d.,]/g, "").replace(",", "."));
  if (!isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 100) / 100;
  const [int, frac] = String(rounded).split(".");
  const s = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (frac ? "," + frac : "");
  const c = CUR[String(currency || "").toUpperCase()];
  return c ? `${s} ${c}` : s;
}

export function parseProduct(html: string): { title: string; price: string; imageUrl: string } {
  const ld = fromJsonLd(html);
  const title = (meta(html, ["og:title", "twitter:title"]) || ld.title || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "")).slice(0, 120);
  const amount = meta(html, ["product:price:amount", "og:price:amount", "price"]) || ld.price || itemprop(html, "price") || "";
  const currency = meta(html, ["product:price:currency", "og:price:currency", "priceCurrency"]) || ld.currency || itemprop(html, "priceCurrency") || "";
  const imageUrl = meta(html, ["og:image:secure_url", "og:image", "twitter:image"]) || ld.image || "";
  return { title, price: formatPrice(amount, currency), imageUrl };
}

const blocked = (t: string) =>
  !t || /access denied|just a moment|attention required|captcha|error 403|403 forbidden|^forbidden|ddos|security check|не робот|not a robot/i.test(t);

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function fetchDirect(url: URL, ms = 8000): Promise<LinkPreview | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url.href, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7" },
    });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 2_500_000);
    const finalUrl = r.url ? new URL(r.url) : url;
    const p = parseProduct(html);
    if (blocked(p.title)) return null;
    const image = p.imageUrl ? new URL(p.imageUrl, finalUrl).href : null;
    return { title: p.title, price: p.price, image, url: cleanUrl(finalUrl).href, guess: false };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const score = (p: LinkPreview | null) => (!p || !p.title ? 0 : 2 + (p.image ? 2 : 0) + (p.price ? 1 : 0));

export async function fetchLinkPreview(raw: string): Promise<LinkPreview> {
  let url: URL;
  try {
    url = cleanUrl(unwrapLink(raw));
  } catch {
    throw new Error("bad_url");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("bad_url");

  let best = await fetchDirect(url);
  if (score(best) < 4) {
    try {
      const s = await api.preview(url.href);
      const fromServer: LinkPreview = { title: s.title || "", price: s.price || "", image: s.image || null, url: s.url || url.href, guess: !!s.guess };
      if (score(fromServer) > score(best)) best = { ...fromServer, price: fromServer.price || best?.price || "" };
    } catch {
      /* backend unreachable or nothing found: keep what we have */
    }
  }
  if (best && best.title) return best;
  const title = titleFromPath(url);
  if (!title) throw new Error("nothing_found");
  return { title, price: "", image: null, url: url.href, guess: true };
}
