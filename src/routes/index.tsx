import { englishPlace } from '@/lib/u19-english';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, CalendarDays, MapPinned, RotateCcw, Search, AlertTriangle, Bookmark } from 'lucide-react';
import { U19Map } from '@/components/U19Map';
import { CountryEntryGuide } from '@/components/CountryEntryGuide';
import { RaceMonthCalendar } from '@/components/RaceMonthCalendar';
import { MultiRaceFilter } from '@/components/MultiRaceFilter';
import { SiteHeader, type CalendarView } from '@/components/SiteHeader';
import { getRaceLevel, LEVEL_OPTIONS, type RaceLevel } from '@/lib/race-level';
import { englishCategory, englishRaceType, englishConfirmation, englishRaceNote } from '@/lib/u19-english';
import { countryLabel, loadU19Races, niceDate, visibleRace, type RaceManifest, type U19Race } from '@/lib/u19-data';
import { UCI_2027_RACES } from '@/lib/uci-2027';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRacingSeason } from '@/lib/use-racing-season';
import { downloadIcs } from '@/lib/race-calendar';
import { ENTRY_OPTIONS, entryLabel, getRaceEntry, matchesEntry } from '@/lib/race-entry';
import { raceDetailUrl, safeCalendarReturn } from '@/lib/race-navigation';
import { langFromSearch, langLinks, useLang, type Lang, type Translations } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';

/* ------------------------------------------------------------------ */
/* Page copy (all interface languages)                                 */
/* ------------------------------------------------------------------ */

type Copy = {
  metaTitle: string; metaDescription: string; ogTitle: string;
  eyebrow: string; heroA: string; heroB: string; heroText: string;
  explore: string; map: string; savedDevice: string; heroNote: string;
  statRecords: string; statDistinct: string; statCountries: string;
  couldNotLoad: string; retry: string; loadingSeason: string; loadingParts: (done: number, total: number) => string;
  previewHeading: string; previewText: string;
  season: string; archive2026: string; upcoming2027: string; known2027: string;
  backToRace: string; showingLinked: string; linkMissing: string; showAll: string;
  planning: string; headingList: string; headingMonth: string; headingMap: string;
  viewList: string; viewMonth: string; viewMap: string; viewsLabel: string;
  mapLinked: string; mapAll: string; raceRecords: string; matchingRecords: string; exportIcs: string;
  findRaces: string; advancedShow: string; advancedHide: string;
  search: string; searchPlaceholder: string; countries: string; months: string; categories: string;
  entryMethod: string; raceLevel: string; verification: string; raceState: string; from: string; until: string; raceTypes: string;
  men: string; women: string; active: string; cancelled: string; merged: string;
  statuses: Record<'confirmed' | 'conditional' | 'review' | 'no', string>;
  types: Record<'road' | 'time trial' | 'stage' | 'criterium' | 'hill climb', string>;
  levels: Record<RaceLevel, string>;
  entries: Record<string, string>;
  upcomingOnly: string; savedRaces: (n: number) => string; showArchived: (n: number) => string; reset: string;
  showing: (a: number, b: number, total: string) => string; perPage: string;
  categoryUnconfirmed: string; dateUnconfirmed: string; saveRace: string; removeRace: string; savedOnDevice: string; saveOnDevice: string;
  note2027: string; noResults: string; previous: string; next: string; pageOf: (p: number, n: number) => string;
  notesTitle: string;
  notes: (m: RaceManifest, year: number) => string;
  scansLink: string; scansText: string;
  footer: (year: number) => string; footerSaved: string; footerAbout: string; footerScans: string; footerReport: string;
};

const COPY: Translations<Copy> = {
  en: {
    metaTitle: 'Young Peloton — European U19 Race Calendar 2026–2027',
    metaDescription: 'European junior road cycling races in 2026 and 2027: dates, original sources and an interactive map of venues. Data and confirmation status are clearly labelled.',
    ogTitle: 'Young Peloton — European U19 Race Calendar',
    eyebrow: 'The junior race index · Europe', heroA: 'Find your next', heroB: 'U19 cycling race', heroText: 'Search European junior cycling events by country, date and race type. Compare verified race information and plan your season in one place.',
    explore: 'Explore races', map: 'All races map', savedDevice: 'Saved races on this device', heroNote: 'Race information is sourced from event listings. Always confirm entry details with the organiser.',
    statRecords: 'European source records', statDistinct: 'Distinct listed entries', statCountries: 'Countries / regions',
    couldNotLoad: 'Could not load races.', retry: 'Retry', loadingSeason: 'Loading season…', loadingParts: (d, t) => `Loading races ${d} of ${t}…`,
    previewHeading: 'Upcoming UCI junior races', previewText: 'The full calendar is loading. Meanwhile, here are the next races from the official UCI junior calendar.',
    season: 'Season', archive2026: '2026 archive', upcoming2027: '2027 upcoming season', known2027: 'Known European races with officially published 2027 dates.',
    backToRace: '← Back to race details', showingLinked: 'Showing linked race:', linkMissing: 'This race link is not in the current archive.', showAll: 'Show all races',
    planning: 'Season planning', headingList: 'Find a race', headingMonth: 'Monthly race calendar', headingMap: 'Racing across Europe',
    viewList: 'List', viewMonth: 'Calendar', viewMap: 'All races map', viewsLabel: 'Race views',
    mapLinked: 'Location of the selected race.', mapAll: 'All distinct races in this season, including labelled cancellations. List filters do not apply to this map.',
    raceRecords: 'race records', matchingRecords: 'matching records', exportIcs: 'Export calendar (.ics)',
    findRaces: 'Find races', advancedShow: 'Advanced filters', advancedHide: 'Hide advanced filters',
    search: 'Search name or place', searchPlaceholder: 'Race, town, region…', countries: 'Countries', months: 'Months', categories: 'Categories',
    entryMethod: 'Entry method', raceLevel: 'Race level', verification: 'U19 verification', raceState: 'Race state', from: 'From', until: 'Until', raceTypes: 'Race types',
    men: 'Men', women: 'Women', active: 'Active', cancelled: 'Cancelled', merged: 'Merged / archived',
    statuses: { confirmed: 'U19 confirmed', conditional: 'Conditional U19', review: 'Needs review', no: 'U19 not confirmed' },
    types: { road: 'Road race', 'time trial': 'Time trial', stage: 'Stage race', criterium: 'Criterium', 'hill climb': 'Hill climb' },
    levels: { uci: 'UCI / international', national: 'National', regional: 'Regional', unverified: 'Level not verified' },
    entries: { individual: 'Individual entry', team: 'Club / team entry', invitation: 'Invitation only', unknown: 'Entry not confirmed' },
    upcomingOnly: 'Upcoming only', savedRaces: n => `Saved races (${n})`, showArchived: n => `Show archived merged / duplicate source records (${n})`, reset: 'Reset filters',
    showing: (a, b, t) => `Showing ${a}–${b} of ${t} races`, perPage: 'Races per page',
    categoryUnconfirmed: 'Category unconfirmed', dateUnconfirmed: 'Date unconfirmed', saveRace: 'Save race', removeRace: 'Remove saved race', savedOnDevice: 'Saved on device', saveOnDevice: 'Save on device',
    note2027: '2027 dates come from official sources. Daily checks look for confirmed 2027 dates of known races; last year’s dates are never reused. Dates may change. Each competition appears once. Registration deadlines, distances and elevation are not yet verified.',
    noResults: 'No races match these filters. Try a different date, country or verification status.', previous: 'Previous', next: 'Next', pageOf: (p, n) => `Page ${p} of ${n}`,
    notesTitle: 'Source and verification notes.',
    notes: (m, y) => `The ${y} source snapshot was updated ${m.asOf} and is not marked complete. Dates are those listed in the source archive, not confirmed event outcomes; ${m.missingDates} entries have no exact date. U19 participation is not verified for every event. Cancelled races stay listed and labelled. ${m.mergedRecords} merged and ${m.semanticDuplicateRecords} duplicate source records are hidden by default to prevent double counting. Map positions are approximate settlement, area or country centres, not start coordinates. 2026 levels follow the Young Peloton classification workbook, 2027 UCI levels follow the official UCI calendar; other levels remain unverified.`,
    scansLink: 'Daily source checks & scan history', scansText: 'Browse daily reports, source coverage and verified race updates.',
    footer: y => `Young Peloton · European U19 road cycling calendar · ${y} · Official event names remain in their published language`,
    footerSaved: 'Saved on this device', footerAbout: 'About & methodology', footerScans: 'Scan history', footerReport: 'Report incorrect race information',
  },
  sl: {
    metaTitle: 'Young Peloton — koledar evropskih dirk U19 2026–2027',
    metaDescription: 'Evropske mladinske cestne kolesarske dirke 2026 in 2027: datumi, uradni viri in interaktivni zemljevid prizorišč. Podatki in stopnja potrditve so jasno označeni.',
    ogTitle: 'Young Peloton — koledar evropskih dirk U19',
    eyebrow: 'Indeks mladinskih dirk · Evropa', heroA: 'Najdi svojo naslednjo', heroB: 'kolesarsko dirko U19', heroText: 'Išči evropske mladinske kolesarske dirke po državi, datumu in vrsti dirke. Primerjaj preverjene podatke in načrtuj sezono na enem mestu.',
    explore: 'Razišči dirke', map: 'Zemljevid dirk', savedDevice: 'Shranjene dirke na tej napravi', heroNote: 'Podatki o dirkah so iz objavljenih razpisov. Pogoje prijave vedno preveri pri organizatorju.',
    statRecords: 'Evropski zapisi iz virov', statDistinct: 'Različne dirke', statCountries: 'Države / regije',
    couldNotLoad: 'Dirk ni bilo mogoče naložiti.', retry: 'Poskusi znova', loadingSeason: 'Nalaganje sezone…', loadingParts: (d, t) => `Nalaganje dirk ${d} od ${t}…`,
    previewHeading: 'Prihajajoče UCI mladinske dirke', previewText: 'Celoten koledar se nalaga. Medtem si oglej naslednje dirke iz uradnega UCI mladinskega koledarja.',
    season: 'Sezona', archive2026: 'Arhiv 2026', upcoming2027: 'Prihajajoča sezona 2027', known2027: 'Znane evropske dirke z uradno objavljenimi datumi za 2027.',
    backToRace: '← Nazaj na podrobnosti dirke', showingLinked: 'Prikazana povezana dirka:', linkMissing: 'Te dirke ni v trenutnem arhivu.', showAll: 'Prikaži vse dirke',
    planning: 'Načrtovanje sezone', headingList: 'Poišči dirko', headingMonth: 'Mesečni koledar dirk', headingMap: 'Dirke po Evropi',
    viewList: 'Seznam', viewMonth: 'Koledar', viewMap: 'Zemljevid dirk', viewsLabel: 'Pogledi dirk',
    mapLinked: 'Lokacija izbrane dirke.', mapAll: 'Vse različne dirke v tej sezoni, vključno z označenimi odpovedmi. Filtri seznama na zemljevidu ne veljajo.',
    raceRecords: 'zapisov dirk', matchingRecords: 'ustreznih zapisov', exportIcs: 'Izvozi koledar (.ics)',
    findRaces: 'Iskanje dirk', advancedShow: 'Napredni filtri', advancedHide: 'Skrij napredne filtre',
    search: 'Išči ime ali kraj', searchPlaceholder: 'Dirka, kraj, regija…', countries: 'Države', months: 'Meseci', categories: 'Kategorije',
    entryMethod: 'Način prijave', raceLevel: 'Raven dirke', verification: 'Potrditev U19', raceState: 'Stanje dirke', from: 'Od', until: 'Do', raceTypes: 'Vrste dirk',
    men: 'Moški', women: 'Ženske', active: 'Aktivna', cancelled: 'Odpovedana', merged: 'Združena / arhivirana',
    statuses: { confirmed: 'U19 potrjeno', conditional: 'U19 pogojno', review: 'Potrebuje pregled', no: 'U19 ni potrjeno' },
    types: { road: 'Cestna dirka', 'time trial': 'Kronometer', stage: 'Etapna dirka', criterium: 'Kriterij', 'hill climb': 'Gorski vzpon' },
    levels: { uci: 'UCI / mednarodna', national: 'Državna', regional: 'Regionalna', unverified: 'Raven ni preverjena' },
    entries: { individual: 'Posamična prijava', team: 'Prijava kluba / ekipe', invitation: 'Samo na povabilo', unknown: 'Prijava ni potrjena' },
    upcomingOnly: 'Samo prihajajoče', savedRaces: n => `Shranjene dirke (${n})`, showArchived: n => `Prikaži arhivirane združene / podvojene zapise (${n})`, reset: 'Ponastavi filtre',
    showing: (a, b, t) => `Prikazano ${a}–${b} od ${t} dirk`, perPage: 'Dirk na stran',
    categoryUnconfirmed: 'Kategorija ni potrjena', dateUnconfirmed: 'Datum ni potrjen', saveRace: 'Shrani dirko', removeRace: 'Odstrani shranjeno dirko', savedOnDevice: 'Shranjeno na napravi', saveOnDevice: 'Shrani na napravo',
    note2027: 'Datumi za 2027 so iz uradnih virov. Dnevni pregledi iščejo potrjene datume znanih dirk; lanskih datumov nikoli ne prepisujemo. Datumi se lahko spremenijo. Vsako tekmovanje je navedeno enkrat. Roki prijav, dolžine in višinci še niso preverjeni.',
    noResults: 'Nobena dirka ne ustreza filtrom. Poskusi z drugim datumom, državo ali stopnjo potrditve.', previous: 'Prejšnja', next: 'Naslednja', pageOf: (p, n) => `Stran ${p} od ${n}`,
    notesTitle: 'Opombe o virih in preverjanju.',
    notes: (m, y) => `Posnetek virov za ${y} je bil posodobljen ${m.asOf} in ni označen kot popoln. Datumi so taki, kot jih navaja arhiv virov, in ne potrjujejo izvedbe; ${m.missingDates} zapisov nima točnega datuma. Udeležba U19 ni preverjena za vsako dirko. Odpovedane dirke ostanejo na seznamu in so označene. ${m.mergedRecords} združenih in ${m.semanticDuplicateRecords} podvojenih zapisov je privzeto skritih, da se ne štejejo dvakrat. Položaji na zemljevidu so približna središča krajev, območij ali držav, ne startne točke. Ravni za 2026 sledijo klasifikaciji Young Peloton, ravni UCI za 2027 uradnemu koledarju UCI; ostale ravni niso preverjene.`,
    scansLink: 'Dnevni pregledi virov in zgodovina', scansText: 'Dnevna poročila, pokritost virov in preverjene posodobitve dirk.',
    footer: y => `Young Peloton · koledar evropskih cestnih dirk U19 · ${y} · Uradna imena dirk ostajajo v izvirnem jeziku`,
    footerSaved: 'Shranjeno na tej napravi', footerAbout: 'O projektu in metodologija', footerScans: 'Zgodovina pregledov', footerReport: 'Prijavi napačen podatek o dirki',
  },
  it: {
    metaTitle: 'Young Peloton — Calendario europeo gare U19 2026–2027',
    metaDescription: 'Gare europee di ciclismo su strada juniores 2026 e 2027: date, fonti ufficiali e mappa interattiva. Dati e stato di conferma chiaramente indicati.',
    ogTitle: 'Young Peloton — Calendario europeo gare U19',
    eyebrow: 'L’indice delle gare juniores · Europa', heroA: 'Trova la tua prossima', heroB: 'gara ciclistica U19', heroText: 'Cerca le gare ciclistiche juniores europee per paese, data e tipo di gara. Confronta informazioni verificate e pianifica la stagione in un unico posto.',
    explore: 'Esplora le gare', map: 'Mappa delle gare', savedDevice: 'Gare salvate su questo dispositivo', heroNote: 'Le informazioni provengono dai calendari degli eventi. Verifica sempre le iscrizioni con l’organizzatore.',
    statRecords: 'Record europei dalle fonti', statDistinct: 'Gare distinte', statCountries: 'Paesi / regioni',
    couldNotLoad: 'Impossibile caricare le gare.', retry: 'Riprova', loadingSeason: 'Caricamento stagione…', loadingParts: (d, t) => `Caricamento gare ${d} di ${t}…`,
    previewHeading: 'Prossime gare UCI juniores', previewText: 'Il calendario completo è in caricamento. Intanto ecco le prossime gare del calendario UCI juniores ufficiale.',
    season: 'Stagione', archive2026: 'Archivio 2026', upcoming2027: 'Stagione 2027', known2027: 'Gare europee note con date 2027 pubblicate ufficialmente.',
    backToRace: '← Torna ai dettagli della gara', showingLinked: 'Gara collegata:', linkMissing: 'Questa gara non è nell’archivio attuale.', showAll: 'Mostra tutte le gare',
    planning: 'Pianificazione stagione', headingList: 'Trova una gara', headingMonth: 'Calendario mensile', headingMap: 'Gare in tutta Europa',
    viewList: 'Elenco', viewMonth: 'Calendario', viewMap: 'Mappa delle gare', viewsLabel: 'Viste delle gare',
    mapLinked: 'Posizione della gara selezionata.', mapAll: 'Tutte le gare distinte della stagione, comprese le cancellazioni indicate. I filtri dell’elenco non si applicano alla mappa.',
    raceRecords: 'gare', matchingRecords: 'risultati', exportIcs: 'Esporta calendario (.ics)',
    findRaces: 'Cerca gare', advancedShow: 'Filtri avanzati', advancedHide: 'Nascondi filtri avanzati',
    search: 'Cerca nome o località', searchPlaceholder: 'Gara, città, regione…', countries: 'Paesi', months: 'Mesi', categories: 'Categorie',
    entryMethod: 'Modalità d’iscrizione', raceLevel: 'Livello gara', verification: 'Verifica U19', raceState: 'Stato gara', from: 'Dal', until: 'Al', raceTypes: 'Tipi di gara',
    men: 'Uomini', women: 'Donne', active: 'Attiva', cancelled: 'Annullata', merged: 'Unita / archiviata',
    statuses: { confirmed: 'U19 confermata', conditional: 'U19 condizionata', review: 'Da verificare', no: 'U19 non confermata' },
    types: { road: 'Gara in linea', 'time trial': 'Cronometro', stage: 'Corsa a tappe', criterium: 'Criterium', 'hill climb': 'Cronoscalata' },
    levels: { uci: 'UCI / internazionale', national: 'Nazionale', regional: 'Regionale', unverified: 'Livello non verificato' },
    entries: { individual: 'Iscrizione individuale', team: 'Iscrizione di club / squadra', invitation: 'Solo su invito', unknown: 'Iscrizione non confermata' },
    upcomingOnly: 'Solo prossime', savedRaces: n => `Gare salvate (${n})`, showArchived: n => `Mostra record archiviati uniti / duplicati (${n})`, reset: 'Azzera filtri',
    showing: (a, b, t) => `Gare ${a}–${b} di ${t}`, perPage: 'Gare per pagina',
    categoryUnconfirmed: 'Categoria non confermata', dateUnconfirmed: 'Data non confermata', saveRace: 'Salva gara', removeRace: 'Rimuovi gara salvata', savedOnDevice: 'Salvata sul dispositivo', saveOnDevice: 'Salva sul dispositivo',
    note2027: 'Le date 2027 provengono da fonti ufficiali. Controlli giornalieri cercano date 2027 confermate; le date dell’anno precedente non vengono mai riutilizzate. Le date possono cambiare. Ogni gara appare una sola volta. Scadenze d’iscrizione, distanze e dislivelli non sono ancora verificati.',
    noResults: 'Nessuna gara corrisponde ai filtri. Prova un’altra data, un altro paese o stato di verifica.', previous: 'Precedente', next: 'Successiva', pageOf: (p, n) => `Pagina ${p} di ${n}`,
    notesTitle: 'Note su fonti e verifica.',
    notes: (m, y) => `L’istantanea delle fonti ${y} è aggiornata al ${m.asOf} e non è completa. Le date sono quelle dell’archivio delle fonti, non esiti confermati; ${m.missingDates} record non hanno una data esatta. La partecipazione U19 non è verificata per ogni gara. Le gare annullate restano elencate e indicate. ${m.mergedRecords} record uniti e ${m.semanticDuplicateRecords} duplicati sono nascosti per evitare doppi conteggi. Le posizioni sulla mappa sono centri approssimativi di località, aree o paesi, non coordinate di partenza. I livelli 2026 seguono la classificazione Young Peloton, i livelli UCI 2027 il calendario UCI ufficiale; gli altri non sono verificati.`,
    scansLink: 'Controlli giornalieri delle fonti', scansText: 'Rapporti giornalieri, copertura delle fonti e aggiornamenti verificati.',
    footer: y => `Young Peloton · Calendario europeo del ciclismo su strada U19 · ${y} · I nomi ufficiali restano nella lingua originale`,
    footerSaved: 'Salvate su questo dispositivo', footerAbout: 'Chi siamo e metodologia', footerScans: 'Cronologia controlli', footerReport: 'Segnala un’informazione errata',
  },
  de: {
    metaTitle: 'Young Peloton — Europäischer U19-Rennkalender 2026–2027',
    metaDescription: 'Europäische Junioren-Straßenrennen 2026 und 2027: Termine, offizielle Quellen und eine interaktive Karte. Daten und Bestätigungsstatus sind klar gekennzeichnet.',
    ogTitle: 'Young Peloton — Europäischer U19-Rennkalender',
    eyebrow: 'Der Junioren-Rennindex · Europa', heroA: 'Finde dein nächstes', heroB: 'U19-Radrennen', heroText: 'Suche europäische Junioren-Radrennen nach Land, Datum und Rennart. Vergleiche geprüfte Informationen und plane deine Saison an einem Ort.',
    explore: 'Rennen entdecken', map: 'Rennkarte', savedDevice: 'Auf diesem Gerät gespeichert', heroNote: 'Die Renninformationen stammen aus Veranstaltungslisten. Bestätige Anmeldedetails immer beim Veranstalter.',
    statRecords: 'Europäische Quelldatensätze', statDistinct: 'Unterschiedliche Rennen', statCountries: 'Länder / Regionen',
    couldNotLoad: 'Rennen konnten nicht geladen werden.', retry: 'Erneut versuchen', loadingSeason: 'Saison wird geladen…', loadingParts: (d, t) => `Rennen werden geladen ${d} von ${t}…`,
    previewHeading: 'Kommende UCI-Juniorenrennen', previewText: 'Der vollständige Kalender wird geladen. Hier schon die nächsten Rennen aus dem offiziellen UCI-Juniorenkalender.',
    season: 'Saison', archive2026: 'Archiv 2026', upcoming2027: 'Saison 2027', known2027: 'Bekannte europäische Rennen mit offiziell veröffentlichten Terminen für 2027.',
    backToRace: '← Zurück zu den Renndetails', showingLinked: 'Verlinktes Rennen:', linkMissing: 'Dieses Rennen ist nicht im aktuellen Archiv.', showAll: 'Alle Rennen anzeigen',
    planning: 'Saisonplanung', headingList: 'Rennen finden', headingMonth: 'Monatskalender', headingMap: 'Rennen in ganz Europa',
    viewList: 'Liste', viewMonth: 'Kalender', viewMap: 'Rennkarte', viewsLabel: 'Ansichten',
    mapLinked: 'Ort des ausgewählten Rennens.', mapAll: 'Alle unterschiedlichen Rennen der Saison, einschließlich gekennzeichneter Absagen. Listenfilter gelten nicht für die Karte.',
    raceRecords: 'Rennen', matchingRecords: 'Treffer', exportIcs: 'Kalender exportieren (.ics)',
    findRaces: 'Rennen suchen', advancedShow: 'Erweiterte Filter', advancedHide: 'Erweiterte Filter ausblenden',
    search: 'Name oder Ort suchen', searchPlaceholder: 'Rennen, Ort, Region…', countries: 'Länder', months: 'Monate', categories: 'Kategorien',
    entryMethod: 'Anmeldung', raceLevel: 'Rennniveau', verification: 'U19-Prüfung', raceState: 'Rennstatus', from: 'Von', until: 'Bis', raceTypes: 'Rennarten',
    men: 'Männer', women: 'Frauen', active: 'Aktiv', cancelled: 'Abgesagt', merged: 'Zusammengeführt / archiviert',
    statuses: { confirmed: 'U19 bestätigt', conditional: 'U19 bedingt', review: 'Prüfung nötig', no: 'U19 nicht bestätigt' },
    types: { road: 'Straßenrennen', 'time trial': 'Zeitfahren', stage: 'Etappenrennen', criterium: 'Kriterium', 'hill climb': 'Bergzeitfahren' },
    levels: { uci: 'UCI / international', national: 'National', regional: 'Regional', unverified: 'Niveau nicht geprüft' },
    entries: { individual: 'Einzelanmeldung', team: 'Vereins- / Teamanmeldung', invitation: 'Nur auf Einladung', unknown: 'Anmeldung nicht bestätigt' },
    upcomingOnly: 'Nur kommende', savedRaces: n => `Gespeicherte Rennen (${n})`, showArchived: n => `Archivierte zusammengeführte / doppelte Datensätze anzeigen (${n})`, reset: 'Filter zurücksetzen',
    showing: (a, b, t) => `${a}–${b} von ${t} Rennen`, perPage: 'Rennen pro Seite',
    categoryUnconfirmed: 'Kategorie nicht bestätigt', dateUnconfirmed: 'Datum nicht bestätigt', saveRace: 'Rennen speichern', removeRace: 'Gespeichertes Rennen entfernen', savedOnDevice: 'Auf Gerät gespeichert', saveOnDevice: 'Auf Gerät speichern',
    note2027: 'Die Termine 2027 stammen aus offiziellen Quellen. Tägliche Prüfungen suchen bestätigte Termine bekannter Rennen; Vorjahrestermine werden nie übernommen. Termine können sich ändern. Jedes Rennen erscheint einmal. Meldeschluss, Distanzen und Höhenmeter sind noch nicht geprüft.',
    noResults: 'Keine Rennen entsprechen diesen Filtern. Versuche ein anderes Datum, Land oder einen anderen Prüfstatus.', previous: 'Zurück', next: 'Weiter', pageOf: (p, n) => `Seite ${p} von ${n}`,
    notesTitle: 'Hinweise zu Quellen und Prüfung.',
    notes: (m, y) => `Der Quellenstand ${y} wurde am ${m.asOf} aktualisiert und ist nicht vollständig. Termine entsprechen dem Quellarchiv, nicht bestätigten Austragungen; ${m.missingDates} Einträge haben kein genaues Datum. Die U19-Teilnahme ist nicht bei jedem Rennen geprüft. Abgesagte Rennen bleiben gelistet und gekennzeichnet. ${m.mergedRecords} zusammengeführte und ${m.semanticDuplicateRecords} doppelte Datensätze sind standardmäßig ausgeblendet. Kartenpositionen sind ungefähre Orts-, Gebiets- oder Landesmittelpunkte, keine Startkoordinaten. Niveaus 2026 folgen der Young-Peloton-Klassifizierung, UCI-Niveaus 2027 dem offiziellen UCI-Kalender; andere sind ungeprüft.`,
    scansLink: 'Tägliche Quellenprüfungen', scansText: 'Tägliche Berichte, Quellenabdeckung und geprüfte Rennaktualisierungen.',
    footer: y => `Young Peloton · Europäischer U19-Straßenradsportkalender · ${y} · Offizielle Rennnamen bleiben in der Originalsprache`,
    footerSaved: 'Auf diesem Gerät gespeichert', footerAbout: 'Über uns & Methodik', footerScans: 'Prüfverlauf', footerReport: 'Falsche Renninformation melden',
  },
  fr: {
    metaTitle: 'Young Peloton — Calendrier européen des courses U19 2026–2027',
    metaDescription: 'Courses cyclistes juniors sur route en Europe en 2026 et 2027 : dates, sources officielles et carte interactive. Données et statut de confirmation clairement indiqués.',
    ogTitle: 'Young Peloton — Calendrier européen des courses U19',
    eyebrow: 'L’index des courses juniors · Europe', heroA: 'Trouve ta prochaine', heroB: 'course cycliste U19', heroText: 'Recherche les courses cyclistes juniors en Europe par pays, date et type de course. Compare des informations vérifiées et planifie ta saison au même endroit.',
    explore: 'Explorer les courses', map: 'Carte des courses', savedDevice: 'Courses enregistrées sur cet appareil', heroNote: 'Les informations proviennent des calendriers des épreuves. Vérifie toujours les inscriptions auprès de l’organisateur.',
    statRecords: 'Fiches européennes sources', statDistinct: 'Courses distinctes', statCountries: 'Pays / régions',
    couldNotLoad: 'Impossible de charger les courses.', retry: 'Réessayer', loadingSeason: 'Chargement de la saison…', loadingParts: (d, t) => `Chargement des courses ${d} sur ${t}…`,
    previewHeading: 'Prochaines courses UCI juniors', previewText: 'Le calendrier complet se charge. En attendant, voici les prochaines courses du calendrier UCI juniors officiel.',
    season: 'Saison', archive2026: 'Archives 2026', upcoming2027: 'Saison 2027', known2027: 'Courses européennes connues avec des dates 2027 officiellement publiées.',
    backToRace: '← Retour aux détails de la course', showingLinked: 'Course liée :', linkMissing: 'Cette course n’est pas dans les archives actuelles.', showAll: 'Afficher toutes les courses',
    planning: 'Planification de saison', headingList: 'Trouver une course', headingMonth: 'Calendrier mensuel', headingMap: 'Courses à travers l’Europe',
    viewList: 'Liste', viewMonth: 'Calendrier', viewMap: 'Carte des courses', viewsLabel: 'Vues des courses',
    mapLinked: 'Emplacement de la course sélectionnée.', mapAll: 'Toutes les courses distinctes de la saison, y compris les annulations signalées. Les filtres de la liste ne s’appliquent pas à la carte.',
    raceRecords: 'courses', matchingRecords: 'résultats', exportIcs: 'Exporter le calendrier (.ics)',
    findRaces: 'Rechercher des courses', advancedShow: 'Filtres avancés', advancedHide: 'Masquer les filtres avancés',
    search: 'Nom ou lieu', searchPlaceholder: 'Course, ville, région…', countries: 'Pays', months: 'Mois', categories: 'Catégories',
    entryMethod: 'Mode d’inscription', raceLevel: 'Niveau', verification: 'Vérification U19', raceState: 'Statut', from: 'Du', until: 'Au', raceTypes: 'Types de course',
    men: 'Hommes', women: 'Femmes', active: 'Active', cancelled: 'Annulée', merged: 'Fusionnée / archivée',
    statuses: { confirmed: 'U19 confirmé', conditional: 'U19 conditionnel', review: 'À vérifier', no: 'U19 non confirmé' },
    types: { road: 'Course en ligne', 'time trial': 'Contre-la-montre', stage: 'Course par étapes', criterium: 'Critérium', 'hill climb': 'Course de côte' },
    levels: { uci: 'UCI / international', national: 'National', regional: 'Régional', unverified: 'Niveau non vérifié' },
    entries: { individual: 'Inscription individuelle', team: 'Inscription club / équipe', invitation: 'Sur invitation', unknown: 'Inscription non confirmée' },
    upcomingOnly: 'À venir uniquement', savedRaces: n => `Courses enregistrées (${n})`, showArchived: n => `Afficher les fiches archivées fusionnées / en double (${n})`, reset: 'Réinitialiser',
    showing: (a, b, t) => `Courses ${a}–${b} sur ${t}`, perPage: 'Courses par page',
    categoryUnconfirmed: 'Catégorie non confirmée', dateUnconfirmed: 'Date non confirmée', saveRace: 'Enregistrer la course', removeRace: 'Retirer la course', savedOnDevice: 'Enregistrée sur l’appareil', saveOnDevice: 'Enregistrer sur l’appareil',
    note2027: 'Les dates 2027 proviennent de sources officielles. Des contrôles quotidiens recherchent les dates 2027 confirmées ; les dates de l’année précédente ne sont jamais reprises. Les dates peuvent changer. Chaque épreuve apparaît une fois. Clôtures d’inscription, distances et dénivelés ne sont pas encore vérifiés.',
    noResults: 'Aucune course ne correspond à ces filtres. Essaie une autre date, un autre pays ou statut de vérification.', previous: 'Précédente', next: 'Suivante', pageOf: (p, n) => `Page ${p} sur ${n}`,
    notesTitle: 'Notes sur les sources et la vérification.',
    notes: (m, y) => `L’instantané des sources ${y} a été mis à jour le ${m.asOf} et n’est pas complet. Les dates sont celles des archives sources, pas des résultats confirmés ; ${m.missingDates} fiches n’ont pas de date exacte. La participation U19 n’est pas vérifiée pour chaque course. Les courses annulées restent listées et signalées. ${m.mergedRecords} fiches fusionnées et ${m.semanticDuplicateRecords} doublons sont masqués par défaut. Les positions sur la carte sont des centres approximatifs de localités, zones ou pays, pas des coordonnées de départ. Les niveaux 2026 suivent la classification Young Peloton, les niveaux UCI 2027 le calendrier UCI officiel ; les autres ne sont pas vérifiés.`,
    scansLink: 'Contrôles quotidiens des sources', scansText: 'Rapports quotidiens, couverture des sources et mises à jour vérifiées.',
    footer: y => `Young Peloton · Calendrier européen du cyclisme sur route U19 · ${y} · Les noms officiels restent dans leur langue d’origine`,
    footerSaved: 'Enregistrées sur cet appareil', footerAbout: 'À propos & méthodologie', footerScans: 'Historique des contrôles', footerReport: 'Signaler une information erronée',
  },
};

export const Route = createFileRoute('/')({
  head: ({ match }) => {
    const lang = langFromSearch(match.search);
    const t = COPY[lang];
    const url = SITE_URL + '/' + (lang === 'en' ? '' : `?lang=${lang}`);
    return {
      meta: [
        { title: t.metaTitle },
        { name: 'description', content: t.metaDescription },
        { property: 'og:title', content: t.ogTitle },
        { property: 'og:description', content: t.metaDescription },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: url },
        { name: 'robots', content: 'index,follow,max-image-preview:large' },
      ],
      links: langLinks('/', lang),
    };
  },
  component: Index,
});

/* ------------------------------------------------------------------ */
/* Filter options and helpers                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 24;
const PAGE_SIZES = [12, 24, 48, 96];
const MONTH_VALUES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const CATEGORY_VALUES = ['men', 'women'] as const;
const STATUS_VALUES = ['confirmed', 'conditional', 'review', 'no'] as const;
const STATE_VALUES = ['active', 'cancelled', 'merged'] as const;
const TYPE_VALUES = ['road', 'time trial', 'stage', 'criterium', 'hill climb'] as const;
const DEFAULT_STATUSES = ['confirmed'];
const DEFAULT_STATES = ['active'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const raceOverlaps = (r: U19Race, start: string, end: string) =>
  (!start || (r.enddate || r.date) >= start) && (!end || (r.date || r.enddate) <= end);
const raceTypeLabel = (r: U19Race) => englishRaceType(r.type).toLowerCase();
const raceYearOf = (r: U19Race) => (r.date.startsWith('2027-') ? 2027 : 2026);

function downloadCsv(races: U19Race[]) {
  const cols: [string, (r: U19Race) => string][] = [
    ['Race ID', r => r.id], ['Race', r => r.name], ['Country', r => countryLabel(r.countryCode, r.country)], ['Location', r => r.place],
    ['Date', r => r.date], ['End date', r => r.enddate], ['Category', r => englishCategory(r.sex)], ['Type', r => englishRaceType(r.type)],
    ['U19 status', r => englishConfirmation(r.confirmation)], ['Race level', r => getRaceLevel(r).label], ['Race sublevel', r => getRaceLevel(r).subtype],
    ['Level evidence type', r => getRaceLevel(r).method], ['Level basis', r => getRaceLevel(r).basis], ['Race state', r => r.state], ['Notice', r => englishRaceNote(r.status)],
    ['Entry method', r => entryLabel(r)], ['Entry evidence', r => getRaceEntry(r)?.sourceUrl || ''], ['Source', r => r.sourceUrl], ['U19 evidence', r => r.proofUrl || r.sourceUrl],
  ];
  const safeCell = (value: string) => {
    let s = value || '';
    // Avoid CSV formula execution in spreadsheet applications.
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [cols.map(c => safeCell(c[0])).join(','), ...races.map(r => cols.map(c => safeCell(c[1](r))).join(','))];
  const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'young-peloton-u19.csv'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/* ------------------------------------------------------------------ */
/* Calendar filters: client-side React state, mirrored in the URL      */
/* ------------------------------------------------------------------ */

type Filters = {
  year: number; view: CalendarView; query: string;
  countries: string[]; months: string[]; categories: string[]; statuses: string[]; states: string[];
  types: string[]; levels: RaceLevel[]; entry: string[];
  from: string; to: string; upcoming: boolean; savedOnly: boolean; archived: boolean;
  page: number; pageSize: number; linkedRace: string;
};

const DEFAULT_FILTERS: Filters = {
  year: 2026, view: 'calendar', query: '',
  countries: [], months: [], categories: [], statuses: DEFAULT_STATUSES, states: DEFAULT_STATES,
  types: [], levels: [], entry: [],
  from: '', to: '', upcoming: false, savedOnly: false, archived: false,
  page: 1, pageSize: PAGE_SIZE, linkedRace: '',
};

/** Multi-value keys: [URL key, filter field, allowed values (null = any), default]. */
const LIST_PARAMS: [string, 'countries' | 'months' | 'categories' | 'statuses' | 'states' | 'types' | 'levels' | 'entry', readonly string[] | null, string[]][] = [
  ['country', 'countries', null, []],
  ['month', 'months', MONTH_VALUES, []],
  ['category', 'categories', CATEGORY_VALUES, []],
  ['verification', 'statuses', STATUS_VALUES, DEFAULT_STATUSES],
  ['state', 'states', STATE_VALUES, DEFAULT_STATES],
  ['type', 'types', TYPE_VALUES, []],
  ['level', 'levels', LEVEL_OPTIONS.map(x => x.value), []],
  ['entry', 'entry', ENTRY_OPTIONS.map(x => x.value), []],
];
const MANAGED_KEYS = ['year', 'from', 'to', 'q', 'view', 'upcoming', 'saved', 'archived', 'page', 'size', 'race', ...LIST_PARAMS.map(p => p[0])];

function filtersFromUrl(search: string): Filters {
  const p = new URLSearchParams(search);
  const list = (key: string, allowed: readonly string[] | null, fallback: string[]) => {
    const all = p.getAll(key).flatMap(v => v.split(',')).filter(Boolean);
    if (all.includes('all')) return [];
    if (!all.length) return fallback;
    return [...new Set(allowed ? all.filter(x => allowed.includes(x)) : all)];
  };
  const f: Filters = { ...DEFAULT_FILTERS };
  for (const [key, field, allowed, fallback] of LIST_PARAMS) (f[field] as string[]) = list(key, allowed, fallback);
  f.year = p.get('year') === '2027' ? 2027 : 2026;
  f.view = p.get('view') === 'map' ? 'map' : p.get('view') === 'month' ? 'month' : 'calendar';
  f.query = p.get('q') || '';
  f.from = p.get('from') || '';
  f.to = p.get('to') || '';
  f.upcoming = p.get('upcoming') === '1';
  f.savedOnly = p.get('saved') === '1';
  f.archived = p.get('archived') === '1';
  f.page = Math.max(1, Number(p.get('page')) || 1);
  f.pageSize = PAGE_SIZES.includes(Number(p.get('size'))) ? Number(p.get('size')) : PAGE_SIZE;
  f.linkedRace = p.get('race') || '';
  return f;
}

function writeFiltersToUrl(f: Filters): string {
  const url = new URL(window.location.href);
  for (const key of MANAGED_KEYS) url.searchParams.delete(key);
  if (f.year === 2027) url.searchParams.set('year', '2027');
  for (const [key, field, , fallback] of LIST_PARAMS) {
    const items = f[field] as string[];
    if (items.join(',') === fallback.join(',')) continue;
    if (items.length === 0 && fallback.length) url.searchParams.set(key, 'all');
    else items.forEach(item => url.searchParams.append(key, item));
  }
  const scalar: [string, string][] = [
    ['from', f.from], ['to', f.to], ['q', f.query],
    ['view', f.view === 'calendar' ? '' : f.view],
    ['upcoming', f.upcoming ? '1' : ''], ['saved', f.savedOnly ? '1' : ''], ['archived', f.archived ? '1' : ''],
    ['page', f.page > 1 ? String(f.page) : ''], ['size', f.pageSize !== PAGE_SIZE ? String(f.pageSize) : ''],
    ['race', f.linkedRace],
  ];
  for (const [k, v] of scalar) if (v) url.searchParams.set(k, v);
  if (!f.linkedRace) url.searchParams.delete('mapReturnTo');
  if (url.toString() !== window.location.href) window.history.replaceState(window.history.state, '', url.toString());
  return url.pathname + url.search;
}

function useCalendarFilters() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(false);
  const [mapCalendarReturn, setMapCalendarReturn] = useState('/');
  const [calendarReturnTo, setCalendarReturnTo] = useState('/');

  useEffect(() => {
    setFilters(filtersFromUrl(window.location.search));
    setMapCalendarReturn(safeCalendarReturn(new URLSearchParams(window.location.search).get('mapReturnTo')) || '/');
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) setCalendarReturnTo(writeFiltersToUrl(filters));
  }, [filters, ready]);

  /** Update fields; any filter change returns to page 1 and leaves a linked single race. */
  const update = useCallback((patch: Partial<Filters>) => setFilters(f => ({ ...f, linkedRace: '', page: 1, ...patch })), []);
  const setPage = useCallback((page: number) => setFilters(f => ({ ...f, page })), []);
  const reset = useCallback(() => setFilters(f => ({ ...DEFAULT_FILTERS, year: f.year, view: f.view, pageSize: f.pageSize })), []);

  return { filters, ready, update, setPage, reset, mapCalendarReturn, calendarReturnTo };
}

function applyFilters(races: U19Race[], f: Filters, saved: string[]) {
  const q = f.query.trim().toLocaleLowerCase();
  const today = todayISO();
  return races.filter(r => {
    if (f.year === 2027 ? !r.date.startsWith('2027-') : r.date.startsWith('2027-')) return false;
    if (f.linkedRace) return r.id === f.linkedRace;
    if (!f.archived && !visibleRace(r)) return false;
    if (f.savedOnly && !saved.includes(r.id)) return false;
    if (f.upcoming && (r.enddate || r.date) < today) return false;
    if (f.countries.length && !f.countries.includes(r.countryCode)) return false;
    if (f.months.length && !f.months.some(m => raceOverlaps(r, `${f.year}-${m.padStart(2, '0')}-01`, new Date(Date.UTC(f.year, Number(m), 0)).toISOString().slice(0, 10)))) return false;
    if (f.categories.length && !f.categories.some(c => c === 'men' ? r.sex.includes('M') : r.sex.includes('Ž') || /women|female/i.test(r.sex))) return false;
    if (f.statuses.length && !f.statuses.includes(r.bucket)) return false;
    if (f.states.length && !f.states.includes(r.state)) return false;
    if (f.types.length && !f.types.some(t => raceTypeLabel(r).includes(t))) return false;
    if (f.levels.length && !f.levels.includes(getRaceLevel(r).level)) return false;
    if (!matchesEntry(r, f.entry)) return false;
    if ((f.from || f.to) && !raceOverlaps(r, f.from, f.to)) return false;
    if (q && !`${r.name} ${r.place} ${r.region} ${r.country} ${countryLabel(r.countryCode, r.country)} ${englishCategory(r.sex)} ${englishRaceType(r.type)} ${englishConfirmation(r.confirmation)} ${englishRaceNote(r.status)}`.toLocaleLowerCase().includes(q)) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Index() {
  const { lang, locale } = useLang();
  const t = COPY[lang];
  const { filters: f, ready, update, setPage, reset, mapCalendarReturn, calendarReturnTo } = useCalendarFilters();
  const { saved, toggle: toggleSaved, error: saveError } = useRacingSeason();
  const [races, setRaces] = useState<U19Race[]>([]);
  const [manifest, setManifest] = useState<RaceManifest | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const tab = f.view;

  const jump = (view: CalendarView) => {
    update({ view, page: f.page });
    requestAnimationFrame(() => document.getElementById('race-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setManifest(null); setRaces([]); setLoadError(''); setProgress(null);
    loadU19Races((done, total) => setProgress([done, total]), controller.signal, f.year)
      .then(({ races, manifest }) => { if (controller.signal.aborted) return; setRaces(races); setManifest(manifest); })
      .catch(err => { if (!controller.signal.aborted) setLoadError(String(err?.message || err)); });
    return () => controller.abort();
  }, [f.year, ready]);

  useEffect(() => { if (ready) document.title = t.metaTitle.replace(/2026–2027/, String(f.year)); }, [f.year, ready, t]);
  useEffect(() => {
    if (!manifest) return;
    try {
      const pos = sessionStorage.getItem('yp-calendar-scroll');
      if (pos) { sessionStorage.removeItem('yp-calendar-scroll'); requestAnimationFrame(() => window.scrollTo(0, Number(pos) || 0)); }
    } catch { /* storage disabled */ }
  }, [manifest]);

  const countries = useMemo(
    () => [...new Map(races.map(r => [r.countryCode, countryLabel(r.countryCode, r.country, lang)])).entries()].sort((a, b) => a[1].localeCompare(b[1], locale)),
    [races, lang, locale],
  );
  const monthNames = useMemo(() => MONTH_VALUES.map(m => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, Number(m) - 1, 15)))), [locale]);
  const selectedLinkedRace = races.find(r => r.id === f.linkedRace);
  const filtered = useMemo(() => applyFilters(races, f, saved), [races, f, saved]);
  // The map shows the whole season, independent of hidden list filters.
  const mapRaces = useMemo(() => races.filter(r => (f.linkedRace ? r.id === f.linkedRace : visibleRace(r))), [races, f.linkedRace]);
  const displayedRaces = tab === 'map' ? mapRaces : filtered;
  const pages = Math.max(1, Math.ceil(filtered.length / f.pageSize));
  const currentPage = Math.min(f.page, pages);
  const shown = filtered.slice((currentPage - 1) * f.pageSize, currentPage * f.pageSize);
  const date = (d: string) => niceDate(d, locale, t.dateUnconfirmed);
  const dateRange = (r: U19Race) => date(r.date) + (r.enddate && r.enddate !== r.date ? ` – ${date(r.enddate)}` : '');
  const n = (x: number) => x.toLocaleString(locale);
  const controlClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';
  const advancedClass = advanced ? 'block' : 'hidden sm:block';

  // Shown immediately (also in the server-rendered HTML) while the full archive loads.
  const preview = useMemo(() => {
    const today = todayISO();
    return UCI_2027_RACES.filter(r => (r.enddate || r.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 9);
  }, []);

  return <main className="min-h-screen bg-background text-foreground">
    <SiteHeader active={tab} onView={jump} />
    <section className="yp-hero relative isolate overflow-hidden bg-[#061a30] text-white">
      <div className="yp-hero-grid absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[1.3fr_0.7fr] lg:gap-12 lg:py-20">
        <div>
          <div className="mb-6 flex items-center gap-3"><span className="h-[2px] w-10 bg-cyan-400" aria-hidden="true" /><span className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">{t.eyebrow}</span></div>
          <h1 className="yp-display max-w-3xl text-[clamp(2.9rem,6vw,5.1rem)] leading-[1.04] tracking-[-0.055em]">{t.heroA} <span className="italic text-cyan-300">{t.heroB}</span>.</h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-slate-300 md:text-base">{t.heroText}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button onClick={() => jump('calendar')} className="h-11 rounded-md bg-cyan-300 px-5 font-bold text-slate-950 hover:bg-cyan-200"><CalendarDays size={17} /> {t.explore}</Button>
            <Button onClick={() => jump('map')} className="h-11 rounded-md border border-white/30 bg-transparent px-5 font-semibold text-white shadow-none hover:border-cyan-300 hover:bg-white/10"><MapPinned size={17} /> {t.map}</Button>
            <Link to="/season" className="inline-flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition hover:border-cyan-300 hover:bg-white/10">{t.savedDevice} <ArrowUpRight size={16} className="ml-2" /></Link>
          </div>
          <p className="mt-6 text-[11px] leading-5 text-slate-400">{t.heroNote}</p>
        </div>
        <div className="yp-season-graphic relative hidden min-h-[345px] overflow-hidden border border-white/15 lg:block" aria-hidden="true">
          <div className="absolute left-7 top-7 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">YP / Race calendar</div>
          <div className="yp-speed-stripes absolute right-[-8%] top-[20%] h-[160px] w-[120%] rotate-[-18deg]" />
          <div className="absolute bottom-14 left-7 text-[120px] font-black leading-none tracking-[-0.12em] text-white/90">26<span className="ml-3 align-top text-lg font-medium tracking-normal text-cyan-300">/ 27</span></div>
          <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-white/30 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65"><span>Road · TT · Stage</span><span>EST. 2026</span></div>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-5 py-10">
      {manifest && <div className="yp-index-stats mb-10 grid gap-4 border-y border-slate-200 py-3 sm:grid-cols-3">
        {([[t.statRecords, manifest.rawEuropeanRecords], [t.statDistinct, manifest.uniqueVisibleRecords], [t.statCountries, countries.length]] as const).map(([label, value]) =>
          <div key={label} className="yp-stat py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 font-mono text-[27px] font-semibold tracking-tight text-slate-950 tabular-nums">{n(value)}</p></div>)}
      </div>}
      {loadError && <div role="alert" className="mb-6 rounded-lg border border-red-300 p-4"><strong>{t.couldNotLoad}</strong> {loadError} <button className="ml-2 underline" onClick={() => window.location.reload()}>{t.retry}</button></div>}
      {!manifest && !loadError && <section aria-labelledby="preview-heading" className="mb-10">
        <p role="status" className="mb-6 text-center text-sm text-muted-foreground">{progress ? t.loadingParts(progress[0], progress[1]) : t.loadingSeason}</p>
        {preview.length > 0 && <>
          <h2 id="preview-heading" className="yp-section-heading text-2xl font-semibold tracking-tight text-slate-950">{t.previewHeading}</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">{t.previewText}</p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {preview.map(r => <li key={r.id} className="yp-race-card rounded-lg border border-slate-200 bg-white p-5">
              <p className="mb-2 font-semibold tabular-nums text-sky-800">{dateRange(r)}</p>
              <Link to="/race/$raceId" params={{ raceId: r.id }} className="text-[17px] font-bold leading-snug text-slate-950 hover:text-sky-700 hover:underline">{r.name}</Link>
              <p className="mt-2 text-sm text-muted-foreground">{englishPlace(r.place)} · {countryLabel(r.countryCode, r.country, lang)}</p>
            </li>)}
          </ul>
        </>}
      </section>}
      {manifest && <>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium" htmlFor="season">{t.season}</label>
          <select id="season" className="rounded-md border bg-background px-3 py-2" value={f.year} onChange={e => update({ year: Number(e.target.value), from: '', to: '' })}>
            <option value={2026}>{t.archive2026}</option><option value={2027}>{t.upcoming2027}</option>
          </select>
          {f.year === 2027 && <span role="status" className="text-sm text-amber-800">{t.known2027}</span>}
        </div>
        {tab === 'map' && f.linkedRace && <a href={raceDetailUrl(f.linkedRace, mapCalendarReturn)} className="mb-4 inline-flex rounded-md border border-sky-300 px-4 py-2 font-semibold text-sky-800 hover:bg-sky-50">{t.backToRace}</a>}
        {f.linkedRace && <div role="status" className="mb-5 rounded-lg border border-sky-300 bg-sky-50 p-4 text-slate-900">{selectedLinkedRace ? <>{t.showingLinked} <strong>{selectedLinkedRace.name}</strong></> : t.linkMissing} <button type="button" className="ml-3 underline" onClick={reset}>{t.showAll}</button></div>}
        <div id="race-results" className="mb-5 flex flex-wrap items-center justify-between gap-3 scroll-mt-4">
          <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.17em] text-sky-700">{t.planning} / {f.year}</p><h2 className="yp-section-heading text-3xl font-semibold tracking-tight text-slate-950">{tab === 'calendar' ? t.headingList : tab === 'month' ? t.headingMonth : t.headingMap}</h2></div>
          <nav aria-label={t.viewsLabel} className="flex w-full flex-wrap gap-2">{([['calendar', t.viewList], ['month', t.viewMonth], ['map', t.viewMap]] as const).map(([view, label]) =>
            <Button key={view} variant={tab === view ? 'default' : 'outline'} aria-pressed={tab === view} onClick={() => jump(view)}>{view === 'map' && <MapPinned size={16} />} {label}</Button>)}</nav>
          {tab === 'map' && <p className="w-full text-sm text-slate-600">{f.linkedRace ? t.mapLinked : t.mapAll}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{n(displayedRaces.length)} {tab === 'map' ? t.raceRecords : t.matchingRecords}</span>
            <Button variant="outline" onClick={() => downloadCsv(displayedRaces)} disabled={displayedRaces.length === 0}><ArrowDownToLine size={16} /> CSV</Button>
            <Button variant="outline" onClick={() => downloadIcs(displayedRaces)} disabled={displayedRaces.length === 0}><CalendarDays size={16} /> {t.exportIcs}</Button>
          </div>
        </div>
        {tab !== 'map' && <div className="yp-filter-panel mb-7 rounded-lg border border-slate-200 bg-white p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between sm:hidden"><strong className="text-sm">{t.findRaces}</strong><button type="button" className="rounded-md border px-3 py-2 text-sm" aria-expanded={advanced} onClick={() => setAdvanced(v => !v)}>{advanced ? t.advancedHide : t.advancedShow}</button></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm"><span className="mb-1 block font-medium">{t.search}</span><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><Input value={f.query} onChange={e => update({ query: e.target.value })} placeholder={t.searchPlaceholder} className="pl-9" /></div></label>
            <MultiRaceFilter label={t.countries} choices={countries.map(([value, label]) => ({ value, label }))} selected={f.countries} onChange={v => update({ countries: v })} searchable />
            <MultiRaceFilter label={t.months} choices={MONTH_VALUES.map((value, i) => ({ value, label: monthNames[i]! }))} selected={f.months} onChange={v => update({ months: v })} />
            <MultiRaceFilter label={t.categories} choices={[{ value: 'men', label: t.men }, { value: 'women', label: t.women }]} selected={f.categories} onChange={v => update({ categories: v })} />
            <MultiRaceFilter label={t.entryMethod} choices={ENTRY_OPTIONS.map(o => ({ value: o.value, label: t.entries[o.value] || o.label }))} selected={f.entry} onChange={v => update({ entry: v })} />
            <MultiRaceFilter label={t.raceLevel} choices={LEVEL_OPTIONS.map(o => ({ value: o.value, label: t.levels[o.value] || o.label }))} selected={f.levels} onChange={v => update({ levels: v as RaceLevel[] })} />
            <div className={advancedClass}><MultiRaceFilter label={t.verification} choices={STATUS_VALUES.map(value => ({ value, label: t.statuses[value] }))} selected={f.statuses} onChange={v => update({ statuses: v })} /></div>
            <div className={advancedClass}><MultiRaceFilter label={t.raceState} choices={[{ value: 'active', label: t.active }, { value: 'cancelled', label: t.cancelled }, ...(f.archived ? [{ value: 'merged', label: t.merged }] : [])]} selected={f.states} onChange={v => update({ states: v })} /></div>
            <label className={advanced ? 'block text-sm' : 'hidden text-sm sm:block'}><span className="mb-1 block font-medium">{t.from}</span><input type="date" className={controlClass} value={f.from} onChange={e => update({ from: e.target.value })} /></label>
            <label className={advanced ? 'block text-sm' : 'hidden text-sm sm:block'}><span className="mb-1 block font-medium">{t.until}</span><input type="date" className={controlClass} value={f.to} onChange={e => update({ to: e.target.value })} /></label>
            <div className={advancedClass}><MultiRaceFilter label={t.raceTypes} choices={TYPE_VALUES.map(value => ({ value, label: t.types[value] }))} selected={f.types} onChange={v => update({ types: v })} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.upcoming} onChange={e => update({ upcoming: e.target.checked })} />{t.upcomingOnly}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.savedOnly} onChange={e => update({ savedOnly: e.target.checked })} />{t.savedRaces(saved.length)}</label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={f.archived} onChange={e => update({ archived: e.target.checked, states: DEFAULT_STATES })} />{t.showArchived(manifest.mergedRecords + manifest.semanticDuplicateRecords)}</label>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm text-sky-700 hover:underline"><RotateCcw size={14} /> {t.reset}</button>
          </div>
        </div>}
        {saveError && <p role="alert" className="mb-4 text-sm text-red-700">{saveError}</p>}
        {tab === 'map' ? <U19Map races={mapRaces} returnTo={calendarReturnTo} focusRaceId={f.linkedRace} />
          : tab === 'month' ? <RaceMonthCalendar races={filtered} year={f.year} saved={saved} onToggleSaved={toggleSaved} />
          : <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600" role="status">{t.showing(filtered.length ? (currentPage - 1) * f.pageSize + 1 : 0, Math.min(currentPage * f.pageSize, filtered.length), n(filtered.length))}</p>
              <label htmlFor="races-per-page" className="flex items-center gap-3 text-sm font-medium text-slate-700">
                {t.perPage}
                <select id="races-per-page" value={f.pageSize} onChange={e => update({ pageSize: Number(e.target.value) })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
                  {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shown.map(r => {
                const isSaved = saved.includes(r.id);
                const level = getRaceLevel(r);
                return <article key={r.id} className="yp-race-card flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition-all duration-200">
                  <p className="mb-3 font-semibold tabular-nums text-sky-800">{dateRange(r)}</p>
                  <h3 className="text-[17px] font-bold leading-snug tracking-[-0.018em] text-slate-950"><Link to="/race/$raceId" params={{ raceId: r.id }} search={{ returnTo: calendarReturnTo }} onClick={() => { try { sessionStorage.setItem('yp-calendar-scroll', String(window.scrollY)); } catch { /* storage disabled */ } }} className="hover:text-sky-700 hover:underline">{r.name}</Link></h3>
                  <p className="mt-2 text-sm text-muted-foreground">{englishPlace(r.place)} · {countryLabel(r.countryCode, r.country, lang)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span title={level.basis} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">{t.levels[level.level] || level.label}</span>
                    <span className="rounded bg-muted px-2.5 py-1">{englishCategory(r.sex) || t.categoryUnconfirmed}</span>
                  </div>
                  <div className="mt-auto pt-4"><button type="button" onClick={() => void toggleSaved(r.id, raceYearOf(r), r)} aria-label={isSaved ? t.removeRace : t.saveRace} aria-pressed={isSaved} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Bookmark size={16} aria-hidden="true" /> {isSaved ? t.savedOnDevice : t.saveOnDevice}</button></div>
                </article>;
              })}
            </div>
            {f.year === 2027 && <p className="my-4 rounded-xl border border-amber-300 p-4 text-sm">{t.note2027}</p>}
            {filtered.length === 0 && <p className="rounded-xl border border-border p-10 text-center text-muted-foreground">{t.noResults}</p>}
            {pages > 1 && <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-4"><Button disabled={currentPage <= 1} variant="outline" onClick={() => setPage(Math.max(1, currentPage - 1))}>{t.previous}</Button><span className="text-sm tabular-nums">{t.pageOf(currentPage, pages)}</span><Button variant="outline" disabled={currentPage >= pages} onClick={() => setPage(Math.min(pages, currentPage + 1))}>{t.next}</Button></nav>}
          </>}
        {tab !== 'map' && <CountryEntryGuide codes={f.countries} />}
        <aside className="mt-10 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><strong className="text-foreground">{t.notesTitle}</strong> {t.notes(manifest, f.year)}</div></div>
        </aside>
      </>}
    </div>
    <div className="mx-auto max-w-7xl px-5 py-4 text-sm text-slate-600"><Link to="/scans" className="font-semibold text-sky-700 underline">{t.scansLink}</Link><p className="mt-1">{t.scansText}</p></div>
    <SiteFooter year={f.year} lang={lang} />
  </main>;
}

function SiteFooter({ year, lang }: { year: number; lang: Lang }) {
  const t = COPY[lang];
  return <footer className="mt-8 border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
    <p>{t.footer(year)}</p>
    <nav aria-label="Project information" className="mt-3 flex flex-wrap justify-center gap-4"><Link to="/season" className="underline">{t.footerSaved}</Link><Link to="/about" className="underline">{t.footerAbout}</Link><Link to="/scans" className="underline">{t.footerScans}</Link><Link to="/report" className="font-semibold underline">{t.footerReport}</Link></nav>
  </footer>;
}
