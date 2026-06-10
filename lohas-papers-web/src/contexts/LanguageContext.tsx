"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { type Locale } from "@/lib/i18n";

const LANGUAGE_KEY = "lohas_language";
const LANGUAGE_CHANGE_EVENT = "lohas-language-change";
const DEFAULT_LOCALE: Locale = "ja";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function isLocale(value: string | null): value is Locale {
  return (
    value === "ja" ||
    value === "en" ||
    value === "ko" ||
    value === "zh-Hans" ||
    value === "es" ||
    value === "pt-BR" ||
    value === "th" ||
    value === "vi"
  );
}

function getLocaleSnapshot(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
}

function subscribeToLocale(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    () => DEFAULT_LOCALE,
  );

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(LANGUAGE_KEY, newLocale);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
