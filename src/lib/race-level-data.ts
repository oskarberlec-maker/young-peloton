import type { U19Race } from './u19-data';

/**
 * Frozen 2026 classifications imported from "Young_Peloton_2026_dirke_po_rangu.xlsx".
 * Exactly 13,405 records; each symbol corresponds to one ID in ascending JS lexical order.
 * This avoids another network request and keeps the data reproducible.
 * The workbook classified source records but did NOT verify every external URL live.
 */
// Display the 2,604 regional and 2,370 club/training records under one Regional tier.
export const EXCEL_LEVEL_COUNTS = {uci:133,national:735,regional:4974,unverified:7563} as const;
export const EXCEL_LEVEL_SNAPSHOT = '2026-10-27';
const ID_FINGERPRINT = 477206250;
const RECORD_COUNT = 13405;
const ENCODED_LEVELS = "12.9A.43.22.2aA.19.22.bA.23.bA.33.12.aA.21.4A.21.22.2A.14.1A.14.3A.24.5A.34.2A.44.1A.14.1A.14.2A.14.1A.24.1A.19.14.2A.14.1A.14.19.5A.14.3A.24.4A.14.1A.29.8A.14.1A.14.2A.14.2A.49.24.3A.14.fA.19.4A.19.2A.19.8A.24.2A.14.1A.14.3A.24.2A.14.5A.14.1A.14.4A.14.bA.14.5A.39.1A.14.2A.14.19.1A.19.3A.19.2A.24.fA.29.5A.24.1A.14.2A.24.4A.14.3A.14.1A.14.1A.34.2A.14.4A.24.29.5A.14.1A.19.1A.14.8A.14.aA.19.6A.14.5A.14.1A.29.1A.14.5A.14.3A.19.qA.39.4A.29.vA.j9.42.vA.22.aA.a3.34A.29.22.hA.43.22.kA.29.22.5xA.21.15A.11.1yA.21.dA.29.22.2qA.22.14A.22.2oA.29.1uA.15.hA.15.3A.16.4A.11.6A.21.17A.11.4A.11.3A.15.2hA.19.3gA.11.37A.61.jA.16.5A.26.2A.16.6A.21.3A.19.4A.21.6A.21.lA.89.22.19.10A.22.4A.a4.1A.34.1A.15.1A.94.15.1A.64.1A.a4.15.34.2A.64.2A.24.1A.25.74.1A.24.2A.44.5A.25.e4.1A.34.2A.34.1A.c4.1A.14.1A.24.3A.15.3A.14.4A.1k4.15.34.3A.84.1A.14.15.34.1A.e4.1A.44.1A.24.1A.14.2A.e4.3A.1zh6.nA.21.dA.25.iA.15.2tA.25.3lA.25.9A.16.2aA.16.qA.15.xA.15.dA.15.5A.16.lA.16.gA.16.8A.16.7A.16.3A.15.mA.l9.22.39.gA.14.pA.14.fA.14.2pA.14.3A.16.3A.16.1qA.11.5A.16.14.3A.15.3cA.11.mA.11.6yA.11.1nA.11.2fA.11.1gA.11.97A.11.6fA.11.1qhA.12.4kA.43.22.cA.22.15A.19.22.7A.11.1A.11.70A.11.1mA.21.5A.21.mA.22.dA.12.dA.19.xA.21.22A.16.2A.16.iA.16.2A.16.5A.16.uA.16.8A.16.bA.16.8A.16.eA.16.oA.21.6A.16.4A.21.dA.f9.22.19.4A.21.mA.22.28.cA.43.29.22.1eA.22.6A.43.12.8A.43.22.cA.12.8A.11.1A.11.gA.29.34.30.c4.12.26.24.60.h4.2a0.14.210.44.a0.14.u0.14.20.34.i0.34.30.24.u0.14.20.94.26.24.a0.64.s0.34.20.14.20.14.130.54.10.14.1u0.14.10.22.100.14.d0.22.70.14.2x0.34.20.14.2h0.24.12.7q0.14.20.14.2c0.22.14.280.44.5d0.24.i0.14.20.34.20.24.170.34.90.14.410.14.80.54.x0.24.f0.24.1g0.14.3q0.14.40.14.1w0.44.20.44.4d0.14.60.19.2u0.14.r0.24.430.14.1b0.29.14.19.64.g0.r4.20.24.32.20.64.c0.a4.20.14.10.14.10.14.10.14.10.64.20.24.a0.24.20.34.19.g4.59.22.7sA.22.2A.61.4A.11.nA.21.9A.21.iA.11.6A.29.22.21.2A.16.rA.21.4A.22.pA.43.22.kA.22.1iA.63.oA.22.6A.11.12A.11.1A.11.tA.22.27.11A.19.22.1A.22.6A.83.8A.22.iA.12.";

/** Maps each imported workbook subrank to its source-evidence explanation. */
export const EXCEL_LEVEL_META = {
  '0': {level:'regional',label:'Regional',subtype:'Regional / local event',method:'Source category',basis:'The original source describes a local club or training event, included in the regional grouping for display.'},
  '1': {level:'national',label:'National',subtype:'National championship (title)',method:'Event title',basis:'The race title identifies a national championship; the title should be confirmed with the organiser.'},
  '2': {level:'national',label:'National',subtype:'National championship (CN)',method:'Source category',basis:'The original CN/NK category identifies a national championship.'},
  '3': {level:'national',label:'National',subtype:'National championship (NC)',method:'Source identifier',basis:'The NC code in this archive identifies a national championship.'},
  '4': {level:'national',label:'National',subtype:'National race / series',method:'Source category',basis:'The original race category explicitly identifies a national-level event.'},
  '5': {level:'national',label:'National',subtype:'National cup / series',method:'Event title',basis:'The race title explicitly describes a national cup or series.'},
  '6': {level:'regional',label:'Regional',subtype:'Regional / provincial',method:'Source category or title',basis:'The original category or race title identifies regional or provincial competition.'},
  '7': {level:'uci',label:'UCI / international',subtype:'World / continental championship',method:'Source category',basis:'The original source explicitly identifies a world or continental championship.'},
  '8': {level:'uci',label:'UCI / international',subtype:'UCI 1.1 / 2.1',method:'Source category',basis:'The international UCI class is explicitly stated in the source record.'},
  '9': {level:'uci',label:'UCI / international',subtype:'UCI 1.1 / 2.1 / Nations Cup',method:'Source category',basis:'The international junior UCI class is specified in the original race category.'},
  A: {level:'unverified',label:'Level not verified',subtype:'Classification not established',method:'Needs source review',basis:'The available source category and event title do not establish a reliable competition level. Source URLs have not all been checked individually.'},
} as const;
export type ExcelLevelSymbol = keyof typeof EXCEL_LEVEL_META;

/** Fail closed rather than attach rankings to the wrong race IDs. */
export function applyExcelRaceLevels(races: U19Race[]): boolean {
  const sorted=[...races].sort((a,b)=>a.id < b.id?-1:a.id > b.id?1:0);
  let fingerprint=2166136261;
  for (const race of sorted) {
    for (let i=0;i<race.id.length;i++)fingerprint=Math.imul(fingerprint^race.id.charCodeAt(i),16777619)>>>0;
    fingerprint=Math.imul(fingerprint^10,16777619)>>>0;
  }
  if(sorted.length!==RECORD_COUNT||fingerprint!==ID_FINGERPRINT){
    console.error('Young Peloton level import does not match the loaded 2026 archive. All race levels are marked unverified.');
    for(const race of races)race.levelSymbol='A';
    return false;
  }
  const expanded=ENCODED_LEVELS.split('.').filter(Boolean).map(part=>{
    const count=Number.parseInt(part.slice(0,-1),36);
    return part.slice(-1).repeat(count);
  }).join('');
  if(expanded.length!==RECORD_COUNT)throw new Error('Invalid race-level workbook snapshot');
  for(let i=0;i<sorted.length;i++)sorted[i].levelSymbol=expanded[i] as ExcelLevelSymbol;
  return true;
}
