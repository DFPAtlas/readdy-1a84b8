import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storeGuestSession } from '@/hooks/useGuestPortal';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { supabase } from '@/lib/supabase';

const DEMO_INVITE_FLAG = 'vowora_demo_invite';

interface InviteData {
  wedding: {
    id: string;
    partner_one_name: string;
    partner_two_name: string;
    title: string;
    wedding_date: string;
    dress_code?: string;
    welcome_message?: string;
    contact_information?: string;
  };
  invitation: {
    id: string;
    formal_recipient_name?: string;
    informal_greeting?: string;
    invitation_type: string;
    rsvp_deadline?: string;
    status: string;
    template?: Record<string, unknown> | null;
  };
  recipients: Array<{
    guest_id: string;
    guest_name: string;
    recipient_role: string;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    name: string;
    start_at?: string;
  }>;
  portal_settings: {
    show_countdown?: boolean;
    show_travel?: boolean;
    show_updates?: boolean;
    show_contact_details?: boolean;
    custom_guest_message?: string;
  } | null;
}

export default function InviteLandingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This invitation link appears to be invalid.');
      setLoading(false);
      return;
    }

    // ── Demo Mode — check token or session flag (survives URL rewrites) ──
    const demoFlagSet = isDemoMode && sessionStorage.getItem(DEMO_INVITE_FLAG) === '1';
    const isDemoToken = isDemoMode && token === DEMO_CONFIG.demoToken;
    const demoActive = isDemoToken || demoFlagSet;

    if (demoActive) {
      // Store flag so refresh on rewritten URL still works
      sessionStorage.setItem(DEMO_INVITE_FLAG, '1');
      try { window.history.replaceState(null, '', '/invite/demo-verified'); } catch { /* best effort */ }
      storeGuestSession(DEMO_CONFIG.guestSessionId);
      setInviteData({
        wedding: {
          id: DEMO_CONFIG.weddingId,
          partner_one_name: 'Emma',
          partner_two_name: 'James',
          title: 'Emma & James',
          wedding_date: '2027-04-24',
          dress_code: 'Formal — black tie optional',
          welcome_message: 'We are so excited to celebrate our special day with you. Thank you for being part of our journey.',
          contact_information: 'emma.and.james@example.com',
        },
        invitation: {
          id: 'demo-inv-bennett-demo',
          formal_recipient_name: 'Mr Oliver Bennett & Miss Charlotte Ellis',
          informal_greeting: 'Oliver & Charlotte',
          invitation_type: 'household',
          rsvp_deadline: '2027-03-24',
          status: 'sent',
          template: { style_preset: 'minimal' } as Record<string, unknown>,
        },
        recipients: [
          { guest_id: 'demo-guest-oliver', guest_name: 'Oliver Bennett', recipient_role: 'primary' },
        ],
        events: [
          { id: 'demo-event-welcome', event_type: 'welcome', name: 'Welcome Drinks', start_at: '2027-04-23T19:00:00+01:00' },
          { id: 'demo-event-ceremony', event_type: 'ceremony', name: 'Wedding Ceremony', start_at: '2027-04-24T13:00:00+01:00' },
          { id: 'demo-event-reception', event_type: 'reception', name: 'Wedding Breakfast & Reception', start_at: '2027-04-24T15:00:00+01:00' },
          { id: 'demo-event-farewell', event_type: 'farewell', name: 'Farewell Brunch', start_at: '2027-04-25T10:30:00+01:00' },
        ],
        portal_settings: { show_countdown: true, show_travel: true, show_updates: true, show_contact_details: true },
      });
      setLoading(false);
      return;
    }

    // Clean the URL to remove the raw token from browser history
    try {
      window.history.replaceState(null, '', `/invite/verified`);
    } catch { /* best effort */ }

    (async () => {
      try {
        const { data: result, error: invokeErr } = await supabase.functions.invoke('validate-invitation', {
          body: { rawToken: token },
        });

        if (invokeErr || !result) throw new Error('invitation_unavailable');

        if (!result.valid) {
          const reason = result.reason || 'invalid_link';
          if (reason === 'expired') setError('This invitation link is no longer active.');
          else if (reason === 'cancelled') setError('This invitation is no longer available.');
          else if (reason === 'portal_disabled') setError('The wedding portal is currently unavailable.');
          else setError('This invitation link is invalid or no longer active.');
          setLoading(false);
          return;
        }

        const { data, session_id } = result;

        if (session_id) {
          storeGuestSession(session_id);
        }

        setInviteData(data);
      } catch {
        setError('We could not verify your invitation at this time. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleViewDetails = () => {
    const sessionSecret = sessionStorage.getItem('vowora_guest_session');
    if (sessionSecret) {
      navigate(`/guest/${sessionSecret}`);
    } else if (inviteData) {
      setError('Could not establish a secure session. Please try your invitation link again.');
    }
  };

  const wedding = inviteData?.wedding;
  const invitation = inviteData?.invitation;
  const recipients = inviteData?.recipients;
  const template = invitation?.template;

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-6">
            <i className="ri-mail-close-line text-3xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Invitation Unavailable</h1>
          <p className="text-sm text-foreground-500 leading-relaxed">{error}</p>
          <p className="text-xs text-foreground-400 mt-4">If you believe this is a mistake, please contact the couple directly.</p>
        </div>
      </div>
    );
  }

  if (!wedding || !invitation) return null;

  const dateDisplay = wedding.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const preset = template?.style_preset || 'minimal';
  const presetStyles: Record<string, { bg: string; text: string; accent: string; border: string }> = {
    classic: { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-200' },
    modern: { bg: 'bg-slate-50', text: 'text-slate-900', accent: 'text-slate-600', border: 'border-slate-200' },
    botanical: { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-200' },
    minimal: { bg: 'bg-white', text: 'text-foreground-900', accent: 'text-primary-600', border: 'border-secondary-100' },
    romantic: { bg: 'bg-rose-50', text: 'text-rose-900', accent: 'text-rose-600', border: 'border-rose-200' },
    editorial: { bg: 'bg-stone-50', text: 'text-stone-900', accent: 'text-stone-600', border: 'border-stone-300' },
  };
  const ps = presetStyles[preset as keyof typeof presetStyles] || presetStyles.minimal;

  const mainNames = recipients
    ?.filter((r: { recipient_role: string }) => r.recipient_role === 'primary' || r.recipient_role === 'partner')
    .map((r: { guest_name: string }) => r.guest_name) || [];
  const allNames = recipients?.map((r: { guest_name: string }) => r.guest_name) || [];

  return (
    <div className={`min-h-screen ${ps.bg} flex flex-col`}>
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-2xl">
          <div className={`bg-white rounded-2xl ${ps.border} border p-8 md:p-12 text-center`}>
            {/* Couple names */}
            <p className={`font-heading text-4xl md:text-5xl ${ps.text} mb-2`}>
              {wedding.partner_one_name} <span className="text-2xl">&amp;</span> {wedding.partner_two_name}
            </p>
            {dateDisplay && (
              <p className={`text-sm font-label ${ps.accent} tracking-wider uppercase mb-8`}>{dateDisplay}</p>
            )}

            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className={`block w-12 h-px ${ps.accent} opacity-30`} />
              <i className={`ri-heart-line ${ps.accent} text-lg`} />
              <span className={`block w-12 h-px ${ps.accent} opacity-30`} />
            </div>

            {/* Invitation text */}
            {template?.header_text && (
              <h2 className={`font-heading text-2xl md:text-3xl ${ps.text} mb-4`}>{template.header_text as string}</h2>
            )}

            {/* Recipient greeting */}
            {invitation.formal_recipient_name && (
              <p className={`text-lg font-label ${ps.text} mb-4`}>{invitation.formal_recipient_name}</p>
            )}
            {invitation.informal_greeting && (
              <p className={`text-sm font-label ${ps.accent} mb-3`}>Dear {invitation.informal_greeting},</p>
            )}

            {template?.body_text && (
              <p className={`text-sm ${ps.text} opacity-80 leading-relaxed max-w-lg mx-auto mb-8`}>
                {template.body_text as string}
              </p>
            )}

            {/* Included guests */}
            {allNames.length > 0 && (
              <div className="mb-8">
                <p className="text-xs text-foreground-500 font-label uppercase tracking-wider mb-2">Invited</p>
                <p className={`text-sm ${ps.text} font-label`}>{allNames.join(', ')}</p>
              </div>
            )}

            {/* Events */}
            <div className="mb-8">
              <p className="text-xs text-foreground-500 font-label uppercase tracking-wider mb-3">Events</p>
              <div className="flex flex-wrap justify-center gap-2">
                {inviteData?.events.map((evt) => (
                  <span key={evt.id} className="px-3 py-1.5 rounded-full bg-background-50 border border-secondary-200 text-xs text-foreground-600 font-label">
                    {evt.name}
                  </span>
                ))}
              </div>
            </div>

            {/* RSVP deadline */}
            {invitation.rsvp_deadline && (
              <div className="mb-8">
                <p className="text-xs text-foreground-500 font-label uppercase tracking-wider mb-1">RSVP by</p>
                <p className={`text-sm font-label font-medium ${ps.text}`}>
                  {new Date(invitation.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Closing */}
            {template?.closing_text && (
              <p className={`text-sm ${ps.text} opacity-70 italic mb-8`}>{template.closing_text as string}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleViewDetails}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-eye-line" /> View invitation details
              </button>
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-secondary-200 text-foreground-400 text-sm font-label cursor-not-allowed whitespace-nowrap opacity-50"
              >
                <i className="ri-check-double-line" /> Respond to invitation
              </button>
            </div>

            {template?.footer_text && (
              <p className={`text-xs ${ps.accent} opacity-60 mt-8`}>{template.footer_text as string}</p>
            )}
          </div>

          {/* Privacy note */}
          <p className="text-center text-[10px] text-foreground-300 mt-6">
            This is a private invitation. Please do not share this link without the couple&rsquo;s permission.
          </p>
        </div>
      </main>
    </div>
  );
}