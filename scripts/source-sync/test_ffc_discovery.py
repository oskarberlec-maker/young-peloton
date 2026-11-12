"""Public FFC markup captured 2026-11-12; mutations below are negative tests."""
import argparse
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from core import Page
from federation_calendar import FFCCalendar
from ffc_discovery import calendar_entries, detail
from confirmations import CALENDAR
import run

FIXTURES = Path(__file__).parent / 'data/fixtures/ffc'
PARENT = 'https://competitions.ffc.fr/calendrier/'
NOW = '2026-11-12T16:00:00Z'
BODIES = {key: (FIXTURES / (key + '.html')).read_text() for key in ('brenne', 'boucles', 'march')}
page = Page(BODIES['march']); page.ffc_calendar = FFCCalendar(BODIES['march']).entries
ENTRIES = calendar_entries(page, PARENT)
URLS = {key: next(row['sourceUrl'] for row in ENTRIES if token in row['sourceUrl'])
        for key, token in [('brenne', 'brenne'), ('boucles', '/4877114003/')]}


class NewFFC(unittest.TestCase):
    def test_two_real_layouts_without_archive(self):
        for key, day in [('brenne', '06'), ('boucles', '07')]:
            race = detail(Page(BODIES[key] + '<button>Annuler</button>'), URLS[key], NOW)
            self.assertEqual(race['date'], '2027-03-' + day)
            self.assertEqual(race['countryCode'], 'FR')
            self.assertEqual(race['sex'], 'U19M')
            self.assertEqual(race['source2026Id'], '')
            self.assertIsNone(race['lat'])
            self.assertIn(race['name'], [row['name'] for row in ENTRIES])

    def test_website_feed_fixture_matches_reader_output(self):
        feed = json.loads((FIXTURES / 'expected-feed.json').read_text())
        races = [detail(Page(BODIES[key]), URLS[key], NOW) for key in URLS]
        self.assertEqual(feed['confirmed2027'], {race['id']: race for race in races})

    def test_category_country_identity_and_season_rejected(self):
        body = BODIES['brenne']
        for changed in [body.replace('1.14.0', '1.12.1'), body.replace('Indre', 'Belgique'),
                        body.replace('Route', 'Piste'), body + '<p>Épreuve annulée</p>', body.replace('4436272001', '4436272002'),
                        body.replace('2027', '2026'), body.replace('1 jour', '2 jours'),
                        body.replace('Classic Coeur de Brenne U19', 'Classic femmes U19')]:
            with self.subTest(changed=changed[-100:]):
                self.assertIsNone(detail(Page(changed), URLS['brenne'], NOW))

    def test_new_event_is_rechecked_without_archive_id_or_discovery_alias(self):
        from confirmations import dates_only
        race = detail(Page(BODIES['brenne']), URLS['brenne'], NOW)
        self.assertIsNotNone(dates_only(BODIES['brenne'], 'text/html', race, URLS['brenne']))
        self.assertIsNone(dates_only(BODIES['brenne'].replace('1.14.0', '1.12.1'), 'text/html', race, URLS['brenne']))

    def test_url_year_not_required_as_evidence(self):
        self.assertIsNotNone(detail(Page(BODIES['brenne']), URLS['brenne'].replace('/2027/', '/'), NOW))
        self.assertIsNone(detail(Page(BODIES['brenne'].replace('2027', '2026')), URLS['brenne'], NOW))

    def test_publish_deduplicate_304_and_conflict(self):
        # Dummy archive row inventories only the official calendar. Neither actual
        # event is present in the archive: both must reach the automatic feed.
        archive = {'id': 'archive', 'name': 'Unrelated archived race', 'date': '2026-03-01',
                   'enddate': '2026-03-01', 'sourceUrl': PARENT, 'countryCode': 'FR', 'sex': 'M'}
        calendar = '\n'.join(anchor for anchor in __import__('re').findall(r'<a\b.*?</a>', BODIES['march'], __import__('re').S)
                             if 'brenne' in anchor or '/4877114003/' in anchor)
        bodies = {PARENT: calendar, **{URLS[key]: BODIES[key] for key in URLS}}
        cached = False
        def get(fetcher, url, prev):
            if url == CALENDAR:
                return {'body': b'{"items": []}'}
            if cached and prev.get('hash'):
                return {'notModified': True, 'httpStatus': 304}
            return {'body': bodies[url].encode(), 'contentType': 'text/html', 'finalUrl': url,
                    'redirectedHost': False, 'httpStatus': 200}
        with tempfile.TemporaryDirectory() as folder:
            args = argparse.Namespace(output=folder, fixtures=None, limit=0, workers=1)
            def scan():
                with patch.object(run, 'load_races', return_value=[archive]), patch.object(run, 'calendar_seeds', return_value=[]), \
                     patch.object(run, 'linked_source_catalogue', return_value=({}, {})), \
                     patch.object(run, 'excel_result_sources', return_value={}), patch.object(run.Fetcher, 'get', get), \
                     contextlib.redirect_stdout(io.StringIO()):
                    run.run(args)
                return tuple(json.loads((Path(folder) / (name + '.json')).read_text()) for name in ('overrides', 'status'))
            overlay, status = scan()
            self.assertEqual(status['new2027RacesDiscovered'], 2)
            self.assertEqual(status['federationDetailPagesVerified'], 2)
            self.assertEqual(status['official2027CalendarEntriesDiscovered'], 2)
            self.assertEqual(status['attempted'], 3)
            self.assertEqual(overlay['races'], {})
            self.assertEqual(len(overlay['confirmed2027']), 2)
            for race in overlay['confirmed2027'].values():
                self.assertIn(PARENT, race['sourceLinks'])
            saved = overlay['confirmed2027']
            cached = True
            overlay, status = scan()
            self.assertEqual(status['notModified'], 3)
            self.assertEqual(status['new2027RacesDiscovered'], 0)
            self.assertEqual(overlay['confirmed2027'], saved)
            # Changed calendar with cached detail must preserve the published date.
            cached = False
            bodies[PARENT] = calendar.replace('06/03/2027', '08/03/2027')
            overlay, status = scan()
            self.assertEqual(status['dateConflicts'], 1)
            self.assertEqual(overlay['confirmed2027'], saved)
            self.assertEqual(overlay['races'], {})
            # A changed name for a stable ID cannot create another race.
            bodies[PARENT] = calendar.replace('Classic Coeur de Brenne U19', 'Other Classic U19')
            bodies[URLS['brenne']] = BODIES['brenne'].replace('Classic Coeur de Brenne U19', 'Other Classic U19')
            overlay, status = scan()
            self.assertEqual(overlay['confirmed2027'], saved)
            self.assertGreater(status['needsReview'], 0)
