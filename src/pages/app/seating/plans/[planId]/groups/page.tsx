import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, SeatingGroup, SeatingGroupMember, GuestInfo, GroupType } from '@/types/seating';
import { GROUP_TYPE_LABELS } from '@/types/seating';

export default function SeatingGroupsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [groups, setGroups] = useState<(SeatingGroup & { members: (SeatingGroupMember & { guest: GuestInfo | null })[] })[]>([]);
  const [allGuests, setAllGuests] = useState<GuestInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [showAddMembers, setShowAddMembers] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<GroupType>('social');
  const [formPriority, setFormPriority] = useState(0);
  const [formKeepTogether, setFormKeepTogether] = useState(false);
  const [formMaxSplit, setFormMaxSplit] = useState(1);
  const [formScope, setFormScope] = useState<'plan' | 'wedding'>('plan');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const fetchData = useCallback(async () => {
    if (!weddingId || !planId) return;
    setLoading(true);
    try {
      const { data: planData } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (!planData) { navigate('/app/seating'); return; }
      setPlan(planData as SeatingPlan);

      const { data: groupsData } = await supabase.from('seating_groups').select('*').or(`seating_plan_id.eq.${planId}, scope.eq.wedding`).eq('wedding_id', weddingId).eq('status', 'active').order('priority', { ascending: false });
      const { data: membersData } = await supabase.from('seating_group_members').select('*, guests:guest_id(id, full_name, guest_type, rsvp_status, household_id)').eq('wedding_id', weddingId);
      const { data: guestsData } = await supabase.from('guests').select('id, full_name, guest_type, rsvp_status, household_id').eq('wedding_id', weddingId).eq('status', 'active');

      const membersMap: Record<string, (SeatingGroupMember & { guest: GuestInfo | null })[]> = {};
      (membersData || []).forEach((m: Record<string, unknown>) => {
        const gid = m.seating_group_id as string;
        if (!membersMap[gid]) membersMap[gid] = [];
        membersMap[gid].push({ ...m, guest: (m as unknown as Record<string, unknown>).guests as GuestInfo | null } as unknown as SeatingGroupMember & { guest: GuestInfo | null });
      });

      const merged = (groupsData || []).map((g: Record<string, unknown>) => ({
        ...g, members: membersMap[g.id as string] || [],
      }));
      setGroups(merged as (SeatingGroup & { members: (SeatingGroupMember & { guest: GuestInfo | null })[] })[]);
      setAllGuests((guestsData || []) as GuestInfo[]);
    } catch { /* */ } finally { setLoading(false); }
  }, [weddingId, planId, navigate]);

  useEffect(() => { if (weddingId && planId) fetchData(); }, [weddingId, planId, fetchData]);

  const handleCreate = async () => {
    if (!formName.trim()) { setFormError('Group name is required'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('seating_groups').insert({
      wedding_id: weddingId, seating_plan_id: formScope === 'plan' ? planId : null,
      name: formName, description: formDesc || null, group_type: formType,
      priority: formPriority, keep_together: formKeepTogether,
      max_table_split: formMaxSplit, scope: formScope, status: 'active',
    }).select('*').single();
    if (error) { setFormError(error.message); setSaving(false); return; }
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'group_created', summary: `Created group "${formName}"` });
    resetForm(); setShowCreate(false); setSaving(false);
    setToast({ msg: 'Group created', type: 'success' }); fetchData();
  };

  const handleArchiveGroup = async (groupId: string) => {
    await supabase.from('seating_groups').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', groupId);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'group_archived', summary: 'Group archived' });
    setToast({ msg: 'Group archived', type: 'success' }); fetchData();
  };

  const handleAddMembers = async (groupId: string, guestIds: string[]) => {
    if (guestIds.length === 0) return;
    const inserts = guestIds.map((gid) => ({ wedding_id: weddingId, seating_plan_id: planId, seating_group_id: groupId, guest_id: gid }));
    await supabase.from('seating_group_members').insert(inserts);
    setShowAddMembers(null);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'member_added', summary: `Added ${guestIds.length} guest(s) to group` });
    setToast({ msg: `${guestIds.length} guest(s) added`, type: 'success' }); fetchData();
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from('seating_group_members').delete().eq('id', memberId);
    setToast({ msg: 'Member removed', type: 'success' }); fetchData();
  };

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormType('social'); setFormPriority(0);
    setFormKeepTogether(false); setFormMaxSplit(1); setFormScope('plan'); setFormError('');
  };

  const memberGuestIds = (g: SeatingGroup & { members: (SeatingGroupMember & { guest: GuestInfo | null })[] }) => new Set(g.members.map((m) => m.guest_id));
  const guestNotInGroup = (g: SeatingGroup & { members: (SeatingGroupMember & { guest: GuestInfo | null })[] }) => allGuests.filter((guest) => !memberGuestIds(g).has(guest.id));

  if (weddingLoading || loading) return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-400 hover:text-foreground-600 mb-1 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
            <h1 className="font-heading text-xl text-foreground-900">Guest Groups</h1>
            <p className="text-xs text-foreground-500 mt-0.5">{plan?.name} — Group guests for seating rules and planning</p>
          </div>
          <button onClick={() => { resetForm(); setShowCreate(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-add-line mr-1" />Create group
          </button>
        </div>

        {/* Groups list */}
        {groups.length === 0 ? (
          <div className="text-center py-16 bg-background-50 rounded-xl border border-secondary-100">
            <i className="ri-group-line text-3xl text-foreground-200 mb-3 block" />
            <p className="text-sm text-foreground-500 mb-1">No groups yet</p>
            <p className="text-xs text-foreground-400 mb-4">Create groups to organise guests for seating rules</p>
            <button onClick={() => { resetForm(); setShowCreate(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label cursor-pointer whitespace-nowrap">Create first group</button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-secondary-100 overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-label font-semibold ${
                      g.group_type === 'wedding_party' ? 'bg-amber-50 text-amber-600' : g.group_type === 'family' ? 'bg-emerald-50 text-emerald-600' : g.group_type === 'children' ? 'bg-sky-50 text-sky-600' : 'bg-background-100 text-foreground-500'}`}>
                      {g.members.length}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><h3 className="text-sm font-label font-semibold text-foreground-800 truncate">{g.name}</h3><span className="text-[10px] bg-background-100 text-foreground-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">{GROUP_TYPE_LABELS[g.group_type]}</span></div>
                      {g.description && <p className="text-[11px] text-foreground-400 truncate">{g.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {g.keep_together && <span className="text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Keep together</span>}
                    {g.scope === 'wedding' && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">Wedding-wide</span>}
                    <button onClick={() => setEditingGroup(editingGroup === g.id ? null : g.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-more-2-fill text-xs" /></button>
                  </div>
                </div>

                {/* Expanded */}
                {editingGroup === g.id && (
                  <div className="px-4 pb-4 border-t border-secondary-50 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddMembers(g.id)} className="px-3 py-1.5 text-[11px] font-label rounded-lg border border-secondary-200 text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap"><i className="ri-user-add-line mr-1" />Add members</button>
                      <button onClick={() => handleArchiveGroup(g.id)} className="px-3 py-1.5 text-[11px] font-label rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1" />Archive</button>
                    </div>
                  </div>
                )}

                {/* Members list */}
                {g.members.length > 0 && (
                  <div className="border-t border-secondary-50 px-4 py-2 flex flex-wrap gap-1.5">
                    {g.members.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-background-50 rounded-full text-[10px] text-foreground-600 font-label border border-secondary-100 group">
                        {m.guest?.full_name || 'Unknown'}
                        <button onClick={() => handleRemoveMember(m.id)} className="text-foreground-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><i className="ri-close-line text-[9px]" /></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add members modal */}
                {showAddMembers === g.id && (
                  <AddMembersModal
                    guests={guestNotInGroup(g)}
                    onAdd={(ids) => handleAddMembers(g.id, ids)}
                    onClose={() => setShowAddMembers(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg text-foreground-900 mb-4">Create Group</h2>
              {formError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3">{formError}</p>}
              <div className="space-y-3">
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Group name *</label><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" placeholder="e.g. Immediate family" /></div>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Description</label><input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" placeholder="Who's in this group?" /></div>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Type</label><select value={formType} onChange={(e) => setFormType(e.target.value as GroupType)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400">{Object.entries(GROUP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Scope</label><select value={formScope} onChange={(e) => setFormScope(e.target.value as 'plan' | 'wedding')} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400"><option value="plan">This plan only</option><option value="wedding">All plans (wedding-wide)</option></select></div>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Priority</label><input type="number" value={formPriority} onChange={(e) => setFormPriority(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" /></div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formKeepTogether} onChange={(e) => setFormKeepTogether(e.target.checked)} className="accent-primary-500" /><span className="text-xs text-foreground-700">Keep group together</span></label>
                {formKeepTogether && <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Max tables to span</label><input type="number" min={1} value={formMaxSplit} onChange={(e) => setFormMaxSplit(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" /></div>}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50">{saving ? 'Creating...' : 'Create group'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-xs font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm`} />
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AddMembersModal({ guests, onAdd, onClose }: { guests: GuestInfo[]; onAdd: (ids: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = guests.filter((g) => !search || g.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-sm mx-4 shadow-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-sm text-foreground-900 mb-3">Add Members</h3>
        <div className="relative mb-3">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-7 pr-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" placeholder="Search guests..." />
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5 mb-3">
          {filtered.map((g) => (
            <button key={g.id} onClick={() => setSelected((prev) => { const n = new Set(prev); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs cursor-pointer whitespace-nowrap ${selected.has(g.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-background-50 text-foreground-700'}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.has(g.id) ? 'bg-primary-500 border-primary-500' : 'border-secondary-300'}`}>
                {selected.has(g.id) && <i className="ri-check-line text-white text-[9px]" />}
              </div>
              <span className="truncate">{g.full_name}</span>
              <span className="text-[10px] text-foreground-400 flex-shrink-0">{g.guest_type}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-foreground-400 text-center py-4">No available guests</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={() => onAdd([...selected])} disabled={selected.size === 0} className="flex-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50">Add ({selected.size})</button>
        </div>
      </div>
    </div>
  );
}