import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import type { DemoGuest } from '@/demo/demoTypes';

// ── Normal mode — preserve existing Supabase preview ──
import { useState as useS, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { Invitation, InvitationRecipient } from '@/types/invitation';

function NormalInvitationPreviewPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useS(true);
  const [error, setError] = useS('');
  const [previewMode, setPreviewMode] = useS<'invitation' | 'desktop' | 'mobile'>('invitation');
  const [invitation, setInvitation] = useS<Invitation | null>(null);
  const [wedding, setWedding] = useS<{ partner_one_name: string; partner_two_name: string; title: string; wedding_date: string; dress_code?: string } | null>(null);
  const [recipients, setRecipients] = useS<InvitationRecipient[]>([]);
  useEffect(() => { if (!invitationId) return; (async () => { try { const [invRes, wedRes, recipRes] = await Promise.all([supabase.from('invitations').select('*, template:invitation_templates(id, name, style_preset, header_text, body_text, closing_text, footer_text)').eq('id', invitationId).eq('wedding_id', weddingId).maybeSingle(), supabase.from('weddings').select('partner_one_name, partner_two_name, title, wedding_date, dress_code').eq('id', weddingId).maybeSingle(), supabase.from('invitation_recipients').select('*, guest:guests(id, full_name)').eq('invitation_id', invitationId)]); if (!invRes.data) { setError('Invitation not found'); return; } setInvitation(invRes.data as Invitation); setWedding(wedRes.data as typeof wedding); setRecipients((recipRes.data || []) as InvitationRecipient[]); } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load preview'); } finally { setLoading(false); } })(); }, [invitationId]);
  if (loading) return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading preview...</span></div></div></AppShell>;
  if (error || !invitation || !wedding) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{error || 'Could not load preview'}</p><button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer">Back</button></div></AppShell>;
  const preset = invitation.template?.style_preset || 'minimal';
  const presetStyles: Record<string, { bg: string; text: string; accent: string; border: string }> = { classic: { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-200' }, modern: { bg: 'bg-slate-50', text: 'text-slate-900', accent: 'text-slate-600', border: 'border-slate-200' }, botanical: { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-200' }, minimal: { bg: 'bg-white', text: 'text-foreground-900', accent: 'text-primary-600', border: 'border-secondary-100' }, romantic: { bg: 'bg-rose-50', text: 'text-rose-900', accent: 'text-rose-600', border: 'border-rose-200' }, editorial: { bg: 'bg-stone-50', text: 'text-stone-900', accent: 'text-stone-600', border: 'border-stone-300' } };
  const ps = presetStyles[preset] || presetStyles.minimal;
  const dateDisplay = wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const names = recipients.map((r) => r.guest?.full_name || 'Guest');
  return (
    <AppShell><div className="max-w-4xl mx-auto"><div className="flex items-center justify-between mb-6"><div><h1 className="font-heading text-2xl text-foreground-900">Preview Invitation</h1></div><button onClick={() => navigate(`/app/invitations/${invitationId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button></div>
    <div className="mb-6 p-3 bg-accent-50/50 border border-accent-200/30 rounded-lg text-center"><p className="text-xs text-accent-700 font-label"><i className="ri-eye-line mr-1" />Preview mode — no guest activity is recorded</p></div>
    <div className={`${ps.bg} rounded-2xl ${ps.border} border p-8 md:p-12`}><div className="max-w-lg mx-auto text-center"><p className={`font-heading text-3xl md:text-4xl ${ps.text} mb-2`}>{wedding.partner_one_name} <span className="text-xl">&amp;</span> {wedding.partner_two_name}</p>{dateDisplay && <p className={`text-sm font-label ${ps.accent} tracking-wider uppercase mb-6`}>{dateDisplay}</p>}{invitation.formal_recipient_name && <p className={`text-base font-label ${ps.text} mb-3`}>{invitation.formal_recipient_name}</p>}{invitation.informal_greeting && <p className={`text-sm font-label ${ps.accent} mb-3`}>Dear {invitation.informal_greeting},</p>}{names.length > 0 && <p className={`text-sm ${ps.text} font-label mb-4`}>Invited: {names.join(', ')}</p>}</div></div></div></AppShell>
  );
}

// ── Demo mode ──

function DemoInvitationPreviewPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const demo = useDemoDataSafe();

  if (!demo) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-foreground-500">Demo data not available</p></div></AppShell>;

  const { state } = demo;
  const invitation = state.invitations.find((i) => i.id === invitationId);
  if (!invitation) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Invitation not found</p><button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer">Back</button></div></AppShell>;

  const wedding = state.wedding;
  const recipRecords = state.invitationRecipients.filter((r) => r.invitation_id === invitation.id);
  const recipientGuests = recipRecords.map((r) => state.guests.find((g) => g.id === r.guest_id)).filter(Boolean) as DemoGuest[];
  const isOliver = recipientGuests.some((g) => g.id === 'demo-guest-oliver');

  // Ceremony and reception venue names
  const ceremonyVenue = state.venues.find((v) => v.venue_type === 'ceremony');
  const receptionVenue = state.venues.find((v) => v.venue_type === 'reception');

  const dateDisplay = wedding.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const deadlineDisplay = invitation.rsvp_deadline
    ? new Date(invitation.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const hasCeremony = recipRecords.some((r) => r.ceremony_included);
  const hasReception = recipRecords.some((r) => r.reception_included);
  const hasEvening = recipRecords.some((r) => r.evening_included);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Preview Invitation</h1>
            <p className="text-sm text-foreground-500">{invitation.internal_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/app/invitations/${invitationId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            {isOliver && (
              <button onClick={() => navigate('/guest/demo-session/rsvp')} className="btn-outline text-sm cursor-pointer text-primary-600 border-primary-200 whitespace-nowrap">
                <i className="ri-user-line mr-1.5" />View as Oliver
              </button>
            )}
          </div>
        </div>

        {/* Preview mode notice */}
        <div className="mb-6 p-3 bg-amber-50/60 border border-amber-200/30 rounded-lg text-center">
          <p className="text-xs text-amber-700 font-label">
            <i className="ri-eye-line mr-1" /> Demo preview — this is a demonstration invitation
          </p>
        </div>

        {/* Invitation card */}
        <div className="bg-white rounded-2xl border border-secondary-100 p-8 md:p-14 shadow-sm max-w-2xl mx-auto">
          <div className="text-center space-y-5">
            {/* Names */}
            <div>
              <p className="font-heading text-4xl md:text-5xl text-foreground-900 tracking-tight">
                {wedding.partner_one_name} <span className="text-2xl md:text-3xl font-light">&amp;</span> {wedding.partner_two_name}
              </p>
            </div>

            {/* Intro */}
            <p className="text-sm text-foreground-600 leading-relaxed max-w-sm mx-auto italic">
              Together with their families, Emma Carter and James Bennett invite you to celebrate their wedding.
            </p>

            {/* Recipient greeting */}
            <div className="pt-2">
              <p className="text-base font-label text-foreground-800">Dear {invitation.informal_greeting},</p>
            </div>

            {/* Date */}
            <div className="py-3">
              <p className="font-heading text-2xl text-foreground-900">{dateDisplay}</p>
            </div>

            {/* Events */}
            <div className="space-y-3 max-w-sm mx-auto">
              {hasCeremony && ceremonyVenue && (
                <div className="p-4 bg-background-50 rounded-xl">
                  <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Ceremony</p>
                  <p className="text-sm font-label font-medium text-foreground-900 mt-1">{ceremonyVenue.name}</p>
                  <p className="text-xs text-foreground-500 mt-0.5">1:00 PM</p>
                </div>
              )}
              {hasReception && receptionVenue && (
                <div className="p-4 bg-background-50 rounded-xl">
                  <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Reception</p>
                  <p className="text-sm font-label font-medium text-foreground-900 mt-1">{receptionVenue.name}</p>
                  <p className="text-xs text-foreground-500 mt-0.5">3:00 PM</p>
                </div>
              )}
              {hasEvening && (
                <div className="p-4 bg-background-50 rounded-xl">
                  <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Evening Celebration</p>
                  <p className="text-sm font-label font-medium text-foreground-900 mt-1">{receptionVenue?.name || 'The Orangery'}</p>
                  <p className="text-xs text-foreground-500 mt-0.5">7:00 PM</p>
                </div>
              )}
            </div>

            {/* RSVP deadline */}
            {deadlineDisplay && (
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-100 text-foreground-700 text-xs font-label">
                  <i className="ri-calendar-line" />
                  Kindly respond by {deadlineDisplay}
                </div>
              </div>
            )}

            {/* Dress code */}
            {wedding.dress_code && (
              <p className="text-xs text-foreground-500">{wedding.dress_code}</p>
            )}

            {/* RSVP button (visual only) */}
            <div className="pt-3">
              <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium">
                <i className="ri-check-double-line" /> RSVP
              </div>
            </div>

            {/* Recipient list */}
            <div className="pt-4 border-t border-secondary-100">
              <p className="text-xs text-foreground-400 mb-2">This invitation is for:</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {recipientGuests.map((g) => (
                  <span key={g.id} className="px-3 py-1 rounded-full bg-background-50 border border-secondary-200 text-xs text-foreground-700 font-label">
                    {g.preferred_name || g.full_name}
                    {recipRecords.find((r) => r.guest_id === g.id)?.plus_one_allowed && ' + guest'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function InvitationPreviewPage() {
  if (isDemoMode) return <DemoInvitationPreviewPage />;
  return <NormalInvitationPreviewPage />;
}