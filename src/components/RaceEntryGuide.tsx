import type { U19Race } from '@/lib/u19-data';
import { safeUrl } from '@/lib/u19-data';
import { entryLabel, getRaceEntry } from '@/lib/race-entry';
import { CountryEntryGuide } from './CountryEntryGuide';

export function RaceEntryGuide({ race }: { race: U19Race }) {
  const info = getRaceEntry(race);
  return <section aria-label="Race entry requirements" className="rounded-xl border border-sky-200 p-5">
    <h2 className="text-xl font-bold">How to enter this race</h2>
    <p className="mt-2 font-semibold">{entryLabel(race)}</p>
    {info ? <>
      <p className="mt-2 text-sm">{info.details}</p>
      <p className="mt-2 text-xs text-muted-foreground">Applies to this edition only · Source reviewed {info.checkedAt}. This does not indicate whether registration is still open.</p>
      <a href={info.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-sky-700 underline">Entry rules</a>
      {info.registrationUrl && <a href={info.registrationUrl} target="_blank" rel="noopener noreferrer" className="ml-4 text-sm text-sky-700 underline">Registration</a>}
    </> : <>
      <p className="mt-2 text-sm">Individual, club / team or invitation-only entry has not yet been verified for this edition. Ask the organiser before planning participation.</p>
      {safeUrl(race.sourceUrl) && <a href={race.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-sky-700 underline">Check the event source for entry details</a>}
    </>}
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold">General country rules — separate from this race’s entry conditions</summary>
      <CountryEntryGuide codes={[race.countryCode]} />
    </details>
  </section>;
}
