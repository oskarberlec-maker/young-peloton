"""Bounded PDF text evidence for review; never an automatic date authority."""
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def pdf_evidence(body):
    if not body.startswith(b'%PDF-'):
        raise ValueError('Invalid PDF signature; manual review required')
    if not shutil.which('pdftotext') or not shutil.which('prlimit'):
        raise ValueError('PDF text extractor unavailable; manual review required')
    with tempfile.TemporaryDirectory(prefix='race-pdf-') as folder:
        source = Path(folder) / 'calendar.pdf'
        output = Path(folder) / 'calendar.txt'
        source.write_bytes(body)
        try:
            result = subprocess.run(['prlimit', '--as=268435456', '--cpu=10', '--fsize=2097152', '--', 'pdftotext', '-f', '1', '-l', '40', '-layout', '-nopgbrk',
                                     str(source), str(output)], stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, timeout=12, check=False)
        except subprocess.TimeoutExpired as error:
            raise ValueError('PDF extraction timeout; manual review required') from error
        if result.returncode or not output.exists() or output.stat().st_size > 2 * 1024 * 1024:
            raise ValueError('PDF extraction failed or too large; manual review required')
        text = output.read_text(errors='replace')
    lines = text.splitlines()
    # Include nearby category/name context, but never attach a date across rows.
    indices = [i for i, line in enumerate(lines) if re.search(r'(?<!\d)2027(?!\d)', line)]
    snippets = [' '.join(lines[max(0, i-1):i+2])[:700] for i in indices[:20]]
    return {'has2027': bool(indices), 'snippets': snippets, 'pagesLimitedTo': 40,
            'publication': 'manual-review-only'}
