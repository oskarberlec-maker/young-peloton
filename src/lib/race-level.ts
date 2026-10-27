import type { U19Race } from './u19-data';

/**
 * The source archive does not contain event tier metadata.
 * A federation's website may publish both international and local events,
 * so the host domain alone is never enough to call a race "national".
 */
export type RaceLevel = 'uci' | 'national' | 'regional' | 'unverified';
export type RaceLevelInfo = { level: RaceLevel; label: string; basis: string };
type RaceLevelInput = Pick<U19Race,'id'|'name'|'type'|'sourceUrl'|'status'>;

export const LEVEL_OPTIONS: {value:RaceLevel;label:string}[] = [
  {value:'uci',label:'UCI / international'},
  {value:'national',label:'National'},
  {value:'regional',label:'Regional / club'},
  {value:'unverified',label:'Level not verified'},
];

const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function getRaceLevel(r:RaceLevelInput):RaceLevelInfo {
  const title=normalized(r.name||'');
  const kind=normalized(r.type||'');
  const id=(r.id||'').toUpperCase();
  const source=(r.sourceUrl||'').toLowerCase();

  // UCI lists national championships as well. They are national titles,
  // not ordinary UCI international-class junior races.
  const nationalChampionship =
    /(?:^|\W)(?:national|nationale|nacional|nazionale|nationale|narodno|drzavno|drzavni|kombetar)(?:\W|$).*(?:championship|championat|campeonato|campionato|meisterschaft|kampioenschap|prvenstvo|mesterskab)/i.test(title) ||
    /(?:championship|championat|campeonato|campionato|meisterschaft|kampioenschap|prvenstvo|mesterskab).*(?:national|nationale|nacional|nazionale|drzavn|kombetar)/i.test(title) ||
    /(?:championnats? de france|campeonat[os]+ de espana|campionati italiani|deutsche meisterschaft|mistrzostwa polski|nederlands kampioenschap|kampionat kombetar|championships? of [a-z ]{2,} national)/.test(title) ||
    /(?:^|-)NC(?:-|$)/.test(id);

  if(nationalChampionship) return {
    level:'national',label:'National',
    basis:'National championship identified from the event name or source record; UCI listing alone does not make it an international race.',
  };

  const uciEventSource=/^https?:\/\/(?:www\.)?uci\.org\/competition-details\/\d{4}\/ROA\/\d+/i.test(source);
  const uciClass=/(?:^|[^a-z0-9])(?:mj|wj)\s*[12]\.(?:ncup|1)(?:[^a-z0-9]|$)/i.test(r.name+' '+r.status);
  if(uciEventSource||uciClass)return {
    level:'uci',label:'UCI / international',
    basis:uciEventSource?'Linked to an official UCI road competition detail page (national championships excluded).':'International junior UCI class is explicitly stated in the source record.',
  };

  // Treat explicit national-series titles as national. A generic federation
  // calendar, a country's name or the word "cup" alone is NOT evidence.
  if(/\b(?:national cup|coupe de france|copa de espana|coppa italia|nationale beker|nationale cup|national series)\b/.test(title))return {
    level:'national',label:'National',basis:'The race title explicitly identifies a national cup or national series.',
  };

  if(/\b(?:regional championship|regional championships|regional meisterschaft|regional kampioenschap|regional prvenstvo|provincial championship|provincial championships|county championship|championnat regional|championnat departemental|campionato regionale|campeonato regional|kampioenschap van de provincie|copa regional)\b/.test(title))return {
    level:'regional',label:'Regional / club',basis:'The event title explicitly identifies a regional or provincial competition.',
  };

  if(/(?:klubska tekmovalna voznja|club race|club competition|club championship|trainingskoers)/.test(kind+' '+title))return {
    level:'regional',label:'Regional / club',basis:'The source categorises this as a club or local training competition, rather than a national/UCI event.',
  };

  return {
    level:'unverified',label:'Level not verified',
    basis:'The available race record does not establish whether this event is on a UCI, national or regional calendar. Check the original organiser source.',
  };
}
