/** Country-centre fallback for 2027 editions without a verified 2026 location.
 * These are approximate map markers only, NEVER a race start location.
 * All coordinates are deliberately labelled at country precision.
 */
export const COUNTRY_CENTRES: Readonly<Record<string,readonly [number,number]>> = {
  AL:[41.15,20.17],AD:[42.55,1.58],AT:[47.52,14.55],BA:[43.92,17.68],
  BE:[50.50,4.47],BG:[42.73,25.49],BY:[53.71,27.95],CH:[46.82,8.23],
  CY:[35.13,33.43],CZ:[49.82,15.47],DE:[51.17,10.45],DK:[56.26,9.50],
  EE:[58.60,25.01],ES:[40.46,-3.75],FI:[61.92,25.75],FR:[46.60,2.21],
  GB:[55.38,-3.44],GR:[39.07,21.82],HR:[45.10,15.20],HU:[47.16,19.50],
  IE:[53.14,-7.69],IS:[64.96,-19.02],IT:[41.87,12.57],LT:[55.17,23.88],
  LU:[49.82,6.13],LV:[56.88,24.60],MC:[43.74,7.42],MD:[47.41,28.37],
  ME:[42.71,19.37],MK:[41.61,21.75],MT:[35.94,14.38],NL:[52.13,5.29],
  NO:[60.47,8.47],PL:[51.92,19.15],PT:[39.40,-8.22],RO:[45.94,24.97],
  RS:[44.02,21.01],RU:[55.75,37.62],SE:[60.13,18.64],SI:[46.15,14.99],
  SK:[48.67,19.70],SM:[43.94,12.46],TR:[39.00,35.24],UA:[48.38,31.17],
  XK:[42.60,20.90],
};

export function mappedRaceLocation(race: {date:string;countryCode:string;lat:number|null;lon:number|null;precision:string}) {
  if (race.lat !== null && race.lon !== null && Number.isFinite(race.lat) && Number.isFinite(race.lon)) {
    return {lat:race.lat,lon:race.lon,precision:race.precision,estimated:false};
  }
  if (race.date.startsWith('2027-')) {
    const centre=COUNTRY_CENTRES[race.countryCode];
    if (centre) return {lat:centre[0],lon:centre[1],precision:'country',estimated:true};
  }
  return null;
}
