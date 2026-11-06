// @vitest-environment jsdom
import { act, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useRacingSeason } from './use-racing-season';

beforeEach(() => { cleanup(); window.localStorage.clear(); });

describe('device-only saved race bookmarks', () => {
  it('loads the existing local bookmarks without an account or network session', async () => {
    localStorage.setItem('young-peloton-saved-races', JSON.stringify(['uci-2027-80539']));
    const {result} = renderHook(() => useRacingSeason());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.error).toBe('');
    expect(result.current.saved).toEqual(['uci-2027-80539']);
  });

  it('saves and removes races using local browser storage', async () => {
    const {result} = renderHook(() => useRacingSeason());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => { await result.current.toggle('uci-2027-81168', 2027); });
    expect(result.current.saved).toEqual(['uci-2027-81168']);
    expect(JSON.parse(localStorage.getItem('young-peloton-saved-races') || '[]')).toEqual(['uci-2027-81168']);
    await act(async () => { await result.current.toggle('uci-2027-81168', 2027); });
    expect(result.current.saved).toEqual([]);
  });

  it('imports without duplicates and clears all device bookmarks', async () => {
    const {result} = renderHook(() => useRacingSeason());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => { result.current.importIds(['race-1','race-1','race-2']); });
    expect(result.current.saved).toEqual(['race-1','race-2']);
    await act(async () => { await result.current.clearAll(); });
    expect(result.current.saved).toEqual([]);
    expect(result.current.error).toBe('');
  });
});
