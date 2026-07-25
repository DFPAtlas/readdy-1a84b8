import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useInvitationAccessToken, useInvitationSend } from '@/hooks/useInvitationSend';
import type { InvitationAccessToken, AccessActivity } from '@/types/access';
import type { Invitation } from '@/types/invitation';
import { DELIVERY_STATUS_BADGE, DELIVERY_STATUS_LABELS } from '@/types/invitation';

export default function InvitationAccessPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const { generating, revoking, generateLink, rotateLink, revokeLink } = useInvitationAccessToken(invitationId || '');
  const { sending, sendInvitation, resendInvitation } = useInvitationSend();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [accessToken, setAccessToken] = useState<InvitationAccessToken | null>(null);
  const [activity, setActivity] = useState<AccessActivity[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [storedLink, setStoredLink] = useState('');

  const fetchData = async () => {
    if (!invitationId) return;
    setLoading(true);
    try {
      const [invRes, tokenRes, actRes] = await Promise.all([
        supabase.from('invitations').select('*, template:invitation_templates(id, name, style_preset), household:guest_households(id, display_name)').eq('id', invitationId).eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('invitation_access_tokens').select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('invitation_access_activity').select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false }).limit(30),
      ]);
      setInvitation(invRes.data as Invitation);
      setAccessToken((tokenRes.data as InvitationAccessToken) || null);
      setActivity((actRes.data || []) as AccessActivity[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [invitationId]);

  const handleGenerateLink = async () => {
    if (!invitationId || generating) return;
    const result = await generateLink();
    if (result) {
      setStoredLink(result.inviteUrl);
      setFeedback({ type: 'success', message: 'Secure link generated successfully.' });
      fetchData();
    } else {
      setFeedback({ type: 'error', message: 'Failed to generate link.' });
    }
  };

  const handleCopyLink = async () => {
    if (!storedLink) {
      // Try to generate a new link
      const result = await generateLink();
      if (!result) {
        setFeedback({ type: 'error', message: 'No link available. Please generate one first.' });
        return;
      }
      setStoredLink(result.inviteUrl);
    }
    try {
      await navigator.clipboard.writeText(storedLink);
      setCopied(true);
      setFeedback({ type: 'success', message: 'Link copied. Anyone with this link can access the invitation.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ type: 'error', message: 'Could not copy. Please copy manually.' });
    }
  };

  const handleRotateLink = async () => {
    if (!invitationId || revoking) return;
    setShowRotateConfirm(false);
    const result = await rotateLink();
    if (result) {
      setStoredLink(result.inviteUrl);
      setFeedback({ type: 'success', message: 'Link rotated. The old link is now invalid.' });
      fetchData();
    } else {
      setFeedback({ type: 'error', message: 'Failed to rotate link.' });
    }
  };

  const handleRevokeLink = async () => {
    if (!accessToken || revoking) return;
    const success = await revokeLink();
    if (success) {
      setStoredLink('');
      setFeedback({ type: 'success', message: 'Link has been revoked.' });
      fetchData();
    } else {
      setFeedback({ type: 'error', message: 'Failed to revoke link.' });
    }
  };

  const handleSendEmail = async () => {
    if (!invitationId || sending) return;
    setShowSendConfirm(false);
    const result = await sendInvitation(invitationId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message || 'Invitation sent!' });
      fetchData();
    } else {
      setFeedback({ type: 'error', message: result.error || 'Send failed' });
    }
  };

  const handleResend = async () => {
    if (!invitationId || sending) return;
    const result = await resendInvitation(invitationId);
    if (result.success) {
      setFeedback({ type: 'success', message: 'Invitation resent!' });
      fetchData();
    } else {
      setFeedback({ type: 'error', message: result.error || 'Resend failed' });
    }
  };

  const handlePreview = () => {
    if (!invitationId) return;
    navigate(`/app/invitations/${invitationId}/preview`);
  };

  if (loading) {
    return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;
  }

  if (!invitation) {
    return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Invitation not found</p><button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer whitespace-nowrap">Back to invitations</button></div></AppShell>;
  }

  const isActive = accessToken?.status === 'active';
  const isRevoked = accessToken?.status === 'revoked';
  const hasLink = !!accessToken && !isRevoked;
  const deliveryBadge = invitation.delivery_status
    ? `px-2 py-0.5 rounded text-xs font-label capitalize ${DELIVERY_STATUS_BADGE[invitation.delivery_status] || 'bg-foreground-100 text-foreground-400'}`
    : '';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${
            feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {feedback.message}
            <button onClick={() => setFeedback(null)} className="ml-3 text-xs underline cursor-pointer">Dismiss</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Guest Access</h1>
            <p className="text-sm text-foreground-500 mt-1">{invitation.internal_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/app/invitations/${invitationId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line mr-1.5" />Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery status */}
            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
                <i className="ri-send-plane-line text-foreground-500" /> Delivery
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-background-50 rounded-lg">
                  <p className="text-xs text-foreground-500">Status</p>
                  <p className="text-sm font-label text-foreground-900 mt-0.5 capitalize">{invitation.status}</p>
                </div>
                <div className="p-3 bg-background-50 rounded-lg">
                  <p className="text-xs text-foreground-500">Delivery</p>
                  <p className="text-sm font-label text-foreground-900 mt-0.5">
                    {invitation.delivery_status ? DELIVERY_STATUS_LABELS[invitation.delivery_status] || invitation.delivery_status : 'Not sent'}
                  </p>
                </div>
                {invitation.sent_at && (
                  <div className="p-3 bg-background-50 rounded-lg">
                    <p className="text-xs text-foreground-500">Sent at</p>
                    <p className="text-sm font-label text-foreground-900 mt-0.5">{new Date(invitation.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                {invitation.delivery_attempts !== undefined && invitation.delivery_attempts > 0 && (
                  <div className="p-3 bg-background-50 rounded-lg">
                    <p className="text-xs text-foreground-500">Attempts</p>
                    <p className="text-sm font-label text-foreground-900 mt-0.5">{invitation.delivery_attempts}</p>
                  </div>
                )}
              </div>

              {invitation.last_delivery_error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <strong className="font-label">Last error:</strong> {invitation.last_delivery_error}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {invitation.status === 'ready' && (
                  <button onClick={() => setShowSendConfirm(true)} disabled={sending} className="btn-primary text-sm py-2 px-4 cursor-pointer whitespace-nowrap disabled:opacity-50">
                    {sending ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Sending...</> : <><i className="ri-send-plane-line mr-1.5" />Send by email</>}
                  </button>
                )}
                {invitation.status === 'sent' && (
                  <button onClick={handleResend} disabled={sending} className="btn-outline text-sm cursor-pointer whitespace-nowrap text-accent-600 border-accent-200 disabled:opacity-50">
                    {sending ? 'Sending...' : <><i className="ri-refresh-line mr-1.5" />Resend</>}
                  </button>
                )}
              </div>
            </div>

            {/* Secure link */}
            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
                <i className={`ri-${isActive ? 'shield-check' : isRevoked ? 'shield-cross' : 'shield-keyhole'}-line text-foreground-500`} />
                Secure Invitation Link
              </h2>

              {isActive ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-label">Active</span>
                    <span className="text-xs text-foreground-500">Version {accessToken.token_version}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div><dt className="text-xs text-foreground-500">Created</dt><dd className="text-foreground-700">{accessToken.created_at ? new Date(accessToken.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</dd></div>
                    <div><dt className="text-xs text-foreground-500">Expires</dt><dd className="text-foreground-700">{accessToken.expires_at ? new Date(accessToken.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No expiry'}</dd></div>
                    <div><dt className="text-xs text-foreground-500">Last used</dt><dd className="text-foreground-700">{accessToken.last_used_at ? new Date(accessToken.last_used_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not yet used'}</dd></div>
                    <div><dt className="text-xs text-foreground-500">Channel</dt><dd className="text-foreground-700 capitalize">{accessToken.delivery_channel || 'link'}</dd></div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {hasLink && (
                      <button onClick={handleCopyLink} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
                        <i className={`ri-${copied ? 'check' : 'file-copy'}-line mr-1.5`} />{copied ? 'Copied' : 'Copy link'}
                      </button>
                    )}
                    <button onClick={() => setShowRotateConfirm(true)} disabled={revoking} className="btn-outline text-xs py-2 text-amber-600 border-amber-200 hover:bg-amber-50 cursor-pointer whitespace-nowrap">
                      <i className="ri-refresh-line mr-1.5" />Rotate link
                    </button>
                    <button onClick={handleRevokeLink} disabled={revoking} className="btn-outline text-xs py-2 text-red-500 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap">
                      <i className="ri-close-circle-line mr-1.5" />Revoke link
                    </button>
                  </div>
                </>
              ) : isRevoked ? (
                <div>
                  <span className="px-2.5 py-1 rounded-full bg-foreground-100 text-foreground-500 text-xs font-label mb-3 inline-block">Revoked</span>
                  <p className="text-sm text-foreground-500 mb-1">
                    Revoked on {accessToken.revoked_at ? new Date(accessToken.revoked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <button onClick={handleGenerateLink} disabled={generating} className="btn-outline text-xs py-2 mt-3 cursor-pointer whitespace-nowrap">
                    <i className="ri-add-line mr-1.5" />Generate new link
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-3">
                    <i className="ri-link-unlink text-xl" />
                  </div>
                  <p className="text-sm text-foreground-500 mb-4">No secure access link has been created for this invitation yet.</p>
                  <button onClick={handleGenerateLink} disabled={generating} className="btn-primary text-sm cursor-pointer whitespace-nowrap">
                    <i className="ri-link mr-1.5" />{generating ? 'Generating...' : 'Generate invitation link'}
                  </button>
                </div>
              )}
            </div>

            {/* Security warnings */}
            <div className="card-default bg-amber-50/50 border-amber-200/50">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2">
                <i className="ri-alert-line text-amber-600" /> Important
              </h3>
              <ul className="space-y-1.5 text-xs text-foreground-600">
                <li className="flex items-start gap-2"><i className="ri-arrow-right-s-line text-amber-500 mt-0.5 flex-shrink-0" /> Anyone with the current link can access the invited guest information.</li>
                <li className="flex items-start gap-2"><i className="ri-arrow-right-s-line text-amber-500 mt-0.5 flex-shrink-0" /> Do not post private invitation links publicly.</li>
                <li className="flex items-start gap-2"><i className="ri-arrow-right-s-line text-amber-500 mt-0.5 flex-shrink-0" /> Rotating a link immediately invalidates the previous link.</li>
                <li className="flex items-start gap-2"><i className="ri-arrow-right-s-line text-amber-500 mt-0.5 flex-shrink-0" /> Links are encrypted (hashed) in storage and never exposed in logs.</li>
                <li className="flex items-start gap-2"><i className="ri-arrow-right-s-line text-amber-500 mt-0.5 flex-shrink-0" /> For digital delivery, use the Send button above to email the invitation directly.</li>
              </ul>
            </div>

            {/* Activity */}
            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
                <i className="ri-history-line text-foreground-500" /> Access Activity
              </h2>
              {activity.length === 0 ? (
                <p className="text-sm text-foreground-400">No access activity recorded.</p>
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 15).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-xs text-foreground-400 whitespace-nowrap mt-0.5">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <span className="text-foreground-700">{a.summary || a.event_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Preview</h3>
              <p className="text-xs text-foreground-500 mb-4">See exactly what your guests will see when they open the invitation.</p>
              <button onClick={handlePreview} className="btn-outline text-xs py-2 w-full cursor-pointer whitespace-nowrap">
                <i className="ri-eye-line mr-1.5" />Preview as guest
              </button>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Invitation Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${invitation.status === 'ready' ? 'bg-accent-500' : invitation.status === 'draft' ? 'bg-secondary-400' : invitation.status === 'sent' ? 'bg-primary-500' : 'bg-foreground-400'}`} />
                  <span className="text-foreground-700 capitalize">{invitation.status}</span>
                </div>
                {invitation.delivery_status && (
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${invitation.delivery_status === 'delivered' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-foreground-700">{DELIVERY_STATUS_LABELS[invitation.delivery_status] || invitation.delivery_status}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Timestamps</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-foreground-500">Created</dt><dd className="text-foreground-700">{invitation.created_at ? new Date(invitation.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Last updated</dt><dd className="text-foreground-700">{invitation.updated_at ? new Date(invitation.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</dd></div>
                {invitation.sent_at && <div><dt className="text-xs text-foreground-500">Sent</dt><dd className="text-foreground-700">{new Date(invitation.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>}
              </dl>
            </div>
          </div>
        </div>

        {/* Rotate confirmation */}
        {showRotateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowRotateConfirm(false)} />
            <div className="relative bg-white rounded-xl border border-secondary-200 p-6 max-w-sm mx-4 z-10">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Rotate Invitation Link?</h3>
              <p className="text-xs text-foreground-500 mb-4">
                This will immediately invalidate the current link. Anyone using the old link will not be able to access the invitation. A new link will be generated.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setShowRotateConfirm(false)} className="btn-ghost text-xs cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleRotateLink} className="btn-primary text-xs cursor-pointer whitespace-nowrap bg-amber-500 hover:bg-amber-600">Rotate link</button>
              </div>
            </div>
          </div>
        )}

        {/* Send confirmation */}
        {showSendConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowSendConfirm(false)} />
            <div className="relative bg-white rounded-xl border border-secondary-200 p-6 max-w-sm mx-4 z-10">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Send invitation by email?</h3>
              <p className="text-xs text-foreground-500 mb-4">
                This will send the invitation to {invitation.formal_recipient_name || 'the recipients'}. A secure access token will be generated and included in the email.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setShowSendConfirm(false)} className="btn-ghost text-xs cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleSendEmail} disabled={sending} className="btn-primary text-xs cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {sending ? 'Sending...' : 'Send invitation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}