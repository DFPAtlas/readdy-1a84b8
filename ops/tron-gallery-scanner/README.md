# Vowora gallery scanner (runs on Tron)

Checks guest photos uploaded to Vowora for nudity/explicit content, on Tron's own
hardware. Tron only makes **outgoing** HTTPS requests to Vowora, so no port or
tunnel needs opening.

```
guest uploads photo ─► Vowora queues it (approval queue)
Tron worker ──claim──► gallery-scan-worker ─► photos + 10-minute download links
Tron worker ──result─► gallery-scan-worker ─► record_gallery_scan() applies the couple's rules
```

- **clean** → stays awaiting review, or is approved automatically if the couple turned
  manual approval off (never for photos sent through the shared QR link).
- **flagged** → held for the couple with the reason shown.
- **error** → retried up to 3 times, then left for manual review.
- Worker stopped or Tron offline → photos wait in the queue. Nothing is ever approved
  because a check didn't run.

Photos are only held in memory while being checked; nothing is written to disk.

## Install

1. Copy this folder to Tron, e.g. `/opt/vowora-gallery-scanner`.
2. `cp .env.example .env` and set `GALLERY_SCAN_WORKER_SECRET` to the same value as the
   Supabase Edge Function secret of that name (Supabase → Edge Functions → Secrets).
3. `docker compose up -d --build`
4. `docker compose logs -f` should show `Connected: N photos waiting`.

The model (Falconsai/nsfw_image_detection, a small ViT, Apache-2.0) downloads on first
start and is cached in a Docker volume. It runs comfortably on CPU; set `DEVICE=cuda`
only if you add GPU access to the container.

## Settings (.env)

| Name | Default | Meaning |
| --- | --- | --- |
| `THRESHOLD` | `0.80` | NSFW score at or above which a photo is flagged. Lower = stricter. |
| `POLL_SECONDS` | `30` | Wait between checks when the queue is empty. |
| `BATCH` | `10` | Photos claimed per request (max 25). |
| `MODEL` | Falconsai/nsfw_image_detection | Any image classifier with an `nsfw` class. The worker refuses to start otherwise. |

## Monitoring from n8n (optional)

A Tron watchdog can POST `{"action":"health"}` to `VOWORA_WORKER_URL` with header
`x-worker-secret`. The response is `{"ok":true,"waiting":N}`. Alert if `waiting` stays high,
because that means the worker is down.

## Limits

This model detects nudity and explicit content only. It does not detect violence, gore,
hate symbols or text. Those still rely on the couple's review, and on guests reporting
photos if reporting is switched on.

## Rotating the secret

Set a new value in Supabase Edge Function secrets and in `.env`, then run
`docker compose up -d`. Until both match, the worker logs "Vowora unreachable" and photos
wait safely.

## Tests

`python3 -m unittest test_worker`
