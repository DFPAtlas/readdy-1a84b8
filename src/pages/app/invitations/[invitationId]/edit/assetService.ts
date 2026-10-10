import { supabase } from '@/lib/supabase';
import type { AssetLibraryItem, EditorAsset } from './types';
import { getDemoImageForAsset } from './demoAssetImages';

// ── Result types ──

export interface AssetLibraryResult {
  success: boolean;
  data?: EditorAsset[];
  error?: string;
}

// ── URL resolver types ──

export type AssetUrlSource = 'signed-url' | 'storage-path' | 'full-url' | 'demo-fallback';

export type AssetUrlResult =
  | { ok: true; url: string; source: AssetUrlSource }
  | { ok: false; reason: AssetUrlError };

export type AssetUrlError =
  | 'empty_value'
  | 'unsafe_url'
  | 'invalid_url'
  | 'extraction_failed'
  | 'signing_failed';

// ── Constants ──

const BUCKET_NAME = 'invitation-assets';
const SIGNED_URL_EXPIRY = 3600; // 1 hour — reasonable for an editing session
const BULK_SIGN_EXPIRY = 3600;

// Track which paths we've already signed this session to avoid redundant calls
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// ── Path extraction ──

/**
 * Extract the bucket-relative object path from any stored URL format.
 * Handles:
 *   - Full Supabase public HTTPS URLs (extracts path after bucket name)
 *   - Already-relative paths (returns cleaned)
 *   - Paths with accidental leading bucket prefix
 */
function extractAssetPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // If it's a full HTTPS URL, extract the object path
  if (trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      // Expected path: /storage/v1/object/public/{bucket}/{path...}
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      // Find the bucket name index
      const bucketIdx = pathParts.indexOf(BUCKET_NAME);
      if (bucketIdx === -1) return null;
      // Everything after the bucket name is the object path
      const objectPath = pathParts.slice(bucketIdx + 1).join('/');
      if (!objectPath) return null;
      return objectPath;
    } catch {
      return null;
    }
  }

  // Relative path — clean it up
  let path = trimmed;

  // Strip leading slash
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  // Strip accidental leading bucket prefix
  if (path.startsWith(`${BUCKET_NAME}/`)) {
    path = path.slice(BUCKET_NAME.length + 1);
  }

  if (!path) return null;

  // Reject traversal and unsafe patterns
  if (path.includes('..') || path.includes('\\') || path.includes('\0')) {
    return null;
  }

  return path;
}

// ── Signed URL resolution ──

/**
 * Resolve a stored URL value to a usable signed URL.
 * Uses an in-memory cache to avoid redundant signing calls.
 */
export async function resolveAssetSignedUrl(value: string): Promise<AssetUrlResult> {
  if (!value || typeof value !== 'string') {
    return { ok: false, reason: 'empty_value' };
  }

  const lower = value.trim().toLowerCase();

  // Reject JavaScript URLs and data URIs
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:')) {
    return { ok: false, reason: 'unsafe_url' };
  }

  const objectPath = extractAssetPath(value);
  if (!objectPath) {
    return { ok: false, reason: 'extraction_failed' };
  }

  // Check cache
  const cached = signedUrlCache.get(objectPath);
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, url: cached.url, source: 'signed-url' };
  }

  // Create signed URL
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      return { ok: false, reason: 'signing_failed' };
    }

    // Cache the result
    signedUrlCache.set(objectPath, {
      url: data.signedUrl,
      expiresAt: Date.now() + (SIGNED_URL_EXPIRY - 60) * 1000, // expire slightly early
    });

    return { ok: true, url: data.signedUrl, source: 'signed-url' };
  } catch {
    return { ok: false, reason: 'signing_failed' };
  }
}

/**
 * Synchronous version for non-async contexts.
 * Returns the cached signed URL if available, otherwise the raw stored value.
 * Used as a fallback in render-heavy paths. Callers should prefer resolveAssetSignedUrl.
 */
export function getCachedSignedUrl(value: string): string | null {
  const objectPath = extractAssetPath(value);
  if (!objectPath) return null;

  const cached = signedUrlCache.get(objectPath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  return null;
}

/**
 * Invalidate the signed URL cache — call when session changes or after long idle.
 */
export function invalidateSignedUrlCache(): void {
  signedUrlCache.clear();
}

// ── Batch resolution ──

/**
 * Resolve a batch of stored URL values to signed URLs efficiently.
 * Uses createSignedUrls (plural) for a single API call when possible,
 * falling back to individual calls.
 */
export async function resolveAssetSignedUrls(
  values: Map<string, string>,
): Promise<Map<string, AssetUrlResult>> {
  const results = new Map<string, AssetUrlResult>();

  // Collect paths that need signing
  const pathsToSign: { assetId: string; objectPath: string }[] = [];

  for (const [assetId, value] of values) {
    const objectPath = extractAssetPath(value);
    if (!objectPath) {
      results.set(assetId, { ok: false, reason: 'extraction_failed' });
      continue;
    }

    // Check cache first
    const cached = signedUrlCache.get(objectPath);
    if (cached && cached.expiresAt > Date.now()) {
      results.set(assetId, { ok: true, url: cached.url, source: 'signed-url' });
      continue;
    }

    pathsToSign.push({ assetId, objectPath });
  }

  if (pathsToSign.length === 0) return results;

  // Batch sign
  try {
    const objectPaths = pathsToSign.map((p) => p.objectPath);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrls(objectPaths, BULK_SIGN_EXPIRY);

    if (!error && data) {
      const signedMap = new Map<string, string>();
      for (const item of data) {
        if (item.path && item.signedUrl) {
          signedMap.set(item.path, item.signedUrl);
        }
      }

      for (const { assetId, objectPath } of pathsToSign) {
        const signedUrl = signedMap.get(objectPath);
        if (signedUrl) {
          signedUrlCache.set(objectPath, {
            url: signedUrl,
            expiresAt: Date.now() + (BULK_SIGN_EXPIRY - 60) * 1000,
          });
          results.set(assetId, { ok: true, url: signedUrl, source: 'signed-url' });
        } else {
          results.set(assetId, { ok: false, reason: 'signing_failed' });
        }
      }

      return results;
    }
  } catch {
    // Fall through to individual signing
  }

  // Individual fallback
  for (const { assetId, objectPath } of pathsToSign) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(objectPath, SIGNED_URL_EXPIRY);

      if (!error && data?.signedUrl) {
        signedUrlCache.set(objectPath, {
          url: data.signedUrl,
          expiresAt: Date.now() + (SIGNED_URL_EXPIRY - 60) * 1000,
        });
        results.set(assetId, { ok: true, url: data.signedUrl, source: 'signed-url' });
      } else {
        results.set(assetId, { ok: false, reason: 'signing_failed' });
      }
    } catch {
      results.set(assetId, { ok: false, reason: 'signing_failed' });
    }
  }

  return results;
}

// ── Database → EditorAsset mapper (async, uses signed URLs with demo fallback) ──

async function mapRowToAsset(row: AssetLibraryItem, index: number): Promise<EditorAsset> {
  const fileResult = await resolveAssetSignedUrl(row.file_url);
  const thumbResult = await resolveAssetSignedUrl(row.thumbnail_url);

  let fileUrl = fileResult.ok ? fileResult.url : '';
  let thumbnailUrl = thumbResult.ok ? thumbResult.url : '';

  // Fallback to demo images when storage signing fails (empty bucket, etc.)
  if (!fileUrl) {
    fileUrl = getDemoImageForAsset(row.category, row.name || '', index);
  }
  if (!thumbnailUrl) {
    thumbnailUrl = getDemoImageForAsset(row.category, row.name || '', index);
  }

  return {
    id: row.id,
    category: row.category,
    name: row.name || 'Untitled',
    fileUrl,
    thumbnailUrl,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPremium: row.is_premium,
  };
}

// ── Load asset library ──

/**
 * Query the asset_library table and resolve all URLs to signed URLs.
 * Falls back to demo images when the storage bucket is empty.
 * Returns typed success/error results ordered by category then name.
 */
export async function loadAssetLibrary(): Promise<AssetLibraryResult> {
  try {
    const { data, error } = await supabase
      .from('asset_library')
      .select('id, category, name, file_url, thumbnail_url, tags, is_premium')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { success: true, data: [] };
      }
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    // Gather all file_url and thumbnail_url values for batch signing
    const urlMap = new Map<string, string>();
    for (const row of data as AssetLibraryItem[]) {
      if (row.file_url) urlMap.set(`file:${row.id}`, row.file_url);
      if (row.thumbnail_url) urlMap.set(`thumb:${row.id}`, row.thumbnail_url);
    }

    // Batch-resolve all URLs to signed URLs
    const signedResults = await resolveAssetSignedUrls(urlMap);

    // Build EditorAsset array with fallback demo images
    const mapped: EditorAsset[] = [];
    let index = 0;
    for (const row of data as AssetLibraryItem[]) {
      const fileResult = signedResults.get(`file:${row.id}`);
      const thumbResult = signedResults.get(`thumb:${row.id}`);

      let fileUrl = fileResult?.ok ? fileResult.url : '';
      let thumbnailUrl = thumbResult?.ok ? thumbResult.url : '';

      // Fallback to demo images when storage signing fails
      if (!fileUrl) {
        fileUrl = getDemoImageForAsset(row.category, row.name || '', index);
      }
      if (!thumbnailUrl) {
        thumbnailUrl = getDemoImageForAsset(row.category, row.name || '', index);
      }

      mapped.push({
        id: row.id,
        category: row.category,
        name: row.name || 'Untitled',
        fileUrl,
        thumbnailUrl,
        tags: Array.isArray(row.tags) ? row.tags : [],
        isPremium: row.is_premium,
      });
      index++;
    }

    return { success: true, data: mapped };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load assets',
    };
  }
}