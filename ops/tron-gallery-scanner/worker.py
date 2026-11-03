"""Vowora photo safety checks, run on Tron.

Polls Vowora's gallery-scan-worker Edge Function for guest photos waiting to be
checked, downloads each one through a short-lived link, classifies it locally
and posts the verdict back. Nothing is sent anywhere else, and photos are only
held in memory. If this worker stops, photos simply wait in the couple's
approval queue — nothing is ever approved because a check didn't run.
"""
import io
import json
import logging
import os
import sys
import time

import requests
from PIL import Image, ImageOps

URL = os.environ.get("VOWORA_WORKER_URL", "")
SECRET = os.environ.get("GALLERY_SCAN_WORKER_SECRET", "")
MODEL = os.environ.get("MODEL", "Falconsai/nsfw_image_detection")
THRESHOLD = float(os.environ.get("THRESHOLD", "0.80"))
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "30"))
BATCH = int(os.environ.get("BATCH", "10"))
DEVICE = os.environ.get("DEVICE", "cpu")  # "cpu" or "cuda"
MAX_BYTES = 30 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 100_000_000  # refuse decompression bombs

log = logging.getLogger("tron-gallery-scanner")


def decide(predictions, threshold=THRESHOLD):
    """Turns classifier output into a Vowora verdict."""
    scores = {str(p["label"]).lower(): float(p["score"]) for p in predictions}
    nsfw = scores.get("nsfw", 0.0)
    if nsfw >= threshold:
        return {
            "verdict": "flagged",
            "labels": ["nudity"],
            "score": round(nsfw, 4),
            "reason": f"Possible nudity or explicit content ({nsfw:.0%} confidence)",
        }
    return {"verdict": "clean", "labels": [], "score": round(nsfw, 4)}


def load_image(url):
    with requests.get(url, timeout=60, stream=True) as resp:
        resp.raise_for_status()
        data = bytearray()
        for chunk in resp.iter_content(1024 * 256):
            data.extend(chunk)
            if len(data) > MAX_BYTES:
                raise ValueError("photo too large")
    img = Image.open(io.BytesIO(bytes(data)))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((1024, 1024))
    return img


class Vowora:
    def __init__(self, url, secret):
        self.url = url
        self.session = requests.Session()
        self.session.headers.update({"x-worker-secret": secret, "content-type": "application/json"})

    def call(self, payload):
        resp = self.session.post(self.url, data=json.dumps(payload), timeout=30)
        resp.raise_for_status()
        return resp.json()


def run():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not URL or len(SECRET) < 32:
        log.error("Set VOWORA_WORKER_URL and GALLERY_SCAN_WORKER_SECRET (32+ characters) in .env")
        sys.exit(1)

    from transformers import pipeline  # imported here so tests don't need it

    classifier = pipeline("image-classification", model=MODEL, device=0 if DEVICE == "cuda" else -1)
    labels = {str(v).lower() for v in classifier.model.config.id2label.values()}
    if "nsfw" not in labels:
        # Without an "nsfw" class every photo would look clean, so refuse to run.
        log.error("Model %s has no 'nsfw' label (labels: %s); choose a compatible MODEL", MODEL, sorted(labels))
        sys.exit(1)
    api = Vowora(URL, SECRET)
    log.info("Connected: %s photos waiting. Model %s, threshold %.2f", api.call({"action": "health"})["waiting"], MODEL, THRESHOLD)

    backoff = POLL_SECONDS
    while True:
        try:
            items = api.call({"action": "claim", "limit": BATCH}).get("items", [])
            for item in items:
                try:
                    result = decide(classifier(load_image(item["url"])))
                except Exception as exc:  # unreadable photo, download failure, model error
                    log.warning("Could not check %s: %s", item["asset_id"], type(exc).__name__)
                    result = {"verdict": "error"}
                outcome = api.call({"action": "result", "asset_id": item["asset_id"], "model": MODEL, **result})
                log.info("%s -> %s (%s)", item["asset_id"], result["verdict"], outcome.get("status"))
            backoff = POLL_SECONDS
            if not items:
                time.sleep(POLL_SECONDS)
        except Exception as exc:
            log.warning("Vowora unreachable (%s); retrying in %ss", type(exc).__name__, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 600)


if __name__ == "__main__":
    run()
