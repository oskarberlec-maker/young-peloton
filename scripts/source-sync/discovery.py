"""Follow explicit next-edition links on known race pages, never guess URLs."""
import re
from urllib.parse import urljoin, urlsplit
from core import canonical, normalized


def edition_links(page, race, source_url):
    name = normalized(race['name'])
    known_heading = any(normalized(heading) == name for heading in page.headings)
    origin = urlsplit(source_url)
    found = []
    for href, text in page.links:
        try:
            url = canonical(urljoin(source_url, href))
        except (ValueError, TypeError):
            continue
        parsed = urlsplit(url)
        if (parsed.scheme, parsed.netloc) != (origin.scheme, origin.netloc) or url == canonical(source_url):
            continue
        if not re.search(r'(?<!\d)2027(?!\d)', parsed.path + '?' + parsed.query):
            continue
        if re.search(r'\.(pdf|zip|jpg|png|ics)$', parsed.path, re.I):
            continue
        anchor = normalized(text)
        if not known_heading and not (name and name in anchor and '2027' in anchor):
            continue
        if url not in found:
            found.append(url)
        if len(found) == 3:
            break
    return found
