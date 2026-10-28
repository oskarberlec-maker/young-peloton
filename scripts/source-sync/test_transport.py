import unittest
import urllib.request
from core import canonical, transport_url

class TransportTests(unittest.TestCase):
    def test_unicode_and_existing_escapes(self):
        url='https://lrf.lv/Upload/Cerību%20kauss.pdf?q=café&next=a%2Fb#section'
        encoded=transport_url(url)
        self.assertEqual(encoded,'https://lrf.lv/Upload/Ceri%CC%84bu%20kauss.pdf?q=caf%C3%A9&next=a%2Fb')
        self.assertEqual(transport_url(encoded),encoded)
        urllib.request.Request(encoded).selector.encode('ascii')
        self.assertIn('Cerību',canonical(url)) # Existing snapshot keys are preserved.
    def test_idn(self):
        self.assertEqual(transport_url('https://münchen.de/a'), 'https://xn--mnchen-3ya.de/a')
    def test_unsafe_urls_still_rejected(self):
        for url in ['file:///etc/passwd','https://user:pass@example.com/a']:
            with self.assertRaises(ValueError):transport_url(url)
