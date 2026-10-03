import dns from "dns/promises";
import net from "net";

// Fetch a product page and pull out title, price and main photo from its
// Open Graph / schema.org markup. Best effort: many shops expose these.
const CUR = { UAH: "₴", USD: "$", EUR: "€", GBP: "£", PLN: "zł", RUB: "₽" };

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") || x.startsWith("::ffff:");
}
// Only public http(s) hosts: never let the server be pointed at internal addresses.
async function assertPublic(u) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("bad_url");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("bad_url");
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(a => a.address);
  if (!addrs.length || addrs.some(privateIp)) throw new Error("bad_url");
}
async function get(url, accept, maxBytes) {
  let u = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(u);
    const r = await fetch(u, {
      redirect: "manual", signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", Accept: accept, "Accept-Language": "uk,ru;q=0.9,en;q=0.8" },
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = new URL(r.headers.get("location"), u); continue; }
    if (!r.ok) throw new Error("http_" + r.status);
    const len = Number(r.headers.get("content-length") || 0);
    if (len && len > maxBytes) throw new Error("too_big");
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > maxBytes) throw new Error("too_big");
    return { buf, type: r.headers.get("content-type") || "", url: u };
  }
  throw new Error("too_many_redirects");
}
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
function meta(html, names) {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m && m[1].trim()) return decode(m[1]);
  }
  return "";
}
function fromJsonLd(html) {
  const out = {};
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (x) => {
        if (!x || typeof x !== "object") return;
        if (Array.isArray(x)) return x.forEach(walk);
        const t = [].concat(x["@type"] || []).join(",");
        if (/Product/i.test(t)) {
          if (!out.title && x.name) out.title = String(x.name);
          if (!out.image && x.image) out.image = typeof x.image === "string" ? x.image : (Array.isArray(x.image) ? (typeof x.image[0] === "string" ? x.image[0] : x.image[0] && x.image[0].url) : x.image.url);
          const offers = [].concat(x.offers || []);
          for (const o of offers) {
            const p = o.price ?? o.lowPrice ?? (o.priceSpecification && o.priceSpecification.price);
            if (!out.price && p != null) { out.price = String(p); out.currency = o.priceCurrency || out.currency; }
          }
        }
        Object.values(x).forEach(v => typeof v === "object" && walk(v));
      };
      walk(JSON.parse(m[1]));
    } catch (e) {}
  }
  return out;
}
function fmtPrice(amount, currency) {
  const n = Number(String(amount).replace(/[^\d.,]/g, "").replace(",", "."));
  if (!isFinite(n) || n <= 0) return "";
  const s = (Math.round(n * 100) / 100).toLocaleString("uk-UA").replace(/ /g, " ");
  const c = CUR[String(currency || "").toUpperCase()];
  return c ? `${s} ${c}` : s;
}

export async function previewLink(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch (e) { throw new Error("bad_url"); }
  const page = await get(url.href, "text/html,application/xhtml+xml", 2_500_000);
  const { title, price, imageUrl } = parseProduct(page.buf.toString("utf8"));
  let image = null;
  if (imageUrl) {
    try {
      const iu = new URL(imageUrl, page.url);
      // fetched here and handed over as a data URL: shops often block hotlinking
      const img = await get(iu.href, "image/*", 4_000_000);
      const type = (img.type.split(";")[0] || "").trim();
      if (/^image\/(jpeg|png|webp|gif)$/.test(type)) image = `data:${type};base64,${img.buf.toString("base64")}`;
    } catch (e) {}
  }
  return { title, price, image };
}

export function parseProduct(html) {
  const ld = fromJsonLd(html);
  const title = (meta(html, ["og:title", "twitter:title"]) || ld.title || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "")).slice(0, 120);
  const amount = meta(html, ["product:price:amount", "og:price:amount", "price"]) || ld.price || "";
  const currency = meta(html, ["product:price:currency", "og:price:currency", "priceCurrency"]) || ld.currency || "";
  const imageUrl = meta(html, ["og:image:secure_url", "og:image", "twitter:image"]) || ld.image || "";
  return { title, price: fmtPrice(amount, currency), imageUrl };
}
