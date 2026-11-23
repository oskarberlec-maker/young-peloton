import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { SITE_URL } from './site';

/** Interface languages. Race names, places and source notes stay in their published form. */
export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'sl', label: 'Slovenščina', short: 'SL', locale: 'sl-SI' },
  { code: 'it', label: 'Italiano', short: 'IT', locale: 'it-IT' },
  { code: 'de', label: 'Deutsch', short: 'DE', locale: 'de-DE' },
  { code: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR' },
] as const;
export type Lang = (typeof LANGS)[number]['code'];
export type Translations<T> = Record<Lang, T>;

const STORAGE_KEY = 'yp-lang';
export const isLang = (value: unknown): value is Lang => LANGS.some(l => l.code === value);
export const localeOf = (lang: Lang) => LANGS.find(l => l.code === lang)!.locale;

/** Reads ?lang= from a parsed search object or a raw query string. */
export function langFromSearch(search: unknown): Lang {
  const value = typeof search === 'string'
    ? new URLSearchParams(search).get('lang')
    : (search as Record<string, unknown> | undefined)?.['lang'];
  return isLang(value) ? value : 'en';
}

/** Canonical and alternate-language URLs for a path, for search engines. */
export function langLinks(path: string, lang: Lang) {
  const url = (l: Lang) => SITE_URL + path + (l === 'en' ? '' : `${path.includes('?') ? '&' : '?'}lang=${l}`);
  return [
    { rel: 'canonical', href: url(lang) },
    ...LANGS.map(l => ({ rel: 'alternate', hrefLang: l.code, href: url(l.code) })),
    { rel: 'alternate', hrefLang: 'x-default', href: url('en') },
  ];
}

type LangState = { lang: Lang; locale: string; setLang: (lang: Lang) => void };
const LangContext = createContext<LangState>({ lang: 'en', locale: 'en-GB', setLang: () => {} });

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  // Without an explicit ?lang=, follow a saved choice or the browser language.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('lang')) return;
    let preferred: string | null = null;
    try { preferred = window.localStorage.getItem(STORAGE_KEY); } catch { /* storage disabled */ }
    if (!preferred) preferred = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (isLang(preferred) && preferred !== initial) setLangState(preferred);
  }, [initial]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage disabled */ }
    const url = new URL(window.location.href);
    if (next === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', next);
    window.history.replaceState(window.history.state, '', url.toString());
  }, []);

  return <LangContext.Provider value={{ lang, locale: localeOf(lang), setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Picks the copy for the active language. */
export function useCopy<T>(copy: Translations<T>): T {
  return copy[useLang().lang];
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <label className={`inline-flex items-center ${className}`}>
      <span className="sr-only">Language</span>
      <select
        value={lang}
        onChange={e => setLang(e.target.value as Lang)}
        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
        aria-label="Language"
      >
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.short} · {l.label}</option>)}
      </select>
    </label>
  );
}
