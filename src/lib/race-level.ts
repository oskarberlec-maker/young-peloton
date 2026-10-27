import type { U19Race } from './u19-data';
import { EXCEL_LEVEL_META } from './race-level-data';
import type { ExcelLevelSymbol } from './race-level-data';

export type RaceLevel = 'uci' | 'national' | 'regional' | 'club' | 'unverified';
export type RaceLevelInfo = { level: RaceLevel; label: string; subtype: string; method: string; basis: string };
type RaceLevelInput = Pick<U19Race, 'levelSymbol'>;

export const LEVEL_OPTIONS: {value:RaceLevel;label:string}[] = [
  {value:'uci',label:'UCI / international'},
  {value:'national',label:'National'},
  {value:'regional',label:'Regional'},
  {value:'club',label:'Club / training'},
  {value:'unverified',label:'Level not verified'},
];

const unverified: RaceLevelInfo = EXCEL_LEVEL_META.A;

/** Matches the imported Excel workbook, without guessing from names/domains. */
export function getRaceLevel(r:RaceLevelInput):RaceLevelInfo {
  const symbol=r.levelSymbol as ExcelLevelSymbol | undefined;
  return symbol && Object.prototype.hasOwnProperty.call(EXCEL_LEVEL_META,symbol)
    ? EXCEL_LEVEL_META[symbol]
    : unverified;
}
