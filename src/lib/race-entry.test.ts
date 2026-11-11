import { describe, expect, it } from 'vitest';
import { entryLabel, getRaceEntry, matchesEntry } from './race-entry';

describe('edition-specific entry conditions', () => {
  it('filters verified team entry and unknown separately', () => {
    const known = { id: 'BE-UCI-78015-MJ' };
    expect(entryLabel(known)).toBe('Club / team entry');
    expect(matchesEntry(known, ['team'])).toBe(true);
    expect(matchesEntry(known, ['individual', 'invitation', 'unknown'])).toBe(false);
    expect(getRaceEntry(known)?.sourceUrl).toMatch(/^https:/);
  });
  it('never infers admission from a country or copies rules to another edition', () => {
    const nextEdition = { id: 'uci-2027-kuurne' };
    expect(getRaceEntry(nextEdition)).toBeUndefined();
    expect(matchesEntry(nextEdition, ['team'])).toBe(false);
    expect(matchesEntry(nextEdition, ['unknown'])).toBe(true);
    expect(matchesEntry(nextEdition, [])).toBe(true);
  });
});
