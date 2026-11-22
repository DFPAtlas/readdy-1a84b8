/**
 * Guard rail for social share images.
 *
 * Every indexable route advertises an `og:image`. If that URL points at a file
 * that was never shipped, the page still builds and renders perfectly — the
 * only symptom is that every link preview outside Google silently 404s. That is
 * exactly what happened while `DEFAULT_OG_IMAGE` was `${SITE_URL}/og-image.jpg`
 * and `public/` contained no such file.
 *
 * These tests fail the build instead of letting that class of mistake reach
 * production. The rules are deliberately simple:
 *
 * 1. A share image must be an absolute http(s) URL, or a site-relative path
 *    whose file genuinely exists in `public/`.
 * 2. An absolute URL on our own origin is treated as a local file, so pointing
 *    at `https://vowora.uk/missing.jpg` cannot slip through.
 * 3. Image-service URLs must actually request a 1200×630 crop, because the
 *    emitted `og:image:width` / `og:image:height` tags claim exactly that.
 * 4. The static `index.html` card must match the resolved default, so the tags
 *    crawlers read without running JS stay in sync with the app.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/hooks/usePageSeo';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const PAGES_DIR = join(PROJECT_ROOT, 'src', 'pages');

/** Matches `image: '…'` inside a page's metadata block (never `imageAlt:`). */
const IMAGE_OVERRIDE_PATTERN = /\bimage:\s*(['"])([^'"]*)\1/g;

const SHARE_IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif)$/i;

function collectFiles(directory: string, extension: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute, extension);
    return entry.name.endsWith(extension) ? [absolute] : [];
  });
}

function publicFileExists(relativePath: string): boolean {
  const clean = relativePath.replace(/^\/+/, '').split('?')[0].split('#')[0];
  if (!clean || clean.includes('..')) return false;
  return existsSync(join(PUBLIC_DIR, clean));
}

/**
 * Compares share URLs by meaning rather than by encoding: the same image can be
 * written with `%20` or literal spaces depending on which editor saved it last.
 */
function comparableUrl(value: string): string {
  try {
    return decodeURI(value).replace(/\s+/g, ' ').trim();
  } catch {
    return value.trim();
  }
}

function sizeProblem(url: string): string | null {
  if (!url.includes('search-image')) return null;
  const hasWidth = /[?&]width=1200(?:&|$)/.test(url);
  const hasHeight = /[?&]height=630(?:&|$)/.test(url);
  if (hasWidth && hasHeight) return null;
  return 'must request a 1200×630 crop to match the declared og:image dimensions';
}

/**
 * Returns `null` when a share image is safe to advertise.
 * Anything else is a human-readable reason for the failure message.
 */
function shareImageProblem(value: string, label: string): string | null {
  const url = value.trim();
  if (!url) return `${label}: share image URL is empty`;

  if (/^https?:\/\//i.test(url)) {
    if (url.startsWith(SITE_URL)) {
      const localPath = `${url.slice(SITE_URL.length)}`;
      if (!SHARE_IMAGE_EXTENSION.test(localPath.split('?')[0])) {
        return `${label}: "${url}" is on our own origin but is not an image file`;
      }
      if (!publicFileExists(localPath)) {
        return `${label}: "${url}" points at a file that is not in public/ — crawlers would get a 404`;
      }
      return null;
    }
    const sizing = sizeProblem(url);
    return sizing ? `${label}: "${url}" ${sizing}` : null;
  }

  if (url.startsWith('//')) {
    return `${label}: "${url}" is protocol-relative; crawlers require an absolute https URL`;
  }

  if (!SHARE_IMAGE_EXTENSION.test(url.split('?')[0])) {
    return `${label}: "${url}" is neither an absolute URL nor an image path`;
  }
  if (!publicFileExists(url)) {
    return `${label}: "${url}" points at a file that is not in public/ — crawlers would get a 404`;
  }
  return null;
}

describe('social share images', () => {
  it('resolves the shared default to a real hosted file', () => {
    expect(DEFAULT_OG_IMAGE).toBeTruthy();
    expect(shareImageProblem(DEFAULT_OG_IMAGE, 'DEFAULT_OG_IMAGE')).toBeNull();
  });

  it('never leaves a page override pointing at a file that does not ship', () => {
    const problems: string[] = [];
    let scanned = 0;

    collectFiles(PAGES_DIR, '.tsx').forEach((file) => {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('usePageSeo')) return;
      scanned += 1;

      const label = relative(PROJECT_ROOT, file);
      for (const match of source.matchAll(IMAGE_OVERRIDE_PATTERN)) {
        const problem = shareImageProblem(match[2], label);
        if (problem) problems.push(problem);
      }
    });

    // Fail loudly if the scan itself broke, rather than passing vacuously.
    expect(scanned).toBeGreaterThan(10);
    expect(problems).toEqual([]);
  });

  it('keeps the static index.html card in sync with the resolved default', () => {
    const html = readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf8');
    const tags = [...html.matchAll(/<meta\s+(?:property|name)="(og:image|twitter:image)"\s+content="([^"]*)"/g)];

    expect(tags.map((tag) => tag[1]).sort()).toEqual(['og:image', 'twitter:image']);

    tags.forEach(([, key, value]) => {
      expect(shareImageProblem(value, `index.html ${key}`)).toBeNull();
      expect(comparableUrl(value)).toBe(comparableUrl(DEFAULT_OG_IMAGE));
    });
  });

  it('rejects the shape of URL that caused the original 404', () => {
    // Proves the checks above cannot rot into a no-op: a site-origin asset that
    // was never added to public/ must always be refused, absolute or not.
    expect(shareImageProblem(`${SITE_URL}/this-file-was-never-shipped.jpg`, 'regression')).toContain('404');
    expect(shareImageProblem('/this-file-was-never-shipped.jpg', 'regression')).toContain('404');
    expect(shareImageProblem('', 'regression')).toContain('empty');
    expect(
      shareImageProblem('https://readdy.ai/api/search-image?query=y&width=800&height=400&seq=x&orientation=landscape', 'regression'),
    ).toContain('1200×630');
  });
});