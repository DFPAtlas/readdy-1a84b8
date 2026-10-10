import type * as React from "react";
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeddingWebsiteBuilder } from '@/hooks/useWeddingWebsiteBuilder';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { PUBLIC_SITE_HOST } from '@/lib/env';
import type { SeoConfig } from '@/types/website';

// ── Character counter with color ──
function CharCount({ current, max, warningAt }: { current: number; max: number; warningAt: number }) {
  const ratio = current / max;
  const isOver = current > max;
  const isWarn = current > warningAt && current <= max;
  return (
    <span className={`text-[10px] ${isOver ? 'text-red-500 font-semibold' : isWarn ? 'text-amber-600' : 'text-foreground-400'}`}>
      {current}/{max}
      {isOver && <span className="ml-1">— too long</span>}
    </span>
  );
}

// ── Search preview card ──
function SearchPreview({ seo, coupleNames, slug }: { seo: SeoConfig; coupleNames: string; slug: string }) {
  const title = seo.seo_title || `${coupleNames} Wedding`;
  const desc = seo.meta_description || `Join ${coupleNames} in celebrating their wedding day.`;
  const url = `${PUBLIC_SITE_HOST}/w/${slug}`;

  return (
    <div className="border border-secondary-200 rounded-lg p-4 bg-white max-w-md">
      <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wider mb-3">Search result preview</p>
      <div className="space-y-0.5">
        <p className="text-xs text-foreground-400 font-mono">{url} ›</p>
        <p className="text-sm font-label text-primary-700 leading-tight line-clamp-1">{title}</p>
        {seo.show_wedding_date_in_meta && (
          <p className="text-[10px] text-foreground-400 flex items-center gap-1">
            <i className="ri-calendar-line text-[9px]" />
            <span>24 Apr 2027</span>
          </p>
        )}
        <p className="text-xs text-foreground-500 leading-relaxed line-clamp-2">{desc}</p>
      </div>
    </div>
  );
}

// ── Social card preview ──
function SocialPreview({ seo, coupleNames }: { seo: SeoConfig; coupleNames: string }) {
  const title = seo.social_title || `${coupleNames} — We're Getting Married!`;
  const desc = seo.social_description || `Join us in celebrating our wedding day.`;
  const hasImg = !!seo.social_image_url;

  return (
    <div className="border border-secondary-200 rounded-lg overflow-hidden bg-white max-w-sm">
      <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wider px-4 pt-3 pb-2">Social card preview</p>
      {hasImg ? (
        <div className="aspect-[1200/630] bg-secondary-100 overflow-hidden">
          <img src={seo.social_image_url!} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[1200/630] bg-secondary-100 flex items-center justify-center">
          <div className="text-center">
            <i className="ri-image-line text-2xl text-foreground-300" />
            <p className="text-[10px] text-foreground-400 mt-1">No image set</p>
          </div>
        </div>
      )}
      <div className="p-3">
        <p className="text-[11px] text-foreground-400 font-mono">{PUBLIC_SITE_HOST}</p>
        <p className="text-sm font-label font-semibold text-foreground-900 leading-snug mt-1">{title}</p>
        <p className="text-xs text-foreground-500 leading-snug mt-1 line-clamp-2">{desc}</p>
      </div>
    </div>
  );
}

// ── Structured data preview ──
function StructuredDataPreview({ seo, coupleNames, wedding }: { seo: SeoConfig; coupleNames: string; wedding: { partner_one_name?: string; partner_two_name?: string; wedding_date?: string; location?: string } | null }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seo.seo_title || `${coupleNames} Wedding`,
    description: seo.meta_description || '',
    url: seo.canonical_domain || `${PUBLIC_SITE_HOST}/w/emma-and-james`,
    about: {
      '@type': 'Event',
      name: `${coupleNames} Wedding`,
      ...(seo.show_wedding_date_in_meta && wedding?.wedding_date ? { startDate: wedding.wedding_date } : {}),
      ...(seo.show_location_in_meta && wedding?.location ? { location: { '@type': 'Place', name: wedding.location } } : {}),
    },
  };

  return (
    <div className="border border-secondary-200 rounded-lg bg-white overflow-hidden">
      <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wider px-4 pt-3 pb-2">Structured data (JSON-LD)</p>
      <div className="bg-background-50 p-3">
        <pre className="text-[10px] font-mono text-foreground-700 leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[200px] overflow-y-auto">
          {JSON.stringify(jsonLd, null, 2)}
        </pre>
      </div>
      <div className="px-4 py-2 border-t border-secondary-100">
        <p className="text-[10px] text-foreground-400 flex items-center gap-1">
          <i className="ri-information-line" /> This data helps search engines understand your wedding website.
        </p>
      </div>
    </div>
  );
}

// ── Field wrapper ──
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-label font-medium text-foreground-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-foreground-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ════════════════ MAIN PAGE ════════════════

export default function WebsiteSeoPage() {
  const navigate = useNavigate();
  const { activeWedding } = useActiveWedding();
  const { draftConfig, saveStatus, publishStatus, setSeo, saveDraft } = useWeddingWebsiteBuilder();

  const [seoState, setSeoState] = useState<SeoConfig | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasInitialized = useRef(false);

  // Initialize local SEO state from draftConfig
  if (draftConfig && !hasInitialized.current) {
    setSeoState({ ...draftConfig.seo_config });
    hasInitialized.current = true;
  }

  const coupleNames = activeWedding
    ? `${activeWedding.partner_one_name || 'Partner One'} & ${activeWedding.partner_two_name || 'Partner Two'}`
    : 'Couple';
  const slug = draftConfig?.slug || 'emma-and-james';

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const updateField = (field: keyof SeoConfig, value: unknown) => {
    if (!seoState) return;
    const updated = { ...seoState, [field]: value };
    setSeoState(updated);
    setSeo(updated);
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await saveDraft();
      setSaveState('saved');
      showToast('success', 'SEO settings saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      showToast('error', 'Failed to save');
    }
  };

  if (!seoState) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading SEO settings...</p>
        </div>
      </div>
    );
  }

  const seo = seoState;
  const isPublished = publishStatus === 'published';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-label font-medium text-foreground-400 uppercase tracking-wider mb-1">Wedding website</p>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">SEO &amp; Sharing</h1>
          <p className="text-sm text-foreground-600 max-w-2xl">
            Control how your wedding website appears in search results and when shared on social media.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saveState === 'saving' ? (
            <><i className="ri-loader-4-line animate-spin mr-1.5" /> Saving...</>
          ) : saveState === 'saved' ? (
            <><i className="ri-check-line mr-1.5" /> Saved</>
          ) : (
            <><i className="ri-save-line mr-1.5" /> Save changes</>
          )}
        </button>
      </div>

      {/* ── Not published warning ── */}
      {!isPublished && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-amber-700 flex items-center gap-2">
            <i className="ri-information-line" />
            Your website is not published. SEO settings will take effect after publishing.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Settings ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search appearance */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
              <i className="ri-search-line text-base text-foreground-400" />
              Search appearance
            </h2>

            <div className="space-y-4">
              <Field label="SEO title" hint={`${seo.seo_title.length}/60 characters — Google typically shows the first 50–60 characters`}>
                <input
                  type="text"
                  value={seo.seo_title}
                  onChange={(e) => updateField('seo_title', e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900"
                  placeholder={`${coupleNames} Wedding`}
                />
                <CharCount current={seo.seo_title.length} max={60} warningAt={50} />
              </Field>

              <Field label="Meta description" hint={`${seo.meta_description.length}/160 characters — Google typically shows the first 120–160 characters`}>
                <textarea
                  value={seo.meta_description}
                  onChange={(e) => updateField('meta_description', e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 resize-none"
                  placeholder="Join Emma and James in celebrating their wedding day in Bath, Somerset..."
                />
                <CharCount current={seo.meta_description.length} max={160} warningAt={140} />
              </Field>

              <button
                onClick={() => {
                  updateField('seo_title', `${coupleNames} Wedding`);
                  updateField('meta_description', `Join ${coupleNames} in celebrating their wedding day${activeWedding?.location ? ` in ${activeWedding.location}` : ''}. Find event details, travel information, and RSVP here.`);
                }}
                className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-restart-line mr-1" /> Reset to generated defaults
              </button>
            </div>
          </div>

          {/* Social sharing */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
              <i className="ri-share-line text-base text-foreground-400" />
              Social sharing
            </h2>

            <div className="space-y-4">
              <Field label="Social title" hint="Title shown when your website is shared on Facebook, Twitter, LinkedIn, and messaging apps">
                <input
                  type="text"
                  value={seo.social_title}
                  onChange={(e) => updateField('social_title', e.target.value)}
                  maxLength={70}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900"
                  placeholder={`${coupleNames} — We're Getting Married!`}
                />
                <CharCount current={seo.social_title.length} max={70} warningAt={60} />
              </Field>

              <Field label="Social description" hint="Description shown in social media previews">
                <textarea
                  value={seo.social_description}
                  onChange={(e) => updateField('social_description', e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 resize-none"
                  placeholder="Join us in celebrating our wedding day..."
                />
                <CharCount current={seo.social_description.length} max={200} warningAt={180} />
              </Field>

              <Field label="Social image" hint="Recommended size: 1200×630px. Images work best at a 1.91:1 ratio.">
                {seo.social_image_url ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-secondary-200 aspect-[1200/630] max-w-sm">
                      <img
                        src={seo.social_image_url}
                        alt={seo.social_image_alt || 'Social sharing image'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateField('social_image_url', null)}
                        className="text-xs text-red-500 hover:text-red-600 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-delete-bin-line mr-1" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-secondary-200 rounded-lg p-6 text-center hover:border-secondary-300 transition-colors">
                    <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-2">
                      <i className="ri-image-add-line text-lg" />
                    </div>
                    <p className="text-xs text-foreground-500 mb-1">No image set</p>
                    <p className="text-[10px] text-foreground-400 mb-3">Upload a 1200×630px image for social sharing</p>
                    <button
                      onClick={() => {
                        // Simulated upload — in production this would open the storage uploader
                        updateField('social_image_url', 'https://readdy.ai/api/search-image?query=Elegant%20romantic%20wedding%20invitation%20flat%20lay%20with%20cream%20roses%20peonies%20and%20greenery%20on%20silk%20fabric%2C%20gold%20accents%2C%20soft%20natural%20window%20light%2C%20fine%20art%20editorial%20photography%2C%20warm%20neutral%20tones%2C%20luxurious%20texture%2C%20joyful%20celebration%20aesthetic&width=1200&height=630&seq=wedding-seo-og&orientation=landscape');
                        updateField('social_image_alt', `${coupleNames} wedding invitation with floral arrangement`);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <i className="ri-upload-line mr-1" /> Upload image
                    </button>
                  </div>
                )}
              </Field>

              {seo.social_image_url && (
                <Field label="Image alt text" hint="Describes the image for screen readers and search engines">
                  <input
                    type="text"
                    value={seo.social_image_alt}
                    onChange={(e) => updateField('social_image_alt', e.target.value)}
                    maxLength={125}
                    className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900"
                    placeholder={`${coupleNames} wedding invitation`}
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Indexing & Privacy */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
              <i className="ri-eye-off-line text-base text-foreground-400" />
              Indexing &amp; privacy
            </h2>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seo.search_indexing}
                  onChange={(e) => updateField('search_indexing', e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div>
                  <p className="text-sm font-label text-foreground-900">Allow search engine indexing</p>
                  <p className="text-xs text-foreground-500 mt-0.5">When enabled, your wedding website may appear in Google and other search results. Disable to keep it private.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seo.show_wedding_date_in_meta}
                  onChange={(e) => updateField('show_wedding_date_in_meta', e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div>
                  <p className="text-sm font-label text-foreground-900">Show wedding date in metadata</p>
                  <p className="text-xs text-foreground-500 mt-0.5">The date will appear in search snippets and social previews.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seo.show_location_in_meta}
                  onChange={(e) => updateField('show_location_in_meta', e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div>
                  <p className="text-sm font-label text-foreground-900">Show general location in metadata</p>
                  <p className="text-xs text-foreground-500 mt-0.5">Only the city/region is shown. Exact venue addresses are never included in public metadata.</p>
                </div>
              </label>

              <div className="bg-background-50 border border-secondary-100 rounded-lg p-3 mt-4">
                <p className="text-xs text-foreground-600 flex items-start gap-2">
                  <i className="ri-shield-check-line text-foreground-400 mt-0.5" />
                  <span>Draft, preview, guest invitation, and token-based pages are always hidden from search engines regardless of this setting.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Structured data */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
              <i className="ri-code-line text-base text-foreground-400" />
              Structured data
            </h2>

            <StructuredDataPreview seo={seo} coupleNames={coupleNames} wedding={activeWedding} />

            <div className="mt-3 bg-background-50 border border-secondary-100 rounded-lg p-3">
              <p className="text-xs text-foreground-500 flex items-start gap-2">
                <i className="ri-information-line text-foreground-400 mt-0.5 flex-shrink-0" />
                <span>This JSON-LD is generated automatically from your public wedding details. Guest names, private contacts, and payment data are never included.</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Previews ── */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            {/* Warnings */}
            <div className="space-y-2">
              {!isPublished && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <i className="ri-alert-line" />
                    Website not published — previews are estimates.
                  </p>
                </div>
              )}
              {!seo.seo_title && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <i className="ri-alert-line" />
                    SEO title is empty. Search engines will generate one automatically.
                  </p>
                </div>
              )}
              {!seo.social_image_url && (
                <div className="bg-background-50 border border-secondary-100 rounded-lg p-3">
                  <p className="text-xs text-foreground-500 flex items-center gap-1.5">
                    <i className="ri-information-line" />
                    No social image set. Shared links will appear without a preview image.
                  </p>
                </div>
              )}
              {!seo.search_indexing && (
                <div className="bg-background-50 border border-secondary-100 rounded-lg p-3">
                  <p className="text-xs text-foreground-500 flex items-center gap-1.5">
                    <i className="ri-eye-off-line" />
                    Search indexing is disabled. Your site won&apos;t appear in search results.
                  </p>
                </div>
              )}
            </div>

            <SearchPreview seo={seo} coupleNames={coupleNames} slug={slug} />
            <SocialPreview seo={seo} coupleNames={coupleNames} />
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-label shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-accent-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}