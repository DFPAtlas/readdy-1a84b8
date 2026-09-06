import { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { DemoDataContextValue } from '@/demo/DemoDataProvider';
import type { FaqRelatedLink, FaqCategory } from '@/types/access';

// ── Types ──

export interface AdminFaq {
  id: string;
  wedding_id: string;
  category: FaqCategory | string;
  question: string;
  answer: string;
  related_links: FaqRelatedLink[];
  is_published: boolean;
  status: 'draft' | 'published' | 'archived';
  sort_order: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export type FaqStatusFilter = 'all' | 'published' | 'draft' | 'archived';

export const FAQ_CATEGORIES = [
  'general', 'invitations', 'dress_code', 'children', 'plus_ones',
  'travel', 'accommodation', 'parking', 'accessibility', 'food',
  'gifts', 'photos', 'timings',
] as const;

export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  general: 'General', invitations: 'Invitations', dress_code: 'Dress code',
  children: 'Children', plus_ones: 'Plus-ones', travel: 'Travel',
  accommodation: 'Accommodation', parking: 'Parking', accessibility: 'Accessibility',
  food: 'Food & drink', gifts: 'Gifts', photos: 'Photos', timings: 'Timings',
};

// ── Hook ──

export function useWeddingFaqs() {
  const { activeWedding } = useActiveWedding();
  const demoDataSafe = useDemoDataSafe();
  const demo = isDemoMode ? demoDataSafe : null;

  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const weddingRef = useRef<string | null>(null);

  const loadFaqs = useCallback(async () => {
    const weddingId = activeWedding?.id || null;
    if (!weddingId) { setLoading(false); return; }
    if (weddingRef.current === weddingId) return;
    weddingRef.current = weddingId;

    setLoading(true);
    setError(null);

    try {
      if (isDemoMode && demoDataSafe) {
        const state = (demoDataSafe as DemoDataContextValue).state;
        const weddingFaqs = state.faqs.filter((f) => f.wedding_id === weddingId);
        setFaqs(weddingFaqs as AdminFaq[]);
      } else {
        const { supabase } = await import('@/lib/supabase');
        const { data, error: fErr } = await supabase
          .from('wedding_faqs')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('sort_order');
        if (fErr) throw fErr;
        setFaqs((data || []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          wedding_id: f.wedding_id as string,
          category: (f.category as string) || 'general',
          question: f.question as string,
          answer: f.answer as string,
          related_links: (f.related_links as FaqRelatedLink[]) || [],
          is_published: (f.status === 'published') || !!(f.is_published),
          status: (f.status as AdminFaq['status']) || ((f.is_published as boolean) ? 'published' : 'draft'),
          sort_order: (f.sort_order as number) || 0,
          helpful_count: (f.helpful_count as number) || 0,
          not_helpful_count: (f.not_helpful_count as number) || 0,
          created_at: f.created_at as string,
          updated_at: f.updated_at as string,
        })));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, [activeWedding, demoDataSafe]);

  useEffect(() => { loadFaqs(); }, [loadFaqs]);

  useEffect(() => {
    if (activeWedding?.id && weddingRef.current && weddingRef.current !== activeWedding.id) {
      weddingRef.current = null;
      loadFaqs();
    }
  }, [activeWedding?.id, loadFaqs]);

  const addFaq = useCallback(async (faq: Omit<AdminFaq, 'id' | 'created_at' | 'updated_at' | 'helpful_count' | 'not_helpful_count'>) => {
    setSaving(true);
    try {
      if (demo) {
        const newFaq = { ...faq, id: `demo-faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, helpful_count: 0, not_helpful_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        demo.addFaq(newFaq as Parameters<typeof demo.addFaq>[0]);
      } else {
        const { supabase } = await import('@/lib/supabase');
        const { error: insErr } = await supabase.from('wedding_faqs').insert({
          wedding_id: faq.wedding_id, category: faq.category, question: faq.question,
          answer: faq.answer, related_links: faq.related_links,
          is_published: faq.status === 'published', status: faq.status,
          sort_order: faq.sort_order,
        });
        if (insErr) throw insErr;
      }
      await loadFaqs();
    } finally {
      setSaving(false);
    }
  }, [demo, loadFaqs]);

  const updateFaq = useCallback(async (faqId: string, updates: Partial<AdminFaq>) => {
    setSaving(true);
    try {
      if (demo) {
        demo.updateFaq(faqId, updates);
      } else {
        const { supabase } = await import('@/lib/supabase');
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.question !== undefined) payload.question = updates.question;
        if (updates.answer !== undefined) payload.answer = updates.answer;
        if (updates.related_links !== undefined) payload.related_links = updates.related_links;
        if (updates.status !== undefined) { payload.status = updates.status; payload.is_published = updates.status === 'published'; }
        if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
        const { error: upErr } = await supabase.from('wedding_faqs').update(payload).eq('id', faqId);
        if (upErr) throw upErr;
      }
      await loadFaqs();
    } finally {
      setSaving(false);
    }
  }, [demo, loadFaqs]);

  const duplicateFaq = useCallback(async (faqId: string) => {
    try {
      if (demo) { demo.duplicateFaq(faqId); }
      else {
        const original = faqs.find((f) => f.id === faqId);
        if (!original) return;
        const { supabase } = await import('@/lib/supabase');
        const { error: insErr } = await supabase.from('wedding_faqs').insert({
          wedding_id: original.wedding_id, category: original.category,
          question: `${original.question} (copy)`, answer: original.answer,
          related_links: original.related_links, is_published: false, status: 'draft',
          sort_order: faqs.length + 1,
        });
        if (insErr) throw insErr;
      }
      await loadFaqs();
    } catch (err: unknown) {
      throw err;
    }
  }, [demo, faqs, loadFaqs]);

  const archiveFaq = useCallback(async (faqId: string) => {
    try {
      if (demo) { demo.archiveFaq(faqId); }
      else {
        const { supabase } = await import('@/lib/supabase');
        const { error: upErr } = await supabase.from('wedding_faqs').update({ status: 'archived', is_published: false, updated_at: new Date().toISOString() }).eq('id', faqId);
        if (upErr) throw upErr;
      }
      await loadFaqs();
    } catch (err: unknown) { throw err; }
  }, [demo, loadFaqs]);

  const publishFaq = useCallback(async (faqId: string) => {
    try {
      if (demo) { demo.publishFaq(faqId); }
      else {
        const { supabase } = await import('@/lib/supabase');
        const { error: upErr } = await supabase.from('wedding_faqs').update({ status: 'published', is_published: true, updated_at: new Date().toISOString() }).eq('id', faqId);
        if (upErr) throw upErr;
      }
      await loadFaqs();
    } catch (err: unknown) { throw err; }
  }, [demo, loadFaqs]);

  const unpublishFaq = useCallback(async (faqId: string) => {
    try {
      if (demo) { demo.unpublishFaq(faqId); }
      else {
        const { supabase } = await import('@/lib/supabase');
        const { error: upErr } = await supabase.from('wedding_faqs').update({ status: 'draft', is_published: false, updated_at: new Date().toISOString() }).eq('id', faqId);
        if (upErr) throw upErr;
      }
      await loadFaqs();
    } catch (err: unknown) { throw err; }
  }, [demo, loadFaqs]);

  const deleteFaq = useCallback(async (faqId: string) => {
    try {
      if (demo) { demo.deleteFaq(faqId); }
      else {
        const { supabase } = await import('@/lib/supabase');
        const { error: delErr } = await supabase.from('wedding_faqs').delete().eq('id', faqId);
        if (delErr) throw delErr;
      }
      await loadFaqs();
    } catch (err: unknown) { throw err; }
  }, [demo, loadFaqs]);

  const reorderFaqs = useCallback(async (faqIds: string[]) => {
    try {
      if (demo) { demo.reorderFaqs(faqIds); }
      else {
        const { supabase } = await import('@/lib/supabase');
        for (let i = 0; i < faqIds.length; i++) {
          await supabase.from('wedding_faqs').update({ sort_order: i + 1, updated_at: new Date().toISOString() }).eq('id', faqIds[i]);
        }
      }
      await loadFaqs();
    } catch (err: unknown) { throw err; }
  }, [demo, loadFaqs]);

  return { faqs, loading, error, saving, addFaq, updateFaq, duplicateFaq, archiveFaq, publishFaq, unpublishFaq, deleteFaq, reorderFaqs, refresh: loadFaqs };
}