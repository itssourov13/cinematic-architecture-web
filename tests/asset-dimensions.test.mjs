import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function jpegDimensions(buffer) {
  let i = 2;
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xff) { i++; continue; }
    while (i < buffer.length && buffer[i] === 0xff) i++;
    if (i >= buffer.length) break;
    const marker = buffer[i++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(i);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return [buffer.readUInt16BE(i + 5), buffer.readUInt16BE(i + 3)];
    }
    i += segmentLength;
  }
  throw new Error('JPEG SOF dimensions not found');
}

function webpDimensions(buffer) {
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
  }
  if (chunk === 'VP8X') {
    return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1];
  }
  throw new Error(`Unsupported WebP encoding chunk ${chunk}`);
}

test('the original photography dimensions and portrait crop are preserved', () => {
  const names = [
    'av-01-hero-exterior-dusk.jpg', 'av-02-approach-gate.jpg',
    'av-03-entrance-door.jpg', 'av-04-living-room.jpg',
    'av-05-kitchen.jpg', 'av-06-master-suite.jpg',
    'av-07-view-reveal.jpg', 'av-08-pool-dusk.jpg',
    'av-09-staircase.jpg', 'av-10-material-macro.jpg',
    'av-11-lifestyle-couple.jpg', 'av-bg-landscape.jpg',
  ];
  for (const name of names) {
    const data = readFileSync(resolve(root, 'public/images', name));
    const expected = name === 'av-09-staircase.jpg' ? [768, 1376] : [1376, 768];
    assert.deepEqual(jpegDimensions(data), expected, `unexpected resolution for ${name}`);
  }
});

test('every hero animation frame retains its live 1280×716 canvas resolution', () => {
  for (let i = 1; i <= 302; i++) {
    const name = `frame${String(i).padStart(4, '0')}.webp`;
    const data = readFileSync(resolve(root, 'public/frames', name));
    assert.deepEqual(webpDimensions(data), [1280, 716], `unexpected resolution for ${name}`);
  }
});
