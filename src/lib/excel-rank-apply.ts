import type { U19Race } from './u19-data';
import { EXCEL_2026_RANKS_RLE } from './excel-rank-2026';
import type { ExcelLevelSymbol } from './race-level-data';

const EXPECTED_IDS = 13405;
const EXPECTED_FINGERPRINT = 477206250;

/** Overrides outdated 27 October rankings only when all IDs match the 7 November workbook. */
export function applyLatestExcelRaceLevels(races: U19Race[]): boolean {
  const sorted = [...races].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  let fingerprint = 2166136261;
  for (const race of sorted) {
    for (let i=0;i<race.id.length;i++) fingerprint = Math.imul(fingerprint ^ race.id.charCodeAt(i),16777619) >>> 0;
    fingerprint = Math.imul(fingerprint ^ 10,16777619) >>> 0;
  }
  if (sorted.length !== EXPECTED_IDS || fingerprint !== EXPECTED_FINGERPRINT) {
    console.error('The 7 November Excel ranks do not match the current source IDs; keeping previous classifications.');
    return false;
  }
  const levels = EXCEL_2026_RANKS_RLE.split('.').filter(Boolean).map(part => {
    const symbol = part.slice(-1);
    const count = Number.parseInt(part.slice(0,-1),36);
    if(!['A','B','C','D'].includes(symbol) || !Number.isSafeInteger(count) || count < 1) throw new Error('Invalid Excel ranks');
    return symbol.repeat(count);
  }).join('');
  if(levels.length !== EXPECTED_IDS) throw new Error('Wrong number of Excel classifications');
  const mapping: Record<string, ExcelLevelSymbol> = {A:'A',B:'8',C:'4',D:'6'};
  sorted.forEach((r,i) => {r.levelSymbol = mapping[levels[i]!]!;});
  return true;
}
