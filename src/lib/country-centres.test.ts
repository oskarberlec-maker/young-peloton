import { describe,expect,it } from 'vitest';
import { mappedRaceLocation } from './country-centres';

describe('2027 maps',()=>{
  it('preserves existing approximate event coordinates',()=>{
    expect(mappedRaceLocation({date:'2027-05-01',countryCode:'SI',lat:46.05,lon:14.50,precision:'town'}))
      .toEqual({lat:46.05,lon:14.5,precision:'town',estimated:false});
  });
  it('maps a newly discovered 2027 race only at a clearly labelled country centre',()=>{
    const marker=mappedRaceLocation({date:'2027-05-01',countryCode:'SI',lat:null,lon:null,precision:''});
    expect(marker?.precision).toBe('country');
    expect(marker?.estimated).toBe(true);
    expect(Number.isFinite(marker?.lat)).toBe(true);
    expect(Number.isFinite(marker?.lon)).toBe(true);
  });
  it('does not fabricate coordinates for missing 2026 races or unsupported regions',()=>{
    expect(mappedRaceLocation({date:'2026-05-01',countryCode:'SI',lat:null,lon:null,precision:''})).toBeNull();
    expect(mappedRaceLocation({date:'2027-05-01',countryCode:'XX',lat:null,lon:null,precision:''})).toBeNull();
  });
});
