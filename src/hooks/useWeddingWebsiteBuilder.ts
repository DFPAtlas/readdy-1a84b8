// ── useWeddingWebsiteBuilder ──

import { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import { supabase } from '@/lib/supabase';
import type {
  WebsiteConfig,
  WebsiteSection,
  ThemeConfig,
  NavigationConfig,
  SeoConfig,
  SaveStatus,
  PublishStatus,
} from '@/types/website';
import {
  defaultThemeConfig,
  defaultNavigationConfig,
  defaultSeoConfig,
  defaultSectionsConfig,
} from '@/types/website';

interface UseBuilderReturn {
  config: WebsiteConfig | null;
  draftConfig: WebsiteConfig | null;
  loading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  publishStatus: PublishStatus;
  isDirty: boolean;
  slugAvailable: boolean | null;
  slugChecking: boolean;
  setSections: (sections: WebsiteSection[]) => void;
  updateSection: (sectionId: string, updates: Partial<WebsiteSection>) => void;
  setTheme: (theme: ThemeConfig) => void;
  setNavigation: (nav: NavigationConfig) => void;
  setSeo: (seo: SeoConfig) => void;
  setSlug: (slug: string) => void;
  checkSlug: (slug: string) => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  discardChanges: () => void;
  retry: () => void;
}

function buildDefaults(wedding: { partner_one_name?: string; partner_two_name?: string; slug?: string } | null): WebsiteConfig {
  const sections = defaultSectionsConfig();
  const heroSection = sections.find((s) => s.type === 'hero');
  if (heroSection && wedding) {
    (heroSection.config as Record<string, unknown>).title = `${wedding.partner_one_name || ''} & ${wedding.partner_two_name || ''}`;
  }

  return {
    id: '',
    wedding_id: '',
    status: 'draft',
    slug: wedding?.slug || '',
    theme_config: defaultThemeConfig(),
    navigation_config: defaultNavigationConfig(),
    sections_config: sections,
    seo_config: defaultSeoConfig(),
    published_config: null,
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function useWeddingWebsiteBuilder(): UseBuilderReturn {
  const { activeWedding } = useActiveWedding();
  const demoData = useDemoDataSafe();
  const demo = isDemoMode ? demoData : null;

  const [publishedConfig, setPublishedConfig] = useState<WebsiteConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('draft');
  const [isDirty, setIsDirty] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const initializedRef = useRef(false);
  const weddingIdRef = useRef<string | null>(null);

  // ── Load config ──
  const loadConfig = useCallback(async () => {
    if (!activeWedding) return;
    // Prevent re-initializing for the same wedding
    if (weddingIdRef.current === activeWedding.id && initializedRef.current) return;
    weddingIdRef.current = activeWedding.id;
    initializedRef.current = true;

    setLoading(true);
    setError(null);

    // Demo mode
    if (isDemoMode && demo) {
      const demoConfig = demo.getWebsiteConfig?.();
      if (demoConfig) {
        setPublishedConfig(demoConfig);
        setDraftConfig(JSON.parse(JSON.stringify(demoConfig)));
        setPublishStatus(demoConfig.status === 'published' ? 'published' : 'draft');
      } else {
        const defaults = buildDefaults(activeWedding);
        setPublishedConfig(null);
        setDraftConfig(defaults);
      }
      setLoading(false);
      return;
    }

    // Production mode
    try {
      const { data, error: queryError } = await supabase
        .from('wedding_website_configs')
        .select('*')
        .eq('wedding_id', activeWedding.id)
        .maybeSingle();

      if (queryError) throw queryError;

      if (data) {
        const cfg: WebsiteConfig = {
          id: data.id,
          wedding_id: data.wedding_id,
          status: data.status || 'draft',
          slug: data.slug || null,
          theme_config: data.theme_config || defaultThemeConfig(),
          navigation_config: data.navigation_config || defaultNavigationConfig(),
          sections_config: data.sections_config || defaultSectionsConfig(),
          seo_config: data.seo_config || defaultSeoConfig(),
          published_config: data.published_config || null,
          published_at: data.published_at || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setPublishedConfig(cfg.status === 'published' ? cfg : (cfg.published_config || null));
        setDraftConfig(cfg);
        setPublishStatus(cfg.status === 'published' ? 'published' : 'draft');
      } else {
        const defaults = buildDefaults(activeWedding);
        setPublishedConfig(null);
        setDraftConfig(defaults);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load website config';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeWedding, demo]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ── Mutators (update draftConfig locally) ──

  const setSections = useCallback((sections: WebsiteSection[]) => {
    setDraftConfig((prev) => prev ? { ...prev, sections_config: sections, updated_at: new Date().toISOString() } : null);
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<WebsiteSection>) => {
    setDraftConfig((prev) => {
      if (!prev) return null;
      const sections = prev.sections_config.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      );
      return { ...prev, sections_config: sections, updated_at: new Date().toISOString() };
    });
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  const setTheme = useCallback((theme: ThemeConfig) => {
    setDraftConfig((prev) => prev ? { ...prev, theme_config: theme, updated_at: new Date().toISOString() } : null);
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  const setNavigation = useCallback((nav: NavigationConfig) => {
    setDraftConfig((prev) => prev ? { ...prev, navigation_config: nav, updated_at: new Date().toISOString() } : null);
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  const setSeo = useCallback((seo: SeoConfig) => {
    setDraftConfig((prev) => prev ? { ...prev, seo_config: seo, updated_at: new Date().toISOString() } : null);
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

  const setSlug = useCallback((slug: string) => {
    setDraftConfig((prev) => prev ? { ...prev, slug, updated_at: new Date().toISOString() } : null);
    setIsDirty(true);
    setSaveStatus('unsaved');
    setSlugAvailable(null);
  }, []);

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    try {
      if (isDemoMode) {
        // Simulate check in demo
        await new Promise((r) => setTimeout(r, 400));
        setSlugAvailable(slug !== 'admin' && slug !== 'app' && slug !== 'api');
      } else {
        const { data } = await supabase
          .from('wedding_website_configs')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        setSlugAvailable(!data);
      }
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  // ── Save / Publish / Unpublish ──

  const saveDraft = useCallback(async () => {
    if (!draftConfig || !activeWedding) return;
    setSaveStatus('saving');
    try {
      if (isDemoMode && demo) {
        demo.saveWebsiteConfig?.(draftConfig);
        await new Promise((r) => setTimeout(r, 300));
      } else {
        const { data: existing } = await supabase
          .from('wedding_website_configs')
          .select('id')
          .eq('wedding_id', activeWedding.id)
          .maybeSingle();

        const payload = {
          wedding_id: activeWedding.id,
          status: draftConfig.status,
          slug: draftConfig.slug,
          theme_config: draftConfig.theme_config,
          navigation_config: draftConfig.navigation_config,
          sections_config: draftConfig.sections_config,
          seo_config: draftConfig.seo_config,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { error: updateError } = await supabase
            .from('wedding_website_configs')
            .update(payload)
            .eq('id', existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('wedding_website_configs')
            .insert(payload);
          if (insertError) throw insertError;
        }
      }
      setSaveStatus('saved');
      setIsDirty(false);
      // Update the draft so updated_at reflects saved time
      setDraftConfig((prev) => prev ? { ...prev, updated_at: new Date().toISOString() } : null);
    } catch (err: unknown) {
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
    }
  }, [draftConfig, activeWedding, demo]);

  const publish = useCallback(async () => {
    if (!draftConfig || !activeWedding) return;
    setPublishStatus('publishing');
    try {
      const publishedAt = new Date().toISOString();
      const published: WebsiteConfig = {
        ...draftConfig,
        status: 'published',
        published_config: null,
        published_at: publishedAt,
        updated_at: publishedAt,
      };

      if (isDemoMode && demo) {
        demo.saveWebsiteConfig?.(published);
        await new Promise((r) => setTimeout(r, 500));
      } else {
        const { data: existing } = await supabase
          .from('wedding_website_configs')
          .select('id')
          .eq('wedding_id', activeWedding.id)
          .maybeSingle();

        const payload = {
          wedding_id: activeWedding.id,
          status: 'published',
          slug: published.slug,
          theme_config: published.theme_config,
          navigation_config: published.navigation_config,
          sections_config: published.sections_config,
          seo_config: published.seo_config,
          published_config: published,
          published_at: publishedAt,
          updated_at: publishedAt,
        };

        if (existing) {
          const { error: updateError } = await supabase
            .from('wedding_website_configs')
            .update(payload)
            .eq('id', existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('wedding_website_configs')
            .insert(payload);
          if (insertError) throw insertError;
        }
      }

      setPublishedConfig(published);
      setDraftConfig(published);
      setPublishStatus('published');
      setSaveStatus('saved');
      setIsDirty(false);
    } catch (err: unknown) {
      setPublishStatus('error');
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setError(msg);
    }
  }, [draftConfig, activeWedding, demo]);

  const unpublish = useCallback(async () => {
    if (!activeWedding) return;
    try {
      if (isDemoMode && demo) {
        const updated = draftConfig ? { ...draftConfig, status: 'draft' as const, updated_at: new Date().toISOString() } : null;
        demo.saveWebsiteConfig?.(updated);
        setPublishedConfig(null);
        if (draftConfig) {
          setDraftConfig({ ...draftConfig, status: 'draft' });
        }
        setPublishStatus('draft');
        return;
      }

      const { error: updateError } = await supabase
        .from('wedding_website_configs')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('wedding_id', activeWedding.id);
      if (updateError) throw updateError;



      setPublishedConfig(null);
      setDraftConfig((prev) => prev ? { ...prev, status: 'draft' } : null);
      setPublishStatus('draft');
      setSaveStatus('saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unpublish failed';
      setError(msg);
    }
  }, [activeWedding, demo, draftConfig]);

  const discardChanges = useCallback(() => {
    if (publishedConfig) {
      setDraftConfig(JSON.parse(JSON.stringify(publishedConfig)));
    } else {
      setDraftConfig(buildDefaults(activeWedding));
    }
    setIsDirty(false);
    setSaveStatus('saved');
  }, [publishedConfig, activeWedding]);

  const retry = useCallback(() => {
    initializedRef.current = false;
    loadConfig();
  }, [loadConfig]);

  return {
    config: publishedConfig,
    draftConfig,
    loading,
    error,
    saveStatus,
    publishStatus,
    isDirty,
    slugAvailable,
    slugChecking,
    setSections,
    updateSection,
    setTheme,
    setNavigation,
    setSeo,
    setSlug,
    checkSlug,
    saveDraft,
    publish,
    unpublish,
    discardChanges,
    retry,
  };
}