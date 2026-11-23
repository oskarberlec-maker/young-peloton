# Young Peloton

Young Peloton helps European junior road cyclists, coaches and clubs discover U19 cycling events.

**Website:** https://www.youngpeloton.eu/

## Features
- Browse and search sourced race records by country, category, verification status, race type and date range.
- Explore approximate race locations on the Europe map.
- Save a shortlist in the browser, share direct race links and export filtered events to CSV.
- Follow links to original race calendars, eligibility evidence and results when available.
- Interface in English, Slovenian, Italian, German and French (`?lang=sl|it|de|fr`); race names stay in their published language.

## Data limitations
The 2026 archive was last updated October 22, 2026 and is not marked complete. Being listed does not guarantee U19 eligibility, exact venue, that a race took place, or that a cancellation has been updated. Map positions are approximate settlement, area or country centres, not race start coordinates. Confirm all dates, registrations and eligibility with the organizer.

Saved races are stored in the current browser only, not synced to an account.

## Development
Requires Node.js and npm.

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

React, TypeScript, TanStack Start/Router, Tailwind CSS and Leaflet. Race pages are server-rendered with their own title, description and schema.org event data. Data is stored under `public/data/2026/`, with a manifest and 54 chunks.

## Corrections
[Report incorrect race information](https://github.com/oskarberlec-maker/young-peloton/issues/new), ideally with the event name and an official source URL.
