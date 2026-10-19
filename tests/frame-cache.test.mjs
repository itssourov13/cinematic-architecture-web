import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/main.js'), 'utf8');

test('hero frame loading uses a bounded cache and releases distant image sources', () => {
  assert.match(source, /const frameCacheRadius\s*=\s*7/);
  assert.match(source, /const minCachedIndex\s*=\s*Math\.max\(0, index - frameCacheRadius\)/);
  assert.match(source, /const maxCachedIndex\s*=\s*Math\.min\(frameCount - 1, index \+ frameCacheRadius\)/);
  assert.match(source, /image\.removeAttribute\('src'\)/);
  assert.match(source, /img\.decoding\s*=\s*'async'/);
});
