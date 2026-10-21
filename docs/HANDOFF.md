# Handoff — The Glass Pavilion / Kaven & Rowe

## Workspace and objective

- **Workspace:** `/home/kali/gpt-workspace/cinematic-architecture-web`
- **Current rebrand branch:** `feat/kaven-rowe-brand-copy`
- **Featured property:** The Glass Pavilion
- **Concept brand:** Kaven & Rowe
- **Implementation:** Static HTML, CSS and JavaScript; no framework migration or npm dependency installation is needed.

The purpose of the rebrand is to make naming, metadata and property writing feel more deliberate and coherent while retaining the existing cinematic page experience.

## Active entry points

- `index.html` — runnable HTML, title/description metadata, brand marks, property copy and demo viewing form.
- `src/main.js` — Lenis, GSAP, ScrollTrigger and SplitType integration; bounded progressive hero-frame loading; static hero fallback; reduced-motion handling; demonstration-only form status.
- `src/style.css` — existing visual styling and responsive/fallback layouts.
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
