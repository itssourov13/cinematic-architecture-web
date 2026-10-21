import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'dist');

if (outputDir === projectRoot || !outputDir.startsWith(projectRoot + sep)) {
  throw new Error('Refusing to clean a build directory outside the project root.');
}

const runtimeEntries = ['index.html', 'public', 'src', 'vendor'];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of runtimeEntries) {
  await cp(resolve(projectRoot, entry), resolve(outputDir, entry), {
    recursive: true,
    force: true,
  });
}

const outputStat = await stat(resolve(outputDir, 'index.html'));
if (!outputStat.isFile() || outputStat.size === 0) {
  throw new Error('Static build did not produce a valid dist/index.html.');
}

console.log('Static deployment output created at dist/.');
console.log('Included: index.html, public/, src/, vendor/.');
console.log('Excluded: repository metadata, docs, tests, scripts, recovered baselines and asset manifest.');
