import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWeddingWebsiteBuilder } from '@/hooks/useWeddingWebsiteBuilder';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import type {
  BuilderTab,
  WebsiteSection,
  WebsiteSectionType,
  ThemeConfig,
  NavigationConfig,
  NavLink,
  SeoConfig,
  DesignPreset,
} from '@/types/website';
import {
  SECTION_LABELS,
  SECTION_ICONS,
  DESIGN_PRESETS,
  FONT_OPTIONS,
  defaultHeroConfig,
  defaultWelcomeConfig,
  defaultStoryConfig,
  defaultScheduleConfig,
  defaultVenueConfig,
  defaultTravelConfig,
  defaultAccommodationConfig,
  defaultDressCodeConfig,
  defaultWeddingPartyConfig,
  defaultRegistryConfig,
  defaultGalleryConfig,
  defaultFaqsConfig,
  defaultContactConfig,
  defaultRsvpConfig,
} from '@/types/website';

// ── Helpers ──

const RESERVED_SLUGS = ['admin', 'app', 'api', 'login', 'signup', 'guest', 'w', 'live-wall', 'invite', 'demo-start'];

function getDefaultConfigForType(type: WebsiteSectionType): Record<string, unknown> {
  switch (type) {
    case 'hero': return defaultHeroConfig();
    case 'welcome': return defaultWelcomeConfig();
    case 'story': return defaultStoryConfig();
    case 'schedule': return defaultScheduleConfig();
    case 'venue': return defaultVenueConfig();
    case 'travel': return defaultTravelConfig();
    case 'accommodation': return defaultAccommodationConfig();
    case 'dress_code': return defaultDressCodeConfig();
    case 'wedding_party': return defaultWeddingPartyConfig();
    case 'registry': return defaultRegistryConfig();
    case 'gallery': return defaultGalleryConfig();
    case 'faqs': return defaultFaqsConfig();
    case 'contact': return defaultContactConfig();
    case 'rsvp': return defaultRsvpConfig();
    case 'custom_text': return { internal_name: '', public_heading: '', body: '', image_url: null, button_label: '', button_url: '', background_style: 'none' };
    default: return {};
  }
}

// ── Status Badge ──

function StatusBadge({ saveStatus, publishStatus, isDirty }: { saveStatus: string; publishStatus: string; isDirty: boolean }) {
  let label = 'Draft';
  let bg = 'bg-secondary-100 text-secondary-700';
  if (publishStatus === 'published') { label = 'Published'; bg = 'bg-accent-100 text-accent-700'; }
  else if (publishStatus === 'publishing') { label = 'Publishing...'; bg = 'bg-secondary-100 text-secondary-700'; }
  else if (publishStatus === 'error') { label = 'Publish failed'; bg = 'bg-red-100 text-red-700'; }
  else if (isDirty && saveStatus === 'unsaved') { label = 'Unsaved changes'; bg = 'bg-amber-100 text-amber-700'; }
  else if (saveStatus === 'saving') { label = 'Saving...'; bg = 'bg-secondary-100 text-secondary-700'; }
  else if (saveStatus === 'error') { label = 'Save failed'; bg = 'bg-red-100 text-red-700'; }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-label font-medium whitespace-nowrap ${bg}`}>
      {label}
    </span>
  );
}

// ── Color Input ──

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-md border border-secondary-200 overflow-hidden flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 -m-1 cursor-pointer"
          aria-label={label}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 font-mono"
        aria-label={label}
      />
    </div>
  );
}

// ── MAIN PAGE ──

export default function WeddingWebsiteBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    draftConfig, loading, error, saveStatus, publishStatus, isDirty,
    slugAvailable, slugChecking,
    setSections, updateSection, setTheme, setNavigation, setSeo, setSlug, checkSlug,
    saveDraft, publish, unpublish, discardChanges, retry,
  } = useWeddingWebsiteBuilder();
  const { activeWedding } = useActiveWedding();

  const [activeTab, setActiveTab] = useState<BuilderTab>('pages');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [unpublishConfirm, setUnpublishConfirm] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Save / Publish handlers ──

  const handleSaveDraft = async () => {
    await saveDraft();
    showToast('success', 'Draft saved');
  };

  const handlePublish = async () => {
    await publish();
    showToast('success', 'Website published');
  };

  const handleUnpublish = async () => {
    setUnpublishConfirm(false);
    await unpublish();
    showToast('success', 'Website unpublished');
  };

  const handleDiscard = () => {
    setDiscardConfirm(false);
    discardChanges();
    showToast('success', 'Changes discarded');
  };

  // ── Section CRUD ──

  const toggleSection = (sectionId: string) => {
    const section = draftConfig?.sections_config.find((s) => s.id === sectionId);
    if (section) {
      updateSection(sectionId, { visible: !section.visible });
    }
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!draftConfig) return;
    const sections = [...draftConfig.sections_config];
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
    sections.forEach((s, i) => { s.sort_order = i; });
    setSections(sections);
  };

  const resetSection = (sectionId: string) => {
    const section = draftConfig?.sections_config.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { config: getDefaultConfigForType(section.type) });
    showToast('success', 'Section reset to default');
  };

  const addCustomSection = () => {
    if (!draftConfig) return;
    const count = draftConfig.sections_config.filter((s) => s.type === 'custom_text').length;
    if (count >= 5) { showToast('error', 'Maximum 5 custom sections allowed'); return; }
    const newId = `sec-custom-${Date.now()}`;
    const newSection: WebsiteSection = {
      id: newId, type: 'custom_text', label: 'Custom Section',
      visible: true, sort_order: draftConfig.sections_config.length,
      config: getDefaultConfigForType('custom_text'),
    };
    setSections([...draftConfig.sections_config, newSection]);
    setSelectedSectionId(newId);
  };

  const removeSection = (sectionId: string) => {
    if (!draftConfig) return;
    const section = draftConfig.sections_config.find((s) => s.id === sectionId);
    if (!section || section.type !== 'custom_text') return;
    const filtered = draftConfig.sections_config.filter((s) => s.id !== sectionId);
    filtered.forEach((s, i) => { s.sort_order = i; });
    setSections(filtered);
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  // ── Theme ──

  const applyPreset = (preset: DesignPreset) => {
    if (!draftConfig) return;
    setTheme({ ...draftConfig.theme_config, ...preset.theme, preset: preset.key });
  };

  const updateThemeField = (field: keyof ThemeConfig, value: string | number | boolean) => {
    if (!draftConfig) return;
    setTheme({ ...draftConfig.theme_config, [field]: value });
  };

  // ── Navigation ──

  const toggleNavLink = (sectionId: string) => {
    if (!draftConfig) return;
    const nav = draftConfig.navigation_config;
    const existing = nav.links.find((l) => l.section_id === sectionId);
    if (existing) {
      setNavigation({ ...nav, links: nav.links.filter((l) => l.section_id !== sectionId).map((l, i) => ({ ...l, sort_order: i })) });
    } else {
      const section = draftConfig.sections_config.find((s) => s.id === sectionId);
      if (!section) return;
      const newLink: NavLink = {
        id: `nav-${sectionId}`, section_id: sectionId,
        label: SECTION_LABELS[section.type] || section.label,
        type: 'section', url: `#${section.type}`, sort_order: nav.links.length,
      };
      setNavigation({ ...nav, links: [...nav.links, newLink] });
    }
  };

  const updateNavLinkLabel = (linkId: string, label: string) => {
    if (!draftConfig) return;
    const nav = draftConfig.navigation_config;
    setNavigation({ ...nav, links: nav.links.map((l) => l.id === linkId ? { ...l, label } : l) });
  };

  const moveNavLink = (linkId: string, direction: 'up' | 'down') => {
    if (!draftConfig) return;
    const nav = draftConfig.navigation_config;
    const idx = nav.links.findIndex((l) => l.id === linkId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= nav.links.length) return;
    const links = [...nav.links];
    [links[idx], links[newIdx]] = [links[newIdx], links[idx]];
    links.forEach((l, i) => { l.sort_order = i; });
    setNavigation({ ...nav, links });
  };

  // ── Slug ──

  const handleSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(sanitized);
  };

  const handleSlugBlur = () => {
    if (draftConfig?.slug) checkSlug(draftConfig.slug);
  };

  // ── SEO ──

  const updateSeoField = (field: keyof SeoConfig, value: unknown) => {
    if (!draftConfig) return;
    setSeo({ ...draftConfig.seo_config, [field]: value });
  };

  // ── Prevent leaving with unsaved changes ──

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Loading / Error ──

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading website builder...</p>
        </div>
      </div>
    );
  }

  if (error && !draftConfig) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-foreground-600 mb-4">{error}</p>
        <button onClick={retry} className="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-label cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap">
          Retry
        </button>
      </div>
    );
  }

  if (!draftConfig) return null;

  const config = draftConfig;
  const selectedSection = config.sections_config.find((s) => s.id === selectedSectionId);
  const previewWidth = previewMode === 'mobile' ? 375 : previewMode === 'tablet' ? 768 : '100%';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-4 md:-m-6 lg:-m-8">
      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 h-14 border-b border-secondary-100 bg-white flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors"
            aria-label="Back"
          >
            <i className="ri-arrow-left-line" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-label font-semibold text-foreground-900 truncate">Wedding Website Builder</h1>
          </div>
          <StatusBadge saveStatus={saveStatus} publishStatus={publishStatus} isDirty={isDirty} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1.5 text-xs font-label rounded-md border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <i className={`${showPreview ? 'ri-eye-off-line' : 'ri-eye-line'} mr-1.5`} />
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={!isDirty || saveStatus === 'saving'}
            className="px-3 py-1.5 text-xs font-label rounded-md border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <i className="ri-save-line mr-1.5" />
            {saveStatus === 'saving' ? 'Saving...' : 'Save draft'}
          </button>
          {publishStatus === 'published' ? (
            <button
              onClick={() => setUnpublishConfirm(true)}
              className="px-3 py-1.5 text-xs font-label rounded-md bg-secondary-100 text-secondary-700 hover:bg-secondary-200 cursor-pointer transition-colors whitespace-nowrap"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishStatus === 'publishing'}
              className="px-4 py-1.5 text-xs font-label rounded-md bg-primary-500 text-white hover:bg-primary-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <i className="ri-rocket-line mr-1.5" />
              {publishStatus === 'publishing' ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <div className="flex-shrink-0 h-10 border-b border-secondary-100 bg-white flex items-center px-4 md:px-6 gap-6">
        {(['pages', 'design', 'navigation', 'domain', 'seo'] as BuilderTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === 'domain') { navigate('/app/website/domain'); return; }
              if (tab === 'seo') { navigate('/app/website/seo'); return; }
              setActiveTab(tab);
            }}
            className={`text-xs font-label cursor-pointer transition-colors whitespace-nowrap pb-2.5 pt-2 border-b-2 -mb-[1px] ${
              activeTab === tab || (tab === 'domain' && location.pathname === '/app/website/domain') || (tab === 'seo' && location.pathname === '/app/website/seo')
                ? 'text-primary-600 border-primary-500 font-semibold'
                : 'text-foreground-500 border-transparent hover:text-foreground-700'
            }`}
          >
            {tab === 'pages' && <><i className="ri-pages-line mr-1.5" />Pages</>}
            {tab === 'design' && <><i className="ri-palette-line mr-1.5" />Design</>}
            {tab === 'navigation' && <><i className="ri-menu-line mr-1.5" />Navigation</>}
            {tab === 'domain' && <><i className="ri-global-line mr-1.5" />Domain</>}
            {tab === 'seo' && <><i className="ri-search-line mr-1.5" />SEO &amp; Sharing</>}
          </button>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Controls */}
        <div className="w-72 lg:w-80 flex-shrink-0 border-r border-secondary-100 bg-white overflow-y-auto">
          {activeTab === 'pages' && (
            <PagesTab
              sections={config.sections_config}
              selectedSectionId={selectedSectionId}
              onSelect={setSelectedSectionId}
              onToggle={toggleSection}
              onMove={moveSection}
              onReset={resetSection}
              onAddCustom={addCustomSection}
              onRemove={removeSection}
            />
          )}

          {activeTab === 'design' && (
            <DesignTab
              theme={config.theme_config}
              onApplyPreset={applyPreset}
              onUpdateField={updateThemeField}
            />
          )}

          {activeTab === 'navigation' && (
            <NavigationTab
              nav={config.navigation_config}
              sections={config.sections_config}
              onToggleLink={toggleNavLink}
              onUpdateLabel={updateNavLinkLabel}
              onMoveLink={moveNavLink}
              onSetNav={(nav) => setNavigation(nav)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              seo={config.seo_config}
              slug={config.slug || ''}
              slugAvailable={slugAvailable}
              slugChecking={slugChecking}
              onSlugChange={handleSlugChange}
              onSlugBlur={handleSlugBlur}
              onUpdateSeo={updateSeoField}
              publishStatus={publishStatus}
            />
          )}
        </div>

        {/* Center — Preview */}
        {showPreview && (
          <div className="flex-1 bg-background-50 overflow-y-auto">
            {/* Preview toolbar */}
            <div className="sticky top-0 z-10 bg-white border-b border-secondary-100 flex items-center justify-between px-4 h-10">
              <span className="text-[11px] text-foreground-400 font-label uppercase tracking-wider">Preview</span>
              <div className="flex items-center gap-1">
                {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`w-8 h-7 flex items-center justify-center rounded text-xs cursor-pointer transition-colors ${
                      previewMode === mode ? 'bg-primary-100 text-primary-600' : 'text-foreground-400 hover:text-foreground-600'
                    }`}
                    title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} preview`}
                  >
                    <i className={mode === 'desktop' ? 'ri-computer-line' : mode === 'tablet' ? 'ri-tablet-line' : 'ri-smartphone-line'} />
                  </button>
                ))}
              </div>
            </div>
            {/* Preview pane */}
            <div className="flex justify-center p-4">
              <div
                style={{ width: typeof previewWidth === 'number' ? previewWidth : '100%', maxWidth: '100%' }}
                className="bg-white border border-secondary-200 shadow-sm rounded-lg overflow-hidden transition-all duration-200"
              >
                <PreviewContent config={config} wedding={activeWedding} />
              </div>
            </div>
          </div>
        )}

        {/* Right Panel — Section Settings */}
        {activeTab === 'pages' && selectedSection && showPreview && (
          <div className="w-72 lg:w-80 flex-shrink-0 border-l border-secondary-100 bg-white overflow-y-auto">
            <SectionEditor
              section={selectedSection}
              onChange={(updates) => updateSection(selectedSection.id, updates)}
              onReset={() => resetSection(selectedSection.id)}
              onRemove={selectedSection.type === 'custom_text' ? () => removeSection(selectedSection.id) : undefined}
            />
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-label shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-accent-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* ── Confirm Dialogs ── */}
      {unpublishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setUnpublishConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-label font-semibold text-foreground-900 mb-2">Unpublish website?</h3>
            <p className="text-xs text-foreground-500 mb-4">Guests will no longer see your wedding website. Published content will be saved as a draft.</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setUnpublishConfirm(false)} className="px-4 py-2 text-xs font-label rounded-md border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={handleUnpublish} className="px-4 py-2 text-xs font-label rounded-md bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors whitespace-nowrap">Unpublish</button>
            </div>
          </div>
        </div>
      )}

      {discardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setDiscardConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-label font-semibold text-foreground-900 mb-2">Discard unsaved changes?</h3>
            <p className="text-xs text-foreground-500 mb-4">Your changes since last save will be lost.</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDiscardConfirm(false)} className="px-4 py-2 text-xs font-label rounded-md border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={handleDiscard} className="px-4 py-2 text-xs font-label rounded-md bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors whitespace-nowrap">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════ PAGES TAB ════════════════

function PagesTab({
  sections, selectedSectionId, onSelect, onToggle, onMove, onReset, onAddCustom, onRemove,
}: {
  sections: WebsiteSection[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onReset: (id: string) => void;
  onAddCustom: () => void;
  onRemove: (id: string) => void;
}) {
  const visibleSections = sections.filter((s) => s.visible).length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-foreground-400 font-label uppercase tracking-wider">
          {visibleSections} of {sections.length} visible
        </span>
      </div>

      <div className="space-y-0.5">
        {sections.map((section, idx) => {
          const isCustom = section.type === 'custom_text';
          return (
            <div
              key={section.id}
              className={`group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                selectedSectionId === section.id
                  ? 'bg-primary-50 border border-primary-200'
                  : 'border border-transparent hover:bg-background-100'
              }`}
              onClick={() => onSelect(section.id)}
            >
              {/* Drag handle proxy — move buttons */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onMove(section.id, 'up'); }}
                  disabled={idx === 0}
                  className="w-4 h-4 flex items-center justify-center text-foreground-300 hover:text-foreground-600 disabled:opacity-20 cursor-pointer"
                  aria-label="Move up"
                >
                  <i className="ri-arrow-up-s-line text-xs" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMove(section.id, 'down'); }}
                  disabled={idx === sections.length - 1}
                  className="w-4 h-4 flex items-center justify-center text-foreground-300 hover:text-foreground-600 disabled:opacity-20 cursor-pointer"
                  aria-label="Move down"
                >
                  <i className="ri-arrow-down-s-line text-xs" />
                </button>
              </div>

              {/* Toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(section.id); }}
                className={`w-8 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0 ${
                  section.visible ? 'bg-primary-500' : 'bg-secondary-200'
                }`}
                aria-label={`${section.visible ? 'Hide' : 'Show'} ${section.label}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  section.visible ? 'left-[14px]' : 'left-0.5'
                }`} />
              </button>

              {/* Label */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <i className={`${SECTION_ICONS[section.type] || 'ri-file-line'} text-sm ${section.visible ? 'text-foreground-600' : 'text-foreground-300'} flex-shrink-0`} />
                <span className={`text-xs font-label truncate ${section.visible ? 'text-foreground-800' : 'text-foreground-400 line-through'}`}>
                  {isCustom ? ((section.config as Record<string, unknown>).internal_name as string || 'Custom Section') : SECTION_LABELS[section.type]}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {isCustom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(section.id); }}
                    className="w-6 h-6 flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer rounded"
                    aria-label="Remove section"
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddCustom}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-secondary-300 text-xs text-foreground-500 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
      >
        <i className="ri-add-line" /> Add custom section
      </button>
    </div>
  );
}

// ════════════════ SECTION EDITOR ════════════════

function SectionEditor({
  section, onChange, onReset, onRemove,
}: {
  section: WebsiteSection;
  onChange: (updates: Partial<WebsiteSection>) => void;
  onReset: () => void;
  onRemove?: () => void;
}) {
  const cfg = section.config as Record<string, unknown>;

  const updateConfig = (field: string, value: unknown) => {
    onChange({ config: { ...cfg, [field]: value } });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-label font-semibold text-foreground-900">
          {SECTION_LABELS[section.type] || 'Section'}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={onReset} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors" title="Reset section" aria-label="Reset section">
            <i className="ri-restart-line text-sm" />
          </button>
          {onRemove && (
            <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors" title="Remove section" aria-label="Remove section">
              <i className="ri-delete-bin-line text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Common fields for most sections */}
      {['welcome', 'story', 'schedule', 'venue', 'travel', 'accommodation', 'dress_code', 'wedding_party', 'registry', 'gallery', 'faqs', 'contact', 'rsvp'].includes(section.type) && (
        <div className="space-y-3">
          <Field label="Heading">
            <input
              type="text"
              value={(cfg.heading as string) || ''}
              onChange={(e) => updateConfig('heading', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900"
              placeholder="Section heading"
            />
          </Field>
          {section.type !== 'wedding_party' && (
            <Field label="Introduction">
              <textarea
                value={(cfg.introduction as string) || ''}
                onChange={(e) => updateConfig('introduction', e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 resize-none"
                placeholder="Brief introduction text"
              />
            </Field>
          )}
        </div>
      )}

      {/* Hero-specific */}
      {section.type === 'hero' && (
        <div className="space-y-3">
          <Field label="Title (couple names)">
            <input type="text" value={(cfg.title as string) || ''} onChange={(e) => updateConfig('title', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" placeholder="Emma & James" />
          </Field>
          <Field label="Subtitle">
            <input type="text" value={(cfg.subtitle as string) || ''} onChange={(e) => updateConfig('subtitle', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" placeholder="Celebrating our love" />
          </Field>
          <Field label="Overlay strength">
            <input type="range" min="0" max="60" value={cfg.overlay_strength as number || 40} onChange={(e) => updateConfig('overlay_strength', parseInt(e.target.value))} className="w-full" />
          </Field>
          <Field label="Text alignment">
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} onClick={() => updateConfig('text_alignment', a)} className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${cfg.text_alignment === a ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Primary button label">
            <input type="text" value={(cfg.primary_button_label as string) || ''} onChange={(e) => updateConfig('primary_button_label', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" />
          </Field>
          <Field label="Secondary button label">
            <input type="text" value={(cfg.secondary_button_label as string) || ''} onChange={(e) => updateConfig('secondary_button_label', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_countdown} onChange={(e) => updateConfig('show_countdown', e.target.checked)} className="rounded" />
            Show countdown
          </label>
        </div>
      )}

      {/* Welcome / Story */}
      {(section.type === 'welcome' || section.type === 'story') && (
        <div className="space-y-3 mt-3">
          <Field label="Body text">
            <textarea value={(cfg.body as string) || ''} onChange={(e) => updateConfig('body', e.target.value)} rows={4} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 resize-none" placeholder="Write your message..." />
          </Field>
          <Field label="Image position">
            <div className="flex gap-1">
              {(['none', 'left', 'right', 'top'] as const).map((p) => (
                <button key={p} onClick={() => updateConfig('image_position', p)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${cfg.image_position === p ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                  {p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Schedule */}
      {section.type === 'schedule' && (
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            {['show_date', 'show_times', 'show_venues', 'show_dress_code', 'show_arrival_notes', 'show_transport_notes'].map((f) => (
              <label key={f} className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
                <input type="checkbox" checked={!!cfg[f]} onChange={(e) => updateConfig(f, e.target.checked)} className="rounded" />
                {f.replace('show_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>
          <Field label="Layout">
            <div className="flex gap-1">
              {(['timeline', 'cards', 'compact'] as const).map((l) => (
                <button key={l} onClick={() => updateConfig('layout', l)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${cfg.layout === l ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Venue */}
      {section.type === 'venue' && (
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            {['show_full_address', 'show_map', 'show_directions', 'show_parking', 'show_accessibility', 'show_contact'].map((f) => (
              <label key={f} className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
                <input type="checkbox" checked={!!cfg[f]} onChange={(e) => updateConfig(f, e.target.checked)} className="rounded" />
                {f.replace('show_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Travel */}
      {section.type === 'travel' && (
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            {['show_hotels', 'show_transport', 'show_parking', 'show_taxi', 'show_attractions', 'show_map_links'].map((f) => (
              <label key={f} className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
                <input type="checkbox" checked={!!cfg[f]} onChange={(e) => updateConfig(f, e.target.checked)} className="rounded" />
                {f.replace('show_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Accommodation */}
      {section.type === 'accommodation' && (
        <div className="space-y-3 mt-3">
          <Field label="Max items to show">
            <input type="number" min={1} max={20} value={(cfg.max_items as number) || 6} onChange={(e) => updateConfig('max_items', parseInt(e.target.value) || 6)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" />
          </Field>
        </div>
      )}

      {/* Registry */}
      {section.type === 'registry' && (
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            {['show_gifts', 'show_funds', 'show_charities', 'show_external', 'show_contribution_guidance'].map((f) => (
              <label key={f} className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
                <input type="checkbox" checked={!!cfg[f]} onChange={(e) => updateConfig(f, e.target.checked)} className="rounded" />
                {f.replace('show_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {section.type === 'gallery' && (
        <div className="space-y-3 mt-3">
          <Field label="Layout">
            <div className="flex gap-1">
              {(['grid', 'masonry', 'carousel'] as const).map((l) => (
                <button key={l} onClick={() => updateConfig('layout', l)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${cfg.layout === l ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Max items">
            <input type="number" min={1} max={50} value={(cfg.max_items as number) || 12} onChange={(e) => updateConfig('max_items', parseInt(e.target.value) || 12)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_upload_invitation} onChange={(e) => updateConfig('show_upload_invitation', e.target.checked)} className="rounded" />
            Show upload invitation
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_live_wall_link} onChange={(e) => updateConfig('show_live_wall_link', e.target.checked)} className="rounded" />
            Show live wall link
          </label>
        </div>
      )}

      {/* FAQs */}
      {section.type === 'faqs' && (
        <div className="space-y-3 mt-3">
          <Field label="Max questions">
            <input type="number" min={1} max={50} value={(cfg.max_questions as number) || 10} onChange={(e) => updateConfig('max_questions', parseInt(e.target.value) || 10)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_search} onChange={(e) => updateConfig('show_search', e.target.checked)} className="rounded" />
            Show search
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.expand_first} onChange={(e) => updateConfig('expand_first', e.target.checked)} className="rounded" />
            Expand first question
          </label>
        </div>
      )}

      {/* Contact */}
      {section.type === 'contact' && (
        <div className="space-y-3 mt-3">
          <Field label="Support message">
            <textarea value={(cfg.support_message as string) || ''} onChange={(e) => updateConfig('support_message', e.target.value)} rows={2} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 resize-none" placeholder="If you have any questions..." />
          </Field>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_question_link} onChange={(e) => updateConfig('show_question_link', e.target.checked)} className="rounded" />
            Show question link
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_organiser_contact} onChange={(e) => updateConfig('show_organiser_contact', e.target.checked)} className="rounded" />
            Show organiser contact
          </label>
        </div>
      )}

      {/* RSVP */}
      {section.type === 'rsvp' && (
        <div className="space-y-3 mt-3">
          <Field label="Button label">
            <input type="text" value={(cfg.button_label as string) || ''} onChange={(e) => updateConfig('button_label', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" placeholder="Respond Now" />
          </Field>
          <Field label="Closed state text">
            <textarea value={(cfg.closed_text as string) || ''} onChange={(e) => updateConfig('closed_text', e.target.value)} rows={2} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 resize-none" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_deadline} onChange={(e) => updateConfig('show_deadline', e.target.checked)} className="rounded" />
            Show deadline
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_update_message} onChange={(e) => updateConfig('show_update_message', e.target.checked)} className="rounded" />
            Show update message
          </label>
        </div>
      )}

      {/* Custom text */}
      {section.type === 'custom_text' && (
        <div className="space-y-3 mt-3">
          <Field label="Internal name">
            <input type="text" value={(cfg.internal_name as string) || ''} onChange={(e) => updateConfig('internal_name', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" placeholder="e.g. Our Gift List" />
          </Field>
          <Field label="Public heading">
            <input type="text" value={(cfg.public_heading as string) || ''} onChange={(e) => updateConfig('public_heading', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" />
          </Field>
          <Field label="Body">
            <textarea value={(cfg.body as string) || ''} onChange={(e) => updateConfig('body', e.target.value)} rows={4} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 resize-none" />
          </Field>
          <Field label="Background style">
            <div className="flex gap-1">
              {(['none', 'light', 'dark', 'accent'] as const).map((s) => (
                <button key={s} onClick={() => updateConfig('background_style', s)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${cfg.background_style === s ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Dress code — minimal */}
      {section.type === 'dress_code' && (
        <div className="space-y-3 mt-3">
          <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.show_children_notes} onChange={(e) => updateConfig('show_children_notes', e.target.checked)} className="rounded" />
            Show children notes
          </label>
        </div>
      )}
    </div>
  );
}

// ════════════════ DESIGN TAB ════════════════

function DesignTab({
  theme, onApplyPreset, onUpdateField,
}: {
  theme: ThemeConfig;
  onApplyPreset: (preset: DesignPreset) => void;
  onUpdateField: (field: keyof ThemeConfig, value: string | number | boolean) => void;
}) {
  return (
    <div className="p-4 space-y-5">
      {/* Presets */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Presets</p>
        <div className="grid grid-cols-2 gap-1.5">
          {DESIGN_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => onApplyPreset(p)}
              className={`px-3 py-2 text-xs font-label rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                theme.preset === p.key
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'border border-secondary-200 text-foreground-600 hover:bg-background-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Typography</p>
        <Field label="Heading font">
          <select value={theme.heading_font} onChange={(e) => onUpdateField('heading_font', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900">
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Body font">
          <select value={theme.body_font} onChange={(e) => onUpdateField('body_font', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900">
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
      </div>

      {/* Colors */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Colors</p>
        <div className="space-y-2">
          <ColorInput label="Primary" value={theme.primary_color} onChange={(v) => onUpdateField('primary_color', v)} />
          <ColorInput label="Secondary" value={theme.secondary_color} onChange={(v) => onUpdateField('secondary_color', v)} />
          <ColorInput label="Accent" value={theme.accent_color} onChange={(v) => onUpdateField('accent_color', v)} />
          <ColorInput label="Background" value={theme.background_color} onChange={(v) => onUpdateField('background_color', v)} />
          <ColorInput label="Text" value={theme.text_color} onChange={(v) => onUpdateField('text_color', v)} />
        </div>
      </div>

      {/* Layout */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Layout</p>
        <Field label="Button style">
          <div className="flex gap-1">
            {(['rounded', 'pill', 'square'] as const).map((s) => (
              <button key={s} onClick={() => onUpdateField('button_style', s)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${theme.button_style === s ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Card style">
          <div className="flex gap-1">
            {(['flat', 'outlined', 'elevated'] as const).map((s) => (
              <button key={s} onClick={() => onUpdateField('card_style', s)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${theme.card_style === s ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Section spacing">
          <div className="flex gap-1">
            {(['compact', 'normal', 'spacious'] as const).map((s) => (
              <button key={s} onClick={() => onUpdateField('section_spacing', s)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${theme.section_spacing === s ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Content width">
          <div className="flex gap-1">
            {(['narrow', 'normal', 'wide'] as const).map((s) => (
              <button key={s} onClick={() => onUpdateField('content_width', s)} className={`px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors whitespace-nowrap ${theme.content_width === s ? 'bg-primary-100 text-primary-700 font-medium' : 'border border-secondary-200 text-foreground-500 hover:bg-background-100'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Border radius">
          <input type="range" min="0" max="24" value={theme.border_radius} onChange={(e) => onUpdateField('border_radius', parseInt(e.target.value))} className="w-full" />
          <span className="text-[10px] text-foreground-400">{theme.border_radius}px</span>
        </Field>
      </div>
    </div>
  );
}

// ════════════════ NAVIGATION TAB ════════════════

function NavigationTab({
  nav, sections, onToggleLink, onUpdateLabel, onMoveLink, onSetNav,
}: {
  nav: NavigationConfig;
  sections: WebsiteSection[];
  onToggleLink: (sectionId: string) => void;
  onUpdateLabel: (linkId: string, label: string) => void;
  onMoveLink: (linkId: string, dir: 'up' | 'down') => void;
  onSetNav: (nav: NavigationConfig) => void;
}) {
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Navigation bar</p>
        <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer mb-2">
          <input type="checkbox" checked={nav.show_top_nav} onChange={(e) => onSetNav({ ...nav, show_top_nav: e.target.checked })} className="rounded" />
          Show top navigation
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer mb-2">
          <input type="checkbox" checked={nav.sticky} onChange={(e) => onSetNav({ ...nav, sticky: e.target.checked })} className="rounded" />
          Sticky navigation
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
          <input type="checkbox" checked={nav.show_initials} onChange={(e) => onSetNav({ ...nav, show_initials: e.target.checked })} className="rounded" />
          Show couple initials
        </label>
      </div>

      {/* Available sections to add */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Links ({nav.links.length})</p>
        {nav.links.length === 0 && (
          <p className="text-xs text-foreground-400 italic mb-2">No navigation links yet. Add visible sections below.</p>
        )}
        <div className="space-y-0.5 mb-3">
          {nav.links.map((link, idx) => (
            <div key={link.id} className="flex items-center gap-1 group">
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => onMoveLink(link.id, 'up')} disabled={idx === 0} className="w-4 h-3.5 flex items-center justify-center text-foreground-300 hover:text-foreground-600 disabled:opacity-20 cursor-pointer" aria-label="Move up">
                  <i className="ri-arrow-up-s-line text-[10px]" />
                </button>
                <button onClick={() => onMoveLink(link.id, 'down')} disabled={idx === nav.links.length - 1} className="w-4 h-3.5 flex items-center justify-center text-foreground-300 hover:text-foreground-600 disabled:opacity-20 cursor-pointer" aria-label="Move down">
                  <i className="ri-arrow-down-s-line text-[10px]" />
                </button>
              </div>
              <input
                type="text"
                value={link.label}
                onChange={(e) => onUpdateLabel(link.id, e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900"
              />
              <button
                onClick={() => onToggleLink(link.section_id)}
                className="w-6 h-6 flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer rounded"
                aria-label="Remove link"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Visibility toggle for each visible section */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Add links from visible sections</p>
        <div className="space-y-0.5">
          {visibleSections.map((s) => {
            const linked = nav.links.some((l) => l.section_id === s.id);
            return (
              <button
                key={s.id}
                onClick={() => onToggleLink(s.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors text-left ${
                  linked ? 'bg-primary-50 text-primary-700' : 'text-foreground-500 hover:bg-background-100'
                }`}
              >
                <span className={`w-4 h-4 flex items-center justify-center rounded border text-[10px] ${linked ? 'bg-primary-500 border-primary-500 text-white' : 'border-secondary-300'}`}>
                  {linked ? <i className="ri-check-line" /> : null}
                </span>
                {SECTION_LABELS[s.type] || s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════ SETTINGS TAB ════════════════

function SettingsTab({
  seo, slug, slugAvailable, slugChecking, onSlugChange, onSlugBlur, onUpdateSeo, publishStatus,
}: {
  seo: SeoConfig;
  slug: string;
  slugAvailable: boolean | null;
  slugChecking: boolean;
  onSlugChange: (v: string) => void;
  onSlugBlur: () => void;
  onUpdateSeo: (field: keyof SeoConfig, value: unknown) => void;
  publishStatus: string;
}) {
  return (
    <div className="p-4 space-y-5">
      {/* Public URL */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Public URL</p>
        <Field label="Website slug">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-400">/w/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              onBlur={onSlugBlur}
              className="flex-1 px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900"
              placeholder="emma-and-james"
            />
          </div>
          {slugChecking && <p className="text-[10px] text-foreground-400 mt-1">Checking availability...</p>}
          {!slugChecking && slugAvailable === true && <p className="text-[10px] text-accent-600 mt-1">Available</p>}
          {!slugChecking && slugAvailable === false && <p className="text-[10px] text-red-500 mt-1">Already taken</p>}
          {slug && slug.length < 3 && <p className="text-[10px] text-foreground-400 mt-1">Slug must be at least 3 characters</p>}
          {RESERVED_SLUGS.includes(slug) && <p className="text-[10px] text-red-500 mt-1">This slug is reserved</p>}
        </Field>
      </div>

      {/* SEO */}
      <div>
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">SEO & Sharing</p>
        <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer mb-3">
          <input type="checkbox" checked={seo.search_indexing} onChange={(e) => onUpdateSeo('search_indexing', e.target.checked)} className="rounded" />
          Allow search engine indexing
        </label>
        <Field label="Social sharing title">
          <input type="text" value={seo.social_title || ''} onChange={(e) => onUpdateSeo('social_title', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900" placeholder="Emma & James Wedding" />
        </Field>
        <Field label="Social sharing description">
          <textarea value={seo.social_description || ''} onChange={(e) => onUpdateSeo('social_description', e.target.value)} rows={2} className="w-full px-2.5 py-1.5 text-xs border border-secondary-200 rounded-md bg-white text-foreground-900 resize-none" placeholder="Join us in celebrating..." maxLength={200} />
          <p className="text-[10px] text-foreground-400 text-right">{(seo.social_description || '').length}/200</p>
        </Field>
      </div>

      {/* Status info */}
      <div className="bg-background-50 rounded-lg p-3">
        <p className="text-xs text-foreground-400 font-label uppercase tracking-wider mb-2">Status</p>
        <p className="text-xs text-foreground-600">
          {publishStatus === 'published' ? 'Your website is live and visible to guests.' : 'Your website is currently in draft mode and hidden from guests.'}
        </p>
      </div>
    </div>
  );
}

// ════════════════ PREVIEW ════════════════

function PreviewContent({ config, wedding }: { config: ReturnType<typeof useWeddingWebsiteBuilder>['draftConfig']; wedding: { partner_one_name?: string; partner_two_name?: string; wedding_date?: string } | null }) {
  if (!config) return null;
  const theme = config.theme_config;
  const visibleSections = config.sections_config.filter((s) => s.visible);
  const coupleNames = `${wedding?.partner_one_name || 'Partner One'} & ${wedding?.partner_two_name || 'Partner Two'}`;
  const spacing = theme.section_spacing === 'compact' ? 'py-12' : theme.section_spacing === 'spacious' ? 'py-24' : 'py-16';
  const widthClass = theme.content_width === 'narrow' ? 'max-w-3xl' : theme.content_width === 'wide' ? 'max-w-6xl' : 'max-w-5xl';
  const cardStyles = theme.card_style === 'outlined' ? 'border border-secondary-100' : theme.card_style === 'elevated' ? 'shadow-sm' : '';
  const btnRadius = theme.button_style === 'pill' ? 'rounded-full' : theme.button_style === 'square' ? 'rounded-none' : `rounded-[${theme.border_radius}px]`;

  return (
    <div style={{ fontFamily: `"${theme.body_font}", serif`, backgroundColor: theme.background_color, color: theme.text_color }}>
      {/* Each visible section renders a simplified preview */}
      {visibleSections.map((section) => {
        const cfg = section.config as Record<string, unknown>;

        // Shared section wrapper
        const SectionWrap = ({ id, bg = '' }: { id: string; bg?: string }) => (
          <section id={id} className={`${spacing} px-4 md:px-6 ${bg}`}>
            <div className={`${widthClass} mx-auto`}>{null}</div>
          </section>
        );

        switch (section.type) {
          case 'hero': {
            return (
              <section key={section.id} id="hero" className="relative h-[420px] flex items-center justify-center overflow-hidden">
                {cfg.image_url ? (
                  <img src={cfg.image_url as string} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ backgroundColor: theme.primary_color, opacity: 0.15 }} />
                )}
                <div className="absolute inset-0 bg-black/40" style={{ opacity: (cfg.overlay_strength as number || 40) / 100 }} />
                <div className="relative z-10 text-center px-4" style={{ textAlign: (cfg.text_alignment as 'left' | 'center' | 'right') || 'center' }}>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: `"${theme.heading_font}", serif` }}>
                    {cfg.title || coupleNames}
                  </h1>
                  {cfg.subtitle && <p className="text-lg text-white/80 mb-6">{cfg.subtitle as string}</p>}
                  <div className="flex items-center justify-center gap-3">
                    {cfg.primary_button_label && (
                      <button style={{ backgroundColor: theme.primary_color }} className={`${btnRadius} px-6 py-2.5 text-sm font-label text-white cursor-pointer whitespace-nowrap`}>
                        {cfg.primary_button_label as string}
                      </button>
                    )}
                    {cfg.secondary_button_label && (
                      <button className={`${btnRadius} px-6 py-2.5 text-sm font-label text-white border border-white/40 cursor-pointer whitespace-nowrap`}>
                        {cfg.secondary_button_label as string}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          case 'welcome':
          case 'story': {
            const hasImg = cfg.image_position && cfg.image_position !== 'none';
            return (
              <section key={section.id} id={section.type} className={spacing}>
                <div className={`${widthClass} mx-auto px-4 md:px-6`}>
                  <div className={`flex flex-col ${hasImg && cfg.image_position === 'left' ? 'md:flex-row' : hasImg && cfg.image_position === 'right' ? 'md:flex-row-reverse' : ''} gap-8 items-center`}>
                    <div className={hasImg ? 'flex-1' : 'max-w-2xl mx-auto text-center'}>
                      <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: `"${theme.heading_font}", serif` }}>
                        {cfg.heading || SECTION_LABELS[section.type]}
                      </h2>
                      {cfg.body && <p className="text-sm leading-relaxed whitespace-pre-line" style={{ opacity: 0.75 }}>{cfg.body as string}</p>}
                    </div>
                    {hasImg && cfg.image_url && (
                      <div className="flex-1">
                        <img src={cfg.image_url as string} alt="" className="w-full h-64 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          case 'schedule': {
            return (
              <section key={section.id} id="schedule" className={`${spacing} bg-black/[0.02]`}>
                <div className={`${widthClass} mx-auto px-4 md:px-6`}>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ fontFamily: `"${theme.heading_font}", serif` }}>{cfg.heading || 'Schedule'}</h2>
                  {cfg.introduction && <p className="text-sm text-center mb-8" style={{ opacity: 0.7 }}>{cfg.introduction as string}</p>}
                  <div className={`${cardStyles} bg-white rounded-lg p-6`}>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4 pb-4 border-b border-secondary-100 last:border-0 last:pb-0">
                          <div className="text-center flex-shrink-0 w-16">
                            <p className="text-xs font-bold" style={{ color: theme.accent_color }}>2:00 PM</p>
                            <p className="text-[10px]" style={{ opacity: 0.5 }}>to 2:45 PM</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{['Ceremony', 'Reception', 'Evening Celebration'][i - 1]}</p>
                            <p className="text-xs" style={{ opacity: 0.6 }}>{['The Orangery', 'Marlborough Tavern', 'Grand Ballroom'][i - 1]}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          case 'gallery': {
            return (
              <section key={section.id} id="gallery" className={spacing}>
                <div className={`${widthClass} mx-auto px-4 md:px-6`}>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ fontFamily: `"${theme.heading_font}", serif` }}>{cfg.heading || 'Gallery'}</h2>
                  {cfg.introduction && <p className="text-sm text-center mb-8" style={{ opacity: 0.7 }}>{cfg.introduction as string}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="aspect-square bg-secondary-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          case 'faqs': {
            return (
              <section key={section.id} id="faqs" className={`${spacing} bg-black/[0.02]`}>
                <div className={`${widthClass} mx-auto px-4 md:px-6`}>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ fontFamily: `"${theme.heading_font}", serif` }}>{cfg.heading || 'FAQs'}</h2>
                  {cfg.introduction && <p className="text-sm text-center mb-8" style={{ opacity: 0.7 }}>{cfg.introduction as string}</p>}
                  <div className={`${cardStyles} bg-white rounded-lg divide-y divide-secondary-100`}>
                    {['What time should guests arrive?', 'Is there parking on site?', 'What is the dress code?'].map((q, i) => (
                      <div key={i} className="px-5 py-4 flex items-center justify-between cursor-pointer">
                        <span className="text-sm">{q}</span>
                        <i className="ri-add-line text-foreground-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          case 'rsvp': {
            return (
              <section key={section.id} id="rsvp" className={`${spacing} text-center`} style={{ backgroundColor: theme.primary_color, color: '#fff' }}>
                <div className="max-w-2xl mx-auto px-4">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: `"${theme.heading_font}", serif` }}>{cfg.heading || 'RSVP'}</h2>
                  {cfg.introduction && <p className="text-sm mb-6 opacity-80">{cfg.introduction as string}</p>}
                  <button className={`${btnRadius} px-8 py-3 font-label text-sm cursor-pointer whitespace-nowrap`} style={{ backgroundColor: '#fff', color: theme.primary_color }}>
                    {cfg.button_label || 'Respond Now'}
                  </button>
                </div>
              </section>
            );
          }

          // Generic sections (venue, travel, accommodation, dress_code, wedding_party, registry, contact, custom_text)
          default: {
            return (
              <section key={section.id} id={section.type} className={spacing}>
                <div className={`${widthClass} mx-auto px-4 md:px-6 text-center`}>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: `"${theme.heading_font}", serif` }}>
                    {cfg.heading || SECTION_LABELS[section.type]}
                  </h2>
                  {cfg.introduction && <p className="text-sm max-w-lg mx-auto" style={{ opacity: 0.7 }}>{cfg.introduction as string}</p>}
                  {!cfg.heading && !cfg.introduction && (
                    <div className={`${cardStyles} bg-white rounded-lg p-8`}>
                      <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-3">
                        <i className={`${SECTION_ICONS[section.type]} text-lg`} />
                      </div>
                      <p className="text-xs" style={{ opacity: 0.5 }}>Configure this section in the editor</p>
                    </div>
                  )}
                </div>
              </section>
            );
          }
        }
      })}

      {/* Footer */}
      <footer className="py-8 border-t border-secondary-100 text-center">
        <p className="text-xs" style={{ opacity: 0.4 }}>{coupleNames} — Wedding Website</p>
      </footer>
    </div>
  );
}

// ── Field wrapper ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="block text-[11px] font-label font-medium text-foreground-500 mb-1">{label}</label>
      {children}
    </div>
  );
}