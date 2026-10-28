"""Deterministic source readers. Remote content is data, never instructions/code."""
import datetime as dt
import html
import json
import re
import unicodedata
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qs, urlunsplit

FIELDS = {'date', 'enddate', 'name', 'place', 'type', 'state', 'liveLevel', 'uciClass'}
LEVELS = {'uci', 'national', 'regional'}


def normalized(value):
    return ' '.join(unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower().split())


def canonical(url):
    p = urlsplit(url)
    if p.scheme not in ('http', 'https') or not p.hostname or p.username or p.password:
        raise ValueError('Not a public HTTP source URL')
    return urlunsplit((p.scheme, p.netloc, p.path or '/', p.query, ''))


def iso(value):
    if not isinstance(value, str) or not re.match(r'^\d{4}-\d{2}-\d{2}(?:$|T)', value):
        raise ValueError('Expected an explicit date including year')
    return dt.date.fromisoformat(value[:10]).isoformat()


def uci_dates(value):
    # Full year is mandatory; never infer a new season from the current date.
    year = re.search(r'(\d{4})$', value)
    if not year:
        raise ValueError('Missing UCI date year')
    parts = value.split(' - ')
    dates = []
    for p in parts:
        p = p if re.search(r'\d{4}$', p) else p + ' ' + year[1]
        dates.append(dt.datetime.strptime(p, '%d %b %Y').date().isoformat())
    return dates[0], dates[-1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.lines, self.props, self.ld, self.headings = [], {}, [], []
        self.skip = 0
        self.script = None
        self.heading = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('data-component') and a.get('data-props'):
            try:
                self.props[a['data-component']] = json.loads(a['data-props'])
            except (ValueError, TypeError):
                pass
        if tag in ('script', 'style'):
            self.skip += 1
        if tag == 'script' and a.get('type', '').lower() == 'application/ld+json':
            self.script = ''
        if tag in ('h1', 'h2'):
            self.heading = ''

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            try:
                self.ld.append(json.loads(self.script))
            except ValueError:
                pass
            self.script = None
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
        if tag in ('h1', 'h2') and self.heading is not None:
            self.headings.append(self.heading.strip())
            self.heading = None

    def handle_data(self, value):
        if self.script is not None:
            self.script += value
        if not self.skip and value.strip():
            self.lines.append(' '.join(value.split()))
            if self.heading is not None:
                self.heading += value

    def after(self, label):
        try:
            return self.lines[self.lines.index(label) + 1]
        except (ValueError, IndexError):
            return None


def read_uci(page, race, url):
    props = page.props.get('CompetitionDetailsModule', {})
    details = props.get('competitionDetails', {})
    if not details:
        return None
    # A competition may include several categories/days; never apply its envelope
    # to an individual national-championship race or stage in the 2026 archive.
    if not race['id'].startswith('uci-2027-'):
        return None
    categories = {r.get('category') for d in props.get('schedule', {}).get('items', []) for r in d.get('races', [])}
    if 'Men Junior' not in categories:
        raise ValueError('UCI record no longer explicitly confirms Men Junior')
    start, end = uci_dates(details.get('dates', ''))
    klass = details.get('competitionClass', '').split(' - ')[0]
    if klass not in ('1.1', '2.1', '1.Ncup', '2.Ncup'):
        raise ValueError('UCI class changed outside supported junior classes')
    fields = {'date': start, 'enddate': end, 'name': details['name'], 'liveLevel': 'uci', 'uciClass': klass}
    # UCI venue is sometimes an organiser address; do not invent map coordinates.
    if details.get('venue') and 'TBC' not in details['venue']:
        fields['place'] = details['venue']
    return {'fields': fields, 'adapter': 'uci-competition-v1', 'confidence': 'exact'}


FRENCH_MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']


def read_ffc(page, race, url):
    event_id = page.after("N° d'épreuve")
    if not event_id or race['id'] != 'FR-FFC-' + event_id:
        return None
    year = page.after('Saison')
    dates = []
    for line in page.lines:
        m = re.fullmatch(r'(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) (\d{1,2}) ([a-z]+) (\d{4})', normalized(line))
        if m and m[2] in FRENCH_MONTHS and m[3] == year:
            dates.append(dt.date(int(m[3]), FRENCH_MONTHS.index(m[2]) + 1, int(m[1])).isoformat())
    fields = {}
    if len(set(dates)) == 1 and page.after('Durée') in ('1 jour', '1 jours'):
        fields.update(date=dates[0], enddate=dates[0])
    level = normalized(page.after('Type de compétition') or '')
    if level in ('regional', 'national'):
        fields['liveLevel'] = 'regional' if level == 'regional' else 'national'
    # No title guessing: only an event heading, not the site's page/navigation title.
    names = [h for h in page.headings if normalized(h) == normalized(race['name'])]
    if len(names) == 1:
        fields['name'] = names[0]
    return {'fields': fields, 'adapter': 'ffc-event-v1', 'confidence': 'exact'} if fields else None


def read_fci(page, race, url):
    rid = parse_qs(urlsplit(url).query).get('raceid', [''])[0]
    if race['id'] != 'IT-' + rid or not rid:
        return None
    text = '\n'.join(page.lines)
    m = re.search(r'ID Gara:\s*' + re.escape(rid) + r'\s*\|\s*Data:\s*(\d{2}/\d{2}/\d{4})(?!\s*[-–])', text)
    if not m:
        return None
    day = dt.datetime.strptime(m[1], '%d/%m/%Y').date().isoformat()
    fields = {}
    # Multi-stage entries need a dedicated stage reader; don't collapse their range.
    if race.get('date') == race.get('enddate'):
        fields.update(date=day, enddate=day)
    place = page.after('Localita:')
    if place:
        fields['place'] = place
    level = normalized(page.after('Categoria Geografica:') or '')
    if level in ('regionale', 'nazionale'):
        fields['liveLevel'] = 'regional' if level == 'regionale' else 'national'
    kind = page.after('Tipo di Gara:')
    kinds = {'in linea \\ strada': 'Road race', 'cronometro individuale': 'Time trial', 'a tappe': 'Stage race'}
    if normalized(kind or '') in kinds:
        fields['type'] = kinds[normalized(kind)]
    approval = normalized(page.after('Approvazione:') or '')
    if approval in ('annullata', 'annullato'):
        fields['state'] = 'cancelled'
    return {'fields': fields, 'adapter': 'fci-event-v1', 'confidence': 'exact'}


def walk_events(node):
    if isinstance(node, list):
        for x in node:
            yield from walk_events(x)
    elif isinstance(node, dict):
        types = node.get('@type', [])
        if any(t in ('Event', 'SportsEvent') for t in ([types] if isinstance(types, str) else types)):
            yield node
        if '@graph' in node:
            yield from walk_events(node['@graph'])


def read_ld(page, race, url):
    matches = []
    for root in page.ld:
        for e in walk_events(root):
            # Strict name+year matching, never pick the first event from a calendar.
            if not isinstance(e.get('name'), str) or normalized(e['name']) != normalized(race['name']):
                continue
            try:
                start = iso(e['startDate'])
            except (KeyError, ValueError):
                continue
            if start[:4] != (race.get('date') or race.get('enddate', ''))[:4]:
                continue
            if e.get('url') and canonical(e['url']) != canonical(url):
                continue
            matches.append(e)
    if len(matches) != 1:
        return None
    e = matches[0]
    fields = {'date': iso(e['startDate'])}
    # Missing endDate must not silently shorten an event.
    if e.get('endDate'):
        fields['enddate'] = iso(e['endDate'])
    elif race.get('date') == race.get('enddate'):
        fields['enddate'] = fields['date']
    status = str(e.get('eventStatus', '')).split('/')[-1]
    if status == 'EventCancelled':
        fields['state'] = 'cancelled'
    location = e.get('location')
    if isinstance(location, dict) and isinstance(location.get('name'), str):
        fields['place'] = location['name']
    return {'fields': fields, 'adapter': 'schema-event-v1', 'confidence': 'structured'}


def extract(body, content_type, race, url):
    if 'html' not in content_type:
        return None
    page = Page(body)
    host = urlsplit(url).hostname
    if host == 'www.uci.org':
        return read_uci(page, race, url)
    if host == 'competitions.ffc.fr':
        return read_ffc(page, race, url)
    if host == 'www.federciclismo.it':
        return read_fci(page, race, url)
    return read_ld(page, race, url)


def validate(fields, race):
    if not fields or set(fields) - FIELDS:
        raise ValueError('Unsupported or empty field set')
    for key, value in fields.items():
        if not isinstance(value, str) or not value.strip() or len(value) > 500 or re.search(r'[<>\x00-\x08]', value):
            raise ValueError('Invalid field value: ' + key)
    start, end = fields.get('date', race['date']), fields.get('enddate', race['enddate'])
    if start or end:
        start, end = iso(start), iso(end)
        year = (race.get('date') or race.get('enddate'))[:4]
        if start[:4] != year or end[:4] != year or start > end:
            raise ValueError('Conflicting dates or a different season')
        if (dt.date.fromisoformat(end) - dt.date.fromisoformat(start)).days > 31:
            raise ValueError('Unexpected event duration')
    if 'liveLevel' in fields and fields['liveLevel'] not in LEVELS:
        raise ValueError('Unknown rank')
    if 'state' in fields and fields['state'] != 'cancelled':
        raise ValueError('State transition needs review')
    return fields


def changes_from_previous(previous, current, race):
    # First successful read establishes a baseline; don't reclassify the entire
    # historical archive because its initial interpretation differs from a page.
    if not previous:
        return {}
    delta = {k: v for k, v in current.items() if k in previous and previous[k] != v and race.get(k) != v}
    if current.get('state') == 'cancelled' and previous.get('state') != 'cancelled' and race.get('state') != 'cancelled':
        delta['state'] = 'cancelled'
    if ('date' in delta or 'enddate' in delta) and 'date' in current and 'enddate' in current:
        delta.update(date=current['date'], enddate=current['enddate'])
    return delta
