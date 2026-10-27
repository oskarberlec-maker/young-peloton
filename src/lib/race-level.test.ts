import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { U19Race } from './u19-data';
import { applyExcelRaceLevels, EXCEL_LEVEL_COUNTS } from './race-level-data';
import { getRaceLevel } from './race-level';

function archiveRows(): U19Race[] {
  const root=resolve(process.cwd(), 'public/data/2026');
  const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')) as {
    parts: string[]; fields: string[]; rawEuropeanRecords: number;
  };
  const idColumn=manifest.fields.indexOf('id');
  if(idColumn<0)throw new Error('Missing race ID column');
  const rows=manifest.parts.flatMap(name=>{
    const data=JSON.parse(readFileSync(resolve(root,name),'utf8')) as unknown[][];
    return data.map(row=>({id:String(row[idColumn])} as U19Race));
  });
  expect(rows).toHaveLength(manifest.rawEuropeanRecords);
  return rows;
}

describe('Excel 2026 race classification import',()=>{
  it('matches every race ID and the four combined category totals',()=>{
    const races=archiveRows();
    expect(applyExcelRaceLevels(races)).toBe(true);
    const totals:Record<string,number>={uci:0,national:0,regional:0,unverified:0};
    for(const race of races){
      const tier=getRaceLevel(race);
      expect(tier.label.length).toBeGreaterThan(0);
      expect(tier.subtype.length).toBeGreaterThan(0);
      totals[tier.level]++;
    }
    expect(totals).toEqual(EXCEL_LEVEL_COUNTS);
    const byId=new Map(races.map(r=>[r.id,getRaceLevel(r)]));
    expect(byId.get('AT-UCI-78311-MJ')?.level).toBe('uci');
    expect(byId.get('AL-NC-20-M')?.level).toBe('national');
    expect(byId.get('FR-FFC-C5064347007')?.level).toBe('regional');
    expect(byId.get('NL-KNWU-110908-Ž')?.level).toBe('regional');
    expect(byId.get('AL-FSHC-12')?.level).toBe('unverified');
  });

  it('does not assign Excel levels to a different or incomplete archive',()=>{
    const fake=[{id:'not-a-record'} as U19Race];
    expect(applyExcelRaceLevels(fake)).toBe(false);
    expect(getRaceLevel(fake[0]).level).toBe('unverified');
  });
});
