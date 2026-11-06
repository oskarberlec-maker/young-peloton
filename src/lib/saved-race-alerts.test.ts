// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { U19Race } from './u19-data';
import {
  compareSnapshots, raceSnapshot, checkSavedRaceChanges, readSavedRaceAlerts,
} from './saved-race-alerts';

const sample = (data: Record<string, unknown> = {}) => ({
  id: 'sample-2026', date: '2026-08-08', enddate: '2026-08-08',
  name: 'Example U19 Race', place: 'Ljubljana', state: 'active',
  type: 'road', bucket: 'confirmed', confirmation: 'U19 confirmed',
  sourceUrl: 'https://example.org/event', proofUrl: '', resultUrl: '', status: '',
  ...data,
}) as unknown as U19Race;

describe('saved race change detection', () => {
  beforeEach(() => localStorage.clear());

  it('detects published changes to saved race dates and cancellation', () => {
    const before = raceSnapshot(sample());
    const after = raceSnapshot(sample({date:'2026-08-09',enddate:'2026-08-09',state:'cancelled'}));
    const changes = compareSnapshots(before, after);
    expect(changes).toHaveLength(3);
    expect(changes.some(c=>c.includes('Start date'))).toBe(true);
    expect(changes.some(c=>c.includes('Race status'))).toBe(true);
  });

  it('never reports a change when nothing changed or IDs differ', () => {
    const baseline = raceSnapshot(sample());
    expect(compareSnapshots(baseline, raceSnapshot(sample()))).toEqual([]);
    expect(compareSnapshots(baseline, raceSnapshot(sample({id:'other-race'})))).toEqual([]);
  });

  it('does not create alerts for an empty saved list', async () => {
    await expect(checkSavedRaceChanges(true)).resolves.toEqual([]);
    expect(readSavedRaceAlerts()).toEqual([]);
  });
});
