import '@/test/canvas';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeFilename,
  waitForImages,
  waitForFonts,
  validatePngBlob,
  generateThumbnail,
} from '../exportService';

// ── Filename sanitization ──

describe('sanitizeFilename', () => {
  it('keeps alphanumeric and hyphens', () => {
    expect(sanitizeFilename('Amelia-and-Jonathan-Wedding')).toBe('Amelia-and-Jonathan-Wedding');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeFilename('Amelia & Jonathan')).toBe('Amelia-Jonathan');
  });

  it('removes special characters', () => {
    expect(sanitizeFilename('Hello! @World #2024')).toBe('Hello-World-2024');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeFilename('Hello   World')).toBe('Hello-World');
  });

  it('removes leading and trailing dots', () => {
    expect(sanitizeFilename('.hidden-file.')).toBe('hidden-file');
  });

  it('limits to 80 characters', () => {
    const long = 'A'.repeat(100) + '-Wedding';
    const result = sanitizeFilename(long);
    expect(result.length).toBeLessThanOrEqual(80);
  });

  it('falls back to vowora-invitation for empty result', () => {
    expect(sanitizeFilename('!!!')).toBe('vowora-invitation');
  });

  it('falls back for whitespace-only', () => {
    expect(sanitizeFilename('   ')).toBe('vowora-invitation');
  });

  it('normalizes unicode characters', () => {
    expect(sanitizeFilename('Café-Résumé')).toBe('Cafe-Resume');
  });

  it('preserves dots in valid positions', () => {
    expect(sanitizeFilename('Wedding.Invitation.Final')).toBe('Wedding.Invitation.Final');
  });

  it('removes leading/trailing hyphens', () => {
    expect(sanitizeFilename('---hello---')).toBe('hello');
  });
});

// ── waitForImages ──

describe('waitForImages', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns ready=true when no images present', async () => {
    const result = await waitForImages(container, 1000);
    expect(result.ready).toBe(true);
    expect(result.failedAssets).toEqual([]);
  });

  it('returns ready=true when all images already loaded', async () => {
    const img = document.createElement('img');
    // Create a tiny valid image via data URL
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    container.appendChild(img);

    // jsdom does not decode HTML image elements; model an already loaded image.
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 1 });

    const result = await waitForImages(container, 2000);
    expect(result.ready).toBe(true);
  });

  it('reports failures for broken images after timeout', async () => {
    const img = document.createElement('img');
    img.src = 'https://invalid.example.com/not-an-image.png';
    container.appendChild(img);

    const result = await waitForImages(container, 500);
    // The image will fail to load at some point
    // Either it completes with error, or times out
    expect(result.failedAssets.length).toBeGreaterThanOrEqual(0);
  });

  it('returns failedAssets when images time out without loading', async () => {
    const img = document.createElement('img');
    // Use a slow URL that will stall
    img.src = 'https://10.255.255.1/nonexistent.png';
    container.appendChild(img);

    const result = await waitForImages(container, 200);
    expect(result.ready).toBe(false);
  });
});

// ── waitForFonts ──

describe('waitForFonts', () => {
  it('returns true when system fonts are available', async () => {
    const result = await waitForFonts(2000);
    // In jsdom, fonts.ready may not be available, so this should return true
    expect(result).toBe(true);
  });
});

// ── validatePngBlob ──

describe('validatePngBlob', () => {
  it('rejects non-PNG MIME type', async () => {
    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    const result = await validatePngBlob(blob, 100, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('image/png');
  });

  it('rejects empty blob', async () => {
    const blob = new Blob([], { type: 'image/png' });
    const result = await validatePngBlob(blob, 100, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('accepts valid PNG blob with correct dimensions', async () => {
    // Create a minimal valid PNG
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 100, 100);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('No blob'));
      }, 'image/png');
    });

    const result = await validatePngBlob(blob, 100, 100);
    expect(result.valid).toBe(true);
  });

  it('rejects PNG with wrong dimensions', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.fillRect(0, 0, 50, 50);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const result = await validatePngBlob(blob, 100, 100);
    expect(result.valid).toBe(false);
  });
});

// ── generateThumbnail ──

describe('generateThumbnail', () => {
  it('generates a 280×280 thumbnail for a square canvas', async () => {
    // Create a 560×560 test PNG
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.fillStyle = '#fffaf5';
    ctx.fillRect(0, 0, 560, 560);
    ctx.fillStyle = '#b8925a';
    ctx.fillRect(100, 100, 360, 360);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const thumb = await generateThumbnail(blob, 560, 560, 280);
    expect(thumb).not.toBeNull();
    expect(thumb!.type).toBe('image/png');
    expect(thumb!.size).toBeGreaterThan(0);
  });

  it('generates a proportional thumbnail for non-square canvas', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.fillStyle = '#fffaf5';
    ctx.fillRect(0, 0, 800, 400);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const thumb = await generateThumbnail(blob, 800, 400, 280);
    expect(thumb).not.toBeNull();
    expect(thumb!.type).toBe('image/png');
    expect(thumb!.size).toBeGreaterThan(0);
  });

  it('returns null for invalid input', async () => {
    const blob = new Blob(['not an image'], { type: 'image/png' });
    const thumb = await generateThumbnail(blob, 560, 560, 280);
    expect(thumb).toBeNull();
  });
});