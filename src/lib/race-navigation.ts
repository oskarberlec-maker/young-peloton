export const safeCalendarReturn = (value: unknown): string | undefined =>
  typeof value === 'string' && /^\/(?:\?|$)/.test(value) ? value : undefined;

export function raceDetailUrl(id: string, returnTo?: string): string {
  const calendar = safeCalendarReturn(returnTo);
  return '/race/' + encodeURIComponent(id) + (calendar ? '?' + new URLSearchParams({ returnTo: calendar }) : '');
}
export function raceMapUrl(id: string, year: number, returnTo?: string): string {
  return '/?' + new URLSearchParams({ year: String(year), view: 'map', race: id, mapReturnTo: safeCalendarReturn(returnTo) || '/' });
}
