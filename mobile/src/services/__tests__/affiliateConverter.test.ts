import { toAffiliateUrl } from "../affiliateConverter";
import type { AffiliateConfig } from "../affiliate/config";
import { linkHost } from "../affiliate/urlCleanup";

const cfg: AffiliateConfig = {
  tag: "wishpool",
  amazonTag: "wishpool-20",
  rozetkaId: "",
  admitad: { makeup: "https://ad.admitad.com/g/mk123/", default: "https://ad.admitad.com/g/def456/" },
};
const q = (u: string) => new URL(u).searchParams;

describe("toAffiliateUrl", () => {
  it("leaves unknown shops untouched", () => {
    const raw = "https://some-small-shop.ua/item/42?color=red&utm_source=ig";
    const r = toAffiliateUrl(raw, cfg);
    expect(r.url).toBe(raw);
    expect(r.network).toBe("none");
    expect(r.changed).toBe(false);
  });

  it("leaves garbage and non-http links untouched", () => {
    expect(toAffiliateUrl("not a url", cfg).url).toBe("not a url");
    expect(toAffiliateUrl("tg://resolve?domain=x", cfg).url).toBe("tg://resolve?domain=x");
  });

  it("adds the Amazon Associates tag and replaces someone else's", () => {
    const r = toAffiliateUrl("https://www.amazon.de/dp/B0C123?tag=other-21&th=1&utm_medium=x", cfg);
    expect(r.network).toBe("amazon");
    expect(q(r.url).get("tag")).toBe("wishpool-20");
    expect(q(r.url).get("ascsubtag")).toBe("wishpool");
    expect(q(r.url).get("th")).toBe("1");
    expect(q(r.url).get("utm_medium")).toBeNull();
  });

  it("keeps Amazon links as is when no Associates tag is configured", () => {
    const raw = "https://www.amazon.com/dp/B0C123";
    expect(toAffiliateUrl(raw, { ...cfg, amazonTag: "" }).url).toBe(raw);
  });

  it("wraps Admitad shops into a deeplink with our subid", () => {
    const r = toAffiliateUrl("https://makeup.com.ua/ua/product/123/?utm_source=google", cfg);
    expect(r.network).toBe("admitad");
    expect(r.url.startsWith("https://ad.admitad.com/g/mk123/")).toBe(true);
    expect(q(r.url).get("ulp")).toBe("https://makeup.com.ua/ua/product/123/");
    expect(q(r.url).get("subid")).toBe("wishpool");
    expect(linkHost(r.url)).toBe("makeup.com.ua");
  });

  it("uses the default Admitad link for shops without their own", () => {
    const r = toAffiliateUrl("https://www.zara.com/ua/uk/dress-p123.html", cfg);
    expect(r.url.startsWith("https://ad.admitad.com/g/def456/")).toBe(true);
  });

  it("falls back to ?subid= for known shops without a network", () => {
    const r = toAffiliateUrl("https://rozetka.com.ua/ua/apple-airpods/p123/?subid=someone", { ...cfg, admitad: {} });
    expect(r.network).toBe("subid");
    expect(q(r.url).get("subid")).toBe("wishpool");
  });

  it("re-wraps someone else's Admitad link with ours", () => {
    const foreign = "https://ad.admitad.com/g/zzz999/?ulp=" + encodeURIComponent("https://makeup.com.ua/ua/product/7/") + "&subid=them";
    const r = toAffiliateUrl(foreign, cfg);
    expect(r.url.startsWith("https://ad.admitad.com/g/mk123/")).toBe(true);
    expect(q(r.url).get("subid")).toBe("wishpool");
  });

  it("is idempotent", () => {
    for (const raw of [
      "https://www.amazon.com/dp/B0C123?psc=1",
      "https://makeup.com.ua/ua/product/123/",
      "https://www.aliexpress.com/item/100500.html",
      "https://www.etsy.com/listing/123/mug",
    ]) {
      const once = toAffiliateUrl(raw, cfg).url;
      expect(toAffiliateUrl(once, cfg).url).toBe(once);
    }
  });
});
