import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import type {
  EmailCampaign,
  EmailTemplate,
  CampaignRecipient,
  EmailSuppression,
  CampaignFormData,
  CampaignStats,
  CampaignStatus,
  DeliveryStats,
} from '@/types/emailCampaigns';

export function useEmailCampaigns() {
  const { weddingId } = useActiveWedding();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!weddingId || isDemoMode) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);

      const [campRes, tmplRes] = await Promise.all([
        supabase.from('email_campaigns').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
        supabase.from('email_templates').select('*').or(`wedding_id.eq.${weddingId},is_system.eq.true`).eq('is_active', true).order('created_at', { ascending: true }),
      ]);

      if (campRes.error) throw campRes.error;
      if (tmplRes.error) throw tmplRes.error;

      if (mountedRef.current) {
        setCampaigns(campRes.data || []);
        setTemplates(tmplRes.data || []);
      }
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getStats = useCallback((): CampaignStats => {
    const stats: CampaignStats = { total: 0, draft: 0, scheduled: 0, sent: 0, failed: 0, total_sent_count: 0, total_delivered: 0, total_bounced: 0, total_complained: 0 };
    for (const c of campaigns) {
      stats.total++;
      if (c.status === 'draft') stats.draft++;
      if (c.status === 'scheduled') stats.scheduled++;
      if (c.status === 'sent' || c.status === 'partial_failure') stats.sent++;
      if (c.status === 'failed') stats.failed++;
      if (c.status === 'sent' || c.status === 'partial_failure') {
        stats.total_sent_count += c.recipient_count;
        const ds = c.delivery_stats as DeliveryStats;
        if (ds) {
          stats.total_delivered += ds.delivered || 0;
          stats.total_bounced += ds.bounced || 0;
          stats.total_complained += ds.complained || 0;
        }
      }
    }
    return stats;
  }, [campaigns]);

  const getCampaign = useCallback(async (campaignId: string) => {
    const { data, error: err } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle();
    if (err) throw err;
    return data as EmailCampaign | null;
  }, []);

  const getRecipients = useCallback(async (campaignId: string) => {
    const { data, error: err } = await supabase.from('email_campaign_recipients').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true });
    if (err) throw err;
    return (data || []) as CampaignRecipient[];
  }, []);

  const createCampaign = useCallback(async (form: CampaignFormData): Promise<EmailCampaign> => {
    if (!weddingId) throw new Error('No active wedding');

    const { data, error: err } = await supabase.from('email_campaigns').insert({
      wedding_id: weddingId,
      template_id: form.template_id,
      name: form.name,
      subject: form.subject,
      preheader: form.preheader,
      sender_name: form.sender_name,
      sender_email: form.sender_email,
      reply_to_email: form.reply_to_email,
      content_blocks: form.content_blocks as unknown as Record<string, unknown>[],
      cta_label: form.cta_label,
      cta_url: form.cta_url,
      brand_primary_color: form.brand_primary_color,
      brand_secondary_color: form.brand_secondary_color,
      brand_accent_color: form.brand_accent_color,
      brand_font_family: form.brand_font_family,
      audience_filter: form.audience_filter as unknown as Record<string, unknown>,
      schedule_at: form.schedule_at,
      status: 'draft',
    }).select().single();

    if (err) throw err;
    const campaign = data as EmailCampaign;

    await supabase.from('email_activity_log').insert({
      wedding_id: weddingId,
      campaign_id: campaign.id,
      action: 'campaign_created',
      details: { name: campaign.name },
    });

    await fetchAll();
    return campaign;
  }, [weddingId, fetchAll]);

  const updateCampaign = useCallback(async (campaignId: string, updates: Partial<CampaignFormData>): Promise<void> => {
    if (!weddingId) throw new Error('No active wedding');

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.preheader !== undefined) dbUpdates.preheader = updates.preheader;
    if (updates.sender_name !== undefined) dbUpdates.sender_name = updates.sender_name;
    if (updates.sender_email !== undefined) dbUpdates.sender_email = updates.sender_email;
    if (updates.reply_to_email !== undefined) dbUpdates.reply_to_email = updates.reply_to_email;
    if (updates.content_blocks !== undefined) dbUpdates.content_blocks = updates.content_blocks as unknown as Record<string, unknown>[];
    if (updates.cta_label !== undefined) dbUpdates.cta_label = updates.cta_label;
    if (updates.cta_url !== undefined) dbUpdates.cta_url = updates.cta_url;
    if (updates.brand_primary_color !== undefined) dbUpdates.brand_primary_color = updates.brand_primary_color;
    if (updates.brand_secondary_color !== undefined) dbUpdates.brand_secondary_color = updates.brand_secondary_color;
    if (updates.brand_accent_color !== undefined) dbUpdates.brand_accent_color = updates.brand_accent_color;
    if (updates.brand_font_family !== undefined) dbUpdates.brand_font_family = updates.brand_font_family;
    if (updates.audience_filter !== undefined) dbUpdates.audience_filter = updates.audience_filter as unknown as Record<string, unknown>;
    if (updates.schedule_at !== undefined) dbUpdates.schedule_at = updates.schedule_at;
    if (updates.template_id !== undefined) dbUpdates.template_id = updates.template_id;

    const { error: err } = await supabase.from('email_campaigns').update(dbUpdates).eq('id', campaignId);
    if (err) throw err;

    await supabase.from('email_activity_log').insert({
      wedding_id: weddingId,
      campaign_id: campaignId,
      action: 'campaign_updated',
      details: { updated_fields: Object.keys(dbUpdates) },
    });

    await fetchAll();
  }, [weddingId, fetchAll]);

  const updateCampaignStatus = useCallback(async (campaignId: string, status: CampaignStatus, extra?: Record<string, unknown>): Promise<void> => {
    const updates: Record<string, unknown> = { status, ...extra };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'archived') updates.archived_at = new Date().toISOString();

    const { error: err } = await supabase.from('email_campaigns').update(updates).eq('id', campaignId);
    if (err) throw err;

    if (weddingId) {
      await supabase.from('email_activity_log').insert({
        wedding_id: weddingId,
        campaign_id: campaignId,
        action: `campaign_${status}`,
        details: extra || {},
      });
    }

    await fetchAll();
  }, [weddingId, fetchAll]);

  const deleteCampaign = useCallback(async (campaignId: string): Promise<void> => {
    const { error: err } = await supabase.from('email_campaigns').delete().eq('id', campaignId);
    if (err) throw err;
    await fetchAll();
  }, [fetchAll]);

  const duplicateCampaign = useCallback(async (campaignId: string): Promise<EmailCampaign> => {
    const { data, error: err } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle();
    if (err || !data) throw err || new Error('Campaign not found');

    const original = data as EmailCampaign;
    const { id, created_at, updated_at, sent_at, cancelled_at, archived_at, delivery_stats, resend_batch_id, status, recipient_count, ...dupData } = original;

    const { data: newData, error: dupErr } = await supabase.from('email_campaigns').insert({
      ...dupData,
      name: `${original.name} (copy)`,
      status: 'draft' as CampaignStatus,
      recipient_count: 0,
      delivery_stats: { accepted: 0, delivered: 0, bounced: 0, complained: 0, failed: 0 },
    }).select().single();

    if (dupErr) throw dupErr;
    await fetchAll();
    return newData as EmailCampaign;
  }, [fetchAll]);

  const getSuppressions = useCallback(async (): Promise<EmailSuppression[]> => {
    if (!weddingId) return [];
    const { data, error: err } = await supabase.from('email_suppressions').select('*').eq('wedding_id', weddingId);
    if (err) throw err;
    return (data || []) as EmailSuppression[];
  }, [weddingId]);

  const addSuppression = useCallback(async (email: string, type: string, reason?: string): Promise<void> => {
    if (!weddingId) throw new Error('No active wedding');
    const { error: err } = await supabase.from('email_suppressions').upsert({
      wedding_id: weddingId,
      email: email.toLowerCase().trim(),
      suppression_type: type,
      reason: reason || '',
    }, { onConflict: 'wedding_id,email' });
    if (err) throw err;
  }, [weddingId]);

  const buildRecipients = useCallback(async (campaignId: string, filter: Record<string, unknown>): Promise<number> => {
    if (!weddingId) throw new Error('No active wedding');

    // Invoke edge function to build recipient list
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/email-campaign-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'build_recipients', campaign_id: campaignId, wedding_id: weddingId, audience_filter: filter }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(errBody || 'Failed to build recipients');
    }

    const result = await res.json();
    return result.recipient_count || 0;
  }, [weddingId]);

  const sendTestEmail = useCallback(async (campaignId: string): Promise<void> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/email-campaign-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'test', campaign_id: campaignId, wedding_id: weddingId }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(errBody || 'Test send failed');
    }
  }, [weddingId]);

  const sendCampaign = useCallback(async (campaignId: string): Promise<void> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/email-campaign-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'send', campaign_id: campaignId, wedding_id: weddingId }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(errBody || 'Send failed');
    }

    await fetchAll();
  }, [weddingId, fetchAll]);

  const cancelScheduled = useCallback(async (campaignId: string): Promise<void> => {
    await updateCampaignStatus(campaignId, 'draft', { cancelled_at: new Date().toISOString(), schedule_at: null });
  }, [updateCampaignStatus]);

  return {
    campaigns, templates, loading, error,
    fetchAll, getStats, getCampaign, getRecipients,
    createCampaign, updateCampaign, updateCampaignStatus, deleteCampaign, duplicateCampaign,
    getSuppressions, addSuppression,
    buildRecipients, sendTestEmail, sendCampaign, cancelScheduled,
  };
}