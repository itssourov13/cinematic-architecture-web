# HANDOFF — T2 Glass Pavilion Reconstruction

## Project and objective

- **Workspace:** `/home/kali/web_atk/3D-web`
- **Target project:** `/home/kali/web_atk/3D-web/source-code/T2`
- **Live reference:** https://demos.davidsantos-ai.com/glass-pavilion/
- **Goal:** Reconstruct the live page as closely as practical while preserving the recovered content, photography, 302-frame hero sequence, typography, pinned hero, horizontal interior journey, parallax, counters, and responsive layout.

This is a static HTML/CSS/JavaScript project. No framework migration or npm dependency installation is needed to run it locally.

## Current implementation

- `index.html` — runnable page entry point, using local CSS, scripts, fonts, and media.
- `src/main.js` — Lenis/GSAP/ScrollTrigger/SplitType motion integration; progressive hero frame requests with a bounded image cache; static hero fallback if animation libraries are unavailable; reduced-motion handling; transparent demo-only viewing-form status.
- `src/style.css` — page styles, mobile overflow handling, and readable vertical interior layout for reduced-motion/fallback mode.
- `public/images/` — 12 collected JPEGs (11 property images plus the landscape background).
- `public/frames/` — 302 collected WebP frames.
- `vendor/` — locally served GSAP, ScrollTrigger, Lenis, SplitType, local Latin font files, and third-party notices/licenses.
- `recovered/` — preserved recovered copies of the original `index.html`, `main.js`, and `style.css`.
- Root-level `main.js` and `style.css` are retained as original baseline copies; the runnable motion code is `src/main.js`.
- `asset-fetch-manifest.tsv` — response status, collected file size, content type, and SHA-256 for every recovered media output.
- `docs/VERIFICATION.md` — verification summary and known deployment caveats.
- `vercel.json` — static deployment headers; parsed locally, not deployed/verified on Vercel.

## Run locally

Requires Node.js 20+; no `npm install` is required.

```sh
cd /home/kali/web_atk/3D-web/source-code/T2
npm run start
```

Open http://127.0.0.1:4173. To expose the server on a LAN, set `HOST=0.0.0.0 PORT=4173` only on a trusted network.

## Verification commands

Run unit/static checks:

```sh
npm run check
```

The last completed run reported **12 passing tests, 0 failures**. Tests include recovered baseline hashes, full asset manifest/file consistency, image and frame dimensions/signatures, local asset references, form copy, and bounded frame-cache invariants.

For real-browser verification, start the server in one terminal, then run these from another:

```sh
npm run browser:smoke
npm run browser:fallback
```

Chromium is required. The normal smoke test exercises desktop (1440×1000), mobile (390×844), hero frame scrubbing, horizontal interior movement on desktop/mobile, reduced-motion mode, form status behavior, local assets/fonts, runtime errors, and horizontal overflow. The fallback test deliberately blocks GSAP and ScrollTrigger and verifies the static hero poster and readable page still work.

Screenshots are written to the workspace-level `/home/kali/web_atk/3D-web/evidence/`:
- `T2_live_desktop.png` — live page hero capture
- `T2_browser_desktop.png` — local implementation desktop capture
- `T2_browser_mobile.png` — local implementation mobile capture
- `T2_browser_dependency_fallback.png` — local static fallback capture

The verification servers on ports 4173 and 4174 were stopped after the last completed checks.

## Asset collection caveat

All **314/314** manifest entries are successful and their on-disk size/hash matches the manifest. All 302 frame outputs are 1280×716. Eleven landscape stills are 1376×768; `av-09-staircase.jpg` is intentionally portrait at 768×1376.

The local-shell connection to the live origin had TLS timeouts, so images were collected via an image proxy at quality 85. The proxy **re-encodes** images: current hashes describe the collected outputs, not byte-for-byte hashes from the origin. Dimensions, filenames and paths were verified, and the local/live desktop hero visual spot-check was close. For stricter pixel fidelity, first try to obtain origin bytes from a direct browser/network capture or other approved source; do not assume proxy output is byte-identical.

## Important remaining work

1. **Viewing form integration:** The form is explicitly a demonstration. It does not submit or persist name/email data. Before using it for real enquiries, connect a secure backend or form provider, implement server-side validation, abuse protection, privacy/retention requirements, and success/error states. Do not replace the current honest demo message with a false booking confirmation.
2. **Deployment validation:** The static configuration is present and valid JSON, but no Vercel deployment or production domain has been tested. Deploy from this project root and verify asset paths, response headers, caching, and mobile behavior against the actual deployment.
3. **Final visual regression:** Current review spot-checked the hero. Before claiming exact parity, compare full-page section screenshots and scroll-transition states from live and local at matched desktop/mobile viewports; focus on hero scrub, each of the four interior panels, parallax, counters, reveal, and footer.
4. **Third-party terms:** Read `vendor/THIRD-PARTY-NOTICES.md` before redistribution/commercial use. In particular, review the applicable GSAP license terms rather than assuming every usage is covered by a permissive open-source license.
5. **Localization:** Self-hosted fonts are Latin subsets for the current English page. Add appropriate subsets if content expands to other writing systems.

## Recovery / collaboration rules

- Treat `recovered/` and the root-level baseline `main.js` / `style.css` as reference material; make implementation changes in `index.html`, `src/`, `public/`, and supporting project files.
- Keep changes targeted and fidelity-first; do not redesign the page unless explicitly requested.
- Re-run `npm run check`, `npm run browser:smoke`, and `npm run browser:fallback` after changing motion, media paths, layout, fallback logic, or form behavior.
- The target directory is not currently a Git repository, and no commit or deployment has been made during this work. Establish/version it in Git only if that is the intended next workflow.

## Last known verified state

- Static test suite: **12 passed, 0 failed**.
- Desktop/mobile/reduced-motion browser smoke: passed.
- Missing-motion-library fallback: passed.
- HTTP/security smoke: GET/HEAD, 404, POST rejection, path-traversal rejection, MIME and baseline security headers passed.
- Browser runtime: no uncaught exceptions, failed local asset requests, local HTTP errors, or external runtime resources in the normal run.
- Form check: demo status appears; no non-read/write request was made.
- Live Vercel production deployment: **not performed**.
