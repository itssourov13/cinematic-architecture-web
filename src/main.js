/* ============================================================
   ASHWORTH & VANE — Motion engine
   Lenis (smooth scroll) + GSAP ScrollTrigger + SplitType
   ============================================================ */

const prefersReducedMotion = window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionLibrariesReady = Boolean(window.gsap && window.ScrollTrigger && window.Lenis && window.SplitType);

if (motionLibrariesReady && !prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger);
}

/* ---- 1 · Smooth scroll (Lenis wired to GSAP ticker) ---- */
const lenis = motionLibrariesReady && !prefersReducedMotion
  ? new Lenis({ lerp: 0.085, smoothWheel: true })
  : null;
window.lenis = lenis; // exposed for debugging / programmatic scroll
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* In-page nav uses Lenis when motion libraries are available; otherwise native anchors work. */
if (lenis) {
  document.querySelectorAll('.topnav a').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id && id.startsWith('#')) {
        e.preventDefault();
        lenis.scrollTo(id, { offset: 0, duration: 1.4 });
      }
    });
  });
}

/* ---- 2 · HERO intro + parallax ---- */
window.addEventListener('load', () => {
  // Keep the page readable if animation libraries are unavailable or the visitor
  // has requested reduced motion. The static poster is drawn into the canvas.
  if (!motionLibrariesReady || prefersReducedMotion) {
    initHeroCanvas(true);
    document.documentElement.classList.add('reduced-motion');
    return;
  }

  // Hero title lines rise in
  gsap.set('.hero-title .line', { yPercent: 120 });
  gsap.to('.hero-title .line', {
    yPercent: 0, duration: 1.5, ease: 'power4.out', stagger: 0.12, delay: 0.2,
  });
  gsap.fromTo('.hero .reveal-up',
    { y: 28, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out', stagger: 0.15, delay: 0.6 }
  );

  // Hero scroll-scrub canvas (the cinematic fly-in)
  initHeroCanvas();

  buildScrollReveals();
});

/* ---- Hero canvas: scrub through the frame sequence on scroll ---- */
function initHeroCanvas(staticOnly = false) {
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas) return;
  // Opaque context (alpha:false) composites faster — the photo always fills the canvas.
  const ctx = canvas.getContext('2d', { alpha: false });
  const frameCount = 302;
  const urlFor = (i) => `public/frames/frame${String(i).padStart(4, '0')}.webp?v=13`;

  const drawCover = (image) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    const cw = canvas.width, ch = canvas.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const canvasRatio = cw / ch;
    let dw, dh, dx, dy;
    if (canvasRatio > imageRatio) {
      dw = cw; dh = cw / imageRatio; dx = 0; dy = (ch - dh) / 2;
    } else {
      dh = ch; dw = ch * imageRatio; dy = 0; dx = (cw - dw) / 2;
    }
    ctx.drawImage(image, dx, dy, dw, dh);
  };

  if (staticOnly) {
    const poster = new Image();
    poster.onload = () => drawCover(poster);
    poster.src = 'public/images/av-01-hero-exterior-dusk.jpg';
    window.addEventListener('resize', () => {
      if (poster.complete && poster.naturalWidth) drawCover(poster);
    });
    return;
  }

  // If embedded as a gallery thumbnail, draw only the hero poster instead of
  // loading the full frame sequence. The cinematic scrub runs when opened standalone.
  if (window.self !== window.top) {
    const poster = new Image();
    poster.onload = () => {
      const dprP = Math.min(window.devicePixelRatio || 1, 1.5);
      const draw = () => {
        canvas.width = Math.floor(canvas.clientWidth * dprP);
        canvas.height = Math.floor(canvas.clientHeight * dprP);
        const cw = canvas.width, ch = canvas.height;
        const ir = poster.naturalWidth / poster.naturalHeight, cr = cw / ch;
        let dw, dh, dx, dy;
        if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
        else { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
        ctx.drawImage(poster, dx, dy, dw, dh);
      };
      draw();
      window.addEventListener('resize', draw);
    };
    poster.src = 'public/images/av-01-hero-exterior-dusk.jpg';
    return;
  }

  const images = new Array(frameCount);
  const failedFrames = new Set();
  const state = { frame: 0 };
  const frameCacheRadius = 7;
  let lastRequestedIndex = 0;

  function requestFrame(index) {
    if (index < 0 || index >= frameCount || images[index] || failedFrames.has(index)) return;
    const img = new Image();
    images[index] = img;
    img.decoding = 'async';
    img.onload = () => {
      if (index === Math.round(state.frame)) render(true);
    };
    img.onerror = () => {
      failedFrames.add(index);
      images[index] = null;
    };
    img.src = urlFor(index + 1);
    if (typeof img.decode === 'function') {
      img.decode().then(() => {
        if (index === Math.round(state.frame)) render(true);
      }).catch(() => {});
    }
  }

  function warmFrameWindow() {
    const index = Math.max(0, Math.min(frameCount - 1, Math.round(state.frame)));
    const direction = index >= lastRequestedIndex ? 1 : -1;
    lastRequestedIndex = index;
    requestFrame(index);
    // Keep a small look-ahead/look-behind buffer without decoding all 302 frames.
    for (let step = 1; step <= 5; step++) requestFrame(index + step * direction);
    for (let step = 1; step <= 2; step++) requestFrame(index - step * direction);

    // Release distant Image objects so fast scrolling does not eventually retain
    // the decoded pixel buffers for the entire frame sequence in memory.
    const minCachedIndex = Math.max(0, index - frameCacheRadius);
    const maxCachedIndex = Math.min(frameCount - 1, index + frameCacheRadius);
    for (let i = 0; i < frameCount; i++) {
      const image = images[i];
      if (!image || (i >= minCachedIndex && i <= maxCachedIndex)) continue;
      images[i] = null;
      image.onload = null;
      image.onerror = null;
      image.removeAttribute('src');
    }
  }

  // The initial viewport only needs the first few frames.
  for (let i = 0; i < 10; i++) requestFrame(i);
  // Cap device-pixel-ratio for the canvas: the hero is a photo, so 1.5 is
  // visually indistinguishable from 2 but roughly halves the per-frame fill cost.
  // (Titles/captions are DOM text and stay crisp regardless.)
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let lastDrawn = -1;

  function resize() {
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    lastDrawn = -1;      // force one redraw at the new size
    render(true);
  }

  function render(force) {
    const idx = Math.max(0, Math.min(frameCount - 1, Math.round(state.frame)));
    warmFrameWindow();
    if (!force && idx === lastDrawn) return;   // skip redundant redraws
    let img = images[idx];
    // If the requested frame is still in flight, draw the nearest loaded frame
    // rather than exposing a black canvas during fast scrolling.
    if (!img || !img.complete || !img.naturalWidth) {
      img = null;
      for (let distance = 1; distance <= 5 && !img; distance++) {
        const before = images[idx - distance];
        const after = images[idx + distance];
        if (before && before.complete && before.naturalWidth) img = before;
        else if (after && after.complete && after.naturalWidth) img = after;
      }
    }
    if (!img || !img.complete || !img.naturalWidth) return;
    lastDrawn = idx;
    const cw = canvas.width, ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    else { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);        // opaque cover → no clearRect needed
  }

  resize();
  window.addEventListener('resize', resize);

  // Tie frame index to scroll progress across the tall hero, pinning the viewport
  gsap.to(state, {
    frame: frameCount - 1,
    ease: 'none',
    onUpdate: () => {
      warmFrameWindow();
      render(false);
    },
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
      pin: '.hero-pin',
      invalidateOnRefresh: true,
    },
  });

  // Scroll-synced narration: title → living-room caption → kitchen caption,
  // mapped across the same pinned hero scroll (timeline length ≈ 1 = full hero scroll).
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true },
  });
  heroTl
    .to('.hero-content', { opacity: 0, y: -40, duration: 0.06 }, 0.14)
    .fromTo('[data-cap="living"]', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.06 }, 0.42)
    .to('[data-cap="living"]', { opacity: 0, y: -32, duration: 0.06 }, 0.62)
    .fromTo('[data-cap="kitchen"]', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.06 }, 0.85)
    .to({}, { duration: 0.06 }, 0.97); // pad so timeline positions ≈ scroll fraction

  gsap.to('.scroll-cue', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '8% top', scrub: true },
  });
}

/* ---- 3 · Cinematic text reveals (SplitType) ---- */
// Rebuilt on resize so a wrong-width layout at load (preview glitch, orientation
// change, mobile URL-bar resize) can never permanently bake one-word-per-line breaks.
let splitInstances = [];
function buildSplits() {
  ScrollTrigger.getAll().forEach((st) => {
    if (st.trigger && st.trigger.classList && st.trigger.classList.contains('split-lines')) st.kill();
  });
  splitInstances.forEach((s) => s.revert());
  splitInstances = [];
  document.querySelectorAll('.split-lines').forEach((el) => {
    const split = new SplitType(el, { types: 'lines' });
    splitInstances.push(split);
    gsap.set(split.lines, { yPercent: 110, opacity: 0 });
    gsap.to(split.lines, {
      yPercent: 0, opacity: 1, duration: 1.1, ease: 'power4.out', stagger: 0.12,
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
  });
  ScrollTrigger.refresh();
}

function buildScrollReveals() {
  buildSplits();
  if (!window.__splitResizeBound) {
    window.__splitResizeBound = true;
    let splitRT;
    window.addEventListener('resize', () => { clearTimeout(splitRT); splitRT = setTimeout(buildSplits, 250); });
  }

  // Generic fade-ups (non-hero)
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(el, { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* ---- 4 · Parallax on background + framed images ---- */
  gsap.utils.toArray('[data-parallax] img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.utils.toArray('[data-parallax-img]').forEach((fig) => {
    const img = fig.tagName === 'IMG' ? fig : fig.querySelector('img');
    gsap.fromTo(img, { yPercent: -12 }, { yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---- 5 · ANATOMY — pinned horizontal journey ---- */
  const track = document.querySelector('.anatomy-track');
  if (track) {
    const rooms = gsap.utils.toArray('.room');
    const shift = () => -(track.scrollWidth - window.innerWidth);
    const horizontalTween = gsap.to(track, {
      x: shift, ease: 'none',
      scrollTrigger: {
        trigger: '.anatomy',
        start: 'top top',
        end: () => '+=' + (track.scrollWidth - window.innerWidth),
        pin: '.anatomy-pin',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    // subtle drift on each room image as it crosses the viewport
    rooms.forEach((room) => {
      gsap.fromTo(room.querySelector('.room-img img'), { scale: 1.16 }, { scale: 1.02, ease: 'none',
        scrollTrigger: { trigger: room, containerAnimation: horizontalTween, start: 'left right', end: 'right left', scrub: true } });
    });
  }

  /* ---- 6 · Spec numbers count up ---- */
  gsap.utils.toArray('.reveal-num').forEach((el) => {
    const raw = el.textContent.trim();
    const target = parseFloat(raw.replace(/,/g, ''));
    const hasComma = raw.includes(',');
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => {
        const val = Math.round(obj.v);
        el.textContent = hasComma ? val.toLocaleString('en-GB') : val;
      },
    });
  });

  ScrollTrigger.refresh();
}

/* The viewing form is intentionally demo-only until a backend is connected. */
const viewingForm = document.querySelector('.viewing-form');
if (viewingForm) {
  viewingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = viewingForm.querySelector('.form-done');
    if (status) status.classList.add('is-visible');
  });
}

/* Keep layout correct on resize only when ScrollTrigger loaded successfully. */
if (window.ScrollTrigger) {
  window.addEventListener('resize', () => ScrollTrigger.refresh());
}
