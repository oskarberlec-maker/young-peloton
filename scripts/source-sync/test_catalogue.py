import unittest
from unittest.mock import patch
from catalogue import source_catalogue, excel_result_sources, combined_source_catalogue, linked_source_catalogue

class SourceCatalogueTest(unittest.TestCase):
    def test_existing_archive_sources_are_indexed(self):
        records=source_catalogue()
        print('Archived source catalogue:',len(records),'race IDs,',sum(map(len,records.values())),'links')
        self.assertGreater(len(records),1000,'Expected at least 1000 race IDs in the generated source catalogue')
        self.assertTrue(all(isinstance(key,str) and all(url.startswith(('https://','http://')) for url in urls) for key,urls in records.items()))

    def test_all_excel_result_sources_imported_without_duplicate_links(self):
        excel = excel_result_sources()
        self.assertEqual(len(excel), 9926)
        pairs = sum(map(len, excel.values()))
        self.assertGreaterEqual(pairs, 28900)
        self.assertLessEqual(pairs, 28975)
        unique_urls = {url for links in excel.values() for url in links}
        self.assertGreaterEqual(len(unique_urls), 10000)
        self.assertTrue(all(len(links)==len(set(links)) for links in excel.values()))
        merged = combined_source_catalogue()
        self.assertTrue(all(set(links).issubset(set(merged[rid])) for rid, links in excel.items()))
        self.assertTrue(all(len(links)==len(set(links)) for links in merged.values()))


    def test_legacy_ids_use_only_unique_exact_archive_links(self):
        races = [
            {'id':'AL-ONE','name':'Race One','date':'2026-05-02',
             'sourceUrl':'https://official.example/race/1','state':'active','duplicate':0},
            {'id':'AL-TWO','name':'Race Two','date':'2026-05-02',
             'sourceUrl':'https://official.example/shared','state':'active','duplicate':0},
            {'id':'AL-THREE','name':'Race Three','date':'2026-05-03',
             'sourceUrl':'https://official.example/shared','state':'active','duplicate':0},
        ]
        legacy = {
            'xl-1':['https://official.example/race/1','https://results.example/1'],
            'xl-2':['https://official.example/shared','https://results.example/shared'],
            'xl-3':['https://official.example/unknown','https://results.example/unknown'],
        }
        with patch('catalogue.source_catalogue',return_value=legacy), patch('catalogue.excel_result_sources',return_value={'AL-TWO':['https://extra.example/2']}):
            merged, metrics = linked_source_catalogue(races)
        self.assertIn('https://results.example/1',merged['AL-ONE'])
        self.assertIn('https://extra.example/2',merged['AL-TWO'])
        self.assertNotIn('https://results.example/shared',merged['AL-TWO'])
        self.assertNotIn('https://results.example/shared',merged['AL-THREE'])
        self.assertIn('xl-2',merged)
        self.assertEqual(metrics['legacyIdsMapped'],1)
        self.assertEqual(metrics['legacyIdsUnmapped'],2)
        self.assertEqual(metrics['legacyAmbiguousIds'],1)
        self.assertEqual(len(merged['AL-ONE']),2)

if __name__=='__main__':
    unittest.main()
