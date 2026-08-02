#!/usr/bin/env python3
"""
Download verified product packshots listed in products_manifest.csv.

Run:
    python3 download_packshots.py

The script creates a folder named product_images next to this file.
"""
from pathlib import Path
import csv
import urllib.request
import time

BASE = Path(__file__).resolve().parent
CSV_PATH = BASE / "products_manifest.csv"
IMG_DIR = BASE / "product_images"
IMG_DIR.mkdir(exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 Chrome/125 Safari/537.36"
}

with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

success = 0
for index, row in enumerate(rows, start=1):
    url = row["image_url"]
    target = IMG_DIR / row["image_filename"]
    try:
        request = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(request, timeout=30) as response:
            target.write_bytes(response.read())
        print(f"[{index}/{len(rows)}] Downloaded: {target.name}")
        success += 1
    except Exception as exc:
        print(f"[{index}/{len(rows)}] FAILED: {target.name} — {exc}")
    time.sleep(0.4)

print(f"\nFinished: {success}/{len(rows)} images downloaded.")
print(f"Folder: {IMG_DIR}")
