import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const profile = mkdtempSync(join(root, '.browser-fallback-profile-'));
const browser = spawn(process.env.CHROMIUM_BIN || 'chromium', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
let ws;

try {
  let port;
  const activePort = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      port = Number.parseInt(readFileSync(activePort, 'utf8').split(/\r?\n/)[0], 10);
      if (port) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
    if (browser.exitCode !== null) throw new Error('Chromium exited before DevTools became ready');
  }
  if (!port) throw new Error('Timed out waiting for Chromium DevTools port');
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  const target = targets.find((item) => item.type === 'page');
  if (!target?.webSocketDebuggerUrl) throw new Error('No DevTools page target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const listeners = new Map();
  const exceptions = [];
  let nextId = 0;
  ws.addEventListener('message', ({ data }) => {
    const packet = JSON.parse(data);
    if (packet.id && pending.has(packet.id)) {
      const waiter = pending.get(packet.id);
      pending.delete(packet.id);
      packet.error ? waiter.reject(new Error(packet.error.message)) : waiter.resolve(packet.result);
      return;
    }
    if (packet.method === 'Runtime.exceptionThrown') {
      exceptions.push(packet.params.exceptionDetails?.text || 'JavaScript exception');
    }
    for (const fn of listeners.get(packet.method) || []) fn(packet.params);
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const waitEvent = (method, timeout = 20000) => new Promise((resolve, reject) => {
    const fn = (data) => {
      clearTimeout(timer);
      listeners.set(method, (listeners.get(method) || []).filter((x) => x !== fn));
      resolve(data);
    };
    listeners.set(method, [...(listeners.get(method) || []), fn]);
    const timer = setTimeout(() => {
      listeners.set(method, (listeners.get(method) || []).filter((x) => x !== fn));
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeout);
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Network.setCacheDisabled', { cacheDisabled: true });
  await command('Network.setBlockedURLs', { urls: [`${siteUrl}/vendor/gsap.js`, `${siteUrl}/vendor/ScrollTrigger.js`] });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const loaded = waitEvent('Page.loadEventFired');
  await command('Page.navigate', { url: siteUrl });
  await loaded;
  await sleep(1800);
  const evaluated = await command('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('.hero-canvas');
      let pixel = null;
      try { pixel = [...canvas.getContext('2d').getImageData(Math.floor(canvas.width/2), Math.floor(canvas.height/2), 1, 1).data].slice(0,3); } catch {}
      const images = [...document.images];
      const track = document.querySelector('.anatomy-track');
      return {
        title: document.title,
        gsapPresent: Boolean(window.gsap),
        scrollTriggerPresent: Boolean(window.ScrollTrigger),
        lenisActive: Boolean(window.lenis),
        reducedModeClass: document.documentElement.classList.contains('reduced-motion'),
        posterVisible: canvas.width > 0 && canvas.height > 0 && pixel && pixel.some(v => v > 0),
        posterPixel: pixel,
        brokenImages: images.filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')),
        loadedImages: images.filter(i => i.complete && i.naturalWidth > 0).length,
        interiorTrackDisplay: getComputedStyle(track).display,
        roomDisplay: getComputedStyle(track.querySelector('.room')).display,
        roomCount: track.querySelectorAll('.room').length,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth
      };
    })()`,
    returnByValue: true,
  });
  const result = evaluated.result.value;
  const shot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  writeFileSync(resolve(root, '..', '..', 'evidence', 'T2_browser_dependency_fallback.png'), Buffer.from(shot.data, 'base64'));

  // In the static layout, emulate the visitor reaching each deferred image so lazy assets are tested end-to-end.
  const deferredImages = await command('Runtime.evaluate', {
    expression: `(async () => {
      const images = [...document.images];
      for (const image of images) {
        if (!image.complete || !image.naturalWidth) {
          const loaded = new Promise(resolve => {
            const settle = () => resolve();
            image.addEventListener('load', settle, { once: true });
            image.addEventListener('error', settle, { once: true });
          });
          image.scrollIntoView({ block: 'center', behavior: 'instant' });
          await Promise.race([loaded, new Promise(resolve => setTimeout(resolve, 2500))]);
        }
      }
      return {
        loadedImages: images.filter(image => image.complete && image.naturalWidth > 0).length,
        brokenImages: images.filter(image => image.complete && !image.naturalWidth).map(image => image.getAttribute('src'))
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  Object.assign(result, deferredImages.result.value);

  const failures = [];
  if (!result.title.includes('The Glass Pavilion')) failures.push('wrong page title');
  if (result.gsapPresent || result.scrollTriggerPresent) failures.push('blocked animation libraries unexpectedly loaded');
  if (result.lenisActive) failures.push('Lenis should not initialise without GSAP/ScrollTrigger');
  if (!result.reducedModeClass) failures.push('static fallback class was not enabled');
  if (!result.posterVisible) failures.push('static hero poster did not paint');
  if (result.brokenImages.length) failures.push(`broken content images: ${result.brokenImages.join(', ')}`);
  if (result.loadedImages !== 11) failures.push(`expected 11 loaded content images, found ${result.loadedImages}`);
  if (result.interiorTrackDisplay !== 'block' || result.roomDisplay !== 'flex' || result.roomCount !== 4) failures.push('static fallback interior layout is not readable');
  if (result.documentWidth > result.viewportWidth) failures.push('fallback layout overflows horizontally');
  if (exceptions.length) failures.push(`JavaScript exceptions: ${exceptions.join('; ')}`);
  console.log(JSON.stringify({ result, exceptions, intentionalBlockedScripts: ['vendor/gsap.js', 'vendor/ScrollTrigger.js'], browserWarnings: stderr.split(/\r?\n/).filter(line => /net::ERR_|Uncaught|JavaScript error/i.test(line)).slice(-10) }, null, 2));
  if (failures.length) {
    console.error('BROWSER_FALLBACK_FAILED', failures.join('; '));
    process.exitCode = 1;
  } else {
    console.log('BROWSER_FALLBACK_PASSED: static poster and readable page survive missing motion libraries.');
  }
  ws.close();
} finally {
  browser.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 250));
  rmSync(profile, { recursive: true, force: true });
}
