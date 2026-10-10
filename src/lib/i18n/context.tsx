'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from './languages';
import { getTranslation } from './dictionaries';

interface LanguageContextType {
  locale: string;
  language: Language;
  setLocale: (newLocale: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LANGUAGE,
  language: SUPPORTED_LANGUAGES[0],
  setLocale: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) {
  const [locale, setLocaleState] = useState<string>(initialLocale);
  const [, startTransition] = useTransition();

  // On client mount, read from cookie or document
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)skillbridge_locale=([^;]+)/);
    if (match && match[1]) {
      const saved = match[1];
      if (SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setLocaleState(saved);
      }
    }
  }, []);

  const setLocale = (newLocale: string) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === newLocale)) return;

    startTransition(() => {
      setLocaleState(newLocale);
      // Persist to cookie (valid for 1 year)
      document.cookie = `skillbridge_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

      // Persist to user profile in backend if authenticated
      void fetch('/api/profile/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_language: newLocale }),
      }).catch(() => {
        // Silent catch if unauthenticated
      });
    });
  };

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0];
  const t = (key: string) => getTranslation(locale, key);

  return (
    <LanguageContext.Provider value={{ locale, language, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
