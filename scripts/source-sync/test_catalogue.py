import unittest
from catalogue import source_catalogue

class SourceCatalogueTest(unittest.TestCase):
    def test_existing_archive_sources_are_indexed(self):
        records=source_catalogue()
        print('Archived source catalogue:',len(records),'race IDs,',sum(map(len,records.values())),'links')
        self.assertGreater(len(records),1000,'Expected at least 1000 race IDs in the generated source catalogue')
        self.assertTrue(all(isinstance(key,str) and all(url.startswith(('https://','http://')) for url in urls) for key,urls in records.items()))

if __name__=='__main__':
    unittest.main()
