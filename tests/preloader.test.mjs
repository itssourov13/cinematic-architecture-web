import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('startup preloader is wired to existing local assets only', () => {
  const html = read('index.html');
  assert.match(html, /rel="preload" as="image" href="public\/images\/av-01-hero-exterior-dusk\.jpg" fetchpriority="high"/);
  assert.match(html, /rel="preload" as="font" href="vendor\/fonts\/cormorant-garamond-roman\.woff2"/);
  assert.match(html, /rel="preload" as="font" href="vendor\/fonts\/jost-latin\.woff2"/);
  assert.match(html, /href="src\/preloader\.css\?v=1"/);
  assert.match(html, /src="src\/preloader\.js\?v=1"/);
  assert.match(html, /role="progressbar"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"/);
  assert.match(html, /src="src\/main\.js\?v=16"/);
  assert.doesNotMatch(html, /preloader[^\n]*(?:https?:\/\/|fonts\.googleapis)/i);
});

test('all existing content images are deferred without changing their sources or alt text', () => {
  const html = read('index.html');
  const imageTags = [...html.matchAll(/<img[^>]+>/g)].map((match) => match[0]);
  assert.equal(imageTags.length, 11, 'preserve the 11 existing content images');
  for (const tag of imageTags) {
    assert.match(tag, /loading="lazy"/);
    assert.match(tag, /decoding="async"/);
  }
  assert.match(html, /public\/images\/av-02-approach-gate\.jpg/);
  assert.match(html, /public\/images\/av-11-lifestyle-couple\.jpg/);
});

test('startup readiness loads only the poster, first ten original frames and two local fonts', () => {
  const source = read('src/preloader.js');
  execFileSync(process.execPath, ['--check', resolve(root, 'src/preloader.js')], { stdio: 'pipe' });
  assert.match(source, /const FRAME_COUNT = 10/);
  assert.match(source, /const STARTUP_TIMEOUT_MS = 8000/);
  assert.match(source, /const MINIMUM_DISPLAY_MS = 420/);
  assert.match(source, /frame\$\{String\(index \+ 1\)\.padStart\(4, '0'\)\}\.webp\?v=13/);
  assert.ok(source.includes('Cormorant Garamond'));
  assert.ok(source.includes("preloadFont('400 1em Jost')"));
  assert.match(source, /getHeroFrame\(index\)/);
  assert.match(source, /getPoster\(\)/);
  assert.match(source, /window\.dispatchEvent\(new CustomEvent\('kaven:preload-ready'/);
  assert.match(source, /Promise\.race\(\[/);
  assert.match(source, /reason === 'timeout'/);
  assert.doesNotMatch(source, /frame000\d.*fetch\(/);
});

test('preloader coordinates startup only; established hero motion settings remain intact', () => {
  const js = read('src/main.js');
  const css = read('src/style.css');
  assert.match(js, /window\.addEventListener\('kaven:preload-ready'/);
  assert.match(js, /const frameCount = 302/);
  assert.match(js, /const frameCacheRadius = 7/);
  assert.match(js, /new Lenis\(\{ lerp: 0\.085, smoothWheel: true \}\)/);
  assert.match(js, /scrub: 0\.4/);
  assert.match(js, /frame: frameCount - 1/);
  assert.match(js, /Math\.min\(window\.devicePixelRatio \|\| 1, 1\.5\)/);
  assert.match(css, /\.hero \{ height: 360vh; position: relative; \}/);
  assert.match(css, /\.hero-pin \{ position: relative; height: 100vh; min-height: 640px; overflow: hidden; \}/);
});
