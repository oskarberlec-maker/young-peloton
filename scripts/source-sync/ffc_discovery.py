"""New FFC events: calendar identity plus independently verified event details.

Layouts checked against Brenne and Boucles public pages on 2026-11-12.
Reuses the existing FFC date reader; never guesses dates or category from a name.
"""
import re
from urllib.parse import urlsplit, urljoin
from core import canonical, normalized, read_ffc, validate
from confirmations import edition
from ffc_categories import junior_code
from federation_calendar import calendar_date_evidence

# Explicit metropolitan department in the event header establishes France and
# European scope. Overseas/unknown locations require review, not geocoding.
DEPARTMENTS = {normalized(x) for x in '''Ain|Aisne|Allier|Alpes-de-Haute-Provence|Hautes-Alpes|Alpes-Maritimes|Ardèche|Ardennes|Ariège|Aube|Aude|Aveyron|Bouches-du-Rhône|Calvados|Cantal|Charente|Charente-Maritime|Cher|Corrèze|Corse-du-Sud|Haute-Corse|Côte-d'Or|Côtes-d'Armor|Creuse|Dordogne|Doubs|Drôme|Eure|Eure-et-Loir|Finistère|Gard|Haute-Garonne|Gers|Gironde|Hérault|Ille-et-Vilaine|Indre|Indre-et-Loire|Isère|Jura|Landes|Loir-et-Cher|Loire|Haute-Loire|Loire-Atlantique|Loiret|Lot|Lot-et-Garonne|Lozère|Maine-et-Loire|Manche|Marne|Haute-Marne|Mayenne|Meurthe-et-Moselle|Meuse|Morbihan|Moselle|Nièvre|Nord|Oise|Orne|Pas-de-Calais|Puy-de-Dôme|Pyrénées-Atlantiques|Hautes-Pyrénées|Pyrénées-Orientales|Bas-Rhin|Haut-Rhin|Rhône|Haute-Saône|Saône-et-Loire|Sarthe|Savoie|Haute-Savoie|Paris|Seine-Maritime|Seine-et-Marne|Yvelines|Deux-Sèvres|Somme|Tarn|Tarn-et-Garonne|Var|Vaucluse|Vendée|Vienne|Haute-Vienne|Vosges|Yonne|Territoire de Belfort|Essonne|Hauts-de-Seine|Seine-Saint-Denis|Val-de-Marne|Val-d'Oise'''.split('|')}


def event_id(url):
    parts = urlsplit(url)
    match = re.fullmatch(r'/calendrier/competition/(?:\d{4}/)?([A-Za-z0-9-]{1,40})/[^/]+/?', parts.path)
    return match[1] if parts.hostname == 'competitions.ffc.fr' and match else None


def calendar_entries(page, url):
    """Keep all explicit road entries, including names absent from the archive."""
    if urlsplit(url).hostname != 'competitions.ffc.fr':
        return []
    dates = calendar_date_evidence(page, url)
    entries = []
    for row in getattr(page, 'ffc_calendar', []):
        try:
            child = canonical(urljoin(url, row.get('url', '')))
        except ValueError:
            continue
        name = row.get('name', '').strip()
        if normalized(row.get('discipline', '')) != 'route' or not event_id(child) or child not in dates:
            continue
        if not 2 <= len(name) <= 200 or any(c in name for c in '<>'):
            continue
        item = {'sourceUrl': child, 'name': name, 'eventId': event_id(child)}
        if item not in entries:
            entries.append(item)
    return entries


def _event_header(page, url):
    """Prove one road event header, metropolitan location, season and ID."""
    eid = event_id(url)
    if not eid or page.after('Saison') != '2027' or page.after("N° d'épreuve") != eid:
        return None
    if any(len(page.values(label)) != 1 for label in ('Saison', "N° d'épreuve", 'Code épreuve', 'Durée')):
        return None
    code = page.after('Code épreuve') or ''
    headers = [(i, name) for i, name in enumerate(page.lines) if name in page.headings
               and i >= 2 and page.lines[i-2] == 'Route' and i+1 < len(page.lines)
               and normalized(page.lines[i+1]) in DEPARTMENTS]
    if len(headers) != 1:
        return None
    i, name = headers[0]
    if not 2 <= len(name) <= 200 or any(c in name for c in '<>') or any(re.search(r'\b(?:annulee?|annulation)\b', normalized(line)) for line in page.lines):
        return None
    return eid, code, i, name


def non_junior_detail(page, url):
    """Audit explicit Men Elite UCI classes; unknown/mixed codes stay in review.

    This is a reporting exclusion, never permission to modify a published race.
    """
    header = _event_header(page, url)
    if not header:
        return None
    eid, code, i, name = header
    if not re.fullmatch(r'ME\.[12]\.(?:PRO|Pro|1|2|UWT)', code):
        return None
    category_text = ' '.join([name, *(page.after(k) or '' for k in ('Catégorie', 'Catégories'))])
    if re.search(r'\b(u19|junior\w*)\b', normalized(category_text)):
        return None
    race = {'id': 'FR-FFC-' + eid, 'name': name, 'date': '2027-01-01', 'enddate': '2027-01-01'}
    observed = read_ffc(page, race, url)
    if not observed or not all(k in observed['fields'] for k in ('date', 'enddate', 'name')):
        return None
    dates = {k: observed['fields'][k] for k in ('date', 'enddate')}
    if not all(v.startswith('2027-') for v in dates.values()):
        return None
    validate(dates, race)
    return {'eventId': eid, 'name': name, 'code': code, **dates,
            'reason': 'Official event code identifies a Men Elite UCI class, not a junior class'}


def explicit_junior_category(page, code):
    """Accept an exclusive event category, never a title/menu or an open field.

    Unmapped national codes require explicit U19 plus gender in event metadata.
    Known elite/U23 codes cannot be overridden by contradictory category text.
    """
    if re.match(r'^(?:ME|WE|MU|WU)\.', code, re.I) or re.fullmatch(r'[12]\.(?:12\.1|(?:13|23|28|30|31|33|36|37|43|45|46|51)(?:\.0)?)', code):
        return None
    values = [v for key in ('categorie', 'categories') for v in page.event_fields.get(key, [])]
    if len(values) != 1:
        return None
    value = normalized(values[0])
    male = r'(?:hommes|homme|masculins?|men|h)'
    female = r'(?:femmes|femme|feminines?|women|f)'
    junior = r'(?:u\s*[-]?\s*19|juniors?)'
    for gender, sex in ((male, 'U19M'), (female, 'U19W')):
        if re.fullmatch(r'(?:' + junior + r'\s+' + gender + '|' + gender + r'\s+' + junior + ')', value):
            return sex
    return None


def detail(page, url, now):
    """Prove one header, metropolitan location, U19 road code, season and ID."""
    header = _event_header(page, url)
    if not header:
        return None
    eid, code, i, name = header
    classification = junior_code(code)
    if classification:
        sex, kind = classification
    else:
        sex = explicit_junior_category(page, code)
        if not sex:
            return None
        # An unknown event format cannot safely be labelled a one-day road race.
        if not code.startswith(('1.', '2.')):
            return None
        kind = 'Stage race' if code.startswith('2.') else 'Road race'
    categories = [v for key in ('categorie', 'categories') for v in page.event_fields.get(key, [])]
    if categories and explicit_junior_category(page, '') != sex:
        return None
    if kind == 'Road race' and re.search(r'\bcontre[ -]la[ -]montre\b', normalized(name)):
        kind = 'Time trial'
    # Explicit gender in the name must not contradict the event code.
    if (sex == 'U19M' and re.search(r'\b(feminin\w*|femmes|women|dames)\b', normalized(name))
            or sex == 'U19W' and re.search(r'\b(masculin\w*|hommes|men)\b', normalized(name))):
        return None
    base = {'id': 'FR-FFC-' + eid, 'name': name, 'countryCode': 'FR', 'country': 'France',
            'sex': sex, 'date': '2027-01-01', 'enddate': '2027-01-01', 'place': page.lines[i+1],
            'type': kind,
            'confirmation': 'U19 confirmed', 'lat': None, 'lon': None, 'precision': '',
            'region': '', 'roadUnconfirmed': 0, 'source2026Id': ''}
    observed = read_ffc(page, base, url)
    if not observed or not all(k in observed['fields'] for k in ('date', 'enddate', 'name')):
        return None
    fields = {k: observed['fields'][k] for k in ('date', 'enddate')}
    if not all(value.startswith('2027-') for value in fields.values()):
        return None
    validate(fields, base)
    return {**edition(base, fields, url, now), 'officialEventId': 'FR-FFC-' + eid}
