import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getRemoteConfig, useRemoteConfig } from "../lib/remoteConfig";
import { MOBILE_STRINGS } from "./mobileStrings";
import { WEB_STRINGS } from "./webStrings";

export const LANGS = ["uk", "ru", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_SHORT: Record<Lang, string> = { uk: "Укр", ru: "Рус", en: "Eng" };

const STR: Record<string, Partial<Record<Lang, string>>> = { ...WEB_STRINGS, ...MOBILE_STRINGS };
export type StrKey = keyof typeof WEB_STRINGS | keyof typeof MOBILE_STRINGS;

export function tr(lang: Lang, id: StrKey | string, params?: Record<string, string | number>): string {
  // a text changed on the admin page wins over the built-in one
  const own = getRemoteConfig().strings[id]?.[lang];
  const row = STR[id];
  let s = own || (row ? row[lang] || row.en || id : id);
  if (params) for (const k in params) s = s.split("{" + k + "}").join(String(params[k]));
  return s;
}

function detectLang(): Lang {
  const code = (getLocales()[0]?.languageCode || "en").toLowerCase();
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : code === "be" || code === "kk" ? "ru" : "en";
}

type LangValue = { lang: Lang; setLang: (l: Lang) => void; t: (id: StrKey | string, params?: Record<string, string | number>) => string };
const LangCtx = createContext<LangValue>({ lang: "en", setLang: () => {}, t: (id) => String(id) });
const KEY = "wp_lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && (LANGS as readonly string[]).includes(v) && setLangState(v as Lang))
      .catch(() => {});
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);
  // new texts from the admin page re-render everything that reads them
  const remote = useRemoteConfig();
  const value = useMemo(() => ({ lang, setLang, t: (id: StrKey | string, p?: Record<string, string | number>) => tr(lang, id, p) }), [lang, setLang, remote]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
