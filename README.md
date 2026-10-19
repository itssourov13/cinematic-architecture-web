# The Glass Pavilion — reconstruction

A static, fidelity-first reconstruction of the recovered **Ashworth & Vane — The Glass Pavilion** page.

## Run locally

Requires Node.js 20+; no npm packages need to be installed.

```sh
npm run start
```

Open `http://127.0.0.1:4173`.

To expose it on the local network, run `HOST=0.0.0.0 PORT=4173 npm run start`. Only do this on a trusted network.

## Checks

```sh
npm run check
```

The tests verify local entry points, recovered baseline hashes, every collected-asset hash/size in the 314-entry manifest, all 302 WebP frames, the 12 JPEGs, vendored fonts, and JavaScript syntax. For real-browser checks, start the server in one terminal and run `npm run browser:smoke` and `npm run browser:fallback` in another; Chromium is required. These checks exercise desktop/mobile scrolling, reduced motion, the demo form, static-poster fallback with GSAP/ScrollTrigger unavailable, local asset loads, and horizontal overflow. Screenshots are saved under the workspace `evidence/` directory.

## Recovered vs. runnable files

- `index.html`, `src/main.js`, and `src/style.css` are the runnable entry points.
- `recovered/index.html`, `recovered/main.js`, and `recovered/style.css` preserve the original recovered baseline for forensic comparison. Root-level `main.js` and `style.css` are also left unchanged.
- `public/images/` and `public/frames/` contain media collected from the publicly served live asset paths.
- `asset-fetch-manifest.tsv` records every asset response, byte size, content type, and SHA-256 hash.
- `scripts/fetch-assets.py` re-fetches the live public assets via an image proxy at quality 85 to improve fidelity over the proxy default. The proxy re-encodes images, so recorded hashes are hashes of collected output—not byte-for-byte origin hashes.
- The live references were GSAP 3.12.5, ScrollTrigger 3.12.5, Lenis 1.1.13, SplitType 0.3.4, Cormorant Garamond, and Jost. These libraries and the Latin font subsets are now stored under `vendor/`, eliminating script/font CDN requests at runtime. Third-party notices and font licenses are in `vendor/THIRD-PARTY-NOTICES.md`.

See [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for the final test results, asset-integrity checks, live/local visual spot-check, and deployment caveats. The project handoff is in [`docs/HANDOFF.md`](docs/HANDOFF.md).

## License

The root [`LICENSE`](LICENSE) contains the MIT License for original project-authored implementation code and documentation only. Recovered website material, media, and third-party vendor assets are excluded from that grant and retain their applicable rights/licenses; see the scope note in `LICENSE` and `vendor/THIRD-PARTY-NOTICES.md`.

## Production notes

- The original English content, luxury-dark palette, layout sections, horizontal interior sequence, pinned hero, captions, parallax, counters, and footer were retained.
- Frame loading is progressive and bounded: nearby frames are requested as the scroll advances, and distant `Image` sources are released instead of retaining decoded buffers for the entire 302-frame sequence.
- A static hero poster is drawn if reduced motion is preferred or animation libraries fail to load.
- The appointment form is a visual demo and does **not** transmit or store names/emails. Connect a real backend before presenting it as a live lead-generation form.
- Deploy the project directory as a static site with `index.html` at the web root; retain the `src/` and `public/` paths.
