import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import type { SendResult, BulkSendResult } from '@/types/invitation';
import { hashToken, generateAccessToken } from '@/lib/api';

export function useInvitationSend() {
  const { weddingId } = useActiveWedding();
  const [sending, setSending] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const sendInvitation = useCallback(async (invitationId: string): Promise<SendResult> => {
    if (!weddingId || isDemoMode) {
      return { success: false, error: 'Cannot send in demo mode' };
    }

    setSending(true);
    setSendingIds((prev) => new Set(prev).add(invitationId));

    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('invitation-send', {
        body: {
          action: 'send_individual',
          invitation_id: invitationId,
          wedding_id: weddingId,
        },
      });

      if (fnErr) throw fnErr;
      return result as SendResult;
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
    } finally {
      setSending(false);
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  }, [weddingId]);

  const sendBulkInvitations = useCallback(async (invitationIds: string[]): Promise<BulkSendResult> => {
    if (!weddingId || isDemoMode) {
      return { total: invitationIds.length, sent: 0, failed: invitationIds.length, results: invitationIds.map((id) => ({ id, success: false, error: 'Cannot send in demo mode' })) };
    }

    setBulkSending(true);

    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('invitation-send', {
        body: {
          action: 'send_bulk',
          invitation_ids: invitationIds,
          wedding_id: weddingId,
        },
      });

      if (fnErr) throw fnErr;
      return result as BulkSendResult;
    } catch (err: unknown) {
      return { total: invitationIds.length, sent: 0, failed: invitationIds.length, results: invitationIds.map((id) => ({ id, success: false, error: err instanceof Error ? err.message : 'Bulk send failed' })) };
    } finally {
      setBulkSending(false);
    }
  }, [weddingId]);

  const resendInvitation = useCallback(async (invitationId: string): Promise<SendResult> => {
    if (!weddingId || isDemoMode) {
      return { success: false, error: 'Cannot resend in demo mode' };
    }

    setSending(true);
    setSendingIds((prev) => new Set(prev).add(invitationId));

    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('invitation-send', {
        body: {
          action: 'resend',
          invitation_id: invitationId,
          wedding_id: weddingId,
        },
      });

      if (fnErr) throw fnErr;
      return result as SendResult;
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Resend failed' };
    } finally {
      setSending(false);
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  }, [weddingId]);

  const generateTokenLink = useCallback(async (invitationId: string): Promise<SendResult> => {
    if (!weddingId || isDemoMode) {
      return { success: false, error: 'Cannot generate tokens in demo mode' };
    }

    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('invitation-send', {
        body: {
          action: 'generate_token',
          invitation_id: invitationId,
          wedding_id: weddingId,
        },
      });

      if (fnErr) throw fnErr;
      return result as SendResult;
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Token generation failed' };
    }
  }, [weddingId]);

  const copyInviteLink = useCallback(async (invitationId: string): Promise<SendResult> => {
    // Generate token via edge function, return the URL for copying
    const result = await generateTokenLink(invitationId);
    return result;
  }, [generateTokenLink]);

  return {
    sending,
    sendingIds,
    bulkSending,
    sendInvitation,
    sendBulkInvitations,
    resendInvitation,
    generateTokenLink,
    copyInviteLink,
  };
}

export function useInvitationAccessToken(invitationId: string) {
  const { weddingId } = useActiveWedding();
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const generateLink = useCallback(async (): Promise<{ rawToken: string; inviteUrl: string } | null> => {
    if (!invitationId || !weddingId) return null;
    setGenerating(true);
    try {
      const rawToken = generateAccessToken();
      const tokenHash = await hashToken(rawToken);

      // Get existing token to determine version
      const { data: existingToken } = await supabase
        .from('invitation_access_tokens')
        .select('token_version')
        .eq('invitation_id', invitationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error: tokenErr } = await supabase.from('invitation_access_tokens').insert({
        wedding_id: weddingId,
        invitation_id: invitationId,
        token_hash: tokenHash,
        token_version: existingToken ? (existingToken.token_version + 1) : 1,
        status: 'active',
        delivery_channel: 'copy_link',
        created_at: new Date().toISOString(),
      });

      if (tokenErr) throw tokenErr;

      await supabase.from('invitation_access_activity').insert({
        wedding_id: weddingId,
        invitation_id: invitationId,
        actor_type: 'couple',
        event_type: 'link_generated',
        summary: 'Secure invitation link generated',
      });

      const inviteUrl = `${window.location.origin}/invite/${rawToken}`;
      return { rawToken, inviteUrl };
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  }, [invitationId, weddingId]);

  const rotateLink = useCallback(async (): Promise<{ rawToken: string; inviteUrl: string } | null> => {
    if (!invitationId || !weddingId) return null;
    setRevoking(true);
    try {
      // Revoke current active tokens
      await supabase.from('invitation_access_tokens').update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        rotation_reason: 'manual_rotation',
      }).eq('invitation_id', invitationId).eq('status', 'active');

      // Generate new token
      const rawToken = generateAccessToken();
      const tokenHash = await hashToken(rawToken);

      const { data: lastVersion } = await supabase
        .from('invitation_access_tokens')
        .select('token_version')
        .eq('invitation_id', invitationId)
        .order('token_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from('invitation_access_tokens').insert({
        wedding_id: weddingId,
        invitation_id: invitationId,
        token_hash: tokenHash,
        token_version: (lastVersion?.token_version || 0) + 1,
        status: 'active',
        delivery_channel: 'copy_link',
        created_at: new Date().toISOString(),
      });

      await supabase.from('invitation_access_activity').insert({
        wedding_id: weddingId,
        invitation_id: invitationId,
        actor_type: 'couple',
        event_type: 'link_rotated',
        summary: 'Invitation link rotated — previous link revoked',
      });

      const inviteUrl = `${window.location.origin}/invite/${rawToken}`;
      return { rawToken, inviteUrl };
    } catch {
      return null;
    } finally {
      setRevoking(false);
    }
  }, [invitationId, weddingId]);

  const revokeLink = useCallback(async (): Promise<boolean> => {
    if (!invitationId || !weddingId) return false;
    setRevoking(true);
    try {
      await supabase.from('invitation_access_tokens').update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        rotation_reason: 'manual_revocation',
      }).eq('invitation_id', invitationId).eq('status', 'active');

      await supabase.from('invitation_access_activity').insert({
        wedding_id: weddingId,
        invitation_id: invitationId,
        actor_type: 'couple',
        event_type: 'link_revoked',
        summary: 'Invitation link revoked',
      });

      return true;
    } catch {
      return false;
    } finally {
      setRevoking(false);
    }
  }, [invitationId, weddingId]);

  return {
    generating,
    revoking,
    generateLink,
    rotateLink,
    revokeLink,
  };
}