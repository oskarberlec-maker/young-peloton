import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

// Keep positional archive schemas intact while withholding result URLs.
// Run after source-link generation so builds cannot re-publish mixed archives.
export async function removePublishedResults(root = 'public/data/2026') {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const column = manifest.fields.indexOf('resultUrl');
  if (column >= 0) {
    for (const part of manifest.parts) {
      const file = path.join(root, part);
      const rows = JSON.parse(await readFile(file, 'utf8'));
      for (const row of rows) row[column] = '';
      await writeFile(file, JSON.stringify(rows));
    }
  }
  for (const name of await readdir(root)) {
    if (/^source-links-\d+\.json$/.test(name))
      await writeFile(path.join(root, name), '{}');
  }
}
if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href)
  await removePublishedResults();
