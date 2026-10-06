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
async function get(url, accept, maxBytes, ms = 7000) {
  let u = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(u);
    const r = await fetch(u, {
      redirect: "manual", signal: AbortSignal.timeout(ms),
      // look like a regular desktop browser: many shops answer bots with 403
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: accept, "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7",
        "Sec-Fetch-Dest": accept.startsWith("image") ? "image" : "document", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Upgrade-Insecure-Requests": "1",
      },
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
// <span itemprop="price" content="7999">, <meta itemprop="priceCurrency" ...> etc.
function itemprop(html, name) {
  const m = html.match(new RegExp(`<[a-z]+[^>]+itemprop=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<[a-z]+[^>]+content=["']([^"']+)["'][^>]*itemprop=["']${name}["']`, "i"));
  return m ? decode(m[1]) : "";
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

// Links copied from search results, ads or social apps wrap the real shop URL:
// google.com/aclk?...&adurl=, google.com/url?q=, l.facebook.com/l.php?u=, ...
const WRAP_PARAMS = ["adurl", "url", "q", "u", "to", "target", "redirect", "redirect_url", "dest"];
export function unwrapLink(raw) {
  let u = new URL(raw.trim());
  for (let i = 0; i < 4; i++) {
    const inner = WRAP_PARAMS.map(k => u.searchParams.get(k)).find(v => v && /^https?:\/\//i.test(v));
    const wrapper = /(^|\.)google\.|(^|\.)facebook\.com$|(^|\.)instagram\.com$|(^|\.)vk\.com$|(^|\.)t\.me$|doubleclick\.net$|googleadservices\.com$/i.test(u.hostname);
    if (!inner || !wrapper) break;
    u = new URL(inner);
  }
  return u;
}
// Last resort: a readable name from the URL itself (/ua/apple-airpods-pro-2/p123/ -> "Apple airpods pro 2").
export function titleFromPath(u) {
  const parts = decodeURIComponent(u.pathname).split("/").filter(Boolean)
    .filter(p => /[a-zа-яіїєґ]{3}/i.test(p) && !/^(ua|ru|en|uk|p|product|products|item|goods|catalog|dp)$/i.test(p));
  const best = parts.sort((a, b) => b.length - a.length)[0] || "";
  const t = best.replace(/\.(html?|php)$/i, "").replace(/[-_+]+/g, " ").replace(/\b[a-z]*\d{4,}[a-z\d]*\b/gi, "").replace(/\s+/g, " ").trim();
  return t.length >= 4 ? (t[0].toUpperCase() + t.slice(1)).slice(0, 120) : "";
}
// Ad and analytics tags never change the page, but make it look like a bot
// visit to some shops and break caches of the fallback services.
const TRACKING = /^(utm_\w+|gclid|gclsrc|gad_source|gad_campaignid|gbraid|wbraid|dclid|fbclid|msclkid|yclid|ysclid|_gl|_ga|srsltid|mc_cid|mc_eid|igshid|ttclid)$/i;
export function cleanUrl(u) {
  const x = new URL(u.href);
  for (const k of [...x.searchParams.keys()]) if (TRACKING.test(k)) x.searchParams.delete(k);
  x.hash = "";
  return x;
}
const blocked = (t) => !t || /access denied|just a moment|attention required|captcha|error 403|403 forbidden|^forbidden|ddos|security check|не робот|not a robot/i.test(t);

// Fallbacks when the shop blocks us (both free, no key; only the product URL is sent):
// microlink.io reads page metadata, r.jina.ai renders the page in a real browser.
async function viaMicrolink(url) {
  const r = await fetch("https://api.microlink.io/?url=" + encodeURIComponent(url), { signal: AbortSignal.timeout(9000) });
  const j = await r.json().catch(() => null);
  if (!j || j.status !== "success" || !j.data) throw new Error("microlink_" + (j && j.code || r.status));
  if (blocked(j.data.title)) throw new Error("microlink_blocked");
  return { title: j.data.title || "", price: "", imageUrl: (j.data.image && j.data.image.url) || "", base: url };
}
async function viaJina(url) {
  const r = await fetch("https://r.jina.ai/" + url, { headers: { "X-Respond-With": "html", "X-Timeout": "8" }, signal: AbortSignal.timeout(9500) });
  if (!r.ok) throw new Error("jina_" + r.status);
  const info = parseProduct(await r.text());
  if (blocked(info.title)) throw new Error("jina_blocked");
  return { ...info, base: url };
}
const firstGood = (ps) => new Promise((resolve, reject) => {
  let left = ps.length;
  ps.forEach(p => p.then(v => (v && v.title ? resolve(v) : --left || reject(new Error("none"))), () => --left || reject(new Error("none"))));
});
// Shop CDNs sometimes refuse our server too: then ask a public image proxy.
async function fetchImage(href, trace = []) {
  for (const src of [href, "https://wsrv.nl/?url=" + encodeURIComponent(href) + "&w=1200&output=jpg"]) {
    try {
      const img = await get(src, "image/*", 4_000_000, 5000);
      const type = (img.type.split(";")[0] || "").trim();
      if (/^image\/(jpeg|png|webp|gif)$/.test(type)) return `data:${type};base64,${img.buf.toString("base64")}`;
    } catch (e) { console.error("preview image failed", new URL(src).hostname, e.message); trace.push("image failed: " + new URL(src).hostname + " " + e.message); }
  }
  return null;
}

export async function previewLink(raw, trace = []) {
  let url;
  try { url = cleanUrl(unwrapLink(raw)); } catch (e) { throw new Error("bad_url"); }
  await assertPublic(url);
  let info = null, base = url.href;
  try {
    const page = await get(url.href, "text/html,application/xhtml+xml", 2_500_000, 6000);
    info = parseProduct(page.buf.toString("utf8")); base = page.url.href;
    trace.push("direct: " + (info.title || "no title"));
  } catch (e) { console.error("preview direct failed", url.hostname, e.message); trace.push("direct failed: " + e.message); }
  if (!info || blocked(info.title)) {
    try {
      const tag = (name, p) => p.then(v => (trace.push(name + ": " + v.title), v), e => { trace.push(name + " failed: " + e.message); throw e; });
      const m = await firstGood([tag("microlink", viaMicrolink(url.href)), tag("jina", viaJina(url.href))]);
      info = { ...m, price: m.price || (info && info.price) || "", imageUrl: m.imageUrl || (info && info.imageUrl) || "" }; base = m.base;
    } catch (e) { console.error("preview fallbacks failed", url.hostname); if (info && blocked(info.title)) info.title = ""; }
  }
  const title = (info && info.title) || titleFromPath(url);
  const price = (info && info.price) || "";
  const imageUrl = info && info.imageUrl;
  if (!title && !imageUrl) throw new Error("nothing_found");
  let image = null;
  if (imageUrl) {
    try { image = await fetchImage(new URL(imageUrl, base).href, trace); } catch (e) {}
  }
  return { title, price, image, url: url.href };
}

export function parseProduct(html) {
  const ld = fromJsonLd(html);
  const title = (meta(html, ["og:title", "twitter:title"]) || ld.title || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "")).slice(0, 120);
  const amount = meta(html, ["product:price:amount", "og:price:amount", "price"]) || ld.price || itemprop(html, "price") || "";
  const currency = meta(html, ["product:price:currency", "og:price:currency", "priceCurrency"]) || ld.currency || itemprop(html, "priceCurrency") || "";
  const imageUrl = meta(html, ["og:image:secure_url", "og:image", "twitter:image"]) || ld.image || "";
  return { title, price: fmtPrice(amount, currency), imageUrl };
}
