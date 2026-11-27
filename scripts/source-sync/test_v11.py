"""V11: fewer duplicate FFC review items and redirects read at their new location."""
import argparse
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import run
from core import Page
from confirmations import CALENDAR
from federation_calendar import FFCCalendar, ffc_calendar_empty, has_2027_dates
from ffc_categories import NON_JUNIOR_CODES, junior_code, non_junior_code
from ffc_discovery import detail, non_junior_detail
from transport import moved_resource
from test_ffc_discovery import FIXTURES, NOW, PARENT
from test_reporting import BODIES, URLS

EMPTY_URL = 'https://competitions.ffc.fr/calendrier/?discipline=1&debut=17%2F12%2F2027&nbjours=14'
EMPTY = (FIXTURES / 'empty-calendar.html').read_text(encoding='utf-8')
ELITE = BODIES['faun'].replace('ME.1.PRO', '1.12.1')


def empty_page(body=EMPTY):
    page = Page(body)
    page.ffc_calendar = FFCCalendar(body).entries
    return page


class NonJuniorCodes(unittest.TestCase):
    def test_official_labels_and_zero_suffix(self):
        self.assertEqual(non_junior_code('1.12.1'), 'Elite/Open/Access')
        self.assertEqual(non_junior_code('3.54.0'), 'Coupe de France N1/N2/N3 (elite amateur)')
        self.assertEqual(non_junior_code('1.43.0'), 'Cyclosportive/randonnée')
        self.assertEqual(non_junior_code('3.34.0'), 'U17 and younger')
        self.assertEqual(non_junior_code('3.0'), 'Elite/Open/Access championship')
        self.assertIsNone(non_junior_code('1.12'))  # not an Annexe II road code
        self.assertIsNone(non_junior_code('3.20.1'))

    def test_junior_and_unlabelled_codes_are_never_excluded(self):
        for code in ('1.14', '1.21', '1.32', '1.35', '2.14', '2.21', '2.32', '3.2', '3.11', '3.23', '3.31',
                     '3.45', '3.46', '3.52', '3.52.1', '3.63', '3.64', '3.72', '3.73', '3.74', '3.75', '3.84',
                     '3.85', '3.92', '3.93', '3.97', '3.98',
                     '1.38', '1.39', '1.40.1', '1.46', '1.49', '1.52', '1.99', '3.59', '3.87', '3.890',
                     'MJ.1.1', 'HIS.2.0'):
            self.assertIsNone(non_junior_code(code), code)
            self.assertIsNone(non_junior_code(code + '.0'), code)
        self.assertFalse([code for code in NON_JUNIOR_CODES if junior_code(code)])

    def test_explicit_national_code_excludes_only_a_clean_event_header(self):
        excluded = non_junior_detail(Page(ELITE), URLS['faun'])
        self.assertEqual((excluded['code'], excluded['date']), ('1.12.1', '2027-02-28'))
        self.assertIn('not a U19 class', excluded['reason'])
        self.assertIsNone(detail(Page(ELITE), URLS['faun'], NOW))
        for code in ('WE.1.1', 'WE.1.PRO', 'WE.2.WWT'):
            women = non_junior_detail(Page(ELITE.replace('1.12.1', code)), URLS['faun'])
            self.assertIn('Women Elite', women['reason'])
        for code in ('WJ.1.1', 'WE.3.1', 'WU.1.1'):
            self.assertIsNone(non_junior_detail(Page(ELITE.replace('1.12.1', code)), URLS['faun']), code)
        for body in (ELITE.replace('Faun Drome Classic', 'Faun Drome Classic Juniors'),
                     ELITE + '<p>Catégorie</p><p>U19 Hommes</p>',
                     ELITE.replace('1.12.1', '1.32.0'),
                     ELITE.replace('1.12.1', '1.99.0'),
                     ELITE.replace('2027', '2026'),
                     ELITE.replace('Route', 'Piste')):
            self.assertIsNone(non_junior_detail(Page(body), URLS['faun']))


class EmptyCalendar(unittest.TestCase):
    def test_explicit_empty_window_is_recognised(self):
        self.assertTrue(has_2027_dates(Page(EMPTY)))  # would otherwise be "needs a reader"
        self.assertTrue(ffc_calendar_empty(empty_page(), EMPTY_URL))

    def test_layout_change_or_other_page_is_not_empty(self):
        self.assertFalse(ffc_calendar_empty(empty_page(EMPTY.replace('Aucune', 'Plusieurs')), EMPTY_URL))
        self.assertFalse(ffc_calendar_empty(empty_page(EMPTY.replace('0 compétition', '3 compétitions')), EMPTY_URL))
        self.assertFalse(ffc_calendar_empty(empty_page(), URLS['faun']))
        self.assertFalse(ffc_calendar_empty(empty_page(), 'https://example.org/calendrier/'))


class Redirects(unittest.TestCase):
    def test_same_resource_is_accepted(self):
        for original, final in (
                ('https://rfec.com/index.php/smartweb/inscripciones/prueba/32095-VOLTA-CASTELLO',
                 'https://fccv.es/index.php/smartweb/inscripciones/prueba/32095-VOLTA-CASTELLO'),
                ('https://swisscycling.ch/de/kalender/?race=9161&complete_year=true',
                 'https://www.swiss-cycling.ch/de/kalender/?race=9161&complete_year=true'),
                ('https://www.elsy-jacobs.lu/', 'https://elsy-jacobs.lu/'),
                ('https://hri.is/vidburdur/585', 'https://hri.is/keppni/671'),
                ('https://www.example.org/race/1', 'https://example.org/event/1/')):
            self.assertTrue(moved_resource(original, final), original)

    def test_gone_or_different_resource_stays_in_review(self):
        for original, final in (
                ('https://members.federciclismo.it/race/detail/180083/', 'https://members.federciclismo.it/'),
                ('https://velo.ffc.fr/courses/tour-du-leman-juniors-u19/', 'https://competitions.ffc.fr/calendrier/'),
                ('https://forms.gle/1mCSSAb9bWMuRSFt6', 'https://docs.google.com/forms/d/e/x/viewform'),
                ('https://drive.google.com/uc?export=download&id=1', 'https://drive.usercontent.google.com/download?id=1'),
                ('https://example.org/race/1', 'https://example.org/login/1'),
                ('https://example.org/race/1', 'https://example.org/error/404'),
                ('https://example.org/race/1', 'https://example.org/race/1/results'),
                ('https://example.org/race/1', 'https://other.example/race/2')):
            self.assertFalse(moved_resource(original, final), original)


class Pipeline(unittest.TestCase):
    def scan(self, bodies, seeds=(), redirects=None):
        redirects = redirects or {}
        archive = {'id': 'inventory', 'name': 'Unrelated', 'date': '2026-01-01', 'enddate': '2026-01-01',
                   'countryCode': 'FR', 'sex': 'M', 'sourceUrl': PARENT}

        def get(fetcher, url, prev):
            if url == CALENDAR:
                return {'body': b'{"items":[]}'}
            final = redirects.get(url, url)
            return {'body': bodies[final].encode(), 'contentType': 'text/html', 'finalUrl': final,
                    'redirectedHost': final != url, 'httpStatus': 200}
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(run, 'load_races', return_value=[archive]), \
                 patch.object(run, 'calendar_seeds', return_value=list(seeds)), \
                 patch.object(run, 'linked_source_catalogue', return_value=({}, {})), \
                 patch.object(run, 'excel_result_sources', return_value={}), \
                 patch.object(run.Fetcher, 'get', get), contextlib.redirect_stdout(io.StringIO()):
                run.run(argparse.Namespace(output=folder, fixtures=None, limit=0, workers=1))
            return (json.loads((Path(folder) / 'report.json').read_text(encoding='utf-8')),
                    json.loads((Path(folder) / 'state.json').read_text(encoding='utf-8')))

    def test_unverified_ffc_event_is_one_review_item_and_national_elite_is_excluded(self):
        cards = ''.join(
            f'<a class="organisation-titre" href="{URLS[key]}"><div class="organisation-titre-discipline">Route</div>'
            f'<div class="organisation-titre-jours">{dates}</div><div class="organisation-titre-libelle">{name}</div></a>'
            for key, name, dates in (('faun', 'Faun Drome Classic', 'Le 28/02/2027'),
                                     ('paris-nice', 'Paris-Nice', 'Du 07/03/2027 au 14/03/2027')))
        report, _ = self.scan({PARENT: cards, URLS['faun']: ELITE, URLS['paris-nice']: BODIES['paris-nice']})
        items = [item for item in report['review'] if item.get('sourceUrl') == URLS['paris-nice']]
        self.assertEqual([item['category'] for item in items], ['eligibility_unverified'])
        self.assertEqual(report['reviewCategories'].get('needs_reader_2027', 0), 0)
        self.assertEqual((report['ffcNonJuniorEntries'], report['ffcEntriesAwaitingVerification']), (1, 1))
        self.assertEqual(report['confirmed2027Added'], 0)

    def test_empty_calendar_window_and_moved_seed_are_not_review_items(self):
        old = 'https://ffc-old.example/calendrier/?discipline=1&debut=17%2F12%2F2027&nbjours=14'
        report, state = self.scan({PARENT: '', EMPTY_URL: EMPTY}, seeds=[EMPTY_URL, old], redirects={old: EMPTY_URL})
        self.assertFalse([item for item in report['review'] if item.get('sourceUrl') in (EMPTY_URL, old)])
        self.assertTrue(state['sources'][EMPTY_URL]['ffcCalendarEmpty'])
        self.assertEqual(state['sources'][old]['movedTo'], EMPTY_URL)
        self.assertEqual(report['movedSources'], 1)
        self.assertEqual(report['movedSourcesList'], [{'sourceUrl': old, 'movedTo': EMPTY_URL}])

    def test_redirect_to_a_home_page_stays_redirected(self):
        old = 'https://ffc-old.example/calendrier/?discipline=1&debut=17%2F12%2F2027&nbjours=14'
        home = 'https://competitions.ffc.fr/'
        report, state = self.scan({PARENT: '', home: EMPTY}, seeds=[old], redirects={old: home})
        items = [item for item in report['review'] if item.get('sourceUrl') == old]
        self.assertEqual(len(items), 1)
        self.assertIn('redirected', items[0]['reasons'])
        self.assertNotIn('movedTo', state['sources'][old])
        self.assertEqual(report['movedSources'], 0)


if __name__ == '__main__':
    unittest.main()
