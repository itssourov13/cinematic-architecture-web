# T2 — Final Verification

Verified: 2026-10-19 (UTC)  
Project: `/home/kali/web_atk/3D-web/source-code/T2`

## Result

The recovered static site is runnable locally and the automated checks below pass. The recovered page and media are retained alongside a production-oriented static implementation. No deployment or commit was performed.

## Test results

- `npm run check`: **12 passed, 0 failed**.
- Desktop browser smoke at **1440 × 1000**: passed.
- Mobile browser smoke at **390 × 844**: passed.
- Reduced-motion run: passed; Lenis is inactive and the four-room interior sequence becomes a vertically readable layout.
- Dependency-fallback run: passed with GSAP and ScrollTrigger intentionally blocked; the static hero poster, all 11 content images, and readable room sequence remain available without JavaScript exceptions.
- HTTP/server checks: passed for page and asset GETs, HEAD, missing path, POST rejection, traversal rejection, MIME types, and baseline security headers.
- Runtime network check: **no external script/font/media requests** in the normal local browser run; no failed local assets, HTTP asset errors, console errors, or uncaught exceptions.
- Appointment-form check: the demo status is accessible and no non-read/write request is sent.

## Asset integrity

The refreshed collection contains **314/314 successful assets**: 12 original-named photographs/backgrounds plus 302 hero frames. The TSV manifest contains each collected output's size, MIME type and SHA-256; all manifest rows match the files on disk.

- All 302 frames are 1280 × 716.
- Eleven stills are 1376 × 768; the staircase image intentionally retains its portrait 768 × 1376 dimension.
- The asset re-fetch uses the image proxy at quality 85. The proxy re-encodes image data; therefore hashes represent the collected files and are **not** byte-for-byte origin hashes. Dimensions and asset naming/path references were verified, and a desktop live/local visual spot-check showed close visual matching.
- Live and local screenshots are stored in the parent workspace's `evidence/` directory (`T2_live_desktop.png`, `T2_browser_desktop.png`, `T2_browser_mobile.png`, `T2_browser_dependency_fallback.png`).

## Baseline preservation

Original recovered copies are retained in `recovered/` and their audited SHA-256 values pass:

- `recovered/index.html`: `07227b7422598ee83c3c7db061aff5b1cb35bba681f77424776c3a893a3d7796`
- `recovered/main.js`: `d7fd794dd3c1eecdceb285cef99fa85d71f01e75debf444abdc91ca884571d39`
- `recovered/style.css`: `a327d9c8ec92b467d1cc4ac39235c5943632a3c7b4d1597f96a7bb254f9c08ee`

## Deployment status and remaining functional integration

The project is packaged for a static deployment: local JavaScript libraries and Latin font files are vendored, `vercel.json` parses as valid JSON, and `npm run start` serves the site without dependency installation. The Vercel configuration was inspected locally, **not deployed to or verified on a live Vercel deployment**.

The appointment form deliberately remains a front-end demonstration: it does not send or persist names/emails. Connect a real, secure backend before using it for actual viewing requests. No build pipeline is required for the current static HTML/CSS/JS implementation.

The local verification servers were stopped after testing.
