import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';

function DemoHouseholdsPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe()!;
  const { state, moveGuestToHousehold, removeGuestFromHousehold, addDemoActivity, generateDemoId } = demo;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const householdsWithMembers = useMemo(() => {
    return state.households
      .filter((h) => (statusFilter ? h.status === statusFilter : true))
      .filter((h) => !search || h.display_name.toLowerCase().includes(search.toLowerCase()))
      .map((h) => ({
        ...h,
        members: state.guests.filter((g) => g.household_id === h.id),
        member_count: state.guests.filter((g) => g.household_id === h.id).length,
      }));
  }, [state.households, state.guests, statusFilter, search]);

  const handleRemoveMember = (guestId: string) => {
    removeGuestFromHousehold(guestId);
    const guest = state.guests.find((g) => g.id === guestId);
    setFeedback({ type: 'success', message: `Demo: ${guest?.preferred_name || guest?.full_name || 'Guest'} removed from household` });
  };

  const handleRename = (id: string) => {
    // For demo, we just show feedback. Full household CRUD would modify the household object.
    setFeedback({ type: 'success', message: 'Demo: Household renamed (changes are session-only)' });
    setEditingId(null);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer ml-3"><i className="ri-close-line" /></button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Households</h1>
            <p className="text-sm text-foreground-500 mt-1">Group guests who share an invitation, address or travel arrangements.</p>
          </div>
          <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to guests</button>
        </div>

        <div className="card-default mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
              <input type="text" className="input-field pl-9 text-sm" placeholder="Search households..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input-field text-sm w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        {householdsWithMembers.length === 0 ? (
          <div className="card-default text-center py-16">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-500 mb-4"><i className="ri-home-4-line text-2xl" /></div>
            <h3 className="font-heading text-lg text-foreground-700 mb-2">No households found</h3>
            <p className="text-sm text-foreground-500 mb-5">{search ? 'Try a different search term.' : 'Households are created automatically when guests share an address.'}</p>
            {search && <button onClick={() => setSearch('')} className="btn-outline text-sm cursor-pointer">Clear search</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {householdsWithMembers.map((h) => (
              <div key={h.id} className="card-default">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 flex-shrink-0"><i className="ri-home-4-line text-sm" /></div>
                    <div>
                      {editingId === h.id ? (
                        <div className="flex items-center gap-1">
                          <input type="text" className="input-field text-sm py-1" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                          <button onClick={() => handleRename(h.id)} className="text-xs text-primary-600 cursor-pointer whitespace-nowrap">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-foreground-400 cursor-pointer">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-label text-sm font-semibold text-foreground-900">{h.display_name}</h3>
                          {h.formal_invitation_name && <p className="text-xs text-foreground-500">{h.formal_invitation_name}</p>}
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${h.status === 'active' ? 'bg-accent-100 text-accent-700' : 'bg-secondary-100 text-secondary-600'}`}>{h.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground-500 mb-2">
                  <span><i className="ri-group-line mr-1" />{h.member_count} {h.member_count === 1 ? 'member' : 'members'}</span>
                  <span>{h.invitation_delivery_method === 'email' ? 'Email' : 'Post'}</span>
                </div>
                {h.members.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {h.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <button onClick={() => navigate(`/app/guests/${m.id}`)} className="text-foreground-700 hover:text-primary-600 cursor-pointer text-left">{m.preferred_name || m.full_name} {m.last_name}</button>
                        <button onClick={() => handleRemoveMember(m.id)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer whitespace-nowrap" title="Remove from household">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-3 border-t border-secondary-100">
                  <button onClick={() => { setEditingId(h.id); setEditName(h.display_name); }} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">Rename</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function NormalHouseholdsPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const svc = useGuestService();
  const [loading, setLoading] = useState(true);
  const [households, setHouseholds] = useState<Array<{ id: string; wedding_id: string; display_name: string; formal_invitation_name?: string; status: string; member_count: number; invitation_delivery_method: string; members: Array<{ id: string; full_name: string; last_name?: string; preferred_name?: string }> }>>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const fetchHouseholds = async () => {
    setLoading(true);
    try {
      let q = supabase.from('guest_households').select('*').eq('wedding_id', weddingId).order('display_name');
      if (statusFilter) q = q.eq('status', statusFilter);
      if (search) q = q.ilike('display_name', `%${search}%`);
      const { data } = await q;
      const hhs = data || [];
      // Fetch all members in one query instead of N+1
      const hhIds = hhs.map((h: Record<string, unknown>) => h.id as string);
      let allMembers: Array<{ id: string; full_name: string; last_name?: string; preferred_name?: string; household_id: string }> = [];
      if (hhIds.length > 0) {
        const { data: members } = await supabase
          .from('guests')
          .select('id, full_name, last_name, preferred_name, household_id')
          .in('household_id', hhIds)
          .eq('wedding_id', weddingId)
          .eq('status', 'active')
          .order('full_name');
        allMembers = (members || []) as typeof allMembers;
      }
      const enriched = hhs.map((h: Record<string, unknown>) => {
        const hMembers = allMembers.filter((m) => m.household_id === h.id);
        return { ...h, member_count: hMembers.length, members: hMembers };
      });
      setHouseholds(enriched as typeof households);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchHouseholds(); }, [weddingId]);

  if (loading) return <AppShell><div className="max-w-6xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading households...</span></div></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div><h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Households</h1><p className="text-sm text-foreground-500 mt-1">Group guests who share an invitation, address or travel arrangements.</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/guests/households/new')} className="btn-primary text-sm cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add household</button>
          </div>
        </div>
        <div className="card-default mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative"><i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" /><input type="text" className="input-field pl-9 text-sm" placeholder="Search households..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select className="input-field text-sm w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="active">Active</option><option value="archived">Archived</option><option value="">All</option></select>
          </div>
        </div>
        {households.length === 0 ? (
          <div className="card-default text-center py-16"><div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-500 mb-4"><i className="ri-home-4-line text-2xl" /></div><h3 className="font-heading text-lg text-foreground-700 mb-2">No households yet</h3><p className="text-sm text-foreground-500 mb-5">Households help you manage groups of guests who share invitations or addresses.</p><button onClick={() => navigate('/app/guests/households/new')} className="btn-primary text-sm cursor-pointer">Create your first household</button></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {households.map((h) => (
              <div key={h.id} className="card-default cursor-pointer hover:border-primary-200 transition-colors" onClick={() => navigate(`/app/guests/households/${h.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2"><div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600"><i className="ri-home-4-line text-sm" /></div><div><h3 className="font-label text-sm font-semibold text-foreground-900">{h.display_name}</h3></div></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${h.status === 'active' ? 'bg-accent-100 text-accent-700' : 'bg-secondary-100 text-secondary-600'}`}>{h.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground-500 mb-2"><span><i className="ri-group-line mr-1" />{h.member_count} {h.member_count === 1 ? 'member' : 'members'}</span></div>
                {h.members.slice(0, 3).map((m) => <span key={m.id} className="inline-block px-2 py-0.5 rounded bg-background-100 text-xs text-foreground-600 mr-1 mb-1">{m.preferred_name || m.full_name} {m.last_name || ''}</span>)}
                {h.member_count > 3 && <span className="text-xs text-foreground-400">+{h.member_count - 3} more</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function HouseholdsPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoHouseholdsPage />;
  return <NormalHouseholdsPage />;
}