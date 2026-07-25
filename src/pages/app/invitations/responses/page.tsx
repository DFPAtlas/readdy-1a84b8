import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import type { DemoGuest } from '@/demo/demoTypes';

// ── Demo response overview ──

function DemoResponseOverviewPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState(false);
  const [allergyFilter, setAllergyFilter] = useState(false);
  const [accessibilityFilter, setAccessibilityFilter] = useState(false);
  const [plusOneFilter, setPlusOneFilter] = useState(false);

  // Pre-compute derived values with fallbacks (all hooks before early return)
  const state = demo?.state;
  const guests = (state?.guests || []).filter((g) => g.status === 'active');

  const attending = guests.filter((g) => g.rsvp_status === 'accepted');
  const awaiting = guests.filter((g) => g.rsvp_status === 'pending' || g.rsvp_status === '');
  const declined = guests.filter((g) => g.rsvp_status === 'declined');
  const responded = guests.filter((g) => g.rsvp_submitted_at);
  const responseRate = guests.length > 0 ? Math.round((responded.length / guests.length) * 100) : 0;

  const dietaryGuests = guests.filter((g) => g.dietary_requirements);
  const allergyGuests = guests.filter((g) => g.allergy_notes);
  const accessibilityGuests = guests.filter((g) => g.accessibility_needs || g.accessibility_notes);
  const plusOneGuests = guests.filter((g) => g.plus_one_status === 'allowed' || g.plus_one_status === 'named');

  const ceremonyCount = attending.filter((g) => g.rsvp_ceremony_attending).length;
  const receptionCount = attending.filter((g) => g.rsvp_reception_attending).length;
  const eveningCount = attending.filter((g) => g.rsvp_evening_attending).length;

  const filteredGuests = useMemo(() => {
    let result = [...guests];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) =>
        g.full_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        g.preferred_name.toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'accepted') result = result.filter((g) => g.rsvp_status === 'accepted');
    if (statusFilter === 'pending') result = result.filter((g) => g.rsvp_status === 'pending' || g.rsvp_status === '');
    if (statusFilter === 'declined') result = result.filter((g) => g.rsvp_status === 'declined');
    if (dietaryFilter) result = result.filter((g) => !!g.dietary_requirements);
    if (allergyFilter) result = result.filter((g) => !!g.allergy_notes);
    if (accessibilityFilter) result = result.filter((g) => g.accessibility_needs || g.accessibility_notes);
    if (plusOneFilter) result = result.filter((g) => g.plus_one_status === 'allowed' || g.plus_one_status === 'named');
    return result;
  }, [guests, search, statusFilter, dietaryFilter, allergyFilter, accessibilityFilter, plusOneFilter]);

  if (!demo || !state) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-sm text-foreground-500">Demo data not available.</p>
        </div>
      </AppShell>
    );
  }

  const rsvpBadge = (g: DemoGuest) => {
    if (g.rsvp_status === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (g.rsvp_status === 'declined') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const rsvpLabel = (g: DemoGuest) => {
    if (g.rsvp_status === 'accepted') return 'Attending';
    if (g.rsvp_status === 'declined') return 'Declined';
    if (g.rsvp_submitted_at) return 'Responded';
    return 'Awaiting';
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate('/app/invitations')} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap flex items-center gap-1">
                <i className="ri-arrow-left-line" /> Invitations
              </button>
            </div>
            <h1 className="font-heading text-2xl text-foreground-900">RSVP responses</h1>
            <p className="text-sm text-foreground-500 mt-1">Track guest responses for Emma &amp; James.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-label self-start">Demo Account</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          <div className="card-default"><p className="text-lg font-heading font-semibold text-emerald-600">{attending.length}</p><p className="text-xs text-foreground-500 mt-0.5">Attending</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-amber-600">{awaiting.length}</p><p className="text-xs text-foreground-500 mt-0.5">Awaiting</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-rose-600">{declined.length}</p><p className="text-xs text-foreground-500 mt-0.5">Declined</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{responseRate}%</p><p className="text-xs text-foreground-500 mt-0.5">Response rate</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{dietaryGuests.length}</p><p className="text-xs text-foreground-500 mt-0.5">Dietary</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-rose-600">{allergyGuests.length}</p><p className="text-xs text-foreground-500 mt-0.5">Allergies</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{plusOneGuests.length}</p><p className="text-xs text-foreground-500 mt-0.5">Plus-ones</p></div>
        </div>

        {/* Event attendance breakdown */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-calendar-check-line text-foreground-500" /> Attendance by event
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-background-50">
              <p className="font-heading text-xl text-foreground-900">{ceremonyCount}</p>
              <p className="text-xs text-foreground-500">Ceremony</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background-50">
              <p className="font-heading text-xl text-foreground-900">{receptionCount}</p>
              <p className="text-xs text-foreground-500">Reception</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background-50">
              <p className="font-heading text-xl text-foreground-900">{eveningCount}</p>
              <p className="text-xs text-foreground-500">Evening</p>
            </div>
          </div>
        </div>

        {/* Recent responses */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-history-line text-foreground-500" /> Recent responses
          </h2>
          <div className="space-y-2">
            {guests.filter((g) => g.rsvp_submitted_at).sort((a, b) => new Date(b.rsvp_submitted_at!).getTime() - new Date(a.rsvp_submitted_at!).getTime()).slice(0, 8).map((g) => (
              <div key={g.id} className="flex items-center justify-between px-3 py-2.5 bg-background-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.rsvp_status === 'accepted' ? 'bg-emerald-500' : g.rsvp_status === 'declined' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <button onClick={() => navigate(`/app/guests/${g.id}`)} className="text-sm font-label text-foreground-800 hover:text-primary-600 transition-colors cursor-pointer">
                    {g.preferred_name || g.full_name}
                  </button>
                  {g.rsvp_plus_one_confirmed && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-600">+1</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {g.dietary_requirements && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Dietary" />}
                  {g.allergy_notes && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Allergy" />}
                  <span className="text-[10px] text-foreground-400">
                    {g.rsvp_submitted_at ? new Date(g.rsvp_submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
              </div>
            ))}
            {guests.filter((g) => g.rsvp_submitted_at).length === 0 && (
              <p className="text-sm text-foreground-400 text-center py-4">No RSVP responses yet.</p>
            )}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex-1 relative min-w-[200px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests..." className="input-field pl-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-sm min-w-[130px]">
            <option value="">All responses</option>
            <option value="accepted">Attending</option>
            <option value="pending">Awaiting</option>
            <option value="declined">Declined</option>
          </select>
          <button onClick={() => setDietaryFilter(!dietaryFilter)} className={`px-3 py-2 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap border transition-colors ${dietaryFilter ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>
            <i className="ri-leaf-line mr-1" /> Dietary
          </button>
          <button onClick={() => setAllergyFilter(!allergyFilter)} className={`px-3 py-2 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap border transition-colors ${allergyFilter ? 'bg-rose-50 border-rose-200 text-rose-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>
            <i className="ri-alert-line mr-1" /> Allergies
          </button>
          <button onClick={() => setAccessibilityFilter(!accessibilityFilter)} className={`px-3 py-2 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap border transition-colors ${accessibilityFilter ? 'bg-sky-50 border-sky-200 text-sky-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>
            <i className="ri-wheelchair-line mr-1" /> Accessibility
          </button>
          <button onClick={() => setPlusOneFilter(!plusOneFilter)} className={`px-3 py-2 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap border transition-colors ${plusOneFilter ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>
            <i className="ri-user-add-line mr-1" /> Plus-one
          </button>
          {(search || statusFilter || dietaryFilter || allergyFilter || accessibilityFilter || plusOneFilter) && (
            <button onClick={() => { setSearch(''); setStatusFilter(''); setDietaryFilter(false); setAllergyFilter(false); setAccessibilityFilter(false); setPlusOneFilter(false); }} className="text-xs text-red-500 hover:text-red-600 cursor-pointer whitespace-nowrap">
              <i className="ri-close-line mr-1" />Clear
            </button>
          )}
        </div>

        {/* Guest list table */}
        <div className="hidden md:block">
          {filteredGuests.length === 0 ? (
            <div className="card-default text-center py-12">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-user-search-line text-2xl" /></div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No guests match</h3>
              <button onClick={() => { setSearch(''); setStatusFilter(''); setDietaryFilter(false); setAllergyFilter(false); setAccessibilityFilter(false); setPlusOneFilter(false); }} className="btn-outline text-sm cursor-pointer">Clear filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100">
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Guest</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Status</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Events</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Meal</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Requirements</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Plus-one</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Response date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((g) => (
                    <tr key={g.id} className="border-b border-secondary-50 hover:bg-background-50 transition-colors">
                      <td className="py-3 px-2">
                        <button onClick={() => navigate(`/app/guests/${g.id}`)} className="text-foreground-900 font-label hover:text-primary-600 transition-colors cursor-pointer text-left">
                          {g.preferred_name || g.full_name}
                        </button>
                        <p className="text-xs text-foreground-400">{g.connection_group || g.invitation_group}</p>
                      </td>
                      <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-label ${rsvpBadge(g)}`}>{rsvpLabel(g)}</span></td>
                      <td className="py-3 px-2 text-xs text-foreground-500">
                        {[
                          g.rsvp_ceremony_attending && 'C',
                          g.rsvp_reception_attending && 'R',
                          g.rsvp_evening_attending && 'E',
                        ].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="py-3 px-2 text-xs text-foreground-600">{g.meal_choice || '—'}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          {g.dietary_requirements && <span className="w-2 h-2 rounded-full bg-amber-400" title={g.dietary_requirements} />}
                          {g.allergy_notes && <span className="w-2 h-2 rounded-full bg-rose-500" title={g.allergy_notes} />}
                          {(g.accessibility_needs || g.accessibility_notes) && <span className="w-2 h-2 rounded-full bg-sky-400" title={g.accessibility_needs || g.accessibility_notes} />}
                          {!g.dietary_requirements && !g.allergy_notes && !g.accessibility_needs && !g.accessibility_notes && <span className="text-foreground-300">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs text-foreground-500">
                        {g.rsvp_plus_one_confirmed && g.plus_one_name ? g.plus_one_name : g.plus_one_status === 'allowed' ? 'Invited' : '—'}
                      </td>
                      <td className="py-3 px-2 text-xs text-foreground-400">
                        {g.rsvp_submitted_at ? new Date(g.rsvp_submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filteredGuests.length === 0 ? (
            <div className="card-default text-center py-12">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No guests match</h3>
              <button onClick={() => { setSearch(''); setStatusFilter(''); setDietaryFilter(false); setAllergyFilter(false); setAccessibilityFilter(false); setPlusOneFilter(false); }} className="btn-outline text-sm cursor-pointer">Clear filters</button>
            </div>
          ) : (
            filteredGuests.map((g) => (
              <div key={g.id} className="card-default cursor-pointer" onClick={() => navigate(`/app/guests/${g.id}`)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-label font-semibold text-foreground-900">{g.preferred_name || g.full_name}</p>
                    <p className="text-xs text-foreground-400">{g.connection_group || g.invitation_group}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-label ${rsvpBadge(g)}`}>{rsvpLabel(g)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-foreground-500">
                  {g.meal_choice && <span className="px-1.5 py-0.5 rounded bg-background-50">{g.meal_choice}</span>}
                  {g.dietary_requirements && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">Dietary</span>}
                  {g.allergy_notes && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">Allergy</span>}
                  {g.rsvp_plus_one_confirmed && <span className="px-1.5 py-0.5 rounded bg-primary-50 text-primary-600">+1 {g.plus_one_name}</span>}
                  {g.rsvp_submitted_at && <span>{new Date(g.rsvp_submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Normal mode fallback ──

function NormalResponseOverviewPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-sm text-foreground-500">RSVP overview requires Demo Mode in this version.</p>
        <button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer mt-4">Back to invitations</button>
      </div>
    </AppShell>
  );
}

export default function ResponseOverviewPage() {
  if (isDemoMode) return <DemoResponseOverviewPage />;
  return <NormalResponseOverviewPage />;
}