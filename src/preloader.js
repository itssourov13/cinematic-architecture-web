/* Critical startup assets only. The full 302-frame sequence remains progressive. */
(() => {
  'use strict';

  const FRAME_COUNT = 10;
  const STARTUP_TIMEOUT_MS = 8000;
  const MINIMUM_DISPLAY_MS = 420;
  const startedAt = performance.now();
  const frameUrl = (index) => `public/frames/frame${String(index + 1).padStart(4, '0')}.webp?v=13`;
  const posterUrl = 'public/images/av-01-hero-exterior-dusk.jpg';
  const totalTasks = 1 + FRAME_COUNT + 2;
  const loadedFrames = new Map();
  let posterImage = null;
  let completedTasks = 0;
  let released = false;

  const overlay = document.getElementById('kaven-preloader');
  const progressBar = document.getElementById('kaven-preloader__bar');
  const progressTrack = document.getElementById('kaven-preloader__track');
  const percentText = document.getElementById('kaven-preloader__percent');
  const message = document.getElementById('kaven-preloader__message');

  function setProgress(value) {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(percent));
  }

  function recordTask() {
    if (released) return;
    completedTasks = Math.min(totalTasks, completedTasks + 1);
    setProgress((completedTasks / totalTasks) * 100);
  }

  function preloadImage(url, priority = 'auto') {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      image.decoding = 'async';
      if ('fetchPriority' in image) image.fetchPriority = priority;

      const finish = async (success) => {
        if (settled) return;
        settled = true;
        if (success && typeof image.decode === 'function') {
          try {
            await image.decode();
          } catch {
            success = image.complete && image.naturalWidth > 0;
          }
        }
        resolve(success && image.naturalWidth > 0 ? image : null);
      };

      image.onload = () => { void finish(true); };
      image.onerror = () => { void finish(false); };
      image.src = url;
      if (image.complete) queueMicrotask(() => { void finish(image.naturalWidth > 0); });
    });
  }

  const posterTask = preloadImage(posterUrl, 'high').then((image) => {
    posterImage = image;
    recordTask();
    return image;
  });

  const frameTasks = Array.from({ length: FRAME_COUNT }, (_, index) =>
    preloadImage(frameUrl(index), index < 2 ? 'high' : 'auto').then((image) => {
      if (image) loadedFrames.set(index, image);
      recordTask();
      return image;
    })
  );

  function preloadFont(font) {
    if (!document.fonts || typeof document.fonts.load !== 'function') return Promise.resolve();
    return document.fonts.load(font).catch(() => []);
  }

  const fontTasks = [
    preloadFont('400 1em "Cormorant Garamond"'),
    preloadFont('400 1em Jost'),
  ].map((task) => task.then(() => { recordTask(); }));

  const essentialsReady = Promise.all([posterTask, ...frameTasks, ...fontTasks]);
  const domReady = document.readyState === 'loading'
    ? new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
    : Promise.resolve();

  window.KavenPreloader = Object.freeze({
    getPoster() {
      return posterImage && posterImage.complete && posterImage.naturalWidth > 0 ? posterImage : null;
    },
    getHeroFrame(index) {
      const image = loadedFrames.get(index);
      return image && image.complete && image.naturalWidth > 0 ? image : null;
    },
    getState() {
      return { completedTasks, totalTasks, released };
    },
  });

  function release(reason) {
    if (released) return;
    released = true;
    window.clearTimeout(timeoutId);
    if (reason === 'timeout') {
      if (message) message.textContent = 'Opening with available assets';
      // 100% means the startup gate resolved; optional/delayed frames continue loading in the background.
      setProgress(100);
    } else {
      setProgress(100);
      if (message) message.textContent = 'Opening experience';
    }

    if (overlay) {
      overlay.setAttribute('aria-label', 'Opening the Kaven & Rowe experience');
      overlay.classList.add('is-leaving');
      window.setTimeout(() => overlay.remove(), 420);
    }
    document.documentElement.classList.add('kaven-preload-ready');
    const notifyReady = () => {
      window.dispatchEvent(new CustomEvent('kaven:preload-ready', {
        detail: { reason, timedOut: reason === 'timeout' },
      }));
    };
    // If the safety timeout wins before parsing finishes, notify only after main.js has registered its listener.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', notifyReady, { once: true });
    } else {
      notifyReady();
    }
  }

  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve('timeout'), STARTUP_TIMEOUT_MS);
  });
  Promise.race([
    Promise.all([essentialsReady, domReady]).then(async () => {
      const remaining = MINIMUM_DISPLAY_MS - (performance.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      return 'ready';
    }),
    timeout,
  ]).then(release).catch(() => release('timeout'));
})();
