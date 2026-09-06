import { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { DemoDataContextValue } from '@/demo/DemoDataProvider';

// ── Types ──

export interface AdminGuestQuestion {
  id: string;
  wedding_id: string;
  invitation_id: string;
  guest_id: string;
  category: string;
  subject: string;
  message: string;
  preferred_response_method: string;
  status: 'pending' | 'answered' | 'closed';
  response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest_name?: string;
  household_name?: string;
  invitation_name?: string;
}

export type QuestionStatusFilter = 'all' | 'pending' | 'answered' | 'closed';
export type QuestionSort = 'newest' | 'oldest';

export const QUESTION_CATEGORIES = [
  'general', 'invitations', 'dress_code', 'children', 'plus_ones',
  'travel', 'accommodation', 'parking', 'accessibility', 'food',
  'gifts', 'photos', 'timings',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', invitations: 'Invitations', dress_code: 'Dress code',
  children: 'Children', plus_ones: 'Plus-ones', travel: 'Travel',
  accommodation: 'Accommodation', parking: 'Parking', accessibility: 'Accessibility',
  food: 'Food & drink', gifts: 'Gifts', photos: 'Photos', timings: 'Timings',
};

// ── Hook ──

export function useGuestQuestionsAdmin() {
  const { activeWedding } = useActiveWedding();
  const demoDataSafe = useDemoDataSafe();
  const demo = isDemoMode ? demoDataSafe : null;

  const [questions, setQuestions] = useState<AdminGuestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const weddingRef = useRef<string | null>(null);

  const loadQuestions = useCallback(async () => {
    const weddingId = activeWedding?.id || null;
    if (!weddingId) { setLoading(false); return; }
    if (weddingRef.current === weddingId) return;
    weddingRef.current = weddingId;

    setLoading(true);
    setError(null);

    try {
      if (isDemoMode && demoDataSafe) {
        const state = (demoDataSafe as DemoDataContextValue).state;
        const weddingQuestions = state.guestQuestions.filter((q) => q.wedding_id === weddingId);
        const enriched: AdminGuestQuestion[] = weddingQuestions.map((q) => {
          const guest = state.guests.find((g) => g.id === q.guest_id);
          const invitation = state.invitations.find((inv) => inv.id === q.invitation_id);
          const household = guest?.household_id ? state.households.find((h) => h.id === guest.household_id) : undefined;
          return {
            ...q,
            guest_name: guest ? (guest.preferred_name || guest.full_name) : 'Unknown guest',
            household_name: household?.display_name || undefined,
            invitation_name: invitation?.internal_name || undefined,
          };
        });
        setQuestions(enriched);
      } else {
        // Production: fetch from Supabase
        const { supabase } = await import('@/lib/supabase');
        const { data, error: qErr } = await supabase
          .from('guest_questions')
          .select('*, guest:guests!inner(full_name, preferred_name, household_id), invitation:invitations!inner(internal_name)')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (qErr) throw qErr;
        const enriched: AdminGuestQuestion[] = (data || []).map((q: Record<string, unknown>) => {
          const guest = q.guest as Record<string, unknown> | undefined;
          const invitation = q.invitation as Record<string, unknown> | undefined;
          return {
            id: q.id as string,
            wedding_id: q.wedding_id as string,
            invitation_id: q.invitation_id as string,
            guest_id: q.guest_id as string,
            category: (q.category as string) || 'general',
            subject: q.subject as string,
            message: q.message as string,
            preferred_response_method: (q.preferred_response_method as string) || 'portal',
            status: (q.status as AdminGuestQuestion['status']) || 'pending',
            response: (q.response as string) || null,
            responded_by: (q.responded_by as string) || null,
            responded_at: (q.responded_at as string) || null,
            created_at: q.created_at as string,
            updated_at: q.updated_at as string,
            guest_name: guest ? ((guest.preferred_name || guest.full_name) as string) : 'Unknown guest',
            invitation_name: invitation ? (invitation.internal_name as string) : undefined,
          };
        });
        setQuestions(enriched);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [activeWedding, demoDataSafe]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Reset when wedding changes
  useEffect(() => {
    if (activeWedding?.id && weddingRef.current && weddingRef.current !== activeWedding.id) {
      weddingRef.current = null;
      loadQuestions();
    }
  }, [activeWedding?.id, loadQuestions]);

  const answerQuestion = useCallback(async (questionId: string, response: string) => {
    setSaving(true);
    try {
      if (demo) {
        demo.answerQuestion(questionId, response);
      } else {
        const { supabase } = await import('@/lib/supabase');
        const now = new Date().toISOString();
        const { error: upErr } = await supabase
          .from('guest_questions')
          .update({ response, responded_at: now, status: 'answered', updated_at: now })
          .eq('id', questionId);
        if (upErr) throw upErr;
      }
      await loadQuestions();
    } catch (err: unknown) {
      throw err;
    } finally {
      setSaving(false);
    }
  }, [demo, loadQuestions]);

  const closeQuestion = useCallback(async (questionId: string) => {
    try {
      if (demo) {
        demo.closeQuestion(questionId);
      } else {
        const { supabase } = await import('@/lib/supabase');
        const { error: upErr } = await supabase
          .from('guest_questions')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
          .eq('id', questionId);
        if (upErr) throw upErr;
      }
      await loadQuestions();
    } catch (err: unknown) {
      throw err;
    }
  }, [demo, loadQuestions]);

  const reopenQuestion = useCallback(async (questionId: string) => {
    try {
      if (demo) {
        demo.reopenQuestion(questionId);
      } else {
        const { supabase } = await import('@/lib/supabase');
        const { error: upErr } = await supabase
          .from('guest_questions')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', questionId);
        if (upErr) throw upErr;
      }
      await loadQuestions();
    } catch (err: unknown) {
      throw err;
    }
  }, [demo, loadQuestions]);

  return { questions, loading, error, saving, answerQuestion, closeQuestion, reopenQuestion, refresh: loadQuestions };
}