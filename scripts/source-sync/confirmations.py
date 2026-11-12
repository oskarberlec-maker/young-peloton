"""Confirm only explicit 2027 dates for races already known to Young Peloton."""
import hashlib
import re
from urllib.parse import urlsplit, parse_qs
from federation_calendar import federation_category
from core import Page, extract, normalized, uci_dates, validate, walk_events, event_context

YEAR = '2027'
CALENDAR = 'https://www.uci.org/api/calendar/upcoming?discipline=ROA&raceCategory=MJ&seasonId=100471&year=2027'

def identity(race):
    return (normalized(race['name']), race.get('countryCode', ''), {'M':'U19M', 'Ž':'U19W'}.get(race.get('sex'), race.get('sex', '')))

def dates_only(body, content_type, race, url, page=None, linked_edition=False):
    if race.get('officialEventId', '').startswith('FR-FFC-'):
        # Newly discovered events must retain the same strict category/identity
        # checks on later scans, even without a 2026 ancestor or discovery alias.
        from ffc_discovery import detail
        if 'html' not in content_type:
            return None
        verified = detail(page if page is not None else Page(body), url, '')
        if not verified or verified['officialEventId'] != race['officialEventId'] or identity(verified) != identity(race):
            return None
        return {'fields': {k: verified[k] for k in ('date', 'enddate')},
                'adapter': 'ffc-calendar-and-detail-v1', 'confidence': 'exact'}
    # The placeholder selects the reader's season; it is never published.
    target = {**race, 'date': '2027-01-01', 'enddate': '2027-01-01' if race['date'] and race['date'] == race['enddate'] else '2027-01-02'}
    target['id'] = race['id'] if race['id'].startswith('uci-2027-') else race.get('source2026Id', race['id'])
    # Federation IDs can change each season. Only an explicitly linked official
    # edition with the exact known event heading can supply its new ID.
    if linked_edition and 'html' in content_type:
        page = page if page is not None else Page(body)
        if any(normalized(heading) == normalized(race['name']) for heading in page.headings):
            host = urlsplit(url).hostname
            if host == 'competitions.ffc.fr' and page.after('Saison') == YEAR:
                event_id = page.after("N° d'épreuve")
                if event_id and re.fullmatch(r'[A-Za-z0-9-]{1,40}', event_id):
                    target['id'] = 'FR-FFC-' + event_id
            elif host == 'www.federciclismo.it':
                event_id = parse_qs(urlsplit(url).query).get('raceid', [''])[0]
                if re.fullmatch(r'\d{1,20}', event_id):
                    target['id'] = 'IT-' + event_id
    if linked_edition and 'html' in content_type:
        page = page if page is not None else Page(body)
        host_country, category = federation_category(page, race, url)
        federation_evidence = bool(host_country) and event_context(
            {'category': category, 'location': {'address': {'addressCountry': host_country}}}, race)
        structured_category = any(normalized(str(event.get('name', ''))) == normalized(race['name']) and
                                  event_context(event, race) for root in page.ld for event in walk_events(root))
        if not (federation_evidence or structured_category):
            return None
    observed = extract(body, content_type, target, url, page=page)
    if not observed or not all(k in observed['fields'] for k in ('date', 'enddate')):
        return None
    fields = {k: observed['fields'][k] for k in ('date', 'enddate')}
    if any(not fields[k].startswith(YEAR + '-') for k in fields):
        return None
    validate(fields, target)
    if observed['fields'].get('state') == 'cancelled':
        return None
    if not race['date'].startswith(YEAR):
        page = page if page is not None else Page(body)
        # Federation IDs alone can be reused. Require the known event name too.
        if observed['adapter'] != 'schema-event-v1' and not any(normalized(h) == normalized(race['name']) for h in page.headings):
            return None
    return {**observed, 'fields': fields}

def edition(race, fields, url, now, uci_id=None):
    rid = uci_id or 'confirmed-2027-' + hashlib.sha256('|'.join(identity(race)).encode()).hexdigest()[:20]
    return {**race, **fields, 'id': rid, 'source2026Id': race.get('source2026Id', race['id']),
            'sourceUrl': url, 'proofUrl': url, 'resultUrl': '', 'bucket': 'confirmed',
            'state': 'active', 'duplicate': 0, 'sourceUpdatedAt': now, 'updateSourceUrl': url,
            'status': '2027 dates explicitly published by the official source.',
            # A date confirmation does not confirm a new season's classification.
            'levelSymbol': '9' if uci_id else 'A', 'liveLevel': 'uci' if uci_id else None}

def calendar_candidates(payload, races):
    known = {}
    for race in races:
        if race.get('duplicate') or race.get('state') == 'merged' or race.get('sex') not in ('M', 'U19M'):
            continue
        known.setdefault(normalized(race['name']), []).append(race)
    country_codes = dict(ALB='AL', AND='AD', AUT='AT', BEL='BE', BIH='BA', BLR='BY', BUL='BG', CRO='HR', CYP='CY', CZE='CZ', DEN='DK', ESP='ES', EST='EE', FIN='FI', FRA='FR', GBR='GB', GER='DE', GRE='GR', HUN='HU', IRL='IE', ISL='IS', ITA='IT', LAT='LV', LIE='LI', LTU='LT', LUX='LU', MDA='MD', MKD='MK', MLT='MT', MNE='ME', MON='MC', NED='NL', NOR='NO', POL='PL', POR='PT', ROU='RO', RUS='RU', SLO='SI', SMR='SM', SRB='RS', SUI='CH', SVK='SK', SWE='SE', TUR='TR', UKR='UA', KOS='XK')
    seen = set()
    for month in payload['items']:
        for day in month['items']:
            for event in day['items']:
                path = event.get('detailsLink', {}).get('url', '')
                if event.get('continentCode') != 'EUR' or not re.fullmatch(r'/competition-details/2027/ROA/\d+', path) or path in seen:
                    continue
                seen.add(path)
                try:
                    start, end = uci_dates(event.get('dates', ''))
                except ValueError:
                    continue
                if not start.startswith(YEAR) or not end.startswith(YEAR):
                    continue
                # UCI three-letter country codes are stored in our UCI records.
                matches = [r for r in known.get(normalized(event['name']), []) if r.get('countryCode') == country_codes.get(event.get('country'))]
                if not matches or len({identity(r) for r in matches}) != 1:
                    continue
                race = next((r for r in matches if r['date'].startswith(YEAR)), matches[0])
                yield race, 'https://www.uci.org' + path, 'uci-2027-' + path.rsplit('/', 1)[1]
