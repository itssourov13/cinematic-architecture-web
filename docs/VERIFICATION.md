# Verification Record — The Glass Pavilion / Kaven & Rowe

**Updated:** 2026-10-21
**Workspace:** `/home/kali/gpt-workspace/cinematic-architecture-web`
**Branch:** `feat/preload-boot`

## Latest verification result

All local checks passed after adding the isolated startup preload system.

| Check | Result | Evidence |
|---|---|---|
| `npm run check` | **18 passed, 0 failed** | JavaScript syntax, preload wiring/progress gate, images/fonts, animation-setting preservation, assets and recovered baseline hashes |
| `npm run check:deployment` | **Passed** | Clean static build and deployment-output smoke |
| `SITE_URL=http://127.0.0.1:4174 npm run browser:smoke` | **Passed** | Chromium desktop/mobile/reduced-motion, preload release, hero scrubbing, interior scroll and full-page lazy-image sweep |
| `SITE_URL=http://127.0.0.1:4174 npm run browser:fallback` | **Passed** | Missing-GSAP/ScrollTrigger fallback, poster drawing and all 11 deferred content images load |
| `git diff --check` | **Passed** | No whitespace errors |

## Deployment artifact

The build command is `npm run build` (`node scripts/build-static.mjs`). Vercel's root `vercel.json` pins Framework Preset to Other/no framework detection, Build Command to `npm run build`, and Output Directory to `dist`.

Latest clean artifact smoke results:

- Output: `dist/`
- Files: **334**
- Total size: **23,638,271 bytes** (~23.6 MB)
- HTML runtime references checked: **24**
- CSS/font stylesheets checked: **3**
- Collected JPEG images: **12**
- Hero WebP frames: **302**
- Repository-only entries explicitly checked as excluded: **10** (`docs`, `tests`, `scripts`, `recovered`, Git metadata, source-level baselines, package/config files and asset manifest)

The build copies only `index.html`, `public/`, `src/` and `vendor/`. CSS/font URL references and the local HTML runtime paths are verified before the smoke command passes. The generated `dist/` folder is Git-ignored and must not be committed.

## Built-output browser details

- Title and primary heading reflect **The Glass Pavilion / Kaven & Rowe**.
- Desktop viewport: 1440×1000; document width stayed 1440.
- Mobile viewport: 390×844; document width stayed 390.
- Startup overlay was removed on desktop and mobile after 13/13 startup tasks completed; the poster was decoded and the preload-ready signal fired.
- Normal animated mode scrolled through the page and loaded all 11 deferred content photos (11/11), with no broken or pending image.
- All observed local requests succeeded; no console error, uncaught exception or unexpected external runtime resource was reported.
- Self-hosted Cormorant Garamond and Jost loaded from `dist/vendor/`.
- Reduced motion was honoured; Lenis stayed inactive and the four interior panels became vertically readable.
- Fallback browser check intentionally blocked GSAP and ScrollTrigger; the static hero poster and all four readable interior panels remained available.
- The viewing form retains its demo-only message and does not send/persist form details.

## Preload scope and preservation checks

The startup gate loads the existing hero poster, the first ten existing WebP frames and two local font families. Progress 100% means the startup gate released; it does not mean the remaining 292 hero frames have downloaded. The 8-second timeout prevents an indefinitely blocked startup overlay, while the existing progressive bounded-cache loader continues for later frames. Below-the-fold photos use `loading="lazy"` and `decoding="async"`; Chromium normal-motion and static-fallback tests verified all 11 photos load during a full-page visit.

Static tests continue to pass for the 314-entry manifest, all 302 WebP frames, all 12 JPEG assets/dimensions, exact frame resolution, the frame-cache radius and SHA-256 hashes of the preserved recovered baselines. Preload work did not modify `src/style.css`, original image/frame assets or paths, vendor libraries, recovered baselines, the 302-frame sequence, canvas DPR cap, Lenis/GSAP animation settings or scroll animation timing. `src/main.js` only gained the startup-ready handoff, preloaded-poster reuse and progressive-cache handoff.

## Known boundaries

- **This preload branch has not been pushed or deployed.** The build artifact and browser behaviour were tested locally only. After the branch is pushed, verify the Vercel Preview Deployment and `https://kaven-itssourov13.vercel.app/` before promoting it.
- No database or environment variables are required by the current static page.
- The viewing form is a front-end demonstration; it does not submit or persist names/emails.
- The **Kaven & Rowe** name is a working concept identity and has not received formal trademark/legal clearance. See `BRAND-AND-COPY.md`.

## Recovered baseline hashes

The original recovered files remain preserved and their automated SHA-256 checks pass:

- `recovered/index.html`: `07227b7422598ee83c3c7db061aff5b1cb35bba681f77424776c3a893a3d7796`
- `recovered/main.js`: `d7fd794dd3c1eecdceb285cef99fa85d71f01e75debf444abdc91ca884571d39`
- `recovered/style.css`: `a327d9c8ec92b467d1cc4ac39235c5943632a3c7b4d1597f96a7bb254f9c08ee`
