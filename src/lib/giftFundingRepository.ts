// ── Gift Funding Repository ──
// Typed, focused data access functions for the Gift Funding domain.
// All functions verify Auth/wedding access through Supabase RLS.
// Never accept user_id as ownership proof — RLS enforces wedding membership.

import { supabase } from '@/lib/supabase';
import type {
  GiftFundRow,
  GiftFundListItem,
  GiftFundContributionRow,
  GiftFundContributionPublic,
  GiftFundConnectStatus,
  CreateGiftFundInput,
  UpdateGiftFundInput,
  ContributionFilter,
  GiftFundVisibility,
} from '@/types/giftFunding';
import { CONFIRMED_PAYMENT_STATUSES, EXCLUDED_PAYMENT_STATUSES } from '@/types/giftFunding';

// ── Fund Queries ──

/**
 * List all gift funds for a wedding, with computed raised totals from webhook-confirmed contributions.
 * RLS ensures only wedding members can read.
 */
export async function listGiftFundsForWedding(weddingId: string): Promise<GiftFundListItem[]> {
  const { data: funds, error } = await supabase
    .from('gift_funds')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false });

  if (error || !funds) {
    console.error('listGiftFundsForWedding error:', error);
    return [];
  }

  const fundIds = (funds as GiftFundRow[]).map((f) => f.id);

  // Fetch confirmed contributions for totals
  const { data: contribs } = await supabase
    .from('gift_fund_contributions')
    .select('fund_id, amount_minor, refunded_amount_minor, payment_status')
    .in('fund_id', fundIds)
    .in('payment_status', Array.from(CONFIRMED_PAYMENT_STATUSES));

  const totalsMap = new Map<string, { total: number; count: number }>();
  (contribs || []).forEach((c: { fund_id: string; amount_minor: number; refunded_amount_minor: number }) => {
    const existing = totalsMap.get(c.fund_id) || { total: 0, count: 0 };
    existing.total += (c.amount_minor || 0) - (c.refunded_amount_minor || 0);
    existing.count += 1;
    totalsMap.set(c.fund_id, existing);
  });

  return (funds as GiftFundRow[]).map((f) => {
    const totals = totalsMap.get(f.id) || { total: 0, count: 0 };
    return {
      id: f.id,
      wedding_id: f.wedding_id,
      title: f.title,
      description: f.description,
      category: f.category as GiftFundListItem['category'],
      target_amount_minor: f.target_amount_minor,
      currency: (f.currency || 'GBP').toUpperCase() as GiftFundListItem['currency'],
      cover_image_path: f.cover_image_path,
      is_active: f.is_active,
      is_public: f.is_public,
      show_total_raised: f.show_total_raised,
      show_contributor_names: f.show_contributor_names,
      closes_at: f.closes_at,
      created_at: f.created_at,
      raised_amount_minor: totals.total,
      contributor_count: totals.count,
    };
  });
}

/**
 * Get a single gift fund, scoped to wedding membership.
 */
export async function getGiftFundForMember(fundId: string): Promise<GiftFundRow | null> {
  const { data, error } = await supabase
    .from('gift_funds')
    .select('*')
    .eq('id', fundId)
    .maybeSingle();

  if (error) {
    console.error('getGiftFundForMember error:', error);
    return null;
  }

  return data as GiftFundRow | null;
}

/**
 * Create a new gift fund for a wedding.
 * RLS ensures the user is a wedding member.
 */
export async function createGiftFund(input: CreateGiftFundInput): Promise<{ id: string } | { error: string }> {
  const fundData: Record<string, unknown> = {
    wedding_id: input.wedding_id,
    title: input.title.trim().slice(0, 80),
    category: input.category,
    currency: input.currency || 'gbp',
    is_active: false,
    is_public: false,
    show_total_raised: true,
    show_contributor_names: true,
  };

  if (input.description?.trim()) {
    fundData.description = input.description.trim().slice(0, 600);
  }
  if (input.target_amount_minor != null && input.target_amount_minor > 0) {
    fundData.target_amount_minor = input.target_amount_minor;
  }
  if (input.cover_image_path?.trim()) {
    fundData.cover_image_path = input.cover_image_path.trim();
  }

  const { data, error } = await supabase
    .from('gift_funds')
    .insert(fundData)
    .select('id')
    .single();

  if (error) {
    console.error('createGiftFund error:', error);
    return { error: error.message || 'Could not create fund.' };
  }

  return { id: (data as { id: string }).id };
}

/**
 * Update an existing gift fund. Only fields that are provided are updated.
 * RLS ensures the user is a wedding member.
 */
export async function updateGiftFund(
  fundId: string,
  input: UpdateGiftFundInput,
): Promise<{ success: true } | { error: string }> {
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title.trim().slice(0, 80);
  if (input.description !== undefined) updateData.description = input.description?.trim().slice(0, 600) || null;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.target_amount_minor !== undefined) updateData.target_amount_minor = input.target_amount_minor;
  if (input.cover_image_path !== undefined) updateData.cover_image_path = input.cover_image_path?.trim() || null;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.is_public !== undefined) updateData.is_public = input.is_public;
  if (input.show_total_raised !== undefined) updateData.show_total_raised = input.show_total_raised;
  if (input.show_contributor_names !== undefined) updateData.show_contributor_names = input.show_contributor_names;
  if (input.closes_at !== undefined) updateData.closes_at = input.closes_at;

  if (Object.keys(updateData).length === 0) return { success: true };

  const { error } = await supabase
    .from('gift_funds')
    .update(updateData)
    .eq('id', fundId);

  if (error) {
    console.error('updateGiftFund error:', error);
    return { error: error.message || 'Could not update fund.' };
  }

  return { success: true };
}

/**
 * Delete a gift fund. RLS ensures the user is a wedding member.
 * Fails if contributions exist (ON DELETE RESTRICT on fund_id FK).
 */
export async function deleteGiftFund(fundId: string): Promise<{ success: true } | { error: string }> {
  const { error } = await supabase
    .from('gift_funds')
    .delete()
    .eq('id', fundId);

  if (error) {
    console.error('deleteGiftFund error:', error);
    if (error.code === '23503') {
      return { error: 'Cannot delete a fund that has contributions.' };
    }
    return { error: error.message || 'Could not delete fund.' };
  }

  return { success: true };
}

// ── Contribution Queries ──

/**
 * List contributions for a fund, with optional filters.
 * RLS ensures the user is a wedding member.
 */
export async function listGiftFundContributions(
  fundId: string,
  filters?: ContributionFilter,
): Promise<GiftFundContributionRow[]> {
  let query = supabase
    .from('gift_fund_contributions')
    .select('*')
    .eq('fund_id', fundId)
    .order('created_at', { ascending: false });

  if (filters?.payment_status) {
    if (Array.isArray(filters.payment_status)) {
      query = query.in('payment_status', filters.payment_status);
    } else {
      query = query.eq('payment_status', filters.payment_status);
    }
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listGiftFundContributions error:', error);
    return [];
  }

  return (data || []) as GiftFundContributionRow[];
}

/**
 * Build the authoritative confirmed total for a fund.
 * Only counts confirmed states: paid, partially_refunded, dispute_won.
 * Formula: sum(amount_minor - refunded_amount_minor)
 */
export async function calculateConfirmedFundTotal(fundId: string): Promise<number> {
  const { data, error } = await supabase
    .from('gift_fund_contributions')
    .select('amount_minor, refunded_amount_minor')
    .eq('fund_id', fundId)
    .in('payment_status', Array.from(CONFIRMED_PAYMENT_STATUSES));

  if (error || !data) {
    console.error('calculateConfirmedFundTotal error:', error);
    return 0;
  }

  return (data as Array<{ amount_minor: number; refunded_amount_minor: number }>).reduce(
    (sum, c) => sum + (c.amount_minor || 0) - (c.refunded_amount_minor || 0),
    0,
  );
}

/**
 * Build public-facing contribution display objects, respecting privacy settings.
 * Caller must verify the viewer is authorized (guest portal with valid accessId).
 */
export function toPublicContributions(
  contributions: GiftFundContributionRow[],
  showContributorNames: boolean,
): GiftFundContributionPublic[] {
  return contributions
    .filter((c) => CONFIRMED_PAYMENT_STATUSES.has(c.payment_status as never))
    .map((c) => {
      const visibility = c.visibility as GiftFundVisibility;

      const isPublic = visibility === 'public' && showContributorNames;
      const isNameOnly = visibility === 'name_only' && showContributorNames;

      return {
        id: c.id,
        contributor_name: c.contributor_name,
        message: c.message,
        amount_minor: c.amount_minor,
        visibility,
        paid_at: c.paid_at,
        display_name: isPublic || isNameOnly ? (c.contributor_name || 'A generous guest') : null,
        display_amount_minor: isPublic ? c.amount_minor : null,
        display_message: isPublic ? c.message : null,
      };
    });
}

// ── Connect Account Queries ──

/**
 * Get the Stripe Connect account status for a wedding.
 * Server-side edge function should be preferred; this is a convenience for read-only checks.
 */
export async function getConnectAccountStatus(weddingId: string): Promise<GiftFundConnectStatus> {
  const { data, error } = await supabase
    .from('gift_fund_accounts')
    .select('onboarding_complete, charges_enabled, payouts_enabled, requirements_due, stripe_account_id')
    .eq('wedding_id', weddingId)
    .maybeSingle();

  if (error || !data) {
    return {
      status: 'not_connected',
      onboarding_complete: false,
      charges_enabled: false,
      payouts_enabled: false,
      requirements_due: false,
    };
  }

  const row = data as { onboarding_complete: boolean; charges_enabled: boolean; payouts_enabled: boolean; requirements_due: boolean; stripe_account_id: string | null };

  if (!row.stripe_account_id) {
    return { status: 'not_connected', onboarding_complete: false, charges_enabled: false, payouts_enabled: false, requirements_due: false };
  }

  if (!row.onboarding_complete || row.requirements_due) {
    return { status: 'action_required', onboarding_complete: row.onboarding_complete, charges_enabled: row.charges_enabled, payouts_enabled: row.payouts_enabled, requirements_due: row.requirements_due };
  }

  if (row.charges_enabled && row.payouts_enabled) {
    return { status: 'ready', onboarding_complete: true, charges_enabled: true, payouts_enabled: true, requirements_due: false };
  }

  if (!row.charges_enabled || !row.payouts_enabled) {
    return { status: 'onboarding', onboarding_complete: row.onboarding_complete, charges_enabled: row.charges_enabled, payouts_enabled: row.payouts_enabled, requirements_due: row.requirements_due };
  }

  return { status: 'error', onboarding_complete: false, charges_enabled: false, payouts_enabled: false, requirements_due: false };
}