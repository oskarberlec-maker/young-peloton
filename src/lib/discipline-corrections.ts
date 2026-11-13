import type { U19Race } from './u19-data';

/** Reviewed corrections are applied after live updates so a generic federation
 * road-calendar label cannot silently restore a known incorrect discipline.
 * Exact IDs avoid misclassifying time trials hosted by triathlon clubs or
 * German cycling rounds whose names contain “Lauf”. Archive rows stay intact.
 */
const CYCLOCROSS_CONFLICTS = new Set([
  'FR-FFC-C4174043003',
  'FR-FFC-C4174048019',
  'FR-FFC-C4174016043',
]);
export function correctDiscipline(race: U19Race): U19Race {
  // https://www.swisscycling-fricktal.ch/kalender — Stadtlauf, 18 January 2026.
  if (race.id === 'CH-SC-9170-M') return {
    ...race, type: 'Running', roadUnconfirmed: 1,
    status: 'Running event, not a road cycling race. Discipline corrected using the organiser’s Laufenburger Stadtlauf listing.',
  };
  // The original FFC result URLs are retained on each record. Event titles say
  // cyclo-cross while the federation listing says Route: do not guess a winner.
  if (CYCLOCROSS_CONFLICTS.has(race.id)) return {
    ...race, type: 'Discipline unconfirmed (cyclo-cross / road source conflict)', roadUnconfirmed: 1,
    status: 'Discipline needs review: the event title says cyclo-cross but the FFC listing categorises it as road. ' + race.status,
  };
  return race;
}
