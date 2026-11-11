import type { U19Race } from './u19-data';

export type EntryMethod = 'individual' | 'team' | 'invitation' | 'unknown';
export const ENTRY_OPTIONS: { value: EntryMethod; label: string }[] = [
  { value: 'individual', label: 'Individual entry' },
  { value: 'team', label: 'Club / team entry' },
  { value: 'invitation', label: 'Invitation only' },
  { value: 'unknown', label: 'Entry not confirmed' },
];
export type RaceEntry = {
  methods: Exclude<EntryMethod, 'unknown'>[];
  details: string;
  sourceUrl: string;
  checkedAt: string;
  registrationUrl?: string;
  technicalGuideUrl?: string;
};

// Evidence belongs to an exact edition, never to its 2027 successor or country.
const kuurne: RaceEntry = {
  methods: ['team'],
  details: 'Regional, club and national teams of 4–6 riders. Team representatives confirm starters. Contact the organiser for team acceptance; a place is not guaranteed.',
  sourceUrl: 'https://www.belgiancycling.be/app/uploads/results/2026/2026009-I.pdf',
  technicalGuideUrl: 'https://www.belgiancycling.be/app/uploads/results/2026/2026009-I.pdf',
  checkedAt: '2026-11-11',
};
const leman: RaceEntry = {
  methods: ['team'],
  details: 'Teams of 4–6 riders: clubs, cantonal, regional and departmental teams, and foreign national teams outside France and Switzerland. National teams require organiser approval. The entry form limits participation to 25 teams / 150 riders; additional teams join a waiting list.',
  sourceUrl: 'https://www.tourdulemanjuniors.ch/formulaires/insc_equTLJ26.html',
  registrationUrl: 'https://www.tourdulemanjuniors.ch/formulaires/insc_equTLJ26.html',
  checkedAt: '2026-11-11',
};
export const RACE_ENTRY: Readonly<Record<string, RaceEntry>> = {
  'BE-CV-13326': kuurne,
  'BE-UCI-78015-MJ': kuurne,
  'CH-SC-9258-M': leman,
  'CH-SC-9258-F': leman,
};
export function getRaceEntry(race: Pick<U19Race, 'id'>): RaceEntry | undefined {
  return RACE_ENTRY[race.id];
}
export function entryLabel(race: Pick<U19Race, 'id'>): string {
  const info = getRaceEntry(race);
  return info ? ENTRY_OPTIONS.filter(option => info.methods.some(method => method === option.value)).map(option => option.label).join(' / ') : 'Entry not confirmed';
}
export function matchesEntry(race: Pick<U19Race, 'id'>, selected: string[]): boolean {
  if (!selected.length) return true;
  const info = getRaceEntry(race);
  return info ? info.methods.some(method => selected.includes(method)) : selected.includes('unknown');
}
