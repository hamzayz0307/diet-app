"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en, { type Dict } from "./en";
import tr from "./tr";
import type { Language } from "../types";

const DICTS: Record<Language, Dict> = { en, tr };
const STORAGE_KEY = "lang";

interface I18nValue {
  lang: Language;
  t: Dict;
  setLang: (l: Language) => void;
}

const I18nContext = createContext<I18nValue>({
  lang: "tr",
  t: tr,
  setLang: () => {},
});

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang?: Language;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Language>(initialLang ?? "tr");

  // On first load (no profile yet), fall back to the stored choice.
  // localStorage is only readable after hydration, so this one-time sync is intentional.
  useEffect(() => {
    if (initialLang) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "en" || stored === "tr") setLangState(stored);
  }, [initialLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t: DICTS[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}

/** Pick the right display name of a food for the current language. */
export function foodName(
  f: { name_en: string; name_tr: string },
  lang: Language
) {
  return lang === "tr" ? f.name_tr || f.name_en : f.name_en || f.name_tr;
}
