"""Regression cases for real FFC codes and event-scoped category metadata."""
import unittest
from pathlib import Path
from core import Page
from ffc_categories import junior_code
from ffc_discovery import detail
from test_ffc_discovery import BODIES, URLS, NOW
import test_ffc_discovery as ffc_tests

URL = 'https://competitions.ffc.fr/calendrier/competition/2027/4759102002/pevele-carembault-classic-coupe-de-france-u19-1/'
BODY = (Path(__file__).parent / 'data/fixtures/ffc/pevele.html').read_text()


def category(value):
    return '<div class="info-principale"><div class="titreValeur-titre">Catégories :</div><div class="titreValeur-valeur">' + value + '</div></div>'


class V9(unittest.TestCase):
    def test_real_cup_event_previously_unrecognized(self):
        race = detail(Page(BODY), URL, NOW)
        self.assertEqual((race['sex'], race['date'], race['type']), ('U19M', '2027-04-04', 'Road race'))
        self.assertEqual(race['officialEventId'], 'FR-FFC-4759102002')
        timed = BODY.replace('Pévèle Carembault Classic', 'Contre La Montre Champenois')
        self.assertEqual(detail(Page(timed), URL, NOW)['type'], 'Time trial')

    def test_official_codes_and_stage_type(self):
        for code in ('3.74', '3.74.0', 'MJ 1.2', 'MJ.1.Ncup'):
            self.assertEqual(junior_code(code), ('U19M', 'Road race'))
        for code in ('3.75', '3.75.0', 'MJ 2.2'):
            self.assertEqual(junior_code(code), ('U19M', 'Stage race'))
        self.assertEqual(junior_code('WJ 2.1'), ('U19W', 'Stage race'))
        for code in ('3.75.E', '3.75.G', '3.74.1', 'ME.1.2', '1.12.1', '3.67.1'):
            self.assertIsNone(junior_code(code))
        body = BODY.replace('3.74.0', '3.75.0').replace('dimanche 04 avril 2027', 'du dimanche 04 avril 2027 au lundi 05 avril 2027').replace('1 jour', '2 jours')
        self.assertEqual(detail(Page(body), URL, NOW)['type'], 'Stage race')

    def test_nested_fields_and_inline_fci_fields(self):
        body = BODY.replace('3.74.0', '<span>3.74</span><span>.0</span>')
        self.assertIsNotNone(detail(Page(body), URL, NOW))
        self.assertEqual(Page('<p>Categoria: Juniores</p>').after('Categoria:'), 'Juniores')
        self.assertIsNone(Page('<p>Saison: 2027</p><p>Saison: 2026</p>').after('Saison'))

    def test_explicit_category_requires_event_scope_and_gender(self):
        body = BODY.replace('3.74.0', '1.99.0')
        self.assertIsNotNone(detail(Page(body + category('<span>U19</span> <b>Hommes</b>')), URL, NOW))
        for label in ('U19', 'Elite et U19 Hommes', 'U17 Hommes', 'U19 Hommes / U23 Hommes', 'U19 Hommes non admis'):
            self.assertIsNone(detail(Page(body + category(label)), URL, NOW))
        self.assertIsNone(detail(Page(body + '<nav>Catégorie U19 Hommes</nav>'), URL, NOW))
        self.assertIsNone(detail(Page(body + category('U19 Hommes') * 2), URL, NOW))
        self.assertIsNone(detail(Page(BODY + category('U19 Femmes')), URL, NOW))
        for code in ('ME.1.PRO', '1.13', '1.13.0', '1.31.0', '1.43.0'):
            self.assertIsNone(detail(Page(BODY.replace('3.74.0', code) + category('U19 Hommes')), URL, NOW))

    def test_age_only_category_needs_a_whole_event_junior_code(self):
        for label in ('U19', 'U-19', 'Juniors'):
            self.assertEqual(detail(Page(BODY + category(label)), URL, NOW)['sex'], 'U19M')
        for code in ('2.14.E', '1.14.G', '1.99.unrecognised'):
            body = BODY.replace('3.74.0', code) + category('U19 Hommes')
            self.assertIsNone(detail(Page(body), URL, NOW))
        self.assertIsNone(detail(Page(BODY + category('U19 / U23')), URL, NOW))

    def test_identity_discipline_and_conflicting_dates_still_fail(self):
        for body in (BODY.replace('Route', 'Piste'), BODY.replace('4759102002', '4759102003'), BODY.replace('2027', '2026'), BODY + '<p>Épreuve annulée</p>'):
            self.assertIsNone(detail(Page(body), URL, NOW))
        with self.assertRaises(ValueError):
            detail(Page(BODY + '<p>lundi 05 avril 2027</p>'), URL, NOW)

    def test_cup_discovery_publication_cache_and_conflict_pipeline(self):
        ffc_tests.NewFFC().test_publish_deduplicate_304_and_conflict(code='3.74.0')
