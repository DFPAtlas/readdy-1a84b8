import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import type { DemoInvitation, DemoGuest, DemoHousehold, DemoInvitationRecipient } from '@/demo/demoTypes';

// ── Normal mode ──
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useInvitationSend } from '@/hooks/useInvitationSend';
import type { Invitation, InvitationRecipient, InvitationActivityLog } from '@/types/invitation';
import { DELIVERY_STATUS_BADGE, DELIVERY_STATUS_LABELS } from '@/types/invitation';

function NormalInvitationDetailPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const { sending, sendingIds, sendInvitation, resendInvitation } = useInvitationSend();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [recipients, setRecipients] = useState<InvitationRecipient[]>([]);
  const [activity, setActivity] = useState<InvitationActivityLog[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const isSending = invitationId ? sendingIds.has(invitationId) : false;

  useEffect(() => {
    if (!invitationId) return;
    (async () => {
      try {
        const [invRes, recipRes, actRes] = await Promise.all([
          supabase.from('invitations').select('*, template:invitation_templates(id, name, style_preset), household:guest_households(id, display_name)').eq('id', invitationId).eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('invitation_recipients').select('*, guest:guests(id, full_name, last_name, preferred_name, guest_type, relationship_label, email, mobile_phone)').eq('invitation_id', invitationId),
          supabase.from('invitation_activity_log').select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false }).limit(20),
        ]);
        setInvitation(invRes.data as Invitation);
        setRecipients((recipRes.data || []) as InvitationRecipient[]);
        setActivity((actRes.data || []) as InvitationActivityLog[]);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [invitationId]);

  const handleSendNow = async () => {
    if (!invitation || isSending) return;
    setShowSendConfirm(false);

    const result = await sendInvitation(invitation.id);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message || 'Invitation sent!' });
      setInvitation((prev) => prev ? { ...prev, status: 'sent', delivery_status: result.warning ? 'pending' : 'delivered', sent_at: new Date().toISOString() } : null);
    } else {
      setFeedback({ type: 'error', message: result.error || result.message || 'Send failed' });
    }
  };

  const handleResend = async () => {
    if (!invitation || isSending) return;
    const result = await resendInvitation(invitation.id);
    if (result.success) {
      setFeedback({ type: 'success', message: 'Invitation resent!' });
      setInvitation((prev) => prev ? { ...prev, status: 'sent', delivery_status: result.warning ? 'pending' : 'delivered', sent_at: new Date().toISOString() } : null);
    } else {
      setFeedback({ type: 'error', message: result.error || 'Resend failed' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invitation) return;
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'archived') updates.archived_at = new Date().toISOString();
    const { error: e } = await supabase.from('invitations').update(updates).eq('id', invitation.id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to update status' }); return; }
    setFeedback({ type: 'success', message: `Status changed to ${newStatus}` });
    setInvitation({ ...invitation, status: newStatus });
  };

  const hasMissingContact = recipients.some((r) => !r.guest?.email && !r.guest?.mobile_phone);
  const hasMissingEmail = recipients.length > 0 && recipients.every((r) => !r.guest?.email);
  const hasDuplicateRecipients = false; // Cross-invitation duplicate check — complex, deferring

  const deliveryBadge = invitation?.delivery_status
    ? `px-2 py-0.5 rounded text-xs font-label capitalize ${DELIVERY_STATUS_BADGE[invitation.delivery_status] || 'bg-foreground-100 text-foreground-400'}`
    : '';

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      draft: 'bg-secondary-100 text-secondary-700',
      ready: 'bg-accent-100 text-accent-700',
      sent: 'bg-primary-100 text-primary-700',
      archived: 'bg-foreground-100 text-foreground-400',
      cancelled: 'bg-foreground-200 text-foreground-600',
    };
    return `px-2 py-0.5 rounded text-xs font-label capitalize ${m[s] || ''}`;
  };

  if (loading) return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;
  if (!invitation) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Invitation not found</p><button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer">Back</button></div></AppShell>;

  const isActive = ['draft', 'ready'].includes(invitation.status);
  const isSent = invitation.status === 'sent';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{invitation.internal_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={statusBadge(invitation.status)}>{invitation.status}</span>
              {invitation.delivery_status && (
                <span className={deliveryBadge}>{DELIVERY_STATUS_LABELS[invitation.delivery_status] || invitation.delivery_status}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/invitations')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => navigate(`/app/invitations/${invitationId}/preview`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-eye-line mr-1.5" />Preview</button>
            <button onClick={() => navigate(`/app/invitations/${invitationId}/access`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-link mr-1.5" />Guest access</button>
            {invitation.status === 'ready' && (
              <button onClick={() => setShowSendConfirm(true)} disabled={isSending} className="btn-primary text-sm py-2 px-4 cursor-pointer whitespace-nowrap disabled:opacity-50">
                {isSending ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Sending...</> : <><i className="ri-send-plane-line mr-1.5" />Send now</>}
              </button>
            )}
            {isSent && (
              <button onClick={handleResend} disabled={isSending} className="btn-outline text-sm cursor-pointer whitespace-nowrap text-accent-600 border-accent-200 disabled:opacity-50">
                {isSending ? 'Sending...' : <><i className="ri-refresh-line mr-1.5" />Resend</>}
              </button>
            )}
            {invitation.status === 'draft' && (
              <button onClick={() => handleStatusChange('ready')} className="btn-outline text-sm text-accent-600 cursor-pointer whitespace-nowrap">Mark ready</button>
            )}
            {isActive && (
              <button onClick={() => handleStatusChange('archived')} className="btn-outline text-sm text-red-500 cursor-pointer whitespace-nowrap">Archive</button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {(hasMissingContact || hasMissingEmail) && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
            <i className="ri-alert-line text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-label font-medium text-amber-800">
                {hasMissingEmail ? 'No email addresses found' : 'Some recipients are missing contact information'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {hasMissingEmail ? 'This invitation cannot be sent by email. Add email addresses to the guests or use the copy-link feature for manual delivery.' : 'Recipients without email or phone cannot receive digital invitations. You can still send via post or use the copy-link.'}
              </p>
            </div>
          </div>
        )}

        {/* Delivery error */}
        {invitation.last_delivery_error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <i className="ri-error-warning-line text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-label font-medium text-red-800">Delivery issue</p>
              <p className="text-xs text-red-700 mt-0.5">{invitation.last_delivery_error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Recipients */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
                <i className="ri-group-line text-foreground-500" /> Recipients ({recipients.length})
              </h3>
              {recipients.length === 0 ? (
                <p className="text-sm text-foreground-400">No recipients yet.</p>
              ) : (
                <div className="space-y-2">
                  {recipients.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2.5 bg-background-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-label text-foreground-900">{r.guest?.preferred_name || r.guest?.full_name || 'Unnamed'}</span>
                        {!r.guest?.email && !r.guest?.mobile_phone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-label">No contact</span>
                        )}
                        {r.guest?.email && <span className="text-[10px] text-foreground-400">{r.guest.email}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/app/guests/${r.guest_id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">View guest</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Recipient line</dt><dd className="text-foreground-900">{invitation.formal_recipient_name || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Greeting</dt><dd className="text-foreground-900">{invitation.informal_greeting || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Delivery method</dt><dd className="text-foreground-900 capitalize">{invitation.delivery_method || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Template</dt><dd className="text-foreground-900">{invitation.template?.name || 'None'}</dd></div>
                <div><dt className="text-xs text-foreground-500">RSVP deadline</dt><dd className="text-foreground-900">{invitation.rsvp_deadline ? new Date(invitation.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Sent at</dt><dd className="text-foreground-900">{invitation.sent_at ? new Date(invitation.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not sent'}</dd></div>
              </dl>
            </div>

            {/* Activity log */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
                <i className="ri-history-line text-foreground-500" /> Communication history
              </h3>
              {activity.length === 0 ? (
                <p className="text-sm text-foreground-400">No activity recorded.</p>
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 15).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-xs text-foreground-400 whitespace-nowrap mt-0.5">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <span className="text-foreground-700">{a.summary || a.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Status panel */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${invitation.status === 'sent' ? 'bg-primary-500' : invitation.status === 'ready' ? 'bg-accent-500' : 'bg-secondary-400'}`} />
                  <span className="text-sm text-foreground-700 capitalize">{invitation.status}</span>
                </div>
                {invitation.delivery_status && (
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${invitation.delivery_status === 'delivered' ? 'bg-emerald-500' : invitation.delivery_status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span className="text-sm text-foreground-700">{DELIVERY_STATUS_LABELS[invitation.delivery_status] || invitation.delivery_status}</span>
                  </div>
                )}
                {invitation.delivery_attempts !== undefined && invitation.delivery_attempts > 0 && (
                  <p className="text-xs text-foreground-500">Delivery attempts: {invitation.delivery_attempts}</p>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Actions</h3>
              <div className="space-y-2">
                <button onClick={() => navigate(`/app/invitations/${invitationId}/access`)} className="btn-ghost text-sm w-full text-left cursor-pointer whitespace-nowrap">
                  <i className="ri-key-2-line mr-1.5" /> Manage guest access
                </button>
                <button onClick={() => navigate(`/app/invitations/${invitationId}/preview`)} className="btn-ghost text-sm w-full text-left cursor-pointer whitespace-nowrap">
                  <i className="ri-eye-line mr-1.5" /> Preview invitation
                </button>
              </div>
            </div>

            {/* Help */}
            <div className="card-default bg-accent-50/30 border-accent-200/30">
              <p className="text-xs text-foreground-500 leading-relaxed">
                <i className="ri-information-line text-accent-600 mr-1" />
                Ready invitations can be sent via email using the Send button. For manual delivery, use the Guest Access page to generate a shareable link.
              </p>
            </div>
          </div>
        </div>

        {/* Send confirmation modal */}
        {showSendConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowSendConfirm(false)} />
            <div className="relative bg-white rounded-xl border border-secondary-200 p-6 max-w-md mx-4 z-10">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Send invitation?</h3>
              <div className="space-y-2 mb-4 text-sm">
                <p className="text-foreground-700"><strong>To:</strong> {recipients.map((r) => r.guest?.preferred_name || r.guest?.full_name || 'Unnamed').join(', ') || 'No recipients'}</p>
                <p className="text-foreground-700"><strong>Via:</strong> {invitation.delivery_method || 'Email'}</p>
                <p className="text-foreground-700"><strong>Template:</strong> {invitation.template?.name || 'None'}</p>
                {invitation.rsvp_deadline && <p className="text-foreground-700"><strong>RSVP deadline:</strong> {new Date(invitation.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
              </div>
              {hasMissingEmail && (
                <div className="mb-4 px-3 py-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <i className="ri-alert-line mr-1" /> Some recipients don't have email addresses. Only guests with valid emails will receive the invitation.
                </div>
              )}
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setShowSendConfirm(false)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleSendNow} disabled={isSending} className="btn-primary text-sm py-2 px-5 cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {isSending ? 'Sending...' : 'Confirm send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Demo mode ──

function DemoInvitationDetailPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!demo) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-foreground-500">Demo data not available</p></div></AppShell>;

  const { state, simulateSendInvitation } = demo;
  const invitation = state.invitations.find((i) => i.id === invitationId);
  if (!invitation) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Invitation not found</p><button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer">Back to invitations</button></div></AppShell>;

  const household = state.households.find((h) => h.id === invitation.household_id);
  const recipRecords = state.invitationRecipients.filter((r) => r.invitation_id === invitation.id);
  const recipientGuests = recipRecords.map((r) => state.guests.find((g) => g.id === r.guest_id)).filter(Boolean) as DemoGuest[];

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { draft: 'bg-secondary-100 text-secondary-700', ready: 'bg-accent-100 text-accent-700', sent: 'bg-primary-100 text-primary-700', cancelled: 'bg-foreground-200 text-foreground-600', archived: 'bg-foreground-100 text-foreground-400' };
    return `px-2 py-0.5 rounded text-xs font-label capitalize ${m[s] || ''}`;
  };

  const rsvpBadge = (g: DemoGuest) => {
    if (g.rsvp_status === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (g.rsvp_status === 'declined') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const handleSimulateSend = async () => {
    setSimulatingId(invitation.id);
    await new Promise((r) => setTimeout(r, 1200));
    simulateSendInvitation(invitation.id);
    setSimulatingId(null);
    setFeedback({ type: 'success', message: 'Demo invitation marked as sent. No real email was delivered.' });
  };

  const isOliver = recipientGuests.some((g) => g.id === 'demo-guest-oliver');
  const hasContactInfo = recipientGuests.some((g) => g.email);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{invitation.internal_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={statusBadge(invitation.status)}>{invitation.status}</span>
              <span className="text-sm text-foreground-500 capitalize">{invitation.invitation_type}</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-label">Demo</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/app/invitations')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => navigate('/app/invitations/responses')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-check-double-line mr-1.5" />All responses</button>
            <button onClick={() => navigate(`/app/invitations/${invitationId}/preview`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-eye-line mr-1.5" />Preview</button>
            {isOliver && (
              <button onClick={() => navigate('/guest/demo-session/rsvp')} className="btn-outline text-sm cursor-pointer text-primary-600 border-primary-200 whitespace-nowrap">
                <i className="ri-user-line mr-1.5" />View as Oliver
              </button>
            )}
            {invitation.status === 'ready' && (
              <button onClick={handleSimulateSend} disabled={simulatingId === invitation.id} className="btn-outline text-sm cursor-pointer text-accent-600 border-accent-200 whitespace-nowrap disabled:opacity-50">
                {simulatingId === invitation.id ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Sending...</> : <><i className="ri-send-plane-line mr-1.5" />Simulate send</>}
              </button>
            )}
            {invitation.status === 'sent' && (
              <button onClick={handleSimulateSend} disabled={simulatingId === invitation.id} className="btn-outline text-sm cursor-pointer text-accent-600 border-accent-200 whitespace-nowrap disabled:opacity-50">
                {simulatingId === invitation.id ? 'Sending...' : <><i className="ri-refresh-line mr-1.5" />Resend (demo)</>}
              </button>
            )}
          </div>
        </div>

        {!hasContactInfo && invitation.status === 'ready' && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
            <i className="ri-alert-line text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700">Demo mode: In production, invitees without email addresses would show a warning here. Use the copy-link feature for manual delivery.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Recipients */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
                <i className="ri-group-line text-foreground-500" />Recipients ({recipientGuests.length})
              </h3>
              <div className="space-y-2">
                {recipientGuests.map((g) => {
                  const recip = recipRecords.find((r) => r.guest_id === g.id);
                  return (
                    <div key={g.id} className="flex items-center justify-between px-3 py-2.5 bg-background-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-label text-foreground-900">{g.preferred_name || g.full_name}</span>
                        {g.guest_type === 'child' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-100 text-accent-700">Child</span>}
                        {recip?.plus_one_allowed && <span className="text-[10px] text-accent-600">+1</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-label ${rsvpBadge(g)}`}>
                          {g.rsvp_status === 'accepted' ? 'Attending' : g.rsvp_status === 'declined' ? 'Declined' : 'Pending'}
                        </span>
                        {recip?.ceremony_included && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-50 text-accent-600">Ceremony</span>}
                        {recip?.reception_included && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-600">Reception</span>}
                        {recip?.evening_included && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-600">Evening</span>}
                        <button onClick={() => navigate(`/app/guests/${g.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer ml-2">View</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Recipient line</dt><dd className="text-foreground-900">{invitation.formal_recipient_name}</dd></div>
                <div><dt className="text-xs text-foreground-500">Greeting</dt><dd className="text-foreground-900">{invitation.informal_greeting}</dd></div>
                <div><dt className="text-xs text-foreground-500">Delivery</dt><dd className="text-foreground-900 capitalize">{invitation.delivery_method}</dd></div>
                <div><dt className="text-xs text-foreground-500">Household</dt><dd className="text-foreground-900">{household?.display_name || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Language</dt><dd className="text-foreground-900">{invitation.language_code}</dd></div>
                <div><dt className="text-xs text-foreground-500">RSVP deadline</dt><dd className="text-foreground-900">{invitation.rsvp_deadline ? new Date(invitation.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}</dd></div>
              </dl>
            </div>

            {/* Activity */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2"><i className="ri-history-line text-foreground-500" />Recent Activity</h3>
              <div className="space-y-2">
                {state.activityFeed.filter((a) => a.category === 'invitation' || a.category === 'rsvp').slice(0, 10).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs text-foreground-400 whitespace-nowrap mt-0.5">{new Date(a.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span className="text-foreground-700">{a.message}</span>
                  </div>
                ))}
                {state.activityFeed.filter((a) => a.category === 'invitation' || a.category === 'rsvp').length === 0 && (
                  <p className="text-sm text-foreground-400">No activity recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Status</h3>
              <span className={statusBadge(invitation.status)}>{invitation.status}</span>
              <p className="text-xs text-foreground-500 mt-2">
                {invitation.status === 'draft' && 'This invitation is still being prepared.'}
                {invitation.status === 'ready' && 'This invitation is ready to send.'}
                {invitation.status === 'sent' && 'This invitation has been sent.'}
              </p>
            </div>

            <div className="card-default bg-accent-50/30 border-accent-200/30">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2 flex items-center gap-2"><i className="ri-information-line text-accent-600" /></h3>
              <p className="text-xs text-foreground-500">This is a demonstration. Sending invitations, email, SMS and Edge Functions are simulated. No real communication is delivered.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function InvitationDetailPage() {
  if (isDemoMode) return <DemoInvitationDetailPage />;
  return <NormalInvitationDetailPage />;
}