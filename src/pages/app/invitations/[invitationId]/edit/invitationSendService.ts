import { supabase } from '@/lib/supabase';

// ── Types ──

export interface SendInvitationRequest {
  invitationId: string;
  senderId: string;
  recipients: string[];
  subject: string;
  message: string;
  mode: 'now' | 'scheduled';
  scheduledFor: string | null;
  timezone: string;
  submissionId: string;
}

export interface SendInvitationResult {
  accepted: boolean;
  submissionId: string;
  sendLogIds: string[];
  guestIds: string[];
  acceptedCount: number;
  rejectedCount: number;
  rejectionReasons: string[];
  error?: string;
}

// ── Send invitation via edge function ──

export async function sendInvitationDesign(request: SendInvitationRequest): Promise<SendInvitationResult> {
  const { data, error } = await supabase.functions.invoke<SendInvitationResult>(
    'send-invitation-design',
    {
      body: request,
    },
  );

  if (error) {
    // Edge function invocation error (network, timeout, etc.)
    return {
      accepted: false,
      submissionId: request.submissionId,
      sendLogIds: [],
      guestIds: [],
      acceptedCount: 0,
      rejectedCount: request.recipients.length,
      rejectionReasons: [error.message || 'Failed to reach send service'],
      error: error.message || 'Failed to reach send service',
    };
  }

  if (!data) {
    return {
      accepted: false,
      submissionId: request.submissionId,
      sendLogIds: [],
      guestIds: [],
      acceptedCount: 0,
      rejectedCount: request.recipients.length,
      rejectionReasons: ['No response from send service'],
      error: 'No response from send service',
    };
  }

  return data;
}