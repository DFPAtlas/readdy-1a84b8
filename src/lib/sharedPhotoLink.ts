import QRCode from 'qrcode';
import { PUBLIC_SITE_URL } from '@/lib/env';

/** Public origin for links guests open (the live site, not an editor preview). */
function publicOrigin(): string {
  const configured = PUBLIC_SITE_URL.replace(/\/+$/, '');
  if (/^https?:\/\//.test(configured)) return configured;
  return typeof window !== 'undefined' ? window.location.origin : 'https://vowora.uk';
}

export function sharedPhotoUploadUrl(token: string): string {
  return `${publicOrigin()}/photos/${encodeURIComponent(token)}`;
}

/** QR code as an SVG string (crisp at any size, e.g. on a big screen). */
export function qrSvg(text: string, dark = '#111111', light = '#ffffff'): Promise<string> {
  return QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark, light } });
}

/** QR code as a PNG data URL, for downloading and printing on table cards. */
export function qrPngDataUrl(text: string, size = 1024): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: size });
}

/**
 * Prepares a phone photo for upload: re-encodes as JPEG (removing camera metadata
 * such as location) and caps the long edge so uploads stay quick on venue Wi-Fi.
 * Falls back to the original file if the browser can't decode it.
 */
export async function preparePhotoForUpload(file: File, maxEdge = 2560): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      return blob || file;
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
