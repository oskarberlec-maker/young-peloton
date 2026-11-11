"""Follow evidence-linked next-edition links on known race pages, never guess URLs."""
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
        if re.search(r'\.(pdf|zip|jpg|png|ics)$', parsed.path, re.I):
            continue
        anchor = normalized(text)
        year_link = bool(re.search(r'(?<!\d)2027(?!\d)', parsed.path + '?' + parsed.query + ' ' + anchor))
        exact_event_link = bool(name and (anchor == name or anchor == name + ' 2027'))
        # Discovery is only a lead. Destination readers must still verify dates
        # and identity. Generic navigation is never followed without season evidence.
        if not ((known_heading and year_link) or (exact_event_link and ('2027' in ' '.join(page.lines) or year_link))):
            continue
        if url not in found:
            found.append(url)
        if len(found) == 3:
            break
    return found
