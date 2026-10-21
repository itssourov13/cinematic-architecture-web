# Handoff — The Glass Pavilion / Kaven & Rowe

## Workspace and objective

- **Workspace:** `/home/kali/gpt-workspace/cinematic-architecture-web`
- **Current implementation branch:** `feat/preload-boot`
- **Featured property:** The Glass Pavilion
- **Concept brand:** Kaven & Rowe
- **Implementation:** Static HTML, CSS and JavaScript; no framework migration or npm dependency installation is needed.

The purpose of the rebrand is to make naming, metadata and property writing feel more deliberate and coherent while retaining the existing cinematic page experience.

## Active entry points

- `index.html` — runnable HTML, title/description metadata, brand marks, property copy, demo viewing form and critical asset hints/startup overlay markup.
- `src/preloader.js` and `src/preloader.css` — isolated preloader: hero poster, first ten original frames and local fonts; progress gate, 8-second safety timeout and loader-only styles.
- `src/main.js` — Lenis, GSAP, ScrollTrigger and SplitType integration; bounded progressive hero-frame loading; static hero fallback; reduced-motion handling; demonstration-only form status. Motion timings/settings and frame canvas resolution are unchanged.
- `src/style.css` — existing visual styling and responsive/fallback layouts; unchanged by preload work.
- `public/images/` and `public/frames/` — collected photographic assets and 302-frame sequence.
- `vendor/` — self-hosted motion libraries, font files and third-party notices.
- `recovered/`, root-level `main.js`/`style.css` — reference baselines, not active entry points.
- `asset-fetch-manifest.tsv` — expected hashes, sizes and content types of the 314 collected media outputs.

## Brand and writing decisions

- **Kaven & Rowe** is used as the working concept identity; **The Glass Pavilion** remains the property name.
- Public-web searches found an existing Auren Properties site and a recent AUREN Estates concept-brand post, so Auren was not adopted. The checks for Kaven & Rowe did not surface a clear exact-name real-estate brand match in the sampled results. This is an initial naming screen, not trademark or legal clearance; see `BRAND-AND-COPY.md`.
- Copy uses restrained architectural language, specific material/space details and shorter sentence structures.
- Existing measurements and listed property facts were preserved.
- The viewing form remains demo-only and must not be described as sending a real enquiry or booking an appointment.

## Run and verify

Requires Node.js 20+; no `npm install` is required.

```sh
cd /home/kali/gpt-workspace/cinematic-architecture-web
npm run start
```

Open http://127.0.0.1:4173.

Static tests:

```sh
npm run check
```

Real-browser checks require Chromium and a running local server:

```sh
npm run browser:smoke
npm run browser:fallback
```

These cover desktop/mobile scroll behaviour, reduced motion, local assets/fonts, the form's honest demo state, runtime exceptions, horizontal overflow, and operation without GSAP/ScrollTrigger. Review `docs/VERIFICATION.md` for the latest dated results; do not reuse old test counts as new results without rerunning the checks.

## Startup preload scope

The preloader's progress covers only the startup gate: one hero poster, ten already-existing sequence frames and two locally served font families. The page may open before optional later frames finish downloading; 100% is not a claim that all 302 frames are cached. On an 8-second timeout it releases the overlay and the original progressive frame loader continues. The 302 frame assets, their resolution, `src/style.css`, the canvas DPR cap, animation sequence and scroll timings are not modified by this change. The normal and dependency-fallback browser checks also verify that all 11 content photos load as the visitor reaches them.

## Vercel static deployment

- `vercel.json` pins Vercel to the framework-free static configuration, `npm run build` and output directory `dist`.
- `scripts/build-static.mjs` creates a clean output containing only `index.html`, `public/`, `src/` and `vendor/`.
- `scripts/deployment-smoke.mjs` checks runtime references, local CSS/font paths, all 12 JPEGs, all 302 hero frames and exclusion of repository-only files.
- `dist/` is generated and ignored by Git; do not commit it.
- Run `npm run check` and `npm run check:deployment` before deployment.
- Preview the exact production artifact with `npm run build` followed by `SERVE_DIST=1 PORT=4174 npm run start`; run browser checks against that server using `SITE_URL=http://127.0.0.1:4174`.
- No environment variables or database are required by the current static page. Preview deployment is not the same as verifying the production domain.

## Change boundaries

Do not alter these during brand/copy work:

- `public/images/**`, `public/frames/**`
- `asset-fetch-manifest.tsv`
- `recovered/**`
- root-level baseline `main.js` and `style.css`
- active CSS/layout rules and motion/animation implementation

Keep updates focused on brand/copy, HTML metadata, relevant project metadata, tests for the updated content contract, and documentation. After any future changes touching motion, layout, fallback logic or media references, rerun all checks above.

## Media caveat and licensing

All 314 manifest entries represent re-fetched outputs, with matching on-disk size/hash expected by the integrity tests. The image proxy re-encodes content at quality 85, so the collected hashes are not original-origin byte hashes. The root `LICENSE` does not grant rights to recovered website content/media or third-party vendor assets. Review `vendor/THIRD-PARTY-NOTICES.md` and each applicable license before redistribution/commercial use.
