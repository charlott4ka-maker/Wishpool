import type { Lang } from "../i18n";

export function daysUntil(date?: string): number | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
}

// forms: [one, few, many] for uk/ru, [one, other] for en
export function plural(lang: Lang, n: number, forms: string[]): string {
  if (lang === "en") return n === 1 ? forms[0] : forms[1];
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

export const DAY_FORMS: Record<Lang, string[]> = { uk: ["день", "дні", "днів"], ru: ["день", "дня", "дней"], en: ["day", "days"] };

export function countdownLabel(lang: Lang, t: (k: string, p?: Record<string, string | number>) => string, date?: string): string | null {
  const n = daysUntil(date);
  if (n == null || n < 0) return null;
  if (n === 0) return t("evToday");
  if (n === 1) return t("evTomorrow");
  return t("evIn", { n, unit: plural(lang, n, DAY_FORMS[lang]) });
}
