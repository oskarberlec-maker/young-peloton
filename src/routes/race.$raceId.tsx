import { englishPlace } from '@/lib/u19-english';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AlertTriangle, Bookmark } from 'lucide-react';
import { useRacingSeason } from '@/lib/use-racing-season';
import { loadU19Race, niceDate, countryLabel, safeUrl, type U19Race } from '@/lib/u19-data';
import { englishCategory, englishRaceType, englishConfirmation, englishRaceNote } from '@/lib/u19-english';
import { getRaceLevel } from '@/lib/race-level';
import { RaceSourceLinks } from '@/components/ui/RaceSourceLinks';
import { RaceEntryGuide } from '@/components/RaceEntryGuide';
import { SiteHeader } from '@/components/SiteHeader';
import { raceMapUrl } from '@/lib/race-navigation';
import { sourceLabel } from '@/lib/source-label';
import { langFromSearch, langLinks, useLang, type Translations } from '@/lib/i18n';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

/* ------------------------------------------------------------------ */
/* Page copy                                                           */
/* ------------------------------------------------------------------ */

type Copy = {
  back: string; loading: string; loadError: string; notFound: string; notFoundText: string;
  save: string; saved: string; viewSaved: string;
  dates: string; location: string; mapPosition: (pos: string) => string; notEstablished: string; approximate: string; onMap: string;
  eligibility: string; notConfirmed: string; category: string; discipline: string; level: string; evidence: string;
  lastCorrection: string; changeSource: string; status: string; cancelled: string; merged: string; listed: string; duplicate: string;
  checkTitle: string; checkOrganiser: string; checkListed: string; checkUnverified: string;
  levelUci: string; levelConfirmed: string; level2026: string;
  officialSource: string; eligibilityEvidence: string;
  guideTitle: string; guideText: string; report: string; dateUnconfirmed: string;
  metaFallback: string; metaSuffix: string;
};

const COPY: Translations<Copy> = {
  en: {
    back: '← Race calendar', loading: 'Loading race details…', loadError: 'Unable to load event information:', notFound: 'Race not found', notFoundText: 'This race is not in the current archive. It may have been merged or removed.',
    save: 'Save on this device', saved: 'Saved on this device', viewSaved: 'View saved races',
    dates: 'Date / end date', location: 'Location', mapPosition: p => `Map position: ${p} · not a verified start line.`, notEstablished: 'not established', approximate: 'approximate', onMap: 'View on Young Peloton map',
    eligibility: 'U19 eligibility', notConfirmed: 'Not confirmed', category: 'Category', discipline: 'Discipline', level: 'Race level', evidence: 'Evidence',
    lastCorrection: 'Last automatic correction', changeSource: 'Verified change source', status: 'Event status', cancelled: 'Cancelled', merged: 'Merged / archived', listed: 'Listed (not necessarily held)', duplicate: 'duplicate source entry',
    checkTitle: 'Before you register', checkOrganiser: 'Confirm the date, eligibility and registration with the organiser.', checkListed: 'Being listed does not guarantee U19 eligibility or that the race takes place.', checkUnverified: 'Entry deadline, distance, elevation and start location are not verified here.',
    levelUci: 'The 2027 competition level comes from the official UCI junior calendar.', levelConfirmed: 'The official source confirms the 2027 date; the 2027 level is not yet verified.', level2026: 'Competition levels come from the 2026 Young Peloton race-classification workbook.',
    officialSource: 'Official source', eligibilityEvidence: 'U19 eligibility evidence',
    guideTitle: 'Technical guide & registration', guideText: 'Links are labelled by destination where recognisable. Some lead to a calendar or portal rather than a race document.', report: 'Report incorrect information (with evidence link)', dateUnconfirmed: 'Date unconfirmed',
    metaFallback: 'Dates, category, status and official source for a European U19 cycling race.', metaSuffix: 'U19 cycling race',
  },
  sl: {
    back: '← Koledar dirk', loading: 'Nalaganje podatkov o dirki…', loadError: 'Podatkov o dirki ni bilo mogoče naložiti:', notFound: 'Dirke ni mogoče najti', notFoundText: 'Te dirke ni v trenutnem arhivu. Morda je bila združena ali odstranjena.',
    save: 'Shrani na to napravo', saved: 'Shranjeno na tej napravi', viewSaved: 'Shranjene dirke',
    dates: 'Datum / konec', location: 'Lokacija', mapPosition: p => `Položaj na zemljevidu: ${p} · ni preverjen start.`, notEstablished: 'ni določen', approximate: 'približno', onMap: 'Pokaži na zemljevidu',
    eligibility: 'Primernost za U19', notConfirmed: 'Ni potrjeno', category: 'Kategorija', discipline: 'Disciplina', level: 'Raven dirke', evidence: 'Dokaz',
    lastCorrection: 'Zadnji samodejni popravek', changeSource: 'Vir preverjene spremembe', status: 'Stanje dirke', cancelled: 'Odpovedana', merged: 'Združena / arhivirana', listed: 'Na seznamu (izvedba ni zagotovljena)', duplicate: 'podvojen zapis',
    checkTitle: 'Pred prijavo', checkOrganiser: 'Datum, primernost in prijavo preveri pri organizatorju.', checkListed: 'Vpis na seznam ne zagotavlja primernosti za U19 ali izvedbe dirke.', checkUnverified: 'Rok prijave, dolžina, višinci in start tu niso preverjeni.',
    levelUci: 'Raven tekmovanja za 2027 je iz uradnega UCI mladinskega koledarja.', levelConfirmed: 'Uradni vir potrjuje datum za 2027; raven za 2027 še ni preverjena.', level2026: 'Ravni tekmovanj so iz klasifikacije dirk Young Peloton 2026.',
    officialSource: 'Uradni vir', eligibilityEvidence: 'Dokaz o primernosti za U19',
    guideTitle: 'Tehnični vodnik in prijava', guideText: 'Povezave so označene po cilju, kjer je to mogoče. Nekatere vodijo na koledar ali portal namesto na dokument dirke.', report: 'Prijavi napačen podatek (s povezavo na dokaz)', dateUnconfirmed: 'Datum ni potrjen',
    metaFallback: 'Datumi, kategorija, stanje in uradni vir evropske kolesarske dirke U19.', metaSuffix: 'kolesarska dirka U19',
  },
  it: {
    back: '← Calendario gare', loading: 'Caricamento dettagli gara…', loadError: 'Impossibile caricare la gara:', notFound: 'Gara non trovata', notFoundText: 'Questa gara non è nell’archivio attuale. Potrebbe essere stata unita o rimossa.',
    save: 'Salva su questo dispositivo', saved: 'Salvata su questo dispositivo', viewSaved: 'Gare salvate',
    dates: 'Data / fine', location: 'Località', mapPosition: p => `Posizione sulla mappa: ${p} · non è la partenza verificata.`, notEstablished: 'non determinata', approximate: 'approssimativa', onMap: 'Vedi sulla mappa',
    eligibility: 'Idoneità U19', notConfirmed: 'Non confermata', category: 'Categoria', discipline: 'Disciplina', level: 'Livello', evidence: 'Fonte',
    lastCorrection: 'Ultima correzione automatica', changeSource: 'Fonte della modifica', status: 'Stato', cancelled: 'Annullata', merged: 'Unita / archiviata', listed: 'In elenco (svolgimento non garantito)', duplicate: 'record duplicato',
    checkTitle: 'Prima di iscriverti', checkOrganiser: 'Conferma data, idoneità e iscrizione con l’organizzatore.', checkListed: 'Essere in elenco non garantisce l’idoneità U19 né lo svolgimento della gara.', checkUnverified: 'Scadenza d’iscrizione, distanza, dislivello e partenza non sono verificati qui.',
    levelUci: 'Il livello 2027 proviene dal calendario UCI juniores ufficiale.', levelConfirmed: 'La fonte ufficiale conferma la data 2027; il livello 2027 non è ancora verificato.', level2026: 'I livelli provengono dalla classificazione gare Young Peloton 2026.',
    officialSource: 'Fonte ufficiale', eligibilityEvidence: 'Prova di idoneità U19',
    guideTitle: 'Guida tecnica e iscrizione', guideText: 'I link sono indicati per destinazione quando riconoscibile. Alcuni portano a un calendario o portale anziché a un documento di gara.', report: 'Segnala un’informazione errata (con link alla prova)', dateUnconfirmed: 'Data non confermata',
    metaFallback: 'Date, categoria, stato e fonte ufficiale di una gara ciclistica europea U19.', metaSuffix: 'gara ciclistica U19',
  },
  de: {
    back: '← Rennkalender', loading: 'Renndetails werden geladen…', loadError: 'Renninformationen konnten nicht geladen werden:', notFound: 'Rennen nicht gefunden', notFoundText: 'Dieses Rennen ist nicht im aktuellen Archiv. Es wurde möglicherweise zusammengeführt oder entfernt.',
    save: 'Auf diesem Gerät speichern', saved: 'Auf diesem Gerät gespeichert', viewSaved: 'Gespeicherte Rennen',
    dates: 'Datum / Ende', location: 'Ort', mapPosition: p => `Kartenposition: ${p} · kein geprüfter Startort.`, notEstablished: 'nicht ermittelt', approximate: 'ungefähr', onMap: 'Auf der Karte anzeigen',
    eligibility: 'U19-Berechtigung', notConfirmed: 'Nicht bestätigt', category: 'Kategorie', discipline: 'Disziplin', level: 'Rennniveau', evidence: 'Nachweis',
    lastCorrection: 'Letzte automatische Korrektur', changeSource: 'Quelle der Änderung', status: 'Status', cancelled: 'Abgesagt', merged: 'Zusammengeführt / archiviert', listed: 'Gelistet (Austragung nicht garantiert)', duplicate: 'doppelter Quelleintrag',
    checkTitle: 'Vor der Anmeldung', checkOrganiser: 'Datum, Berechtigung und Anmeldung beim Veranstalter bestätigen.', checkListed: 'Ein Eintrag garantiert weder die U19-Berechtigung noch die Austragung.', checkUnverified: 'Meldeschluss, Distanz, Höhenmeter und Startort sind hier nicht geprüft.',
    levelUci: 'Das Niveau 2027 stammt aus dem offiziellen UCI-Juniorenkalender.', levelConfirmed: 'Die offizielle Quelle bestätigt den Termin 2027; das Niveau 2027 ist noch nicht geprüft.', level2026: 'Die Niveaus stammen aus der Young-Peloton-Rennklassifizierung 2026.',
    officialSource: 'Offizielle Quelle', eligibilityEvidence: 'Nachweis der U19-Berechtigung',
    guideTitle: 'Technischer Leitfaden & Anmeldung', guideText: 'Links sind nach Ziel beschriftet, soweit erkennbar. Manche führen zu einem Kalender oder Portal statt zu einem Renndokument.', report: 'Falsche Information melden (mit Nachweis-Link)', dateUnconfirmed: 'Datum nicht bestätigt',
    metaFallback: 'Termine, Kategorie, Status und offizielle Quelle eines europäischen U19-Radrennens.', metaSuffix: 'U19-Radrennen',
  },
  fr: {
    back: '← Calendrier des courses', loading: 'Chargement de la course…', loadError: 'Impossible de charger la course :', notFound: 'Course introuvable', notFoundText: 'Cette course n’est pas dans les archives actuelles. Elle a peut-être été fusionnée ou retirée.',
    save: 'Enregistrer sur cet appareil', saved: 'Enregistrée sur cet appareil', viewSaved: 'Courses enregistrées',
    dates: 'Date / fin', location: 'Lieu', mapPosition: p => `Position sur la carte : ${p} · pas un départ vérifié.`, notEstablished: 'non établie', approximate: 'approximative', onMap: 'Voir sur la carte',
    eligibility: 'Éligibilité U19', notConfirmed: 'Non confirmée', category: 'Catégorie', discipline: 'Discipline', level: 'Niveau', evidence: 'Preuve',
    lastCorrection: 'Dernière correction automatique', changeSource: 'Source de la modification', status: 'Statut', cancelled: 'Annulée', merged: 'Fusionnée / archivée', listed: 'Listée (tenue non garantie)', duplicate: 'fiche en double',
    checkTitle: 'Avant de t’inscrire', checkOrganiser: 'Confirme la date, l’éligibilité et l’inscription auprès de l’organisateur.', checkListed: 'Figurer dans la liste ne garantit ni l’éligibilité U19 ni la tenue de la course.', checkUnverified: 'Clôture des inscriptions, distance, dénivelé et lieu de départ ne sont pas vérifiés ici.',
    levelUci: 'Le niveau 2027 provient du calendrier UCI juniors officiel.', levelConfirmed: 'La source officielle confirme la date 2027 ; le niveau 2027 n’est pas encore vérifié.', level2026: 'Les niveaux proviennent de la classification des courses Young Peloton 2026.',
    officialSource: 'Source officielle', eligibilityEvidence: 'Preuve d’éligibilité U19',
    guideTitle: 'Guide technique & inscription', guideText: 'Les liens sont libellés selon leur destination lorsque c’est possible. Certains mènent à un calendrier ou un portail plutôt qu’à un document de course.', report: 'Signaler une information erronée (avec lien de preuve)', dateUnconfirmed: 'Date non confirmée',
    metaFallback: 'Dates, catégorie, statut et source officielle d’une course cycliste européenne U19.', metaSuffix: 'course cycliste U19',
  },
};

const raceYear = (race: U19Race) => (race.date.startsWith('2027-') ? 2027 : 2026);

/** schema.org SportsEvent so search engines can show the race as an event. */
function eventJsonLd(race: U19Race, url: string) {
  const status = race.state === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled';
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.name,
    sport: 'Road cycling',
    url,
    ...(race.date ? { startDate: race.date } : {}),
    ...(race.enddate || race.date ? { endDate: race.enddate || race.date } : {}),
    eventStatus: status,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: englishPlace(race.place) || countryLabel(race.countryCode, race.country),
      address: { '@type': 'PostalAddress', addressLocality: englishPlace(race.place) || undefined, addressCountry: race.countryCode || undefined },
      ...(race.lat != null && race.lon != null ? { geo: { '@type': 'GeoCoordinates', latitude: race.lat, longitude: race.lon } } : {}),
    },
    ...(safeUrl(race.sourceUrl) ? { sameAs: race.sourceUrl } : {}),
    image: OG_IMAGE,
    description: `${englishCategory(race.sex) || 'Junior'} ${englishRaceType(race.type).toLowerCase()} for U19 riders in ${countryLabel(race.countryCode, race.country)}.`,
  };
}

export const Route = createFileRoute('/race/$raceId')({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string; lang?: string } => ({
    ...(typeof search['returnTo'] === 'string' && /^\/(?:\?|$)/.test(search['returnTo']) ? { returnTo: search['returnTo'] } : {}),
    ...(typeof search['lang'] === 'string' ? { lang: search['lang'] } : {}),
  }),
  // Runs on the server for the first request (so crawlers and link previews get the
  // race name, date and place) and in the browser on in-app navigation.
  loader: async ({ params }) => {
    try {
      return { race: await loadU19Race(params.raceId, AbortSignal.timeout(10000)), failed: false };
    } catch {
      return { race: null as U19Race | null, failed: true };
    }
  },
  head: ({ params, loaderData, match }) => {
    const lang = langFromSearch(match.search);
    const t = COPY[lang];
    const path = '/race/' + encodeURIComponent(params.raceId);
    const url = SITE_URL + path;
    const race = loaderData?.race;
    if (!race) {
      return {
        meta: [
          { title: `${t.metaSuffix} | ${SITE_NAME}` },
          { name: 'description', content: t.metaFallback },
          // A missing race must not be indexed; a temporary failure is left to the client retry.
          ...(loaderData && !loaderData.failed ? [{ name: 'robots', content: 'noindex,follow' }] : []),
        ],
        links: langLinks(path, lang),
      };
    }
    const when = niceDate(race.date, 'en-GB', '');
    const where = [englishPlace(race.place), countryLabel(race.countryCode, race.country)].filter(Boolean).join(', ');
    const title = `${race.name} ${race.date ? '(' + race.date.slice(0, 4) + ') ' : ''}— ${t.metaSuffix} | ${SITE_NAME}`.slice(0, 120);
    const description = [race.name, when, where, englishCategory(race.sex), englishRaceType(race.type)].filter(Boolean).join(' · ').slice(0, 155) + '. ' + t.metaFallback;
    return {
      meta: [
        { title },
        { name: 'description', content: description.slice(0, 300) },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: `${race.name} — ${SITE_NAME}` },
        { property: 'og:description', content: [when, where].filter(Boolean).join(' · ') },
        { property: 'og:url', content: url },
      ],
      links: langLinks(path, lang),
      scripts: [{ type: 'application/ld+json', children: JSON.stringify(eventJsonLd(race, url)) }],
    };
  },
  component: RacePage,
});

function RacePage() {
  const { raceId } = Route.useParams();
  const data = Route.useLoaderData();
  const { saved, toggle, error: saveError } = useRacingSeason();
  const { returnTo } = Route.useSearch();
  const { lang, locale } = useLang();
  const t = COPY[lang];
  const calendarUrl = returnTo || ((raceId.startsWith('uci-2027-') || raceId.startsWith('confirmed-2027-')) ? '/?year=2027' : '/');
  const [race, setRace] = useState<U19Race | null>(data.race);
  const [loading, setLoading] = useState(data.failed);
  const [error, setError] = useState('');

  useEffect(() => { setRace(data.race); setLoading(data.failed); setError(''); }, [data]);

  // If the server could not reach the data, retry once in the browser.
  useEffect(() => {
    if (!data.failed) return;
    const controller = new AbortController();
    loadU19Race(raceId, controller.signal)
      .then(r => { if (!controller.signal.aborted) setRace(r); })
      .catch(e => { if (!controller.signal.aborted) setError(String(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [raceId, data]);

  const date = (d: string) => niceDate(d, locale, t.dateUnconfirmed);
  const level = race ? getRaceLevel(race) : null;

  return <main className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <article className="mx-auto max-w-4xl space-y-5 p-5 py-10">
      <a href={calendarUrl} className="text-sky-700 underline">{t.back}</a>
      {loading && <p role="status">{t.loading}</p>}
      {error && <p role="alert">{t.loadError} {error}</p>}
      {!loading && !error && !race && <><h1 className="text-3xl font-bold">{t.notFound}</h1><p className="text-muted-foreground">{t.notFoundText}</p></>}
      {race && level && <>
        <p className="text-sm font-semibold text-sky-700">{date(race.date)}{race.enddate && race.enddate !== race.date ? ' – ' + date(race.enddate) : ''}</p>
        <h1 className="text-4xl font-extrabold">{race.name}</h1>
        <p className="text-lg text-slate-700">{englishPlace(race.place)} · {countryLabel(race.countryCode, race.country, lang)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50" aria-pressed={saved.includes(race.id)} onClick={() => void toggle(race.id, raceYear(race), race)}><Bookmark size={16} />{saved.includes(race.id) ? t.saved : t.save}</button>
          <Link to="/season" className="text-sm text-sky-700 underline">{t.viewSaved}</Link>
        </div>
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}

        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" aria-labelledby="check-heading">
          <h2 id="check-heading" className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle size={16} aria-hidden="true" /> {t.checkTitle}</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t.checkOrganiser}</li>
            <li>{t.checkListed}</li>
            <li>{t.checkUnverified}</li>
          </ul>
        </section>

        <dl className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">{t.dates}</dt><dd>{date(race.date)}{race.enddate && race.enddate !== race.date ? ' – ' + date(race.enddate) : ''}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{t.location}</dt><dd>{englishPlace(race.place)} · {countryLabel(race.countryCode, race.country, lang)}</dd>
            <p className="mt-1 text-xs text-muted-foreground">{t.mapPosition(race.lat != null && race.lon != null ? `${Number(race.lat).toFixed(4)}, ${Number(race.lon).toFixed(4)} (${race.precision || t.approximate})` : t.notEstablished)}</p>
            <a className="text-sm text-sky-700 underline" href={raceMapUrl(race.id, raceYear(race), calendarUrl)}>{t.onMap}</a></div>
          <div><dt className="text-sm text-muted-foreground">{t.eligibility}</dt><dd>{englishConfirmation(race.confirmation) || t.notConfirmed}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{t.category}</dt><dd>{englishCategory(race.sex)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{t.discipline}</dt><dd>{englishRaceType(race.type)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{t.level}</dt><dd className="font-semibold">{level.label}</dd><p className="mt-1 text-sm text-muted-foreground">{level.subtype}</p>
            <p className="mt-1 text-xs text-muted-foreground"><strong>{t.evidence}:</strong> {race.id.startsWith('uci-2027-') ? t.levelUci : race.id.startsWith('confirmed-2027-') ? t.levelConfirmed : t.level2026} {level.method} — {level.basis}</p></div>
          {race.sourceUpdatedAt && <div><dt className="text-sm text-muted-foreground">{t.lastCorrection}</dt><dd>{new Date(race.sourceUpdatedAt).toLocaleString(locale)}</dd>{safeUrl(race.updateSourceUrl) && <a className="text-sky-700 underline" href={race.updateSourceUrl} target="_blank" rel="noopener noreferrer">{t.changeSource}</a>}</div>}
          <div><dt className="text-sm text-muted-foreground">{t.status}</dt><dd>{race.state === 'cancelled' ? t.cancelled : race.state === 'merged' ? t.merged : race.state === 'active' ? t.listed : race.state}{race.duplicate ? ' · ' + t.duplicate : ''}</dd><p className="mt-1 text-sm">{englishRaceNote(race.status)}</p></div>
        </dl>

        <div className="flex flex-wrap gap-4">
          {safeUrl(race.sourceUrl) && <a className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900" href={race.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel(race.sourceUrl, t.officialSource)}</a>}
          {safeUrl(race.proofUrl) && <a className="inline-flex items-center text-sm text-sky-700 underline" href={race.proofUrl} target="_blank" rel="noopener noreferrer">{sourceLabel(race.proofUrl, t.eligibilityEvidence)}</a>}
        </div>
        <RaceEntryGuide race={race} />
        <section className="rounded-xl border p-4"><h2 className="text-base font-semibold">{t.guideTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{t.guideText}</p><RaceSourceLinks raceId={race.id} /></section>
        <p className="font-mono text-xs text-muted-foreground">ID: {race.id}</p>
        <div className="mt-7 border-t pt-5"><Link to="/report" search={{ raceId: race.id, raceName: race.name }} className="inline-flex rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100">{t.report}</Link></div>
      </>}
    </article>
  </main>;
}
