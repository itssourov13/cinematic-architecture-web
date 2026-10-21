# The Glass Pavilion — Kaven & Rowe

A cinematic, static architectural-property experience, refreshed with the **Kaven & Rowe** concept identity. **The Glass Pavilion** remains the featured residence. The original composition, photography, 302-frame hero sequence, visual styling and motion behaviour are intentionally preserved.

## Run locally

Requires Node.js 20 or newer. No package installation is needed for the static site.

```sh
npm run start
```

Open http://127.0.0.1:4173.

To expose the server on a local network, use `HOST=0.0.0.0 PORT=4173 npm run start` only on a trusted network.

## Verification

Static and asset-integrity checks:

```sh
npm run check
```

With Chromium available, start the server in one terminal and run these in another:

```sh
npm run browser:smoke
npm run browser:fallback
```

The browser tests cover desktop/mobile rendering, hero frame scrubbing, horizontal interior movement, reduced motion, the demo viewing form, local assets/fonts, runtime errors, horizontal overflow and the static poster fallback when GSAP/ScrollTrigger are unavailable. Browser scripts write screenshots to `/home/kali/evidence/`, outside the Git working tree.

## Project map

- `index.html` — live page, brand metadata, visible copy, and page structure.
- `src/main.js` — Lenis/GSAP/ScrollTrigger/SplitType motion integration, progressive hero-frame loading with a bounded cache, reduced-motion handling, static-poster fallback and demo-only form status.
- `src/style.css` — existing page styling, responsive layout and motion-fallback layout.
- `public/images/` — the 12 collected JPEG images/backgrounds.
- `public/frames/` — the 302 collected WebP hero frames.
- `asset-fetch-manifest.tsv` — file size, MIME type and SHA-256 manifest for collected media.
- `vendor/` — locally served animation libraries, font assets, notices and licenses; no runtime CDN dependency is required.
- `recovered/` — preserved recovered baseline files.
- Root-level `main.js` and `style.css` — original baseline copies; not the active motion/style entry points.
- `docs/BRAND-AND-COPY.md` — brand decision, copy principles and public-web naming-screen notes.
- `docs/HANDOFF.md` — current workspace, implementation boundaries and handoff instructions.
- `docs/VERIFICATION.md` — dated verification record and known limitations.

## Content and behaviour boundaries

- The updated writing keeps the existing property name, room sequence, measurements and stated property facts intact; no new price, dimensions, services or real-world business contact details have been invented.
- The viewing form is a **demonstration only**. It does not send or persist names/emails, and its confirmation text explicitly says no appointment was requested.
- Branding/copy work does not require changing media, asset paths, CSS/layout, animation logic or recovered baselines.
- The original concept/build attribution remains visible in the footer.

## Media and recovery safeguards

The manifest tracks 314 collected outputs: 12 photographs/backgrounds and 302 hero frames. Proxy-collected images were re-encoded at quality 85; manifest hashes describe the collected local outputs, not byte-for-byte origin downloads. Treat `recovered/`, root-level baseline copies and the asset manifest as reference material—do not rewrite them during brand/content updates.

## License

The root `LICENSE` applies only to original project-authored code and documentation within its stated scope. Recovered website material, media and third-party assets are excluded and remain subject to their respective rights and licenses. Read `vendor/THIRD-PARTY-NOTICES.md` before redistribution or commercial use.
