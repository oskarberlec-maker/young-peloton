"""Find confirmed 2027 European Men Junior road races by official UCI competition ID.

The official UCI MJ calendar discovers candidate IDs. The linked UCI detail record
must independently agree on name, competition year, dates, and junior UCI class.
A linked 2026 edition is useful for approximate map position, but NOT required
to publish a genuinely new 2027 UCI competition.
"""
import re
from urllib.parse import urlsplit

from core import Page, normalized, uci_dates

UCI_PATH = re.compile(r'/competition-details/2027/ROA/(\d+)')
UCI_CLASSES = {'1.1', '2.1', '1.Ncup', '2.Ncup'}
COUNTRY_CODES = dict(
    ALB='AL', AND='AD', AUT='AT', BEL='BE', BIH='BA', BLR='BY',
    BUL='BG', CRO='HR', CYP='CY', CZE='CZ', DEN='DK', ESP='ES',
    EST='EE', FIN='FI', FRA='FR', GBR='GB', GER='DE', GRE='GR',
    HUN='HU', IRL='IE', ISL='IS', ITA='IT', LAT='LV', LIE='LI',
    LTU='LT', LUX='LU', MDA='MD', MKD='MK', MLT='MT', MNE='ME',
    MON='MC', NED='NL', NOR='NO', POL='PL', POR='PT', ROU='RO',
    RUS='RU', SLO='SI', SMR='SM', SRB='RS', SUI='CH', SVK='SK',
    SWE='SE', TUR='TR', UKR='UA', KOS='XK',
)
COUNTRY_NAMES = dict(
    AL='Albania', AD='Andorra', AT='Austria', BE='Belgium', BA='Bosnia and Herzegovina',
    BY='Belarus', BG='Bulgaria', HR='Croatia', CY='Cyprus', CZ='Czech Republic',
    DK='Denmark', ES='Spain', EE='Estonia', FI='Finland', FR='France',
    GB='United Kingdom', DE='Germany', GR='Greece', HU='Hungary', IE='Ireland',
    IS='Iceland', IT='Italy', LV='Latvia', LI='Liechtenstein', LT='Lithuania',
    LU='Luxembourg', MD='Moldova', MK='North Macedonia', MT='Malta',
    ME='Montenegro', MC='Monaco', NL='Netherlands', NO='Norway', PL='Poland',
    PT='Portugal', RO='Romania', RU='Russia', RS='Serbia', SE='Sweden',
    SI='Slovenia', SK='Slovakia', SM='San Marino', CH='Switzerland',
    TR='Turkey', UA='Ukraine', XK='Kosovo',
)


def calendar_entries(payload):
    """Collect new AND existing 2027 event IDs, never treating a URL year alone as proof."""
    if not isinstance(payload, dict) or not isinstance(payload.get('items'), list):
        raise ValueError('UCI calendar is missing the expected month collection')
    found, conflicts = {}, set()
    for month in payload['items']:
        if not isinstance(month, dict):
            continue
        for day in month.get('items', []):
            if not isinstance(day, dict):
                continue
            for event in day.get('items', []):
                if not isinstance(event, dict) or event.get('continentCode') != 'EUR':
                    continue
                path = event.get('detailsLink', {}).get('url', '')
                match = UCI_PATH.fullmatch(path) if isinstance(path, str) else None
                if not match:
                    continue
                code = COUNTRY_CODES.get(event.get('country'))
                name = event.get('name', '')
                if not code or not isinstance(name, str) or not 2 <= len(name.strip()) <= 200:
                    continue
                try:
                    start, end = uci_dates(event.get('dates', ''))
                except (TypeError, ValueError):
                    continue
                if not (start.startswith('2027-') and end.startswith('2027-') and start <= end):
                    continue
                from datetime import date
                if (date.fromisoformat(end) - date.fromisoformat(start)).days > 31:
                    continue
                key = 'uci-2027-' + match.group(1)
                row = {
                    'id': key, 'name': name.strip(), 'date': start, 'enddate': end,
                    'countryCode': code, 'sourceUrl': 'https://www.uci.org' + path,
                }
                existing = found.get(key)
                if existing and existing != row:
                    conflicts.add(key)  # Ambiguous duplicate in the same official feed.
                else:
                    found[key] = row
    return [found[key] for key in sorted(found) if key not in conflicts]


def matching_2026_edition(candidate, races):
    """A country, normalized name AND Men Junior category must identify one known edition."""
    matching = {
        race['id']: race for race in races
        if (not race['date'].startswith('2027-')
            and race.get('duplicate') in (0, None)
            and race.get('state') != 'merged'
            and race.get('countryCode') == candidate['countryCode']
            and race.get('sex') in ('M', 'U19M')
            and normalized(race.get('name', '')) == normalized(candidate['name']))
    }
    return next(iter(matching.values())) if len(matching) == 1 else None


def confirmed_uci_detail(body, candidate):
    """Validate independently against the detail URL and exact calendar entry."""
    if not isinstance(body, str):
        return None
    page = Page(body)
    props = page.props.get('CompetitionDetailsModule', {})
    details = props.get('competitionDetails', {}) if isinstance(props, dict) else {}
    if not isinstance(details, dict):
        return None
    name = details.get('name')
    if not isinstance(name, str) or normalized(name) != normalized(candidate['name']):
        return None
    if not 2 <= len(name.strip()) <= 200 or any(c in name for c in '<>'):
        return None
    try:
        dates = uci_dates(details.get('dates', ''))
    except (TypeError, ValueError):
        return None
    if dates != (candidate['date'], candidate['enddate']):
        return None
    klass = str(details.get('competitionClass', '')).split(' - ')[0]
    if klass not in UCI_CLASSES:
        return None
    schedule = props.get('schedule', {}).get('items', [])
    categories = {
        race.get('category')
        for day in schedule if isinstance(day, dict)
        for race in day.get('races', []) if isinstance(race, dict)
    }
    if categories and 'Men Junior' not in categories:
        return None
    # If UCI omitted the schedule entirely, the source is still the verified
    # official /raceCategory=MJ calendar, NOT an arbitrary competition URL.
    venue = details.get('venue', '')
    if not isinstance(venue, str) or len(venue) > 200 or any(c in venue for c in '<>'):
        venue = ''
    return {'name': name.strip(), 'date': dates[0], 'enddate': dates[1],
            'venue': venue.strip() if 'TBC' not in venue.upper() else '', 'uciClass': klass}


def edition_from_uci_calendar(candidate, details, now, linked=None):
    """Create one complete 2027 entry, using linked 2026 coordinates only when unambiguous."""
    klass = details['uciClass']
    original = linked or {}
    lat = original.get('lat') if isinstance(original.get('lat'), (int, float)) else None
    lon = original.get('lon') if isinstance(original.get('lon'), (int, float)) else None
    if lat is None or lon is None or abs(lat) > 90 or abs(lon) > 180:
        lat, lon = None, None
    return {
        'id': candidate['id'], 'date': details['date'], 'enddate': details['enddate'],
        'name': details['name'], 'place': details['venue'] or original.get('place') or '',
        'countryCode': candidate['countryCode'],
        'country': original.get('country') or COUNTRY_NAMES[candidate['countryCode']],
        'sex': 'U19M', 'type': 'Stage race' if klass.startswith('2.') else 'Road race',
        'confirmation': 'U19 confirmed',
        'status': 'Verified from the 2027 UCI Men Junior calendar and competition details.',
        'sourceUrl': candidate['sourceUrl'], 'proofUrl': candidate['sourceUrl'],
        'resultUrl': '', 'bucket': 'confirmed', 'state': 'active',
        'lat': lat, 'lon': lon,
        'precision': original.get('precision', '') if lat is not None else '',
        'region': original.get('region', ''), 'roadUnconfirmed': 0, 'duplicate': 0,
        'source2026Id': original.get('id', ''), 'sourceUpdatedAt': now,
        'updateSourceUrl': candidate['sourceUrl'], 'levelSymbol': '9',
        'liveLevel': 'uci', 'uciClass': klass,
    }
