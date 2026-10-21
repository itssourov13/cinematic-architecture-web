import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('canonical HTML, stylesheet and motion script exist', () => {
  for (const file of ['index.html', 'src/style.css', 'src/main.js', 'vendor/gsap.js', 'vendor/ScrollTrigger.js', 'vendor/lenis.js', 'vendor/split-type.js', 'vendor/lenis-css.css', 'vendor/fonts.css', 'vendor/fonts/cormorant-garamond-italic-300.woff2', 'vendor/fonts/cormorant-garamond-roman.woff2', 'vendor/fonts/jost-latin.woff2']) {
    assert.ok(existsSync(resolve(root, file)), `missing ${file}`);
    assert.ok(statSync(resolve(root, file)).size > 0, `empty ${file}`);
  }
});

test('in-page navigation points to existing sections', () => {
  const html = read('index.html');
  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
  const anchors = [...html.matchAll(/href=["']#([^"']+)["']/g)].map((m) => m[1]);
  assert.ok(anchors.length >= 4, 'expected original navigation anchors');
  assert.deepEqual(anchors.filter((id) => !ids.has(id)), []);
});

test('Kaven & Rowe brand and copy metadata are coherent', () => {
  const html = read('index.html');
  const pkg = JSON.parse(read('package.json'));
  assert.ok(html.includes('<title>The Glass Pavilion | Kaven &amp; Rowe — Private Residences</title>'));
  assert.ok(html.includes('demonstration-only viewing form.'));
  assert.equal(html.split('KAVEN <span>&amp;</span> ROWE').length - 1, 2);
  assert.equal(html.includes('ASHWORTH'), false);
  assert.ok(html.includes('A contemporary residence shaped by light, landscape'));
  assert.ok(html.includes('Your details are not sent and no appointment has been requested'));
  assert.equal(pkg.name, 'kaven-rowe-glass-pavilion');
  assert.match(pkg.description, /Kaven & Rowe/);
});

test('Vercel is configured to deploy the explicit static build output', () => {
  const config = JSON.parse(read('vercel.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(config.framework, null);
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.ok(config.headers.some((rule) =>
    rule.source === '/(.*)' && rule.headers.some((header) =>
      header.key === 'X-Content-Type-Options' && header.value === 'nosniff')));
  assert.ok(config.headers.some((rule) =>
    rule.source === '/src/(.*)' && rule.headers.some((header) =>
      header.key === 'Cache-Control' && header.value.includes('must-revalidate'))));
  assert.equal(pkg.scripts.build, 'node scripts/build-static.mjs');
  assert.equal(pkg.scripts['check:deployment'], 'npm run build && node scripts/deployment-smoke.mjs');
  assert.ok(read('.gitignore').includes('dist/'));
  assert.ok(existsSync(resolve(root, 'scripts/build-static.mjs')));
  assert.ok(existsSync(resolve(root, 'scripts/deployment-smoke.mjs')));
});

test('referenced local media paths resolve from their correct base directories', () => {
  const html = read('index.html');
  const css = read('src/style.css');
  const htmlRefs = [...html.matchAll(/(?:src|poster)=["']([^"']+)["']/g)].map((m) => m[1]);
  const cssRefs = [...css.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map((m) => m[1]);
  const refs = [
    ...htmlRefs.map((ref) => [ref, root]),
    ...cssRefs.map((ref) => [ref, resolve(root, 'src')]),
  ];
  for (const [ref, base] of refs) {
    if (/^(?:https?:)?\/\//i.test(ref) || ref.startsWith('data:')) continue;
    const path = ref.split('?')[0];
    const absolute = resolve(base, path.startsWith('/') ? path.slice(1) : path);
    assert.ok(absolute.startsWith(root), `path escapes project: ${ref}`);
    assert.ok(existsSync(absolute), `missing local asset: ${ref}`);
  }
  assert.ok(existsSync(resolve(root, 'src/style.css')));
  assert.ok(existsSync(resolve(root, 'src/main.js')));
});

test('all 302 hero frames are present with WebP container signatures', () => {
  const js = read('src/main.js');
  assert.match(js, /frameCount\s*=\s*302/, 'preserve the source 302-frame sequence');
  for (let i = 1; i <= 302; i++) {
    const name = `public/frames/frame${String(i).padStart(4, '0')}.webp`;
    const file = resolve(root, name);
    assert.ok(existsSync(file), `missing ${name}`);
    const bytes = readFileSync(file);
    assert.ok(bytes.length > 16, `empty/truncated ${name}`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `invalid RIFF signature: ${name}`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `invalid WebP signature: ${name}`);
  }
});

test('all twelve original photography asset names exist as valid JPEGs', () => {
  const names = [
    'av-01-hero-exterior-dusk.jpg', 'av-02-approach-gate.jpg',
    'av-03-entrance-door.jpg', 'av-04-living-room.jpg',
    'av-05-kitchen.jpg', 'av-06-master-suite.jpg',
    'av-07-view-reveal.jpg', 'av-08-pool-dusk.jpg',
    'av-09-staircase.jpg', 'av-10-material-macro.jpg',
    'av-11-lifestyle-couple.jpg', 'av-bg-landscape.jpg',
  ];
  for (const name of names) {
    const file = resolve(root, 'public/images', name);
    assert.ok(existsSync(file), `missing ${name}`);
    assert.ok(readFileSync(file).subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), `invalid JPEG: ${name}`);
  }
});

test('JavaScript syntax is valid and the demo form does not falsely claim submission', () => {
  execFileSync(process.execPath, ['--check', resolve(root, 'src/main.js')], { stdio: 'pipe' });
  const html = read('index.html');
  assert.match(html, /type="email"[^>]*required/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /details are not sent/i);
});

test('the page uses local JavaScript, CSS and font assets without runtime CDN dependencies', () => {
  const html = read('index.html');
  assert.match(html, /href="src\/style\.css/);
  assert.match(html, /href="vendor\/fonts\.css/);
  assert.match(html, /src="src\/main\.js/);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  const fontCss = read('vendor/fonts.css');
  for (const url of fontCss.matchAll(/url\(['"]?([^)'"]+)['"]?\)/g)) {
    const file = resolve(root, 'vendor', url[1]);
    assert.ok(file.startsWith(resolve(root, 'vendor')), 'font path escapes vendor folder');
    assert.ok(existsSync(file), `missing font file ${url[1]}`);
  }
});
