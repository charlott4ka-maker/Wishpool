import { formatPrice, parseProduct } from "../linkPreview";

describe("parseProduct", () => {
  it("reads Open Graph tags", () => {
    const html = `<html><head>
      <meta property="og:title" content="Навушники Apple AirPods Pro 2 &amp; кейс">
      <meta property="og:image" content="https://cdn.shop.ua/a.jpg">
      <meta property="product:price:amount" content="9999.00">
      <meta property="product:price:currency" content="UAH">
    </head></html>`;
    expect(parseProduct(html)).toEqual({ title: "Навушники Apple AirPods Pro 2 & кейс", price: "9 999 ₴", imageUrl: "https://cdn.shop.ua/a.jpg" });
  });

  it("falls back to schema.org JSON-LD", () => {
    const html = `<title>Shop</title><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "Product", name: "Lip Gloss", image: ["https://x.com/g.png"],
      offers: { "@type": "Offer", price: "349", priceCurrency: "UAH" },
    })}</script>`;
    expect(parseProduct(html)).toEqual({ title: "Lip Gloss", price: "349 ₴", imageUrl: "https://x.com/g.png" });
  });
});

describe("formatPrice", () => {
  it("formats with currency sign", () => {
    expect(formatPrice("1299.5", "USD")).toBe("1 299,5 $");
    expect(formatPrice("abc", "USD")).toBe("");
  });
});
