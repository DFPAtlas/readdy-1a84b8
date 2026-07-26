import { supabase } from '@/lib/supabase';

// ── Types ──

export interface VerifiedSender {
  id: string;
  email: string;
  displayName: string | null;
  isVerified: boolean;
}

export interface VerifiedSenderResult {
  success: boolean;
  data?: VerifiedSender[];
  error?: string;
}

// ── Load verified senders for the authenticated user ──

export async function loadVerifiedSenders(): Promise<VerifiedSenderResult> {
  try {
    const { data, error } = await supabase
      .from('verified_senders')
      .select('id, email, display_name, is_verified')
      .eq('is_verified', true)
      .order('email', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    const senders: VerifiedSender[] = data.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      isVerified: row.is_verified,
    }));

    return { success: true, data: senders };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load senders' };
  }
}

// ── Format a sender for display ──

export function formatSenderDisplay(sender: VerifiedSender): string {
  if (sender.displayName) {
    return `${sender.displayName} <${sender.email}>`;
  }
  return sender.email;
}