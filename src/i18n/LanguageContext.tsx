import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'zh';
const STORAGE_KEY = 'joe-dizi-language';

interface LanguageSettings {
  language: Language;
  setLanguage: (value: Language) => void;
  t: (english: string, chinese: string) => string;
}

const LanguageContext = createContext<LanguageSettings>({
  language: 'en', setLanguage: () => {}, t: english => english,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'; }
    catch { return 'en'; }
  });
  useEffect(() => { document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'; }, [language]);
  const value = useMemo<LanguageSettings>(() => ({
    language,
    setLanguage(next) {
      updateLanguage(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private browsing */ }
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
    },
    t: (english, chinese) => language === 'zh' ? chinese : english,
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
