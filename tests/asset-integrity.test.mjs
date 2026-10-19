import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('recovered baselines retain their original audited SHA-256 hashes', () => {
  const expected = {
    'recovered/index.html': '07227b7422598ee83c3c7db061aff5b1cb35bba681f77424776c3a893a3d7796',
    'recovered/main.js': 'd7fd794dd3c1eecdceb285cef99fa85d71f01e75debf444abdc91ca884571d39',
    'recovered/style.css': 'a327d9c8ec92b467d1cc4ac39235c5943632a3c7b4d1597f96a7bb254f9c08ee',
  };
  for (const [file, digest] of Object.entries(expected)) {
    const path = resolve(root, file);
    assert.ok(existsSync(path), `missing baseline ${file}`);
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), digest, `baseline changed: ${file}`);
  }
});

test('the asset manifest matches the complete 314-file collection', () => {
  const lines = read('asset-fetch-manifest.tsv').trim().split(/\r?\n/);
  assert.equal(lines[0], 'status\tpath\tbytes\tsha256\tcontent_type\terror');
  const rows = lines.slice(1);
  assert.equal(rows.length, 314, '12 stills + 302 animation frames');
  for (const row of rows) {
    const [status, path, bytesText, digest, type, error] = row.split('\t');
    assert.equal(status, 'OK', `asset fetch failed for ${path}: ${error}`);
    assert.match(type, /^image\//, `unexpected MIME type for ${path}`);
    const file = resolve(root, path);
    assert.ok(file.startsWith(root), `asset path escapes project: ${path}`);
    assert.ok(existsSync(file), `missing collected asset ${path}`);
    const data = readFileSync(file);
    assert.equal(data.length, Number(bytesText), `size mismatch: ${path}`);
    assert.equal(createHash('sha256').update(data).digest('hex'), digest, `hash mismatch: ${path}`);
  }
});
