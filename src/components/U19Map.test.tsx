import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { U19Race } from '@/lib/u19-data';
import { U19Map } from './U19Map';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ params, search, children, ...props }: any) => <a {...props} href={'/race/' + params.raceId + '?' + new URLSearchParams(search)}>{children}</a>,
}));

it('opens a focused race with English country text and links back to race details', async () => {
  const setView = vi.fn().mockReturnThis();
  const layer = { clearLayers: vi.fn(), addLayers: vi.fn() };
  const fakeMap = { setView, addLayer: vi.fn(), remove: vi.fn() };
  Object.assign(window, { L: {
    markerClusterGroup: () => layer,
    map: () => fakeMap,
    tileLayer: () => ({ addTo: vi.fn() }),
    divIcon: vi.fn(),
    marker: () => ({ on: vi.fn() }),
  } });
  const race = {
    id: 'test-france', date: '2027-05-01', countryCode: 'FR', country: 'Francija',
    lat: null, lon: null, precision: '', place: '', name: 'Example junior race',
    sex: 'M', type: 'Cestna dirka', confirmation: 'Potrjeno U19', sourceUrl: 'https://example.com/results',
  } as U19Race;
  const view = render(<U19Map races={[race]} focusRaceId={race.id} returnTo="/?year=2027&view=map" />);
  await waitFor(() => expect(screen.getByRole('link', { name: 'View race details →' })).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'France — 1 race records' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Example junior race' })).toHaveAttribute('href', '/race/test-france?returnTo=%2F%3Fyear%3D2027%26view%3Dmap');
  expect(screen.getByText('Men · Road race', { exact: false })).toBeInTheDocument();
  expect(setView).toHaveBeenLastCalledWith([46.6, 2.21], 6);
  view.unmount();
  expect(fakeMap.remove).toHaveBeenCalledOnce();
});
