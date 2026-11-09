import unittest
from catalogue import source_catalogue, excel_result_sources, combined_source_catalogue

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

if __name__=='__main__':
    unittest.main()
