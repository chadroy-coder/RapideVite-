#!/usr/bin/env python3
"""
Downloads real product packshots from the Open Food Facts public product database.

This does NOT generate images and does NOT crop shelf photos.

Run:
    python3 fetch_real_packshots.py

Outputs:
    product_images/
    matched_products.csv
    review_contact_sheet.html

Important:
    Every result must be visually reviewed before importing into RapideVite.
"""

from pathlib import Path
import csv
import json
import re
import time
import urllib.parse
import urllib.request
from difflib import SequenceMatcher

BASE = Path(__file__).resolve().parent
INPUT = BASE / "requested_products.csv"
IMAGE_DIR = BASE / "product_images"
RESULTS = BASE / "matched_products.csv"
HTML = BASE / "review_contact_sheet.html"
IMAGE_DIR.mkdir(exist_ok=True)

USER_AGENT = "RapideVite catalog builder - contact: admin@rapidevite.local"

def norm(value):
    value = (value or "").lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())

def safe_filename(value):
    value = norm(value).replace(" ", "_")
    return (value[:90] or "product") + ".jpg"

def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=40) as response:
        return json.loads(response.read().decode("utf-8"))

def download(url, target):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as response:
        target.write_bytes(response.read())

def similarity(a, b):
    return SequenceMatcher(None, norm(a), norm(b)).ratio()

def choose_best(row, candidates):
    requested = row["requested_name"]
    brand = row["brand"]
    preferred_size = norm(row["preferred_size"])

    best = None
    best_score = -1
    for p in candidates:
        name = p.get("product_name_en") or p.get("product_name") or ""
        brands = p.get("brands") or ""
        quantity = p.get("quantity") or ""
        image = p.get("image_front_url") or p.get("image_url") or ""
        if not name or not image:
            continue

        score = similarity(requested, name) * 70
        if norm(brand) and norm(brand) in norm(brands):
            score += 20
        else:
            score += similarity(brand, brands) * 10

        if preferred_size and preferred_size in norm(quantity):
            score += 10

        if p.get("countries_tags") and "en:united-states" in p.get("countries_tags", []):
            score += 2

        if score > best_score:
            best_score = score
            best = p

    return best, round(best_score, 1)

with INPUT.open(newline="", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

results = []
for i, row in enumerate(rows, 1):
    query = urllib.parse.quote(row["requested_name"])
    url = (
        "https://world.openfoodfacts.org/cgi/search.pl"
        f"?search_terms={query}&search_simple=1&action=process&json=1"
        "&page_size=25"
        "&fields=code,product_name,product_name_en,brands,quantity,"
        "image_front_url,image_url,countries_tags"
    )

    print(f"[{i}/{len(rows)}] Searching: {row['requested_name']}")
    try:
        data = get_json(url)
        best, score = choose_best(row, data.get("products", []))
        if not best:
            raise RuntimeError("No product with a usable front image found")

        found_name = best.get("product_name_en") or best.get("product_name") or ""
        image_url = best.get("image_front_url") or best.get("image_url") or ""
        filename = safe_filename(row["requested_name"])
        target = IMAGE_DIR / filename
        download(image_url, target)

        status = "REVIEW"
        if score >= 86:
            status = "HIGH"
        elif score < 68:
            status = "LOW"

        results.append({
            **row,
            "matched_name": found_name,
            "matched_brand": best.get("brands", ""),
            "matched_size": best.get("quantity", ""),
            "barcode": best.get("code", ""),
            "image_filename": filename,
            "image_url": image_url,
            "match_score": score,
            "confidence": status,
            "approved": "",
        })
        print(f"    Downloaded: {filename} ({status}, score {score})")
    except Exception as exc:
        results.append({
            **row,
            "matched_name": "",
            "matched_brand": "",
            "matched_size": "",
            "barcode": "",
            "image_filename": "",
            "image_url": "",
            "match_score": "",
            "confidence": "FAILED",
            "approved": "",
        })
        print(f"    FAILED: {exc}")

    time.sleep(0.7)

fields = [
    "requested_name", "brand", "category", "preferred_size",
    "matched_name", "matched_brand", "matched_size", "barcode",
    "image_filename", "image_url", "match_score", "confidence", "approved"
]
with RESULTS.open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(results)

cards = []
for r in results:
    if r["image_filename"]:
        img = f"product_images/{r['image_filename']}"
        cards.append(f"""
        <article class="card">
          <img src="{img}" alt="">
          <h3>{r['requested_name']}</h3>
          <p>Matched: {r['matched_name']}</p>
          <p>Brand: {r['matched_brand']}</p>
          <p>Size: {r['matched_size']}</p>
          <strong>{r['confidence']} — score {r['match_score']}</strong>
        </article>
        """)

HTML.write_text("""<!doctype html>
<html><head><meta charset="utf-8"><title>RapideVite Packshot Review</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;background:#f5f5f5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:14px}
.card img{width:100%;height:210px;object-fit:contain;background:#fff}
h3{font-size:16px;margin:10px 0}p{font-size:13px;margin:5px 0;color:#444}
</style></head><body>
<h1>RapideVite — real packshot review</h1>
<p>Open matched_products.csv and mark approved=yes only after checking the image and exact package.</p>
<div class="grid">""" + "\n".join(cards) + "</div></body></html>", encoding="utf-8")

ok = sum(1 for r in results if r["image_filename"])
print(f"\nCompleted: {ok}/{len(results)} images downloaded.")
print(f"Review: {HTML}")
print(f"Manifest: {RESULTS}")
