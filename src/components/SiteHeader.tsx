import { Link } from '@tanstack/react-router';
import { ArrowUpRight, MapPinned } from 'lucide-react';
import type { MouseEvent } from 'react';
import { InstallAppButton } from '@/components/InstallAppButton';
import { LanguageSwitcher, useCopy, useLang, type Translations } from '@/lib/i18n';
import { useRacingSeason } from '@/lib/use-racing-season';

export type CalendarView = 'calendar' | 'month' | 'map';

const COPY: Translations<{ races: string; calendar: string; map: string; saved: string; home: string; tagline: string }> = {
  en: { races: 'Races', calendar: 'Calendar', map: 'All races map', saved: 'Saved', home: 'Young Peloton home', tagline: 'EUROPEAN JUNIOR RACING' },
  sl: { races: 'Dirke', calendar: 'Koledar', map: 'Zemljevid dirk', saved: 'Shranjeno', home: 'Young Peloton – domov', tagline: 'EVROPSKE MLADINSKE DIRKE' },
  it: { races: 'Gare', calendar: 'Calendario', map: 'Mappa delle gare', saved: 'Salvate', home: 'Young Peloton – home', tagline: 'CICLISMO JUNIORES EUROPEO' },
  de: { races: 'Rennen', calendar: 'Kalender', map: 'Rennkarte', saved: 'Gespeichert', home: 'Young Peloton – Startseite', tagline: 'EUROPÄISCHER JUNIORENRADSPORT' },
  fr: { races: 'Courses', calendar: 'Calendrier', map: 'Carte des courses', saved: 'Enregistrées', home: 'Young Peloton – accueil', tagline: 'CYCLISME JUNIOR EUROPÉEN' },
};

const VIEW_HREF: Record<CalendarView, string> = { calendar: '/', month: '/?view=month', map: '/?view=map' };

/**
 * Shared site header. Views are real links (they can be opened in a new tab or shared);
 * on the calendar page a plain click switches the view in place via onView.
 */
export function SiteHeader({ active, onView }: { active?: CalendarView; onView?: (view: CalendarView) => void }) {
  const t = useCopy(COPY);
  const { lang } = useLang();
  const { saved } = useRacingSeason();
  const withLang = (href: string) => lang === 'en' ? href : href + (href.includes('?') ? '&' : '?') + 'lang=' + lang;
  const click = (view: CalendarView) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onView || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onView(view);
  };
  const item = (view: CalendarView, label: string) => (
    <a
      href={withLang(VIEW_HREF[view])}
      onClick={click(view)}
      aria-current={active === view ? 'page' : undefined}
      className={active === view ? 'yp-nav-link yp-nav-active' : 'yp-nav-link'}
    >
      {view === 'map' && <MapPinned size={15} className="mr-1 inline" />}{label}
    </a>
  );
  return (
    <header className="yp-site-header border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={t.home}>
          <img src="/yp-favicon.svg" alt="" width="40" height="40" className="rounded-lg" />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-black tracking-[-0.035em] text-slate-950">YOUNG <span className="text-sky-700">PELOTON</span></span>
            <span className="mt-1 text-[9px] font-bold tracking-[0.22em] text-slate-500">{t.tagline}</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="ml-auto flex flex-wrap items-center gap-1 text-sm sm:gap-2">
          {item('calendar', t.races)}
          {item('month', t.calendar)}
          {item('map', t.map)}
          <InstallAppButton />
          <LanguageSwitcher />
          <Link to="/season" className="ml-1 inline-flex items-center rounded-md bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-sky-900 sm:ml-3 sm:px-4">
            {t.saved} ({saved.length}) <ArrowUpRight size={14} className="ml-1 hidden sm:inline" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
