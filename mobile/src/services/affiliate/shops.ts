// Shops we know how to turn into affiliate links. A domain matches itself and
// every subdomain (m.rozetka.com.ua, ua.makeup.com, ...). Order matters only
// for overlapping domains: the first match wins.
//
// network:
//   amazon   Amazon Associates: ?tag=<amazonTag>&ascsubtag=<tag>
//   rozetka  Admitad deeplink when configured, else Rozetka Affiliate id, else ?subid=
//   admitad  Admitad deeplink (https://ad.admitad.com/g/<hash>/?ulp=<url>&subid=<tag>), else ?subid=
//   subid    no network yet, only our ?subid=<tag> so clicks are visible in the shop's analytics

export type AffiliateNetwork = "amazon" | "rozetka" | "admitad" | "subid";

export interface Shop {
  id: string;
  name: string;
  domains: string[];
  network: AffiliateNetwork;
}

const AMAZON_TLDS = [
  "com", "co.uk", "de", "fr", "it", "es", "nl", "pl", "se", "com.be", "com.tr",
  "ca", "com.mx", "com.br", "com.au", "co.jp", "in", "sg", "ae", "sa", "eg",
];

export const SHOPS: Shop[] = [
  { id: "amazon", name: "Amazon", domains: [...AMAZON_TLDS.map((t) => "amazon." + t), "amzn.eu", "amzn.to", "a.co"], network: "amazon" },
  { id: "rozetka", name: "Rozetka", domains: ["rozetka.com.ua", "rozetka.ua"], network: "rozetka" },
  { id: "makeup", name: "MAKEUP", domains: ["makeup.com.ua", "makeup.ua"], network: "admitad" },
  { id: "zara", name: "Zara", domains: ["zara.com"], network: "admitad" },
  { id: "aliexpress", name: "AliExpress", domains: ["aliexpress.com", "aliexpress.ru", "aliexpress.us", "a.aliexpress.com"], network: "admitad" },
  { id: "notino", name: "Notino", domains: ["notino.ua", "notino.com", "notino.pl", "notino.de"], network: "admitad" },
  { id: "answear", name: "Answear", domains: ["answear.ua", "answear.com"], network: "admitad" },
  { id: "eva", name: "EVA", domains: ["eva.ua"], network: "admitad" },
  { id: "allo", name: "Allo", domains: ["allo.ua"], network: "admitad" },
  { id: "comfy", name: "Comfy", domains: ["comfy.ua"], network: "admitad" },
  { id: "foxtrot", name: "Foxtrot", domains: ["foxtrot.com.ua"], network: "admitad" },
  { id: "epicentrk", name: "Epicentr", domains: ["epicentrk.ua"], network: "admitad" },
  { id: "citrus", name: "Citrus", domains: ["ctrs.com.ua", "citrus.ua"], network: "admitad" },
  { id: "moyo", name: "MOYO", domains: ["moyo.ua"], network: "admitad" },
  { id: "intertop", name: "Intertop", domains: ["intertop.ua"], network: "admitad" },
  { id: "lamoda", name: "Lamoda", domains: ["lamoda.ua", "lamoda.pl"], network: "admitad" },
  { id: "hm", name: "H&M", domains: ["hm.com"], network: "subid" },
  { id: "sephora", name: "Sephora", domains: ["sephora.com", "sephora.fr", "sephora.pl"], network: "subid" },
  { id: "prom", name: "Prom.ua", domains: ["prom.ua"], network: "subid" },
  { id: "kasta", name: "Kasta", domains: ["kasta.ua"], network: "subid" },
  { id: "temu", name: "Temu", domains: ["temu.com"], network: "subid" },
  { id: "ebay", name: "eBay", domains: ["ebay.com", "ebay.de", "ebay.co.uk", "ebay.pl"], network: "subid" },
  { id: "etsy", name: "Etsy", domains: ["etsy.com"], network: "subid" },
];

export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

export function findShop(host: string): Shop | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  return SHOPS.find((s) => s.domains.some((d) => hostMatches(h, d))) || null;
}
