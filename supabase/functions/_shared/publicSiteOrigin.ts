// Only HTTP(S) origins are valid for public links and hosted checkout redirects.
export function resolvePublicSiteOrigin(configured: string | undefined): string {
  try {
    const url = new URL(configured?.trim() || 'https://vowora.uk');
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) return url.origin;
  } catch { /* Invalid deployment configuration uses the canonical public site. */ }
  return 'https://vowora.uk';
}
