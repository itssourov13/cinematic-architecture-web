import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const chromium = process.env.CHROMIUM_BIN || 'chromium';
const profile = mkdtempSync(join(root, '.browser-smoke-profile-'));
const browser = spawn(chromium, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let stderr = '';
browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
let ws;
try {
  const activePort = join(profile, 'DevToolsActivePort');
  let port;
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
  if (!target?.webSocketDebuggerUrl) throw new Error('Could not locate Chromium page target');
  ws = new WebSocket(target.webSocketDebuggerUrl);

  const pending = new Map();
  const events = new Map();
  const requestUrls = new Map();
  const observed = { exceptions: [], consoleErrors: [], failedRequests: [], badLocalResponses: [], nonReadRequests: [] };
  let nextId = 0;
  ws.addEventListener('message', (message) => {
    const packet = JSON.parse(message.data);
    if (packet.id && pending.has(packet.id)) {
      const handler = pending.get(packet.id);
      pending.delete(packet.id);
      if (packet.error) handler.reject(new Error(packet.error.message));
      else handler.resolve(packet.result);
      return;
    }
    if (packet.method === 'Runtime.exceptionThrown') {
      observed.exceptions.push(packet.params.exceptionDetails?.text || 'JavaScript exception');
    }
    if (packet.method === 'Runtime.consoleAPICalled' && packet.params.type === 'error') {
      observed.consoleErrors.push(packet.params.args?.map((a) => a.value || a.description || '').join(' ').slice(0, 400));
    }
    if (packet.method === 'Network.requestWillBeSent') {
      requestUrls.set(packet.params.requestId, packet.params.request.url);
      if (!['GET', 'HEAD'].includes(packet.params.request.method)) {
        observed.nonReadRequests.push({ method: packet.params.request.method, url: packet.params.request.url });
      }
    }
    if (packet.method === 'Network.loadingFailed') {
      const url = requestUrls.get(packet.params.requestId) || '';
      // Frame-cache eviction deliberately cancels obsolete in-flight image requests.
      if (url.startsWith(siteUrl) && !url.endsWith('/favicon.ico') && packet.params.errorText !== 'net::ERR_ABORTED') {
        observed.failedRequests.push({ url, error: packet.params.errorText });
      }
    }
    if (packet.method === 'Network.responseReceived') {
      const { response } = packet.params;
      if (response.url.startsWith(siteUrl) && response.status >= 400 && !response.url.endsWith('/favicon.ico')) {
        observed.badLocalResponses.push({ url: response.url, status: response.status });
      }
    }
    for (const listener of events.get(packet.method) || []) listener(packet.params);
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  function command(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  function waitEvent(method, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const list = events.get(method) || [];
      const callback = (data) => {
        clearTimeout(timer);
        const current = events.get(method) || [];
        events.set(method, current.filter((item) => item !== callback));
        resolve(data);
      };
      events.set(method, [...list, callback]);
      const timer = setTimeout(() => {
        events.set(method, (events.get(method) || []).filter((item) => item !== callback));
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
    });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  let loaded = waitEvent('Page.loadEventFired');
  await command('Page.navigate', { url: siteUrl });
  await loaded;
  await sleep(2500);

  async function collect(label) {
    const evaluated = await command('Runtime.evaluate', {
      expression: `(async () => {
        await document.fonts.ready;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const rect = el => { const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)}; };
        const title = document.querySelector('.hero-title');
        const lines = [...document.querySelectorAll('.hero-title .line')];
        const brand = document.querySelector('.topbar .brand');
        const nav = document.querySelector('.topnav');
        const track = document.querySelector('.anatomy-track');
        const imgs = [...document.images];
        const canvas = document.querySelector('.hero-canvas');
        return {
          title: document.title,
          h1: title?.innerText?.replace(/\\n/g, ' ').trim(),
          viewport: {width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, visualWidth: visualViewport?.width, screenWidth: screen.width},
          overflowCandidates: [...document.body.querySelectorAll('*')].map(el => { const r=el.getBoundingClientRect(); let p=el.parentElement, clipped=false; while(p && p!==document.body){const cs=getComputedStyle(p); if(['hidden','clip','auto','scroll'].includes(cs.overflowX)){clipped=true;break;} p=p.parentElement;} return {node:el.tagName.toLowerCase(),id:el.id,classes:typeof el.className==='string'?el.className:'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),clipped}; }).filter(x=>x.right>document.documentElement.clientWidth+2 || x.left < -2).sort((a,b)=>b.right-a.right).slice(0,15),
          sections: [...document.querySelectorAll('main section, body > section')].map(el => ({id:el.id,height:Math.round(el.getBoundingClientRect().height)})),
          visibleSections: [...document.querySelectorAll('body > section')].map(el => el.id),
          images: {total:imgs.length, broken:imgs.filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src')), loaded:imgs.filter(i=>i.complete && i.naturalWidth>0).length},
          fonts: {
            cormorant:document.fonts.check('400 16px "Cormorant Garamond"'),
            jost:document.fonts.check('400 16px Jost'),
            loadedFaces:[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,weight:f.weight,style:f.style,status:f.status})),
            localFontResources:performance.getEntriesByType('resource').filter(r=>/\\.woff2(?:$|\\?)/.test(r.name)).map(r=>({url:r.name,size:r.transferSize,responseEnd:Math.round(r.responseEnd)}))
          },
          motion: {gsap:!!window.gsap, scrollTrigger:!!window.ScrollTrigger, lenis:!!window.lenis, splitType:!!window.SplitType, triggers:window.ScrollTrigger?.getAll().length ?? 0},
          frameAssetsRequested:performance.getEntriesByType('resource').filter(r=>/frame\\d{4}\\.webp/.test(r.name)).length,
          externalResources:performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name) && !r.name.startsWith(location.origin)).map(r=>r.name),
          canvas:canvas ? {width:canvas.width,height:canvas.height,rect:rect(canvas)} : null,
          brandRect:brand ? rect(brand) : null,
          navRect:nav ? rect(nav) : null,
          titleRect:title ? rect(title) : null,
          lineMetrics:lines.map(el=>({text:el.textContent,rect:rect(el),scrollHeight:el.scrollHeight,clientHeight:el.clientHeight})),
          interiorTrack:track ? {scrollWidth:track.scrollWidth,viewport:innerWidth,rooms:track.querySelectorAll('.room').length} : null,
          formMessage:document.querySelector('.form-done')?.innerText || '',
          startup: {
            overlayPresent:Boolean(document.getElementById('kaven-preloader')),
            readyClass:document.documentElement.classList.contains('kaven-preload-ready'),
            posterCached:Boolean(window.KavenPreloader?.getPoster()),
            state:window.KavenPreloader?.getState() ?? null
          }
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text);
    const metrics = evaluated.result.value;
    const shot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    writeFileSync(resolve(root, '..', '..', 'evidence', `T2_browser_${label}.png`), Buffer.from(shot.data, 'base64'));
    return metrics;
  }

  const desktop = await collect('desktop');
  const heroProgressResponse = await command('Runtime.evaluate', {
    expression: `(async () => {
      const target = document.getElementById('hero');
      if (window.lenis) window.lenis.stop();
      window.scrollTo({ top: target.offsetTop + target.clientHeight * 0.52, behavior: 'instant' });
      window.ScrollTrigger?.update(true);
      await new Promise(r => setTimeout(r, 1700));
      const canvas = document.querySelector('.hero-canvas');
      const rect = canvas.getBoundingClientRect();
      let pixels = null;
      try {
        const ctx = canvas.getContext('2d');
        const sample = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        pixels = [...sample].slice(0, 3);
      } catch {}
      return {
        scrollY: Math.round(scrollY),
        heroHeight: Math.round(target.clientHeight),
        requestedFrameCount: performance.getEntriesByType('resource').filter(r => /frame\\d{4}\\.webp/.test(r.name)).length,
        canvasPixelSample: pixels,
        canvasVisible: rect.width > 0 && rect.height > 0
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const heroProgress = heroProgressResponse.result.value;
  const scrollCheckResponse = await command('Runtime.evaluate', {
    expression: `(async () => {
      const target = document.getElementById('anatomy');
      if (window.lenis) window.lenis.stop();
      window.scrollTo({ top: target.offsetTop + innerHeight * 0.6, behavior: 'instant' });
      window.ScrollTrigger?.update(true);
      await new Promise(r => setTimeout(r, 600));
      const track = document.querySelector('.anatomy-track');
      const transform = getComputedStyle(track).transform;
      return { scrollY: Math.round(scrollY), sectionTop: Math.round(target.offsetTop), trackTransform: transform, firstRoomLeft: Math.round(track.querySelector('.room').getBoundingClientRect().left) };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const scrollCheck = scrollCheckResponse.result.value;
  const lazyAssetsResponse = await command('Runtime.evaluate', {
    expression: `(async () => {
      if (window.lenis) window.lenis.stop();
      const images = [...document.images];
      const step = Math.max(360, Math.floor(innerHeight * 0.65));
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      for (let top = 0; top <= maxScroll; top += step) {
        window.scrollTo({ top, behavior: 'instant' });
        window.ScrollTrigger?.update(true);
        await new Promise(resolve => setTimeout(resolve, 110));
      }
      window.scrollTo({ top: maxScroll, behavior: 'instant' });
      window.ScrollTrigger?.update(true);
      await new Promise(resolve => setTimeout(resolve, 1400));
      return {
        loaded: images.filter(image => image.complete && image.naturalWidth > 0).length,
        total: images.length,
        broken: images.filter(image => image.complete && !image.naturalWidth).map(image => image.getAttribute('src')),
        pending: images.filter(image => !image.complete).map(image => image.getAttribute('src'))
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const lazyAssets = lazyAssetsResponse.result.value;
  await command('Runtime.evaluate', { expression: 'window.scrollTo({ top: 0, behavior: "instant" })' });
  await sleep(300);
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Page.setDeviceOrientationOverride', { alpha: 0, beta: 0, gamma: 0 }).catch(() => {});
  loaded = waitEvent('Page.loadEventFired');
  await command('Page.reload', { ignoreCache: true });
  await loaded;
  await sleep(2500);
  const mobile = await collect('mobile');
  const mobileScrollResponse = await command('Runtime.evaluate', {
    expression: `(async () => {
      const target = document.getElementById('anatomy');
      window.scrollTo({ top: target.offsetTop + innerHeight * 0.55, behavior: 'instant' });
      window.ScrollTrigger?.update(true);
      await new Promise(r => setTimeout(r, 600));
      const track = document.querySelector('.anatomy-track');
      const result = { firstRoomLeft: Math.round(track.querySelector('.room').getBoundingClientRect().left), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
      window.scrollTo({ top: 0, behavior: 'instant' });
      return result;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const mobileScrollCheck = mobileScrollResponse.result.value;
  const formResponse = await command('Runtime.evaluate', {
    expression: `(() => {
      const form = document.querySelector('.viewing-form');
      const name = form.querySelector('[name="name"]');
      const email = form.querySelector('[name="email"]');
      name.value = 'Visual verification';
      email.value = 'visual-test@example.invalid';
      form.requestSubmit();
      const status = form.querySelector('.form-done');
      return { statusVisible: getComputedStyle(status).display !== 'none', message: status.textContent.trim(), formConnected: form.isConnected };
    })()`,
    returnByValue: true,
  });
  const formCheck = formResponse.result.value;

  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  loaded = waitEvent('Page.loadEventFired');
  await command('Page.reload', { ignoreCache: true });
  await loaded;
  await sleep(1200);
  const reduced = await collect('reduced');
  const reducedLayoutResponse = await command('Runtime.evaluate', {
    expression: `(() => {
      const track = document.querySelector('.anatomy-track');
      return {
        preferenceHonored: matchMedia('(prefers-reduced-motion: reduce)').matches,
        lenisActive: Boolean(window.lenis),
        trackDisplay: getComputedStyle(track).display,
        roomCount: track.querySelectorAll('.room').length,
        roomTops: [...track.querySelectorAll('.room')].map(el => Math.round(el.getBoundingClientRect().top + scrollY)),
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth
      };
    })()`,
    returnByValue: true,
  });
  const reducedLayout = reducedLayoutResponse.result.value;

  const result = { desktop, mobile, heroProgress, scrollCheck, lazyAssets, mobileScrollCheck, formCheck, reduced, reducedLayout, runtime: observed, browserWarnings: stderr.split(/\\r?\\n/).filter((line) => /net::ERR_|Uncaught|JavaScript error/i.test(line)).slice(-15) };
  console.log(JSON.stringify(result, null, 2));

  const failures = [];
  for (const [name, metrics] of [['desktop', desktop], ['mobile', mobile]]) {
    if (!metrics.title.includes('The Glass Pavilion')) failures.push(`${name}: wrong page title`);
    if (metrics.startup.overlayPresent) failures.push(`${name}: preload overlay remained after startup readiness`);
    if (!metrics.startup.readyClass) failures.push(`${name}: startup readiness signal was not dispatched`);
    if (!metrics.startup.posterCached) failures.push(`${name}: hero poster was not preloaded and decoded`);
    if (!metrics.motion.gsap || !metrics.motion.scrollTrigger || !metrics.motion.lenis || !metrics.motion.splitType) failures.push(`${name}: motion dependency missing`);
    if (!metrics.fonts.loadedFaces.some((font) => font.family.replace(/["\']/g, '') === 'Cormorant Garamond') ||
        !metrics.fonts.loadedFaces.some((font) => font.family.replace(/["\']/g, '') === 'Jost') ||
        metrics.fonts.localFontResources.length < 2) failures.push(`${name}: self-hosted font files did not load`);
    if (metrics.images.broken.length) failures.push(`${name}: broken images ${metrics.images.broken.join(', ')}`);
    if (metrics.externalResources.length) failures.push(`${name}: unexpected remote runtime resources ${metrics.externalResources.join(', ')}`);
    if (metrics.viewport.scrollWidth > metrics.viewport.clientWidth) failures.push(`${name}: document horizontal overflow`);
  }
  if (lazyAssets.loaded !== lazyAssets.total || lazyAssets.broken.length || lazyAssets.pending.length) failures.push(`normal-motion scroll sweep did not finish all deferred images: ${JSON.stringify(lazyAssets)}`);
  if (heroProgress.requestedFrameCount <= 10) failures.push('hero frame sequence did not request more frames as scroll progressed');
  if (!heroProgress.canvasVisible || !heroProgress.canvasPixelSample || heroProgress.canvasPixelSample.every((value) => value === 0)) failures.push('hero canvas did not render a visible image while scrubbing');
  if (Math.abs(scrollCheck.firstRoomLeft) < 100) failures.push('desktop interior journey did not move horizontally with scroll');
  if (Math.abs(mobileScrollCheck.firstRoomLeft) < 50) failures.push('mobile interior journey did not move horizontally with scroll');
  if (mobileScrollCheck.scrollWidth > mobileScrollCheck.clientWidth) failures.push('mobile interior journey caused document overflow');
  if (!formCheck.statusVisible || !formCheck.formConnected) failures.push('demo viewing form submit handler did not show its accessible status');
  if (!/details are not sent/i.test(formCheck.message)) failures.push('demo viewing form message is misleading');
  if (!reducedLayout.preferenceHonored) failures.push('reduced-motion media preference was not detected');
  if (reducedLayout.lenisActive) failures.push('Lenis remained active while reduced motion was requested');
  if (reducedLayout.trackDisplay !== 'block' || reducedLayout.roomCount !== 4) failures.push('reduced-motion interior journey is not a readable vertical layout');
  if (reducedLayout.roomTops.some((top, index, values) => index > 0 && top <= values[index - 1])) failures.push('reduced-motion room panels are not vertically ordered');
  if (reducedLayout.documentWidth > reducedLayout.viewportWidth) failures.push('reduced-motion layout overflows horizontally');
  if (observed.exceptions.length) failures.push('uncaught JavaScript exceptions observed');
  if (observed.nonReadRequests.length) failures.push(`unexpected non-read requests: ${JSON.stringify(observed.nonReadRequests)}`);
  if (observed.failedRequests.length) failures.push('local asset requests failed');
  if (observed.badLocalResponses.length) failures.push('local assets returned HTTP errors');
  if (failures.length) {
    console.error('BROWSER_SMOKE_FAILED', failures.join('; '));
    process.exitCode = 1;
  } else {
    console.log('BROWSER_SMOKE_PASSED desktop+mobile+reduced-motion; hero scrub, desktop/mobile interior scroll, demo form, local assets, and runtime libraries verified.');
  }

  await command('Page.close').catch(() => {});
  ws.close();
} finally {
  browser.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 250));
  rmSync(profile, { recursive: true, force: true });
}
