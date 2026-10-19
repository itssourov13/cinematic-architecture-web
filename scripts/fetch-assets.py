#!/usr/bin/env python3
"""Collect Glass Pavilion media from the live asset paths via a high-quality image proxy.
The proxy re-encodes images; this script records collected bytes and SHA-256 hashes."""
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import time, sys, hashlib

ROOT = Path(__file__).resolve().parents[1]
HOST = "demos.davidsantos-ai.com"
BASE = "glass-pavilion"
IMAGE_NAMES = [
    "av-01-hero-exterior-dusk.jpg",
    "av-02-approach-gate.jpg",
    "av-03-entrance-door.jpg",
    "av-04-living-room.jpg",
    "av-05-kitchen.jpg",
    "av-06-master-suite.jpg",
    "av-07-view-reveal.jpg",
    "av-08-pool-dusk.jpg",
    "av-09-staircase.jpg",
    "av-10-material-macro.jpg",
    "av-11-lifestyle-couple.jpg",
    "av-bg-landscape.jpg",
]
ASSETS = [(f"public/images/{name}", f"{BASE}/public/images/{name}") for name in IMAGE_NAMES]
ASSETS += [
    (f"public/frames/frame{i:04d}.webp",
     f"{BASE}/public/frames/frame{i:04d}.webp?v=13")
    for i in range(1, 303)
]
PROXY = "https://images.weserv.nl/?url="
MANIFEST = ROOT / "asset-fetch-manifest.tsv"

def fetch(path, target, attempts=3):
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    source = HOST + "/" + target
    url = PROXY + quote(source, safe="") + "&q=85"
    last_error = "unknown"
    for n in range(attempts):
        try:
            req = Request(url, headers={
                "User-Agent": "T2-Glass-Pavilion-asset-recovery/1.0",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            })
            with urlopen(req, timeout=25) as response:
                data = response.read()
                content_type = response.headers.get("Content-Type", "").split(";")[0].lower()
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}")
                if not content_type.startswith("image/"):
                    raise RuntimeError(f"unexpected content-type {content_type!r}")
                if path.endswith(".jpg") and not data.startswith(b"\xff\xd8\xff"):
                    raise RuntimeError("invalid JPEG signature")
                if path.endswith(".webp") and not (data[:4] == b"RIFF" and data[8:12] == b"WEBP"):
                    raise RuntimeError("invalid WebP signature")
                out.write_bytes(data)
                return ("OK", len(data), hashlib.sha256(data).hexdigest(), content_type, "")
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            if n + 1 < attempts:
                time.sleep(1.5 * (n + 1))
    return ("FAIL", 0, "", "", last_error)

def main():
    print(f"Fetching {len(ASSETS)} assets from the live Glass Pavilion asset paths", flush=True)
    ok = fail = 0
    with MANIFEST.open("w", encoding="utf-8") as log:
        log.write("status\tpath\tbytes\tsha256\tcontent_type\terror\n")
        for index, (path, target) in enumerate(ASSETS, 1):
            status, size, digest, kind, error = fetch(path, target)
            log.write(f"{status}\t{path}\t{size}\t{digest}\t{kind}\t{error.replace(chr(9), ' ')}\n")
            log.flush()
            if status == "OK":
                ok += 1
                if path.startswith("public/images/"):
                    print(f"[{index}/{len(ASSETS)}] OK {path} ({size:,} bytes)", flush=True)
                elif index % 25 == 0 or index == len(ASSETS):
                    print(f"[{index}/{len(ASSETS)}] frames progress; last={path} ({size:,} bytes)", flush=True)
            else:
                fail += 1
                print(f"[{index}/{len(ASSETS)}] FAIL {path}: {error}", flush=True)
            time.sleep(0.18)
    print(f"ASSET_FETCH_SUMMARY ok={ok} failed={fail} manifest={MANIFEST}", flush=True)
    sys.exit(1 if fail else 0)

if __name__ == "__main__":
    main()
