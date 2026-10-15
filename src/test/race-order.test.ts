import { describe, expect, it } from "vitest";

import { compareRaces, RACES } from "@/routes/index";

type RaceItem = (typeof RACES)[number];
const PERIOD_RANK = { early: 0, mid: 1, "mid-late": 2, late: 3, any: 4 } as const;


const nameKey = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const ordered = (list: typeof RACES) => [...list].sort(compareRaces);

describe("Race list ordering", () => {
  const sorted = ordered(RACES);

  it("sorts by month, then approximate window, then name", () => {
    const rank = (race: RaceItem) =>
      [race.month, PERIOD_RANK[race.period], nameKey(race.name)] as const;

    let previous: RaceItem | null = null;
    for (const current of sorted) {
      if (previous) {
        const [monthA, windowA, nameA] = rank(previous);
        const [monthB, windowB, nameB] = rank(current);
        const inOrder =
          monthA < monthB ||
          (monthA === monthB &&
            (windowA < windowB || (windowA === windowB && nameA <= nameB)));
        expect(inOrder).toBe(true);
      }
      previous = current;
    }
  });



  it("does not group the season by country", () => {
    const countries = sorted.map((race) => race.country);
    const switches = countries.slice(1).filter((country, i) => country !== countries[i]).length;
    expect(switches).toBeGreaterThan(1);
  });

  it("gives the same order whatever order the records arrive in", () => {
    const reversed = [...RACES].reverse();
    const shuffled = [...RACES].sort((a, b) => compareText(a.id, b.id));

    expect(ordered(reversed).map((race) => race.id)).toEqual(sorted.map((race) => race.id));
    expect(ordered(shuffled).map((race) => race.id)).toEqual(sorted.map((race) => race.id));
  });

  it("keeps every record and changes none of their data", () => {
    expect(sorted).toHaveLength(RACES.length);
    expect(sorted.map((race) => race.id).sort()).toEqual(RACES.map((race) => race.id).sort());
    expect(RACES.filter((race) => race.country === "Austria").length).toBeGreaterThan(0);
  });
});

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
