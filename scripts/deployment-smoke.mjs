import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'dist');
const exists = (path) => existsSync(resolve(outputDir, path));
const read = (path) => readFileSync(resolve(outputDir, path), 'utf8');

assert.ok(exists('index.html'), 'dist/index.html must exist');
assert.ok(exists('src/main.js'), 'active motion entry point must be deployed');
assert.ok(exists('src/style.css'), 'active stylesheet must be deployed');

const html = read('index.html');
assert.ok(html.includes('<title>The Glass Pavilion | Kaven &amp; Rowe — Private Residences</title>'));
assert.match(html, /src="src\/main\.js(?:\?[^"]*)?"/);
assert.match(html, /href="src\/style\.css(?:\?[^"]*)?"/);

const htmlRefs = [...html.matchAll(/(?:src|href|poster)=(["'])([^"']+)\1/g)]
  .map((match) => match[2])
  .filter((value) => !/^(?:https?:)?\/\//i.test(value) && !value.startsWith('#') && !value.startsWith('data:'));
for (const ref of htmlRefs) {
  const path = ref.split('?')[0];
  if (!path || path.startsWith('mailto:') || path.startsWith('tel:')) continue;
  assert.ok(exists(path), 'HTML runtime reference missing from dist: ' + ref);
}

const cssFiles = ['src/style.css', 'vendor/fonts.css', 'vendor/lenis-css.css'];
for (const cssPath of cssFiles) {
  assert.ok(exists(cssPath), 'missing deployed CSS: ' + cssPath);
  const css = read(cssPath);
  for (const match of css.matchAll(/url\((["']?)([^)"']+)\1\)/g)) {
    const raw = match[2].trim();
    if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith('data:')) continue;
    const path = raw.split('?')[0];
    const absolute = resolve(outputDir, dirname(cssPath), path);
    const relativePath = relative(outputDir, absolute);
    assert.ok(relativePath !== '..' && !relativePath.startsWith('..' + sep) && !relativePath.startsWith(sep),
      'CSS reference escapes dist: ' + cssPath + ' -> ' + raw);
    assert.ok(existsSync(absolute), 'CSS reference missing from dist: ' + cssPath + ' -> ' + raw);
  }
}

const imagesDir = resolve(outputDir, 'public/images');
const framesDir = resolve(outputDir, 'public/frames');
assert.equal(readdirSync(imagesDir).filter((file) => /\.jpe?g$/i.test(file)).length, 12,
  'deployment should contain all 12 collected JPEG assets');
assert.equal(readdirSync(framesDir).filter((file) => /^frame\d{4}\.webp$/.test(file)).length, 302,
  'deployment should contain all 302 hero frames');
for (const asset of ['vendor/gsap.js', 'vendor/ScrollTrigger.js', 'vendor/lenis.js',
  'vendor/split-type.js', 'vendor/fonts/cormorant-garamond-roman.woff2',
  'vendor/fonts/cormorant-garamond-italic-300.woff2', 'vendor/fonts/jost-latin.woff2']) {
  assert.ok(exists(asset), 'required deployed runtime asset missing: ' + asset);
}

const forbidden = ['.git', 'docs', 'tests', 'scripts', 'recovered', 'asset-fetch-manifest.tsv',
  'main.js', 'style.css', 'package.json', 'vercel.json'];
for (const entry of forbidden) {
  assert.equal(exists(entry), false, 'development/reference file must not ship: ' + entry);
}

let fileCount = 0;
let totalBytes = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path);
    else {
      fileCount++;
      totalBytes += info.size;
    }
  }
}
walk(outputDir);

console.log('DEPLOYMENT_SMOKE_PASSED');
console.log(JSON.stringify({
  outputDirectory: relative(projectRoot, outputDir),
  fileCount,
  totalBytes,
  htmlRuntimeReferences: htmlRefs.length,
  cssFilesChecked: cssFiles.length,
  jpegAssets: 12,
  heroFrames: 302,
  forbiddenRepositoryFiles: forbidden.length
}, null, 2));
