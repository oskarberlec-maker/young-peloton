"""Bounded, polite fetching. Never retry or circumvent access denials."""
import ipaddress
import socket
import threading
import time
import urllib.error
import urllib.request
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit, urljoin
from core import canonical, transport_url

MAX_BYTES = 8 * 1024 * 1024
UA = 'YoungPelotonSourceMonitor/2.0 (+https://www.youngpeloton.eu/)'


class DeferredSource(ValueError):
    """A host has asked us to stop, or repeatedly denied access this run."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Fetcher:
    def __init__(self):
        self.lock = threading.Lock()
        self.host_locks = {}
        self.last = {}
        self.blocked = {}
        self.denials = {}
        self.cooldowns = {}
        self.requests = self.retries = 0
        self.opener = urllib.request.build_opener(NoRedirect())

    def safe(self, url):
        p = urlsplit(canonical(url))
        if p.port not in (None, 80, 443):
            raise ValueError('Non-public port')
        addresses = socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == 'https' else 80), type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
            raise ValueError('Non-public address')

    def get(self, url, previous):
        original_host = urlsplit(url).hostname
        original_resource = (urlsplit(url).path.rstrip('/'), urlsplit(url).query)
        for _ in range(5):
            host = urlsplit(url).hostname
            with self.lock:
                lock = self.host_locks.setdefault(host, threading.Lock())
            with lock:
                if host in self.blocked:
                    raise DeferredSource(self.blocked[host])
                if self.cooldowns.get(host, 0) > time.time():
                    self.blocked[host] = 'Server Retry-After pause is still active; host sources deferred'
                    raise DeferredSource(self.blocked[host])
                self.safe(url)
                for attempt in range(3):
                    time.sleep(max(0, 1.0 - (time.monotonic() - self.last.get(host, 0))))
                    headers = {'User-Agent': UA, 'Accept': 'text/html,application/json,application/pdf;q=0.8,*/*;q=0.5'}
                    if previous.get('etag'):
                        headers['If-None-Match'] = previous['etag']
                    if previous.get('lastModified'):
                        headers['If-Modified-Since'] = previous['lastModified']
                    retry_delay = 2 ** attempt
                    try:
                        with self.lock:
                            self.requests += 1
                        response = self.opener.open(urllib.request.Request(transport_url(url), headers=headers), timeout=25)
                        try:
                            body = response.read(MAX_BYTES + 1)
                            content_type = response.headers.get_content_type()
                            result = {'body': body, 'contentType': content_type, 'etag': response.headers.get('ETag'),
                                      'lastModified': response.headers.get('Last-Modified'), 'finalUrl': url,
                                      'redirectedHost': host != original_host or (urlsplit(url).path.rstrip('/'), urlsplit(url).query) != original_resource,
                                      'httpStatus': response.status}
                        finally:
                            response.close()
                        if len(body) > MAX_BYTES:
                            raise ValueError('Source exceeds 8 MiB limit; manual reader required')
                        self.denials[host] = 0
                        return result
                    except urllib.error.HTTPError as error:
                        if error.code == 304:
                            self.denials[host] = 0
                            return {'notModified': True, 'httpStatus': 304}
                        if error.code in (301, 302, 303, 307, 308):
                            url = canonical(urljoin(url, error.headers.get('Location', '')))
                            previous = {}  # Validators belong to the resource that issued them.
                            break
                        if error.code == 403:
                            self.denials[host] = self.denials.get(host, 0) + 1
                            if self.denials[host] >= 3:
                                self.blocked[host] = 'Repeated HTTP 403 access denials; remaining host sources deferred until the next run'
                            raise
                        if error.code == 429:
                            self.blocked[host] = 'HTTP 429 rate limit; remaining host sources deferred until the next run'
                            self.remember_cooldown(host, error.headers.get('Retry-After'))
                            raise
                        if error.code not in (408, 500, 502, 503, 504) or attempt == 2:
                            raise
                        retry_after = error.headers.get('Retry-After')
                        if retry_after:
                            # Never ignore a long/date-based Retry-After or occupy a worker indefinitely.
                            if not retry_after.isdigit() or int(retry_after) > 10:
                                self.blocked[host] = 'Server Retry-After requested a longer pause; remaining host sources deferred until the next run'
                                self.remember_cooldown(host, retry_after)
                                raise
                            retry_delay = max(retry_delay, int(retry_after))
                    except (urllib.error.URLError, TimeoutError, ConnectionError):
                        if attempt == 2:
                            raise
                    finally:
                        self.last[host] = time.monotonic()
                    with self.lock:
                        self.retries += 1
                    time.sleep(retry_delay)
        raise ValueError('Too many redirects')

    def remember_cooldown(self, host, value):
        if not value:
            return
        try:
            until = time.time() + min(int(value), 2147483647) if value.isdigit() else parsedate_to_datetime(value).timestamp()
            if until > time.time():
                self.cooldowns[host] = until
        except (ValueError, TypeError, OverflowError):
            pass
