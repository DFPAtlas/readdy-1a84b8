import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
const { coverCrop, validateSocialImageFile, websiteImageNameFromUrl } = await import('../websiteImages');

const W = '11111111-2222-4333-8444-555555555555';

describe('website social image helpers', () => {
  it('extracts only this wedding\'s image names from public URLs', () => {
    const base = 'https://x.supabase.co/storage/v1/object/public/website-public/website';
    expect(websiteImageNameFromUrl(`${base}/${W}/social-1.jpg`, W)).toBe('social-1.jpg');
    expect(websiteImageNameFromUrl(`${base}/${W}/social-1.jpg?v=2`, W)).toBe('social-1.jpg');
    expect(websiteImageNameFromUrl(`${base}/other-wedding/social-1.jpg`, W)).toBeNull();
    expect(websiteImageNameFromUrl(`${base}/${W}/../x.jpg`, W)).toBeNull();
    expect(websiteImageNameFromUrl('https://readdy.ai/api/search-image?q=1', W)).toBeNull();
    expect(websiteImageNameFromUrl(null, W)).toBeNull();
  });

  it('crops to 1.91:1 from the centre', () => {
    expect(coverCrop(4000, 3000)).toEqual({ sx: 0, sy: 450, sw: 4000, sh: 2100 });
    expect(coverCrop(3000, 1000)).toEqual({ sx: 548, sy: 0, sw: 1905, sh: 1000 });
    expect(coverCrop(1200, 630)).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 630 });
  });

  it('accepts common image types only', () => {
    const file = (type: string, size = 1000) => ({ type, size }) as File;
    expect(validateSocialImageFile(file('image/jpeg'))).toBeNull();
    expect(validateSocialImageFile(file('image/gif'))).toMatch(/JPG/);
    expect(validateSocialImageFile(file('image/png', 30 * 1024 * 1024))).toMatch(/20 MB/);
  });
});
