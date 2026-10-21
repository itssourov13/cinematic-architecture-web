# Verification Record — The Glass Pavilion / Kaven & Rowe

**Updated:** 2026-10-21
**Workspace:** `/home/kali/gpt-workspace/cinematic-architecture-web`
**Branch:** `feat/kaven-rowe-brand-copy`

## Latest result

All checks run after the brand and copy refresh passed.

| Check | Result | Evidence |
|---|---|---|
| `npm run check` | **13 passed, 0 failed** | JavaScript syntax, navigation, brand/copy contract, local references, asset integrity and recovered baseline hashes |
| `npm run browser:smoke` | **Passed** | Desktop 1440×1000, mobile 390×844, normal motion, reduced motion, form demo state and scroll interactions |
| `npm run browser:fallback` | **Passed** | GSAP and ScrollTrigger intentionally blocked; static poster and readable content retained |
| `git diff --check` | Passed | No whitespace errors (checked during final review) |

### Browser details

- The page title resolves to `The Glass Pavilion | Kaven & Rowe — Private Residences`; the primary heading remains **The Glass Pavilion**.
- Desktop and mobile document widths matched the viewport (1440/1440 and 390/390). The four-room horizontal sequence behaved as expected in the normal run; all four rooms became vertically readable in reduced-motion and fallback modes.
- All 11 content images observed by the browser loaded; no broken images, failed local requests, unexpected external runtime resources, JavaScript exceptions or console errors were reported.
- The self-hosted Cormorant Garamond and Jost font faces loaded.
- Reduced-motion preference was honoured and Lenis was inactive.
- The viewing form still displays its explicit demo-only message and does not send or persist form data.

## Preservation checks

The static suite passed the checks for the 314-entry asset manifest, all 302 WebP frames, all 12 JPEG files/dimensions, frame resolution, bounded frame-cache invariants, and the SHA-256 values of the preserved recovered baselines. The brand change did not alter media paths or files, the asset manifest, CSS, motion implementation or recovered baseline files.

Expected scope of the source change: `index.html`, `package.json`, `scripts/serve.mjs`, `tests/smoke.test.mjs`, `README.md`, `docs/HANDOFF.md`, this record and `docs/BRAND-AND-COPY.md`.

Browser smoke scripts wrote verification screenshots to `/home/kali/evidence/`; these are test artifacts outside the Git working tree, not changes to the project's media collection.

## Known boundaries

- No production deployment was attempted or verified in this run.
- The viewing form is a front-end demonstration; it does not submit or persist names/emails.
- The **Kaven & Rowe** name is a working concept identity. Public-web screening did not surface a clear same-name real-estate brand in the sampled results, but no formal company-registry or trademark clearance was performed. See `BRAND-AND-COPY.md`.
- These checks confirm behaviour and integrity; they do not constitute a fresh pixel-by-pixel comparison against the original live site.

## Recovered baseline hashes

The original recovered files remain preserved and their automated SHA-256 checks pass:

- `recovered/index.html`: `07227b7422598ee83c3c7db061aff5b1cb35bba681f77424776c3a893a3d7796`
- `recovered/main.js`: `d7fd794dd3c1eecdceb285cef99fa85d71f01e75debf444abdc91ca884571d39`
- `recovered/style.css`: `a327d9c8ec92b467d1cc4ac39235c5943632a3c7b4d1597f96a7bb254f9c08ee`
