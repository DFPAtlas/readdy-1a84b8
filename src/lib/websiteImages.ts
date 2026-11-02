import { supabase } from '@/lib/supabase';

/** Public bucket for wedding website images (see migration 20261102170000). */
export const WEBSITE_IMAGE_BUCKET = 'website-public';
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const SOCIAL_IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const SOCIAL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function websiteImageFolder(weddingId: string): string {
  return `website/${weddingId}`;
}

/**
 * File name inside the wedding's website folder that a public URL points at,
 * or null when the URL is not one of this wedding's website images.
 */
export function websiteImageNameFromUrl(url: string | null | undefined, weddingId: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${WEBSITE_IMAGE_BUCKET}/${websiteImageFolder(weddingId)}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const name = decodeURIComponent(url.slice(at + marker.length).split(/[?#]/)[0]);
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(name) ? name : null;
}

/** Source rectangle that fills the target ratio from the centre of the image ("cover"). */
export function coverCrop(
  width: number,
  height: number,
  targetWidth = SOCIAL_IMAGE_WIDTH,
  targetHeight = SOCIAL_IMAGE_HEIGHT,
): { sx: number; sy: number; sw: number; sh: number } {
  const target = targetWidth / targetHeight;
  if (width / height > target) {
    const sw = Math.round(height * target);
    return { sx: Math.round((width - sw) / 2), sy: 0, sw, sh: height };
  }
  const sh = Math.round(width / target);
  return { sx: 0, sy: Math.round((height - sh) / 2), sw: width, sh };
}

export function validateSocialImageFile(file: File): string | null {
  if (!SOCIAL_IMAGE_TYPES.includes(file.type)) return 'Please choose a JPG, PNG or WebP image.';
  if (file.size > SOCIAL_IMAGE_MAX_INPUT_BYTES) return 'That image is over 20 MB. Please choose a smaller one.';
  return null;
}

/** Crop to 1200×630 and re-encode as JPEG (also drops camera metadata such as location). */
async function toSocialJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, sw, sh } = coverCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = SOCIAL_IMAGE_WIDTH;
    canvas.height = SOCIAL_IMAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is not available in this browser.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT);
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob) throw new Error('Could not process that image.');
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Uploads a social sharing image and returns its public URL. Older images in the
 * folder are removed, except any URL listed in `keepUrls` (e.g. the image the
 * published site still uses, or the one currently shown before saving).
 */
export async function uploadSocialImage(weddingId: string, file: File, keepUrls: Array<string | null | undefined> = []): Promise<string> {
  const invalid = validateSocialImageFile(file);
  if (invalid) throw new Error(invalid);
  const jpeg = await toSocialJpeg(file);
  const folder = websiteImageFolder(weddingId);
  const name = `social-${Date.now()}.jpg`;
  const bucket = supabase.storage.from(WEBSITE_IMAGE_BUCKET);
  const { error } = await bucket.upload(`${folder}/${name}`, jpeg, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message || 'Upload failed.');
  const url = bucket.getPublicUrl(`${folder}/${name}`).data.publicUrl;

  // Best-effort tidy-up of images that are no longer used anywhere.
  try {
    const keep = new Set([name, ...keepUrls.map((u) => websiteImageNameFromUrl(u, weddingId)).filter(Boolean) as string[]]);
    const { data: existing } = await bucket.list(folder, { limit: 100 });
    const stale = (existing || []).map((o) => o.name).filter((n) => n.startsWith('social-') && !keep.has(n));
    if (stale.length) await bucket.remove(stale.map((n) => `${folder}/${n}`));
  } catch {
    // Leaving an unused image behind is harmless.
  }
  return url;
}
