# Verification Record — The Glass Pavilion / Kaven & Rowe

**Updated:** 2026-10-21
**Workspace:** `/home/kali/gpt-workspace/cinematic-architecture-web`
**Branch:** `feat/vercel-static-deployment`

## Latest verification result

All local checks passed after preparing the Vercel static deployment output.

| Check | Result | Evidence |
|---|---|---|
| `npm run check` | **14 passed, 0 failed** | JavaScript syntax, source paths, branding, Vercel configuration, asset integrity and recovered baseline hashes |
| `npm run check:deployment` | **Passed** | Clean build and deployment-output smoke |
| `SITE_URL=http://127.0.0.1:4174 npm run browser:smoke` | **Passed** | Chromium test against `dist/`: desktop, mobile, reduced motion, scrolling, fonts and form status |
| `SITE_URL=http://127.0.0.1:4174 npm run browser:fallback` | **Passed** | Built output still works when GSAP and ScrollTrigger are blocked |
| `git diff --check` | **Passed** | No whitespace errors |

## Deployment artifact

The build command is `npm run build` (`node scripts/build-static.mjs`). Vercel's root `vercel.json` pins Framework Preset to Other/no framework detection, Build Command to `npm run build`, and Output Directory to `dist`.

Latest clean artifact smoke results:

- Output: `dist/`
- Files: **332**
- Total size: **23,628,320 bytes** (~23.6 MB)
- HTML runtime references checked: **19**
- CSS/font stylesheets checked: **3**
- Collected JPEG images: **12**
- Hero WebP frames: **302**
- Repository-only entries explicitly checked as excluded: **10** (`docs`, `tests`, `scripts`, `recovered`, Git metadata, source-level baselines, package/config files and asset manifest)

The build copies only `index.html`, `public/`, `src/` and `vendor/`. CSS/font URL references and the local HTML runtime paths are verified before the smoke command passes. The generated `dist/` folder is Git-ignored and must not be committed.

## Built-output browser details

- Title and primary heading reflect **The Glass Pavilion / Kaven & Rowe**.
- Desktop viewport: 1440×1000; document width stayed 1440.
- Mobile viewport: 390×844; document width stayed 390.
- All observed content images loaded; no broken image, failed local request, console error, uncaught exception or unexpected external runtime resource was reported.
- Self-hosted Cormorant Garamond and Jost loaded from `dist/vendor/`.
- Reduced motion was honoured; Lenis stayed inactive and the four interior panels became vertically readable.
- Fallback browser check intentionally blocked GSAP and ScrollTrigger; the static hero poster and all four readable interior panels remained available.
- The viewing form retains its demo-only message and does not send/persist form details.

## Preservation checks

Static tests continue to pass for the 314-entry manifest, all 302 WebP frames, all 12 JPEG assets/dimensions, frame resolution and bounded-cache behaviour, and SHA-256 hashes of the preserved recovered baselines. Deployment prep did not modify the actual media files/paths, active CSS, animation source, or recovered original baselines.

## Known boundaries

- **A live Vercel deployment was not triggered or verified.** The build artifact and browser behaviour were tested locally only. A Preview Deployment is still required to validate Vercel's effective settings, deployed response headers, actual edge delivery and the target production domain.
- No database or environment variables are required by the current static page.
- The viewing form is a front-end demonstration; it does not submit or persist names/emails.
- The **Kaven & Rowe** name is a working concept identity and has not received formal trademark/legal clearance. See `BRAND-AND-COPY.md`.

## Recovered baseline hashes

The original recovered files remain preserved and their automated SHA-256 checks pass:

- `recovered/index.html`: `07227b7422598ee83c3c7db061aff5b1cb35bba681f77424776c3a893a3d7796`
- `recovered/main.js`: `d7fd794dd3c1eecdceb285cef99fa85d71f01e75debf444abdc91ca884571d39`
- `recovered/style.css`: `a327d9c8ec92b467d1cc4ac39235c5943632a3c7b4d1597f96a7bb254f9c08ee`
