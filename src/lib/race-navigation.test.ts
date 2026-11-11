import { expect, it } from 'vitest';
import { raceDetailUrl, raceMapUrl, safeCalendarReturn } from './race-navigation';

it('round-trips detail → focused map → detail with the original calendar filters', () => {
  const calendar = '/?year=2027&country=BE&entry=team&page=2';
  const url = new URL(raceMapUrl('uci-2027-example', 2027, calendar), 'https://www.youngpeloton.eu');
  expect(url.searchParams.get('race')).toBe('uci-2027-example');
  expect(url.searchParams.get('view')).toBe('map');
  const detail = new URL(raceDetailUrl(url.searchParams.get('race')!, url.searchParams.get('mapReturnTo')!), url.origin);
  expect(detail.pathname).toBe('/race/uci-2027-example');
  expect(detail.searchParams.get('returnTo')).toBe(calendar);
});
it('rejects external and protocol-relative return destinations', () => {
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/race/example']) {
    expect(safeCalendarReturn(value)).toBeUndefined();
  }
});
