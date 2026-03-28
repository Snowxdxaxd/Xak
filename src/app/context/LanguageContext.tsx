import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { translations, type Lang, type TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (k) => k,
});

export const useLanguage = () => useContext(LanguageContext);

const LANG_KEY = 'ck_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return (stored === 'en' || stored === 'ru') ? stored : 'ru';
  });

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] ?? translations.ru[key] ?? key,
    [lang]
  );

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
