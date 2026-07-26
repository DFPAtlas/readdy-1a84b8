// ── Demo fallback asset images ──
// Used when the invitation-assets storage bucket is empty and signed URLs fail.
// Each image is a Stable Diffusion search-image URL with a unique seq ID.

export interface DemoAssetImage {
  url: string;
  category: string;
  keywords: string[];
}

export const DEMO_IMAGES: DemoAssetImage[] = [
  {
    url: 'https://readdy.ai/api/search-image?query=Elegant%20blush%20peony%20floral%20cluster%20watercolor%20illustration%20soft%20pink%20cream%20background%20botanical%20wedding%20decoration%20delicate%20petals%20romantic%20style%20high%20detail%20digital%20art&width=512&height=512&seq=wedora-demo-floral-01&orientation=squarish',
    category: 'florals',
    keywords: ['peony', 'blush', 'floral', 'flower', 'cluster'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Rose%20gold%20bouquet%20watercolor%20illustration%20warm%20pink%20gold%20tones%20elegant%20wedding%20flowers%20soft%20background%20romantic%20botanical%20art%20high%20detail%20delicate&width=512&height=512&seq=wedora-demo-floral-02&orientation=squarish',
    category: 'florals',
    keywords: ['rose', 'bouquet', 'gold', 'floral'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=White%20lily%20spray%20watercolor%20illustration%20pure%20white%20cream%20petals%20elegant%20wedding%20flowers%20soft%20light%20background%20botanical%20art%20delicate%20romantic&width=512&height=512&seq=wedora-demo-floral-03&orientation=squarish',
    category: 'florals',
    keywords: ['lily', 'white', 'spray', 'floral'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Wildflower%20garland%20wreath%20watercolor%20illustration%20mixed%20meadow%20flowers%20soft%20pastel%20colors%20rustic%20wedding%20decoration%20botanical%20art%20natural%20organic%20style&width=512&height=512&seq=wedora-demo-floral-04&orientation=squarish',
    category: 'florals',
    keywords: ['wildflower', 'garland', 'wreath', 'meadow'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Gold%20ornate%20decorative%20border%20frame%20vintage%20wedding%20invitation%20elegant%20filigree%20metallic%20gold%20cream%20background%20luxury%20classic%20design%20high%20detail%20digital%20art&width=512&height=512&seq=wedora-demo-frame-01&orientation=squarish',
    category: 'frames',
    keywords: ['gold', 'ornate', 'border', 'frame', 'vintage'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Minimal%20clean%20rectangular%20frame%20thin%20gold%20line%20border%20modern%20wedding%20invitation%20simple%20elegant%20cream%20background%20contemporary%20design%20subtle%20luxury&width=512&height=512&seq=wedora-demo-frame-02&orientation=squarish',
    category: 'frames',
    keywords: ['minimal', 'rectangular', 'frame', 'modern'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Dove%20pair%20silhouette%20wedding%20illustration%20elegant%20birds%20love%20romantic%20symbol%20soft%20gold%20cream%20background%20minimal%20line%20art%20delicate%20icon%20design&width=512&height=512&seq=wedora-demo-icon-01&orientation=squarish',
    category: 'icons',
    keywords: ['dove', 'birds', 'silhouette', 'love'],
  },
  {
    url: 'https://readdy.ai/api/search-image?query=Eucalyptus%20leaf%20branch%20watercolor%20illustration%20soft%20sage%20green%20botanical%20wedding%20decoration%20natural%20organic%20style%20cream%20background%20delicate%20leaves%20rustic%20elegant&width=512&height=512&seq=wedora-demo-leaf-01&orientation=squarish',
    category: 'leaves',
    keywords: ['eucalyptus', 'leaf', 'branch', 'green'],
  },
];

/**
 * Get a fallback demo image URL for an asset based on its category and name.
 * Uses keyword matching to pick the most relevant image, falling back to index-based rotation.
 */
export function getDemoImageForAsset(category: string, name: string, index: number): string {
  const catLower = category.toLowerCase();
  const nameLower = name.toLowerCase();

  // Try keyword matching first
  for (const demo of DEMO_IMAGES) {
    for (const keyword of demo.keywords) {
      if (nameLower.includes(keyword) || catLower.includes(demo.category)) {
        return demo.url;
      }
    }
  }

  // Fallback: rotate by index
  return DEMO_IMAGES[index % DEMO_IMAGES.length].url;
}