/** Classify recognisable link destinations, without claiming their contents were reviewed. */
export function sourceLabel(url: string, fallback = 'Event information'): string {
  let value: string;
  try { const parsed = new URL(url); value = decodeURIComponent(parsed.pathname + parsed.search).toLowerCase(); }
  catch { return fallback; }
  if (/technical[-_ ]?guide|roadbook|guide[-_ ]?technique|reglement|regulations|règlement/.test(value)) return 'Technical guide / regulations';
  if (/result|uitslag|uitslagen|classement|classifica|ranking|izidi|rezultati/.test(value)) return 'Results';
  if (/registr|inscri|inschri|insc[_-]|engagement|entry[-_/ ]?form|entries|enter[-_/]|prijav/.test(value)) return 'Registration';
  if (/calendar|calendrier|kalender|koledar/.test(value)) return 'Race calendar';
  if (/startlist|start[-_]?list|participants|deelnemers/.test(value)) return 'Start list';
  return fallback;
}
