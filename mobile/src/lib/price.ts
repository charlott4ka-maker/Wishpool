// Price formatting, ported from web/src/App.jsx (priceNum, withCurrency, priceRangeText).
import type { Lang } from "../i18n";

export function priceNum(raw: string, lang: Lang): string | null {
  const s = String(raw || "").trim();
  if (!/^\d[\d\s.,]*$/.test(s)) return null;
  const n = Number(s.replace(/\s/g, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, ""));
  if (!isFinite(n)) return null;
  const [int, frac] = String(Math.round(n * 100) / 100).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : " ");
  return grouped + (frac ? (lang === "en" ? "." : ",") + frac : "");
}

export function withCurrency(raw: string, lang: Lang): string {
  const n = priceNum(raw, lang);
  return n == null ? String(raw || "").trim() : lang === "en" ? "$" + n : n + " ₴";
}

export function priceRangeText(a: string, b: string, lang: Lang, t: (k: string, p?: Record<string, string | number>) => string): string {
  if (!a || !b) return withCurrency(a || b, lang);
  const na = priceNum(a, lang), nb = priceNum(b, lang);
  if (lang === "en") return t("priceRange", { a: na != null ? "$" + na : a, b: nb != null ? "$" + nb : b });
  // uk/ru: the currency sign once, at the end ("від 1 000 до 2 000 ₴")
  return t("priceRange", { a: na != null ? na : a, b: nb != null ? nb + " ₴" : b });
}

// "от 1 000 до 2 000 ₴" (any of our languages) -> ["1 000", "2 000 ₴"]
export const RANGE_RE = /^(?:від|от|from)?\s*(.+?)\s+(?:до|to)\s+(.+)$/i;
