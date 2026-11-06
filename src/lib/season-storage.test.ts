// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_RACES_KEY, readLocalSavedIds, safeSavedIds, writeLocalSavedIds } from './season-storage';

describe('device-only saved races', () => {
  beforeEach(() => window.localStorage.clear());

  it('preserves the existing browser storage key and saved race IDs', () => {
    window.localStorage.setItem(LOCAL_RACES_KEY, JSON.stringify(['race-2026', 'uci-2027-80902']));
    expect(readLocalSavedIds()).toEqual(['race-2026', 'uci-2027-80902']);
  });

  it('removes duplicate or invalid saved IDs', () => {
    expect(safeSavedIds(['r1', 'r1', null, 45, '', 'r2'])).toEqual(['r1', 'r2']);
  });

  it('stores bookmarks without a login or database', () => {
    expect(writeLocalSavedIds(['race-1', 'race-2'])).toBe(true);
    expect(readLocalSavedIds()).toEqual(['race-1', 'race-2']);
    expect(writeLocalSavedIds([])).toBe(true);
    expect(readLocalSavedIds()).toEqual([]);
  });

  it('ignores malformed local browser data', () => {
    window.localStorage.setItem(LOCAL_RACES_KEY, 'not JSON');
    expect(readLocalSavedIds()).toEqual([]);
  });
});
