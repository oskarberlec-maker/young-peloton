"""Build small ID lookup shards from the immutable archive and frozen workbook."""
import json
from pathlib import Path
import re
import sys
root=Path(__file__).resolve().parents[2]
folder=root/'public/data/2026'
m=json.loads((folder/'manifest.json').read_text())
entries=[(row[0],i) for i,part in enumerate(m['parts']) for row in json.loads((folder/part).read_text())]
encoded=re.search(r'const ENCODED_LEVELS = "([^"]+)"', (root/'src/lib/race-level-data.ts').read_text())[1]
levels=''.join(p[-1]*int(p[:-1],36) for p in encoded.split('.') if p)
assert len(entries)==len(levels)==13405
shards=[{} for _ in range(16)]
for (rid,part),level in zip(sorted(entries),levels):
    shards[sum(map(ord,rid))%16][rid]=[part,level]
for i,shard in enumerate(shards):
    dest=folder/f'lookup-{i}.json'
    content=json.dumps(shard,ensure_ascii=False,separators=(',',':'))+'\n'
    if '--check' in sys.argv:
        assert dest.read_text()==content, f'Stale index: {dest}'
    else: dest.write_text(content)
