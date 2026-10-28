import copy
import json
import unittest
from core import extract, validate, changes_from_previous, uci_dates, canonical

RACE = {'id':'uci-2027-81168','date':'2027-05-06','enddate':'2027-05-09','name':'Course de la Paix Juniors','place':'Old venue','state':'active'}


def uci_page(date='06 May - 09 May 2027', category='Men Junior', klass='2.Ncup'):
    import html
    props = {'competitionDetails': {'name': RACE['name'], 'dates':date,'venue':'New venue','competitionClass':klass+' - Stages'}, 'schedule':{'items':[{'races':[{'category':category}]}]}}
    return '<div data-component="CompetitionDetailsModule" data-props="'+html.escape(json.dumps(props),quote=True)+'"></div>'


class Rules(unittest.TestCase):
    def test_dates_cross_month(self):
        self.assertEqual(uci_dates('29 Jul - 01 Aug 2027'), ('2027-07-29','2027-08-01'))

    def test_uci_identity_category_and_class(self):
        result = extract(uci_page(), 'text/html', RACE, 'https://www.uci.org/competition-details/2027/ROA/81168')
        self.assertEqual(result['fields']['uciClass'],'2.Ncup')
        self.assertEqual(result['fields']['date'],'2027-05-06')
        with self.assertRaises(ValueError):
            extract(uci_page(category='Men Elite'), 'text/html', RACE, 'https://www.uci.org/competition-details/2027/ROA/81168')

    def test_national_program_not_used_as_individual_date(self):
        race = {**RACE,'id':'AL-NC-20-M'}
        self.assertIsNone(extract(uci_page(), 'text/html', race, 'https://www.uci.org/competition-details/2026/ROA/78504'))

    def test_first_read_baseline_is_not_a_change(self):
        self.assertEqual(changes_from_previous(None, {'date':'2027-05-08'}, RACE), {})

    def test_date_pair_changes_together(self):
        previous={'date':'2027-05-06','enddate':'2027-05-09'}
        current={'date':'2027-05-07','enddate':'2027-05-09'}
        self.assertEqual(changes_from_previous(previous,current,RACE),current)

    def test_year_and_range_guards(self):
        for fields in [{'date':'2028-05-06'}, {'date':'2027-05-12'}, {'date':'2027-02-30'}]:
            with self.assertRaises(ValueError):validate(fields,RACE)

    def test_untrusted_fields_rejected(self):
        for fields in [{'id':'replacement'}, {'name':'<script>bad</script>'}, {'liveLevel':'WorldTour'}, {'state':'deleted'}]:
            with self.assertRaises(ValueError):validate(fields,RACE)

    def test_missing_end_does_not_shorten_multiday(self):
        event={'@type':'SportsEvent','name':RACE['name'],'startDate':'2027-05-07'}
        result=extract('<script type="application/ld+json">'+json.dumps(event)+'</script>', 'text/html', RACE, 'https://example.org/race')
        self.assertNotIn('enddate',result['fields'])

    def test_ambiguous_event_is_not_selected(self):
        event={'@type':'SportsEvent','name':RACE['name'],'startDate':'2027-05-06'}
        html='<script type="application/ld+json">'+json.dumps([event,event])+'</script>'
        self.assertIsNone(extract(html,'text/html',RACE,'https://example.org/race'))

    def test_pdf_and_html_noise_do_not_propose_fields(self):
        self.assertIsNone(extract('2027-05-10','application/pdf',RACE,'https://example.org/a.pdf'))
        self.assertIsNone(extract('<p>Copyright 2027. Today 10 May 2027</p>','text/html',RACE,'https://example.org/'))

    def test_ffc_explicit_regional_class(self):
        text="<p>N° d'épreuve</p><p>C123</p><p>Saison</p><p>2026</p><p>vendredi 06 février 2026</p><p>Durée</p><p>1 jour</p><p>Type de compétition</p><p>Régional</p>"
        race={**RACE,'id':'FR-FFC-C123','date':'2026-02-06','enddate':'2026-02-06'}
        result=extract(text,'text/html',race,'https://competitions.ffc.fr/resultats/resultat/2026/C123/race/')
        self.assertEqual(result['fields']['date'],'2026-02-06')
        self.assertEqual(result['fields']['liveLevel'],'regional')

    def test_deduplicates_fragments_but_keeps_query_identifiers(self):
        self.assertEqual(canonical('https://example.org/race?id=1#results'),'https://example.org/race?id=1')
        self.assertNotEqual(canonical('https://example.org/race?id=1'),canonical('https://example.org/race?id=2'))

if __name__=='__main__':unittest.main()
