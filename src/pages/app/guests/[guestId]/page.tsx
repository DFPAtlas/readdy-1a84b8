import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import type { Guest, GuestHousehold, GuestTag } from '@/types/guest';
import { TAG_COLOUR_CLASSES } from '@/types/guest';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { DemoGuest } from '@/demo/demoTypes';

// ── Helpers ──

function getRsvpLabel(status: string): string {
  if (status === 'accepted') return 'Attending';
  if (status === 'declined') return 'Declined';
  return 'Awaiting reply';
}

function getRsvpClass(status: string): string {
  if (status === 'accepted') return 'bg-accent-100 text-accent-700';
  if (status === 'declined') return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

// ── Demo Guest Detail ──

function DemoGuestDetailPage() {
  const { guestId } = useParams();
  const navigate = useNavigate();
  const demo = useDemoDataSafe()!;
  const { state, archiveGuest, restoreGuest, addDemoActivity, generateDemoId, updateRsvp, updateGuest } = demo;

  const guest = useMemo(() => state.guests.find((g) => g.id === guestId), [state.guests, guestId]);
  const household = useMemo(() => state.households.find((h) => h.id === guest?.household_id), [state.households, guest?.household_id]);
  const householdMembers = useMemo(() => state.guests.filter((g) => g.household_id === guest?.household_id && g.id !== guestId), [state.guests, guest?.household_id, guestId]);
  const seatAssignment = useMemo(() => state.seatingPlan.assignments.find((a) => a.guest_id === guestId), [state.seatingPlan.assignments, guestId]);
  const seatTable = useMemo(() => seatAssignment ? state.seatingPlan.tables.find((t) => t.id === seatAssignment.table_id) : null, [state.seatingPlan.tables, seatAssignment]);

  const relevantActivities = useMemo(
    () => state.activityFeed.filter((a) => a.related_guest === guestId).slice(0, 10),
    [state.activityFeed, guestId],
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [quickRsvpOpen, setQuickRsvpOpen] = useState(false);
  const [confirmRsvpDecline, setConfirmRsvpDecline] = useState(false);

  if (!guest) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">Guest not found</p>
          <button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer">Back to guests</button>
        </div>
      </AppShell>
    );
  }

  const displayName = guest.preferred_name || guest.full_name || 'Unnamed';
  const fullDisplayName = (() => { const last = guest.last_name || ''; if (!last) return displayName; if (displayName.toLowerCase().includes(last.toLowerCase())) return displayName; return `${displayName} ${last}`; })();

  const handleArchive = () => {
    archiveGuest(guest.id);
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${displayName} archived`, category: 'guest', related_guest: guest.id, wedding_id: state.wedding.id });
    setFeedback({ type: 'success', message: 'Demo: Guest archived' });
  };

  const handleRestore = () => {
    restoreGuest(guest.id);
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${displayName} restored`, category: 'guest', related_guest: guest.id, wedding_id: state.wedding.id });
    setFeedback({ type: 'success', message: 'Demo: Guest restored' });
  };

  const handleQuickRsvp = (status: DemoGuest['rsvp_status']) => {
    // If changing to declined and guest has a seat, confirm first
    if (status === 'declined' && seatAssignment) {
      setConfirmRsvpDecline(true);
      setQuickRsvpOpen(false);
      return;
    }
    applyRsvpChange(status);
  };

  const applyRsvpChange = (status: DemoGuest['rsvp_status']) => {
    updateRsvp(guest.id, status);
    // Unseat if declined
    if (status === 'declined' && seatAssignment) {
      demo.unassignGuest(guest.id);
    }
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${displayName} RSVP changed to ${getRsvpLabel(status)}`, category: 'rsvp', related_guest: guest.id, wedding_id: state.wedding.id });
    setQuickRsvpOpen(false);
    setConfirmRsvpDecline(false);
    setFeedback({ type: 'success', message: 'Demo: RSVP updated' });
  };

  const hasDietary = !!(guest.dietary_requirements || guest.allergy_notes);
  const hasAccessibility = !!(guest.accessibility_needs || guest.accessibility_notes);
  const isOliver = guest.id === 'demo-guest-oliver';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {feedback.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{fullDisplayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {guest.relationship_label && <span className="text-sm text-foreground-500">{guest.relationship_label}</span>}
              {guest.wedding_party_role && <span className="px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-700">{guest.wedding_party_role}</span>}
              {guest.guest_type === 'child' && <span className="px-2 py-0.5 rounded text-xs bg-accent-100 text-accent-700">Child</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs ${getRsvpClass(guest.rsvp_status)}`}>{getRsvpLabel(guest.rsvp_status)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => navigate(`/app/guests/${guestId}/edit`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-pencil-line mr-1.5" />Edit</button>
            {guest.status === 'active' ? (
              <button onClick={handleArchive} className="btn-outline text-sm text-red-500 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1.5" />Archive</button>
            ) : (
              <button onClick={handleRestore} className="btn-outline text-sm text-accent-600 border-accent-200 hover:bg-accent-50 cursor-pointer whitespace-nowrap"><i className="ri-refresh-line mr-1.5" />Restore</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2"><i className="ri-user-line text-foreground-500" />Overview</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Full name</dt><dd className="text-foreground-900">{fullDisplayName}</dd></div>
                <div><dt className="text-xs text-foreground-500">Preferred name</dt><dd className="text-foreground-900">{guest.preferred_name || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Title</dt><dd className="text-foreground-900">{guest.title || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Guest type</dt><dd className="text-foreground-900 capitalize">{guest.guest_type}</dd></div>
                <div><dt className="text-xs text-foreground-500">Connection</dt><dd className="text-foreground-900">{guest.connection_group || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Status</dt><dd><span className={`inline-flex items-center gap-1 text-sm ${guest.status === 'active' ? 'text-accent-600' : 'text-foreground-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${guest.status === 'active' ? 'bg-accent-500' : 'bg-foreground-300'}`} />{guest.status}</span></dd></div>
              </dl>
            </div>

            {/* Contact */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2"><i className="ri-mail-line text-foreground-500" />Contact</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Email</dt><dd className="text-foreground-900">{guest.email || <span className="text-red-400 text-xs">Missing</span>}</dd></div>
                <div><dt className="text-xs text-foreground-500">Mobile</dt><dd className="text-foreground-900">{guest.mobile_phone || <span className="text-red-400 text-xs">Missing</span>}</dd></div>
                <div><dt className="text-xs text-foreground-500">Preferred method</dt><dd className="text-foreground-900 capitalize">{guest.preferred_contact_method || 'None'}</dd></div>
              </dl>
            </div>

            {/* Invitation & RSVP */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2"><i className="ri-mail-send-line text-foreground-500" />Invitation &amp; RSVP</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Group</dt><dd className="text-foreground-900">{guest.invitation_group || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Preparation</dt><dd className="text-foreground-900">{guest.invite_preparation_status === 'ready' ? 'Ready' : 'Draft'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Plus-one</dt><dd className="text-foreground-900 capitalize">{guest.plus_one_status}{guest.plus_one_name ? ` — ${guest.plus_one_name}` : ''}</dd></div>
                <div><dt className="text-xs text-foreground-500">Invited to</dt><dd className="text-foreground-900">{[guest.ceremony_invited && 'Ceremony', guest.reception_invited && 'Reception', guest.evening_invited && 'Evening'].filter(Boolean).join(', ') || '—'}</dd></div>
                <div className="col-span-2">
                  <dt className="text-xs text-foreground-500 mb-1">RSVP status</dt>
                  <dd>
                    <div className="relative inline-block">
                      <button onClick={() => setQuickRsvpOpen(!quickRsvpOpen)} className={`px-3 py-1 rounded-full text-sm cursor-pointer ${getRsvpClass(guest.rsvp_status)}`}>{getRsvpLabel(guest.rsvp_status)} <i className="ri-arrow-down-s-line ml-1 text-xs" /></button>
                      {quickRsvpOpen && (
                        <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-1.5 z-20 min-w-[150px]">
                          {(['accepted', 'pending', 'declined'] as const).map((s) => (
                            <button key={s} onClick={() => handleQuickRsvp(s)} className={`block w-full text-left px-3 py-1.5 text-sm rounded cursor-pointer hover:bg-background-100 whitespace-nowrap ${guest.rsvp_status === s ? 'font-semibold' : ''}`}>{getRsvpLabel(s)}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </dd>
                </div>
                {guest.meal_choice && <div><dt className="text-xs text-foreground-500">Meal choice</dt><dd className="text-foreground-900 capitalize">{guest.meal_choice}</dd></div>}
              </dl>
            </div>

            {/* Requirements */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2"><i className="ri-sticky-note-line text-foreground-500" />Requirements &amp; Notes</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Dietary', value: guest.dietary_requirements },
                  { label: 'Allergies', value: guest.allergy_notes },
                  { label: 'Accessibility', value: guest.accessibility_notes || guest.accessibility_needs },
                  { label: 'Mobility / Transport', value: guest.mobility_transport_notes },
                  { label: 'Child notes', value: guest.child_notes },
                ].map((item) => (
                  item.value ? <div key={item.label}><dt className="text-xs text-foreground-500">{item.label}</dt><dd className="text-foreground-900 mt-0.5">{item.value}</dd></div> : null
                ))}
                {![guest.dietary_requirements, guest.allergy_notes, guest.accessibility_notes, guest.accessibility_needs, guest.mobility_transport_notes, guest.child_notes].some(Boolean) && <p className="text-sm text-foreground-400">No requirements recorded.</p>}
              </div>
            </div>

            {/* Activity */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2"><i className="ri-history-line text-foreground-500" />Activity</h3>
              {relevantActivities.length === 0 ? (
                <p className="text-sm text-foreground-400">No activity recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {relevantActivities.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-xs text-foreground-400 whitespace-nowrap mt-0.5">{new Date(a.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      <span className="text-foreground-700">{a.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {household && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2"><i className="ri-home-4-line text-foreground-500" />Household</h3>
                <p className="text-sm font-label text-foreground-900 mb-1">{household.display_name}</p>
                <p className="text-xs text-foreground-500 mb-3">{household.formal_invitation_name}</p>
                {householdMembers.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {householdMembers.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground-700">{m.preferred_name || m.full_name} {m.last_name}</span>
                        <button onClick={() => navigate(`/app/guests/${m.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">View</button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => navigate(`/app/guests/households/${household.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">View household</button>
              </div>
            )}

            {/* Seating */}
            {guest.rsvp_status === 'declined' && seatTable ? (
              <div className="card-default border-amber-200 bg-amber-50/50">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2 flex items-center gap-2"><i className="ri-error-warning-line text-amber-500" />Seating conflict</h3>
                <p className="text-xs text-amber-700 mb-2">This guest declined but is still assigned to <strong>{seatTable.name}</strong>{seatAssignment?.seat_number ? ` (Seat #${seatAssignment.seat_number})` : ''}. You may want to unassign them.</p>
                <button onClick={() => navigate('/app/seating')} className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer font-label">Open seating planner</button>
              </div>
            ) : guest.rsvp_status !== 'declined' && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2"><i className="ri-map-pin-line text-foreground-500" />Seating</h3>
                {seatTable ? (
                  <div>
                    <p className="text-sm text-foreground-900">{seatTable.name}</p>
                    {seatAssignment?.seat_number && <p className="text-xs text-foreground-500">Seat #{seatAssignment.seat_number}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-amber-500">Unassigned</p>
                )}
                <button onClick={() => navigate('/app/seating')} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer mt-2">View seating plan</button>
              </div>
            )}

            {/* Tags */}
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {guest.wedding_party_role && <span className="px-2.5 py-1 rounded-full text-xs bg-primary-100 text-primary-700 whitespace-nowrap">Wedding party</span>}
                {guest.invitation_group && <span className="px-2.5 py-1 rounded-full text-xs bg-secondary-100 text-secondary-700 whitespace-nowrap">{guest.invitation_group}</span>}
                {guest.guest_type === 'child' && <span className="px-2.5 py-1 rounded-full text-xs bg-accent-100 text-accent-700 whitespace-nowrap">Child</span>}
                {hasDietary && <span className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${guest.allergy_notes ? 'bg-red-100 text-red-700' : 'bg-secondary-100 text-secondary-600'}`}>{guest.allergy_notes ? 'Allergy' : 'Dietary'}</span>}
                {hasAccessibility && <span className="px-2.5 py-1 rounded-full text-xs bg-secondary-100 text-secondary-600 whitespace-nowrap">Accessibility</span>}
              </div>
            </div>

            {/* Demo guest portal link */}
            {isOliver && (
              <div className="card-default bg-accent-50/50 border-accent-200/50">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2 flex items-center gap-2"><i className="ri-eye-line text-accent-500" />Demo guest portal</h3>
                <p className="text-xs text-foreground-500 mb-3">See what Oliver sees in the guest portal.</p>
                <button onClick={() => navigate('/guest/demo-session')} className="btn-primary text-sm cursor-pointer whitespace-nowrap">View demo guest portal</button>
              </div>
            )}
          </div>
        </div>

        {/* Decline confirmation modal */}
        {confirmRsvpDecline && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmRsvpDecline(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" role="dialog" aria-modal="true">
                <h3 className="font-heading text-lg text-foreground-900 mb-2">Change RSVP to Declined?</h3>
                <p className="text-sm text-foreground-500 mb-5">
                  {seatAssignment ? (
                    <>
                      <span className="block mb-2">{displayName} is currently seated at <strong>{seatTable?.name || 'a table'}</strong>{seatAssignment.seat_number ? ` (Seat #${seatAssignment.seat_number})` : ''}. Changing to Declined will <strong>release their seat</strong>.</span>
                    </>
                  ) : (
                    'This will mark the guest as not attending.'
                  )}
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setConfirmRsvpDecline(false)} className="btn-outline text-sm cursor-pointer">Cancel</button>
                  <button onClick={() => applyRsvpChange('declined')} className="btn-primary text-sm bg-red-500 hover:bg-red-600 cursor-pointer">Mark Declined</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Original Supabase Guest Detail ──

function NormalGuestDetailPage() {
  const { guestId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [household, setHousehold] = useState<GuestHousehold | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Guest[]>([]);
  const [guestTags, setGuestTags] = useState<GuestTag[]>([]);
  const [activityLog, setActivityLog] = useState<Array<{ action: string; summary: string; created_at: string }>>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // RSVP data from rsvp_responses table
  const [rsvpData, setRsvpData] = useState<Record<string, unknown> | null>(null);
  const [rsvpRevisions, setRsvpRevisions] = useState<Array<{ revision_number: number; change_summary: string; created_at: string }>>([]);
  const [rsvpCustomAnswers, setRsvpCustomAnswers] = useState<Array<{ question_label: string; answer: string }>>([]);
  const [manualRsvpOpen, setManualRsvpOpen] = useState(false);
  const [manualRsvpStatus, setManualRsvpStatus] = useState('');
  const [manualRsvpNote, setManualRsvpNote] = useState('');
  const [manualRsvpSaving, setManualRsvpSaving] = useState(false);

  useEffect(() => {
    if (!guestId || !weddingId) return;
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const gRes = await supabase.from('guests').select('*').eq('id', guestId).eq('wedding_id', weddingId).maybeSingle();
        if (cancelled) return;
        if (gRes.error) throw gRes.error;
        if (!gRes.data) { setError('Guest not found'); setLoading(false); return; }
        const g = gRes.data as Guest;
        setGuest(g);

        const [tagRes, hRes, actRes, rsvpRes] = await Promise.all([
          supabase.from('guest_tag_assignments').select('tag_id').eq('guest_id', guestId),
          g.household_id ? supabase.from('guest_households').select('*').eq('id', g.household_id).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from('guest_activity_log').select('action, summary, created_at').eq('guest_id', guestId).order('created_at', { ascending: false }).limit(20),
          supabase.from('rsvp_responses').select('*').eq('guest_id', guestId).eq('wedding_id', weddingId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (cancelled) return;
        if (tagRes.data?.length) {
          const tagIds = tagRes.data.map((t: { tag_id: string }) => t.tag_id);
          const tRes = await supabase.from('guest_tags').select('*').in('id', tagIds);
          if (!cancelled) setGuestTags((tRes.data || []) as GuestTag[]);
        }
        if (hRes.data) setHousehold(hRes.data as GuestHousehold);
        if (hRes.data) {
          const mRes = await supabase.from('guests').select('*').eq('household_id', hRes.data.id).eq('wedding_id', weddingId).neq('id', guestId);
          if (!cancelled) setHouseholdMembers((mRes.data || []) as Guest[]);
        }
        if (!cancelled) setActivityLog((actRes.data || []) as Array<{ action: string; summary: string; created_at: string }>);

        // RSVP response data
        if (rsvpRes.data && !cancelled) {
          const rd = rsvpRes.data as unknown as Record<string, unknown>;
          setRsvpData(rd);

          // Fetch revisions
          if (rd.submission_id) {
            const revRes = await supabase.from('rsvp_response_revisions').select('revision_number, change_summary, created_at').eq('submission_id', rd.submission_id).order('revision_number', { ascending: false });
            if (!cancelled) setRsvpRevisions((revRes.data || []) as Array<{ revision_number: number; change_summary: string; created_at: string }>);
          }

          // Fetch custom answers
          if (rd.id) {
            const caRes = await supabase.from('rsvp_custom_answers').select('question_label, answer').eq('response_id', rd.id);
            if (!cancelled) setRsvpCustomAnswers((caRes.data || []) as Array<{ question_label: string; answer: string }>);
          }
        } else {
          setRsvpData(null);
          setRsvpRevisions([]);
          setRsvpCustomAnswers([]);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [guestId, weddingId]);

  const handleArchive = async () => {
    if (!guest) return;
    const { error: e } = await supabase.from('guests').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', guest.id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to archive' }); return; }
    setFeedback({ type: 'success', message: 'Guest archived' });
    setGuest({ ...guest, status: 'archived', archived_at: new Date().toISOString() });
  };

  const handleRestore = async () => {
    if (!guest) return;
    const { error: e } = await supabase.from('guests').update({ status: 'active', archived_at: null }).eq('id', guest.id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to restore' }); return; }
    setFeedback({ type: 'success', message: 'Guest restored' });
    setGuest({ ...guest, status: 'active', archived_at: null });
  };

  const handleManualRsvp = async () => {
    if (!guest || !weddingId || !manualRsvpStatus) return;
    setManualRsvpSaving(true);
    try {
      const now = new Date().toISOString();
      // Update guest rsvp_status
      const { error: gErr } = await supabase.from('guests').update({ rsvp_status: manualRsvpStatus, updated_at: now }).eq('id', guest.id);
      if (gErr) throw gErr;

      // Create or update rsvp_response record
      if (rsvpData?.id) {
        await supabase.from('rsvp_responses').update({
          response_status: manualRsvpStatus,
          submitted_at: now,
          updated_at: now,
          is_draft: false,
        }).eq('id', rsvpData.id);
      }

      // Log the activity
      const auditNote = manualRsvpNote.trim() ? ` — Note: ${manualRsvpNote.trim()}` : '';
      await supabase.from('guest_activity_log').insert({
        wedding_id: weddingId,
        guest_id: guest.id,
        action: 'rsvp_manual',
        summary: `RSVP manually recorded as ${getRsvpLabel(manualRsvpStatus)} by couple${auditNote}`,
        actor_source: 'couple',
      });

      setFeedback({ type: 'success', message: `RSVP recorded as ${getRsvpLabel(manualRsvpStatus)}` });
      setManualRsvpOpen(false);
      setManualRsvpNote('');
      setGuest({ ...guest, rsvp_status: manualRsvpStatus });

      // Refresh RSVP data
      const { data: freshRsvp } = await supabase.from('rsvp_responses').select('*').eq('guest_id', guest.id).eq('wedding_id', weddingId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      setRsvpData((freshRsvp || null) as unknown as Record<string, unknown> | null);

      // Refresh activity
      const { data: freshAct } = await supabase.from('guest_activity_log').select('action, summary, created_at').eq('guest_id', guestId).order('created_at', { ascending: false }).limit(20);
      setActivityLog((freshAct || []) as Array<{ action: string; summary: string; created_at: string }>);
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to record RSVP' });
    } finally {
      setManualRsvpSaving(false);
    }
  };

  const displayName = (g: Guest) => g.preferred_name || g.full_name || 'Unnamed';
  const rsvpStatus = rsvpData?.response_status as string || guest?.rsvp_status || 'pending';
  const rsvpIsAttending = rsvpStatus === 'attending';

  if (loading) return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading guest...</span></div></div></AppShell>;
  if (error || !guest) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{error || 'Guest not found'}</p><button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer">Back to guests</button></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{displayName(guest)} {guest.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {guest.relationship_label && <span className="text-sm text-foreground-500">{guest.relationship_label}</span>}
              {guest.wedding_party_role && <span className="px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-700">{guest.wedding_party_role}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => navigate(`/app/guests/${guestId}/edit`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-pencil-line mr-1.5" />Edit</button>
            {guest.status === 'active' ? <button onClick={handleArchive} className="btn-outline text-sm text-red-500 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1.5" />Archive</button> : <button onClick={handleRestore} className="btn-outline text-sm text-accent-600 border-accent-200 hover:bg-accent-50 cursor-pointer whitespace-nowrap"><i className="ri-refresh-line mr-1.5" />Restore</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4"><i className="ri-user-line text-foreground-500" />Overview</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Full name</dt><dd className="text-foreground-900">{guest.full_name} {guest.last_name || ''}</dd></div>
                <div><dt className="text-xs text-foreground-500">Preferred name</dt><dd className="text-foreground-900">{guest.preferred_name || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Title / Pronouns</dt><dd className="text-foreground-900">{[guest.title, guest.pronouns].filter(Boolean).join(' / ') || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Guest type</dt><dd className="text-foreground-900 capitalize">{guest.guest_type}</dd></div>
                <div><dt className="text-xs text-foreground-500">Connection</dt><dd className="text-foreground-900">{guest.connection_group || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Status</dt><dd><span className={`inline-flex items-center gap-1 text-sm ${guest.status === 'active' ? 'text-accent-600' : 'text-foreground-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${guest.status === 'active' ? 'bg-accent-500' : 'bg-foreground-300'}`} />{guest.status}</span></dd></div>
              </dl>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4"><i className="ri-mail-line text-foreground-500" />Contact</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Email</dt><dd className="text-foreground-900">{guest.email || <span className="text-red-400 text-xs">Missing</span>}</dd></div>
                <div><dt className="text-xs text-foreground-500">Mobile</dt><dd className="text-foreground-900">{guest.mobile_phone || <span className="text-red-400 text-xs">Missing</span>}</dd></div>
                <div><dt className="text-xs text-foreground-500">Alternative phone</dt><dd className="text-foreground-900">{guest.alternative_phone || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Preferred method</dt><dd className="text-foreground-900 capitalize">{guest.preferred_contact_method}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-foreground-500">Address</dt><dd className="text-foreground-900">{[guest.address_line_1, guest.address_line_2, guest.city, guest.county_or_region, guest.postcode, guest.country].filter(Boolean).join(', ') || '—'}</dd></div>
              </dl>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4"><i className="ri-mail-send-line text-foreground-500" />Invitation planning</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-foreground-500">Group</dt><dd className="text-foreground-900">{guest.invitation_group || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Preparation</dt><dd className="text-foreground-900">{guest.invite_preparation_status === 'ready' ? 'Ready' : 'Draft'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Plus-one</dt><dd className="text-foreground-900 capitalize">{guest.plus_one_status}</dd></div>
                <div><dt className="text-xs text-foreground-500">Invited to</dt><dd className="text-foreground-900">{[guest.ceremony_invited && 'Ceremony', guest.reception_invited && 'Reception', guest.evening_invited && 'Evening'].filter(Boolean).join(', ')}</dd></div>
              </dl>
            </div>

            {/* RSVP Response from database */}
            <div className="card-default">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-label text-sm font-semibold text-foreground-900 flex items-center gap-2"><i className="ri-check-double-line text-foreground-500" />RSVP Response</h3>
                <button onClick={() => { setManualRsvpStatus(rsvpStatus); setManualRsvpNote(''); setManualRsvpOpen(true); }} className="text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap"><i className="ri-edit-line mr-1" />Record manually</button>
              </div>
              {rsvpData ? (
                <div className="space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-label ${rsvpIsAttending ? 'bg-accent-100 text-accent-700' : rsvpStatus === 'declined' || rsvpStatus === 'not_attending' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {rsvpIsAttending ? 'Attending' : rsvpStatus === 'declined' || rsvpStatus === 'not_attending' ? 'Declined' : rsvpStatus === 'maybe' ? 'Maybe' : 'Pending'}
                    </span>
                    {rsvpData.is_draft && <span className="px-2 py-0.5 rounded-full text-xs bg-secondary-100 text-secondary-600">Draft</span>}
                    {rsvpData.submitted_at && <span className="text-xs text-foreground-400">Submitted {new Date(rsvpData.submitted_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                  </div>

                  {/* Events */}
                  {rsvpIsAttending && (
                    <div className="text-xs space-y-1">
                      <span className="text-foreground-400 font-label">Events:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {rsvpData.ceremony_attending && <span className="px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 text-[11px] font-label">Ceremony</span>}
                        {rsvpData.reception_attending && <span className="px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 text-[11px] font-label">Reception</span>}
                        {rsvpData.evening_attending && <span className="px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 text-[11px] font-label">Evening</span>}
                        {rsvpData.welcome_attending && <span className="px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 text-[11px] font-label">Welcome</span>}
                        {rsvpData.day_after_attending && <span className="px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 text-[11px] font-label">Day after</span>}
                      </div>
                    </div>
                  )}

                  {/* Meal */}
                  {rsvpIsAttending && rsvpData.meal_choice && (
                    <div className="text-xs"><span className="text-foreground-400">Meal:</span> <span className="text-foreground-700">{rsvpData.meal_choice as string}</span></div>
                  )}

                  {/* Dietary */}
                  {rsvpIsAttending && rsvpData.dietary_requirements && (
                    <div className="text-xs">
                      <span className="text-foreground-400">Dietary:</span>
                      <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded ml-1 inline-block">Sensitive</span>
                      <span className="text-foreground-700 block mt-0.5">{rsvpData.dietary_requirements as string}</span>
                    </div>
                  )}

                  {/* Accessibility */}
                  {rsvpIsAttending && rsvpData.accessibility_notes && (
                    <div className="text-xs">
                      <span className="text-foreground-400">Accessibility:</span>
                      <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded ml-1 inline-block">Sensitive</span>
                      <span className="text-foreground-700 block mt-0.5">{rsvpData.accessibility_notes as string}</span>
                    </div>
                  )}

                  {/* Transport/Accommodation */}
                  {(rsvpData.transport_status || rsvpData.accommodation_status) && (
                    <div className="text-xs flex flex-wrap gap-2">
                      {rsvpData.transport_status && <span><span className="text-foreground-400">Transport:</span> <span className="text-foreground-700">{rsvpData.transport_status as string}</span></span>}
                      {rsvpData.accommodation_status && <span><span className="text-foreground-400">Accommodation:</span> <span className="text-foreground-700">{rsvpData.accommodation_status as string}</span></span>}
                    </div>
                  )}

                  {/* Plus-one */}
                  {rsvpData.plus_one_confirmed && (
                    <div className="text-xs"><span className="text-foreground-400">Plus-one:</span> <span className="text-foreground-700">{rsvpData.plus_one_name as string || 'Confirmed'}</span></div>
                  )}

                  {/* Song / Message */}
                  {rsvpData.song_request && (
                    <div className="text-xs"><span className="text-foreground-400">Song:</span> <span className="text-foreground-700">&ldquo;{rsvpData.song_request as string}&rdquo;</span></div>
                  )}
                  {rsvpData.message_to_couple && (
                    <div className="text-xs bg-background-50 p-2 rounded-lg italic text-foreground-600">&ldquo;{rsvpData.message_to_couple as string}&rdquo;</div>
                  )}

                  {/* Custom answers */}
                  {rsvpCustomAnswers.length > 0 && (
                    <div className="pt-2 border-t border-secondary-100">
                      <span className="text-xs text-foreground-400 font-label block mb-1">Custom answers:</span>
                      {rsvpCustomAnswers.map((a, i) => (
                        <div key={i} className="text-xs mb-1"><span className="text-foreground-400">{a.question_label}:</span> <span className="text-foreground-700">{a.answer}</span></div>
                      ))}
                    </div>
                  )}

                  {/* Revision history */}
                  {rsvpRevisions.length > 0 && (
                    <div className="pt-2 border-t border-secondary-100">
                      <span className="text-[10px] text-foreground-400 font-label uppercase tracking-wider block mb-1">Response history</span>
                      {rsvpRevisions.map((rev) => (
                        <div key={rev.revision_number} className="flex items-start gap-2 text-xs mt-1">
                          <span className="text-foreground-400 whitespace-nowrap">{new Date(rev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span className="text-foreground-600">{rev.change_summary}</span>
                          <span className="text-foreground-300 text-[10px]">v{rev.revision_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground-400">No RSVP response recorded yet.</p>
                  <p className="text-xs text-foreground-300 mt-1">The guest has not submitted their RSVP through the portal.</p>
                </div>
              )}
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4"><i className="ri-sticky-note-line text-foreground-500" />Requirements &amp; Notes</h3>
              <div className="space-y-3 text-sm">
                {[{ label: 'Dietary', value: guest.dietary_requirements }, { label: 'Allergies', value: guest.allergy_notes }, { label: 'Accessibility', value: guest.accessibility_notes || guest.accessibility_needs }, { label: 'Transport', value: guest.mobility_transport_notes }, { label: 'Child notes', value: guest.child_notes }, { label: 'Private notes', value: guest.private_notes }].map((item) => (
                  item.value ? <div key={item.label}><dt className="text-xs text-foreground-500">{item.label}</dt><dd className="text-foreground-900 mt-0.5">{item.value}</dd></div> : null
                ))}
                {![guest.dietary_requirements, guest.allergy_notes, guest.accessibility_notes, guest.mobility_transport_notes, guest.child_notes, guest.private_notes].some(Boolean) && <p className="text-sm text-foreground-400">No requirements recorded.</p>}
              </div>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4"><i className="ri-history-line text-foreground-500" />Activity</h3>
              {activityLog.length === 0 ? <p className="text-sm text-foreground-400">No activity recorded yet.</p> : (
                <div className="space-y-2">{activityLog.slice(0, 10).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm"><span className="text-xs text-foreground-400 whitespace-nowrap mt-0.5">{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><span className="text-foreground-700">{a.summary}</span></div>
                ))}</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {household && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3"><i className="ri-home-4-line text-foreground-500" />Household</h3>
                <p className="text-sm font-label text-foreground-900 mb-1">{household.display_name}</p>
                {householdMembers.length > 0 && (
                  <div className="space-y-1.5 mb-3">{householdMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm"><span className="text-foreground-700">{m.preferred_name || m.full_name} {m.last_name}</span><button onClick={() => navigate(`/app/guests/${m.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">View</button></div>
                  ))}</div>
                )}
                <button onClick={() => navigate(`/app/guests/households/${household.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">View household</button>
              </div>
            )}
            {guestTags.length > 0 && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">{guestTags.map((t) => (
                  <span key={t.id} className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${TAG_COLOUR_CLASSES[t.colour_key] || 'bg-secondary-100 text-secondary-700'}`}>{t.name}</span>
                ))}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual RSVP modal */}
      {manualRsvpOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setManualRsvpOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" role="dialog" aria-modal="true">
              <h3 className="font-heading text-lg text-foreground-900 mb-2">Record RSVP manually</h3>
              <p className="text-sm text-foreground-500 mb-4">
                For {displayName(guest)} — this records a response on the guest&apos;s behalf. An audit note is recommended.
              </p>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-2">Response</label>
                  <div className="flex gap-2">
                    {[{ value: 'attending', label: 'Attending' }, { value: 'declined', label: 'Declined' }, { value: 'pending', label: 'Pending' }].map((opt) => (
                      <button key={opt.value} onClick={() => setManualRsvpStatus(opt.value)} className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${manualRsvpStatus === opt.value ? (opt.value === 'attending' ? 'bg-accent-100 text-accent-700 border border-accent-200' : opt.value === 'declined' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200') : 'bg-secondary-50 text-foreground-500 border border-secondary-100 hover:border-secondary-200'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Audit note</label>
                  <textarea value={manualRsvpNote} onChange={(e) => setManualRsvpNote(e.target.value)} placeholder="Reason for manual recording (e.g. 'Guest called to confirm', 'WhatsApp message received')" rows={2} maxLength={300} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setManualRsvpOpen(false)} className="btn-outline text-sm cursor-pointer">Cancel</button>
                <button onClick={handleManualRsvp} disabled={!manualRsvpStatus || manualRsvpSaving} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {manualRsvpSaving ? <><i className="ri-loader-4-line animate-spin mr-1" />Saving...</> : 'Record response'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default function GuestDetailPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoGuestDetailPage />;
  return <NormalGuestDetailPage />;
}