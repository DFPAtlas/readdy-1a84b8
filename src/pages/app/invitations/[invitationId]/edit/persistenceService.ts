import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { createDemoDesign, loadDemoDesign, saveDemoDesign } from '@/demo/demoDesignPersistence';
import type { InvitationDocument } from './types';

// ── Result types ──

export interface LoadResult {
  success: boolean;
  data?: InvitationDesignRow;
  error?: string;
}

export interface CreateResult {
  success: boolean;
  id?: string;
  updatedAt?: string;
  error?: string;
}

export interface SaveResult {
  success: boolean;
  updatedAt?: string;
  error?: string;
}

// ── Row shape from the database ──

export interface InvitationDesignRow {
  id: string;
  user_id: string;
  title: string;
  document: unknown;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── Load an invitation design by ID ──

export async function loadInvitationDesign(id: string): Promise<LoadResult> {
  if (isDemoMode) {
    const result = loadDemoDesign(id);
    return {
      success: result.success,
      data: result.data ? {
        id: result.data.id,
        user_id: 'demo-user',
        title: result.data.title,
        document: result.data.document,
        thumbnail_url: null,
        created_at: result.data.updated_at,
        updated_at: result.data.updated_at,
      } : undefined,
      error: result.error,
    };
  }

  try {
    const { data, error } = await supabase
      .from('invitation_designs')
      .select('id, title, document, thumbnail_url, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === 'PGRST116') {
        return { success: false, error: 'Invitation not found or unavailable' };
      }
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Invitation not found or unavailable' };
    }

    return { success: true, data: data as InvitationDesignRow };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load invitation' };
  }
}

// ── Create a new invitation design ──

export async function createInvitationDesign(
  userId: string,
  document: InvitationDocument,
  title = 'Untitled Invitation',
): Promise<CreateResult> {
  if (isDemoMode) {
    const result = createDemoDesign(document, title);
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('invitation_designs')
      .insert({
        user_id: userId,
        title,
        document: document as unknown as Record<string, unknown>,
      })
      .select('id, updated_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No data returned after insert' };
    }

    return {
      success: true,
      id: data.id,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create invitation' };
  }
}

// ── Save/update an existing invitation design ──

export async function saveInvitationDesign(
  id: string,
  document: InvitationDocument,
  title: string,
): Promise<SaveResult> {
  if (isDemoMode) {
    const result = saveDemoDesign(id, document, title);
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('invitation_designs')
      .update({
        title: title || 'Untitled Invitation',
        document: document as unknown as Record<string, unknown>,
      })
      .eq('id', id)
      .select('id, updated_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      updatedAt: data?.updated_at,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save invitation' };
  }
}