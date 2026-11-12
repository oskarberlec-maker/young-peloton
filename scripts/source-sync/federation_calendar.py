"""Official FFC calendar discovery using event-scoped fields, not page-wide years."""
import datetime as dt
from html.parser import HTMLParser
import re
from urllib.parse import urljoin, urlsplit, urlencode
from core import normalized, canonical

FFC = 'https://competitions.ffc.fr'


def calendar_seeds():
    # The public FFC form supports at most 14 days; 365 silently becomes one day.
    day = dt.date(2027, 1, 1)
    while day.year == 2027:
        yield FFC + '/calendrier/?' + urlencode({'discipline': '1', 'debut': day.strftime('%d/%m/%Y'), 'nbjours': 14})
        day += dt.timedelta(days=14)


class FFCCalendar(HTMLParser):
    """Capture each event anchor independently to avoid mixing adjacent rows."""
    fields = {'organisation-titre-libelle': 'name', 'organisation-titre-discipline': 'discipline',
              'organisation-titre-jours': 'dates'}

    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.entries, self.current, self.stack = [], None, []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        if tag == 'a' and 'organisation-titre' in classes:
            self.current = {'url': attrs.get('href', '')}
            self.stack = []
        if self.current is not None and tag not in ('br', 'img', 'input', 'hr', 'meta', 'link'):
            self.stack.append((tag, next((self.fields[c] for c in classes if c in self.fields), None)))

    def handle_data(self, text):
        if self.current is not None:
            for _, key in self.stack:
                if key:
                    self.current[key] = self.current.get(key, '') + text

    def handle_endtag(self, tag):
        if self.current is None:
            return
        if tag == 'a':
            self.entries.append({k: ' '.join(v.split()) for k, v in self.current.items()})
            self.current, self.stack = None, []
        else:
            for i in range(len(self.stack)-1, -1, -1):
                if self.stack[i][0] == tag:
                    del self.stack[i:]
                    break


def calendar_links(page, source_url, known_names):
    """Follow explicit 2027 road entries; the detail must independently confirm."""
    if urlsplit(source_url).hostname != 'competitions.ffc.fr':
        return []
    result = []
    for event in getattr(page, 'ffc_calendar', []):
        if normalized(event.get('discipline', '')) != 'route':
            continue
        # URL season can say 2027 even for a cyclocross race in November 2026.
        dates = re.findall(r'\b\d{2}/\d{2}/(\d{4})\b', event.get('dates', ''))
        if not dates or set(dates) != {'2027'}:
            continue
        try:
            url = canonical(urljoin(source_url, event['url']))
        except ValueError:
            continue
        if urlsplit(url).hostname != 'competitions.ffc.fr' or not re.fullmatch(r'/calendrier/competition/2027/[A-Za-z0-9-]+/[^/]+/?', urlsplit(url).path):
            continue
        for race in known_names.get(normalized(event.get('name', '')), []):
            if race.get('countryCode') == 'FR' and not race.get('duplicate') and race.get('state') != 'merged':
                result.append((url, race['id']))
    return list(dict.fromkeys(result))


def federation_category(page, race, url):
    """Read event fields, excluding menus, related races and social media feeds."""
    host = urlsplit(url).hostname
    if host == 'www.federciclismo.it':
        category = ' '.join(page.after(k) or '' for k in ('Categoria:', 'Categorie Ammesse:'))
        discipline = page.after('Tipo di Gara:') or ''
        return 'IT', category + ' ' + discipline
    if host == 'competitions.ffc.fr':
        # In the FFC detail header the discipline and date directly precede the title.
        heading_index = next((i for i, line in enumerate(page.lines) if normalized(line) == normalized(race['name'])), None)
        if heading_index is not None:
            header = [normalized(line) for line in page.lines[max(0, heading_index-3):heading_index]]
            if any(value in ('piste', 'cyclo-cross', 'vtt - cross country', 'bmx race', 'gravel') for value in header):
                return 'FR', ''
        code = page.after('Code épreuve') or ''
        category = ' '.join(page.after(k) or '' for k in ('Catégorie', 'Catégories'))
        if re.match(r'^MJ(?:\.|$)', code):
            category += ' U19 men'
        elif re.match(r'^WJ(?:\.|$)', code):
            category += ' U19 women'
        # Published FFC road codification: federal U19 men/women, one-day or stages.
        # https://ffc.fr/app/uploads/sites/2/2024/04/Codification-epreuves-route-bareme-points.pdf
        if re.fullmatch(r'[12]\.14(?:\.0)?', code):
            category += ' U19 men'
        elif re.fullmatch(r'[12]\.21(?:\.0)?', code):
            category += ' U19 women'
        # U19 is explicit category evidence; a generic name such as Junior Tour is not.
        for heading in page.headings:
            if normalized(heading) == normalized(race['name']) and re.search(r'\bu19\b', normalized(heading)):
                category += ' ' + heading
        # Standalone category labels occur in older detail layouts.
        category += ' ' + ' '.join(line for line in page.lines if re.fullmatch(r'U19(?: H| F| H/F)?', line))
        return 'FR', category
    return None, ''


def has_2027_dates(page):
    """A year in navigation/copyright is not race date evidence."""
    import json
    text = '\n'.join(page.lines) + '\n' + json.dumps(page.ld) + '\n' + json.dumps(page.props)
    return bool(re.search(r'\b2027-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]2027\b|\b\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+2027\b', text))


def calendar_date_evidence(page, source_url):
    evidence = {}
    for event in getattr(page, 'ffc_calendar', []):
        if normalized(event.get('discipline', '')) != 'route':
            continue
        text = event.get('dates', '')
        one = re.fullmatch(r'Le (\d{2}/\d{2}/2027)', text)
        span = re.fullmatch(r'Du (\d{2}/\d{2}/2027) au (\d{2}/\d{2}/2027)', text)
        if not one and not span:
            continue
        try:
            dates = [dt.datetime.strptime(value, '%d/%m/%Y').date().isoformat() for value in (span.groups() if span else (one[1], one[1]))]
            if dates[0] > dates[1]:
                continue
            url = canonical(urljoin(source_url, event['url']))
        except ValueError:
            continue
        if urlsplit(url).hostname == 'competitions.ffc.fr':
            evidence.setdefault(url, []).append(dates)
    return evidence
