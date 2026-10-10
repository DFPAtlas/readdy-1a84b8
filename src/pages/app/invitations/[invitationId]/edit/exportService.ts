import { toBlob } from 'html-to-image';
import { supabase } from '@/lib/supabase';

// ── Constants ──

const EXPORT_BG = '#faf7f2';
const IMAGE_LOAD_TIMEOUT_MS = 10000;
const FONT_LOAD_TIMEOUT_MS = 5000;
const THUMBNAIL_BUCKET = 'invitation-thumbnails';
const THUMBNAIL_TARGET = 280;

// ── Types ──

export type ExportErrorCode =
  | 'save_failed'
  | 'missing_asset'
  | 'image_load_failed'
  | 'font_timeout'
  | 'render_failed'
  | 'download_failed'
  | 'thumbnail_failed';

export interface ExportResult {
  success: boolean;
  error?: string;
  errorCode?: ExportErrorCode;
}

export interface ThumbnailResult {
  success: boolean;
  error?: string;
}

// ── Filename sanitization ──

export function sanitizeFilename(title: string): string {
  const normalized = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized
    .replace(/[^a-zA-Z0-9\s-.]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80)
    .trim()
    .replace(/^-+|-+$/g, '');

  if (!cleaned || cleaned === '') return 'vowora-invitation';
  return cleaned;
}

// ── Wait for all images in a container to load ──

export async function waitForImages(
  container: HTMLElement,
  timeoutMs: number = IMAGE_LOAD_TIMEOUT_MS,
): Promise<{ ready: boolean; failedAssets: string[] }> {
  const images = container.querySelectorAll('img');
  if (images.length === 0) return { ready: true, failedAssets: [] };

  const failedAssets: string[] = [];

  const promises = Array.from(images).map(
    (img) =>
      new Promise<void>((resolve) => {
        // Already loaded
        if (img.complete && img.naturalWidth > 0) {
          resolve();
          return;
        }

        const onDone = () => {
          img.removeEventListener('load', onDone);
          img.removeEventListener('error', onDone);
          if (img.naturalWidth === 0) {
            const src = img.getAttribute('src') || 'unknown';
            failedAssets.push(src.length > 60 ? src.slice(0, 57) + '...' : src);
          }
          resolve();
        };

        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);
      }),
  );

  // Race against timeout
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      // Mark any still-loading images as failed
      for (const img of images) {
        if (!img.complete || img.naturalWidth === 0) {
          const src = img.getAttribute('src') || 'unknown';
          failedAssets.push(src.length > 60 ? src.slice(0, 57) + '...' : src);
        }
      }
      resolve();
    }, timeoutMs);
  });

  await Promise.race([Promise.all(promises), timeout]);

  return { ready: failedAssets.length === 0, failedAssets };
}

// ── Wait for fonts ──

export async function waitForFonts(timeoutMs: number = FONT_LOAD_TIMEOUT_MS): Promise<boolean> {
  if (!document.fonts) return true;
  // Wait for document.fonts.ready
  try {
    await document.fonts.ready;
  } catch {
    // Some browsers don't support fonts.ready
  }

  // Verify common fonts are loaded
  const requiredFonts = ['Georgia', 'Inter', 'Cormorant Garamond'];
  const missing: string[] = [];

  for (const font of requiredFonts) {
    if (!document.fonts.check(`12px "${font}"`)) {
      missing.push(font);
    }
  }

  if (missing.length > 0) {
    // Wait a bit longer — fonts may still be loading
    await new Promise((resolve) => setTimeout(resolve, 300));
    const stillMissing = missing.filter((f) => !document.fonts.check(`12px "${f}"`));

    if (stillMissing.length < missing.length) {
      // Some loaded in the extra wait — consider it ready
      return true;
    }

    // If only Inter is missing (it may be the variable version), still proceed
    if (stillMissing.every((f) => f === 'Inter')) {
      return true;
    }

    return stillMissing.length === 0;
  }

  return true;
}

// ── Set crossOrigin on images for CORS safety ──

export function prepareImagesForExport(container: HTMLElement): void {
  const images = container.querySelectorAll('img');
  for (const img of images) {
    if (img.src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
  }
}

// ── Capture a DOM element as a PNG Blob ──

export async function capturePng(element: HTMLElement): Promise<Blob | null> {
  try {
    const blob = await toBlob(element, {
      backgroundColor: EXPORT_BG,
      pixelRatio: 1, // We already set the element size to the export dimensions
      cacheBust: false,
      skipFonts: false,
    });

    return blob;
  } catch (err) {
    console.error('html-to-image capture failed:', err);
    return null;
  }
}

// ── Validate a PNG Blob ──

export function validatePngBlob(
  blob: Blob,
  expectedWidth: number,
  expectedHeight: number,
): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (blob.type !== 'image/png') {
      resolve({ valid: false, error: `Expected image/png, got ${blob.type}` });
      return;
    }

    if (blob.size === 0) {
      resolve({ valid: false, error: 'Generated PNG is empty' });
      return;
    }

    // Verify dimensions by decoding
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth !== expectedWidth || img.naturalHeight !== expectedHeight) {
        resolve({
          valid: false,
          error: `Expected ${expectedWidth}×${expectedHeight}, got ${img.naturalWidth}×${img.naturalHeight}`,
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Failed to decode generated PNG' });
    };

    img.src = url;
  });
}

// ── Download a Blob as a file ──

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Delayed cleanup — give the browser time to start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ── Generate a thumbnail PNG from a high-res PNG Blob ──

export async function generateThumbnail(
  highResBlob: Blob,
  canvasWidth: number,
  canvasHeight: number,
  targetSize: number = THUMBNAIL_TARGET,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(highResBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate proportional fit within target square
      const aspectRatio = canvasWidth / canvasHeight;
      let drawWidth: number;
      let drawHeight: number;

      if (aspectRatio >= 1) {
        drawWidth = targetSize;
        drawHeight = Math.round(targetSize / aspectRatio);
      } else {
        drawHeight = targetSize;
        drawWidth = Math.round(targetSize * aspectRatio);
      }

      // Centre in the target square
      const offsetX = Math.round((targetSize - drawWidth) / 2);
      const offsetY = Math.round((targetSize - drawHeight) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      // Fill background
      ctx.fillStyle = EXPORT_BG;
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Draw the image proportionally centred
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            resolve(null);
          }
        },
        'image/png',
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

// ── Upload thumbnail to Supabase Storage ──

export async function uploadThumbnail(
  invitationId: string,
  thumbnailBlob: Blob,
): Promise<ThumbnailResult> {
  try {
    // Get current user for path construction
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = session.user.id;
    const path = `${userId}/${invitationId}/thumbnail.png`;

    // Upload (upsert)
    const { error: uploadError } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(path, thumbnailBlob, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Update invitation_designs.thumbnail_url with the stable path reference
    const thumbnailRef = `${THUMBNAIL_BUCKET}/${path}`;
    const { error: updateError } = await supabase
      .from('invitation_designs')
      .update({ thumbnail_url: thumbnailRef })
      .eq('id', invitationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload thumbnail',
    };
  }
}