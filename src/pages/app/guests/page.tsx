import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import type { Guest, GuestHousehold, GuestTag } from '@/types/guest';
import { TAG_COLOUR_CLASSES, TAG_COLOUR_OPTIONS } from '@/types/guest';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';
import type { DemoGuest } from '@/demo/demoTypes';

const PAGE_SIZE = 20;

// ── Demo tag helpers ──

interface DemoTags {
  id: string;
  name: string;
  colour_key: string;
}

function deriveDemoTags(): DemoTags[] {
  return [
    { id: 'tag-family', name: 'Family', colour_key: 'primary' },
    { id: 'tag-friends', name: 'Friends', colour_key: 'accent' },
    { id: 'tag-wedding-party', name: 'Wedding party', colour_key: 'primary' },
    { id: 'tag-work', name: 'Work', colour_key: 'secondary' },
    { id: 'tag-child', name: 'Child', colour_key: 'accent' },
    { id: 'tag-dietary', name: 'Dietary', colour_key: 'secondary' },
    { id: 'tag-allergy', name: 'Allergy', colour_key: 'secondary' },
    { id: 'tag-accessibility', name: 'Accessibility', colour_key: 'secondary' },
    { id: 'tag-vip', name: 'VIP', colour_key: 'primary' },
  ];
}

function getGuestDerivedTags(g: DemoGuest): DemoTags[] {
  const allTags = deriveDemoTags();
  const result: DemoTags[] = [];
  const tagIds = g.tag_ids || [];
  for (const t of allTags) {
    if (tagIds.includes(t.id)) { result.push(t); continue; }
    if (t.id === 'tag-family' && g.invitation_group === 'Family') result.push(t);
    else if (t.id === 'tag-friends' && g.invitation_group === 'Friends') result.push(t);
    else if (t.id === 'tag-wedding-party' && g.invitation_group === 'Wedding party') result.push(t);
    else if (t.id === 'tag-work' && g.invitation_group === 'Work') result.push(t);
    else if (t.id === 'tag-child' && g.guest_type === 'child') result.push(t);
    else if (t.id === 'tag-dietary' && (g.dietary_requirements || g.allergy_notes)) result.push(t);
    else if (t.id === 'tag-allergy' && g.allergy_notes) result.push(t);
    else if (t.id === 'tag-accessibility' && (g.accessibility_needs || g.accessibility_notes)) result.push(t);
    else if (t.id === 'tag-vip' && g.wedding_party_role) result.push(t);
  }
  return result;
}

function getGuestRsvpLabel(status: string): string {
  if (status === 'accepted') return 'Attending';
  if (status === 'declined') return 'Declined';
  return 'Awaiting reply';
}

function getGuestRsvpClass(status: string): string {
  if (status === 'accepted') return 'bg-accent-100 text-accent-700';
  if (status === 'declined') return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

// ── Demo Guest List ──

function DemoGuestsListPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe()!;
  const { state, stats, addGuest, updateGuest, archiveGuest, restoreGuest, updateRsvp, moveGuestToHousehold, removeGuestFromHousehold, updateGuestTags, generateDemoId, addDemoActivity } = demo;

  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [reqFilter, setReqFilter] = useState('');
  const [householdFilter, setHouseholdFilter] = useState('');
  const [seatedFilter, setSeatedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortKey, setSortKey] = useState('full_name_asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string[] | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string[] | null>(null);
  const [bulkHouseholdOpen, setBulkHouseholdOpen] = useState(false);
  const [bulkGroupOpen, setBulkGroupOpen] = useState(false);
  const [quickRsvpGuest, setQuickRsvpGuest] = useState<string | null>(null);
  const [lastArchivedIds, setLastArchivedIds] = useState<string[] | null>(null);

  // Derived data
  const allGuests = state.guests;
  const households = state.households;
  const demoTags = useMemo(() => deriveDemoTags(), []);
  const seatingAssignments = useMemo(() => new Map(state.seatingPlan.assignments.map((a) => [a.guest_id, a])), [state.seatingPlan.assignments]);

  // Filter + sort
  const filteredGuests = useMemo(() => {
    let result = allGuests.filter((g) => {
      if (statusFilter === 'active' && g.status !== 'active') return false;
      if (statusFilter === 'archived' && g.status !== 'archived') return false;
      return true;
    });

    if (rsvpFilter) result = result.filter((g) => g.rsvp_status === rsvpFilter);
    if (typeFilter === 'day') result = result.filter((g) => g.ceremony_invited || g.reception_invited);
    else if (typeFilter === 'evening') result = result.filter((g) => !g.ceremony_invited && !g.reception_invited && g.evening_invited);
    else if (typeFilter === 'child') result = result.filter((g) => g.guest_type === 'child');
    else if (typeFilter === 'adult') result = result.filter((g) => g.guest_type === 'adult');

    if (groupFilter) result = result.filter((g) => g.invitation_group === groupFilter);
    if (reqFilter === 'dietary') result = result.filter((g) => g.dietary_requirements || g.allergy_notes);
    else if (reqFilter === 'allergy') result = result.filter((g) => g.allergy_notes);
    else if (reqFilter === 'accessibility') result = result.filter((g) => g.accessibility_needs || g.accessibility_notes);
    else if (reqFilter === 'transport') result = result.filter((g) => g.mobility_transport_notes);

    if (householdFilter) result = result.filter((g) => g.household_id === householdFilter);

    if (seatedFilter === 'seated') result = result.filter((g) => seatingAssignments.has(g.id));
    else if (seatedFilter === 'unseated') result = result.filter((g) => !seatingAssignments.has(g.id) && g.rsvp_status !== 'declined');

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((g) => {
        const hh = households.find((h) => h.id === g.household_id);
        return g.full_name.toLowerCase().includes(q)
          || g.last_name.toLowerCase().includes(q)
          || g.preferred_name.toLowerCase().includes(q)
          || g.email.toLowerCase().includes(q)
          || (hh?.display_name || '').toLowerCase().includes(q)
          || g.invitation_group.toLowerCase().includes(q)
          || getGuestDerivedTags(g).some((t) => t.name.toLowerCase().includes(q));
      });
    }

    // Sort
    if (sortKey === 'full_name_asc') result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    else if (sortKey === 'full_name_desc') result.sort((a, b) => b.full_name.localeCompare(a.full_name));
    else if (sortKey === 'created_at_desc') result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    else if (sortKey === 'created_at_asc') result.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    return result;
  }, [allGuests, statusFilter, rsvpFilter, typeFilter, groupFilter, reqFilter, householdFilter, seatedFilter, search, sortKey, households, seatingAssignments]);

  const totalPages = Math.ceil(filteredGuests.length / PAGE_SIZE);
  const displayedGuests = filteredGuests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats from filtered
  const filteredStats = useMemo(() => {
    const base = statusFilter === 'active' ? allGuests.filter((g) => g.status === 'active') : allGuests;
    return {
      total: base.length,
      attending: base.filter((g) => g.rsvp_status === 'accepted').length,
      awaiting: base.filter((g) => g.rsvp_status === 'pending' || !g.rsvp_status).length,
      declined: base.filter((g) => g.rsvp_status === 'declined').length,
      dietary: base.filter((g) => g.dietary_requirements || g.allergy_notes).length,
      households: new Set(base.filter((g) => g.household_id).map((g) => g.household_id)).size,
    };
  }, [allGuests, statusFilter]);

  const hasFilters = !!(search || rsvpFilter || typeFilter || groupFilter || reqFilter || householdFilter || seatedFilter || statusFilter !== 'active');

  const clearFilters = () => {
    setSearch('');
    setRsvpFilter('');
    setTypeFilter('');
    setGroupFilter('');
    setReqFilter('');
    setHouseholdFilter('');
    setSeatedFilter('');
    setStatusFilter('active');
    setPage(1);
  };

  const displayName = (g: DemoGuest) => {
    const first = g.preferred_name || g.full_name || 'Unnamed';
    const last = g.last_name || '';
    if (!last) return first;
    if (first.toLowerCase().includes(last.toLowerCase())) return first;
    return `${first} ${last}`;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedGuests.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedGuests.map((g) => g.id)));
  };

  const handleArchive = (ids: string[]) => {
    ids.forEach((id) => archiveGuest(id));
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${ids.length} guest${ids.length > 1 ? 's' : ''} archived`, category: 'guest', related_guest: ids[0] || '', wedding_id: state.wedding.id });
    setLastArchivedIds(ids);
    setActionFeedback({ type: 'success', message: `Demo: ${ids.length} guest${ids.length > 1 ? 's' : ''} archived` });
    setSelectedIds(new Set());
    setConfirmArchive(null);
  };

  const handleRestore = (ids: string[]) => {
    ids.forEach((id) => restoreGuest(id));
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${ids.length} guest${ids.length > 1 ? 's' : ''} restored`, category: 'guest', related_guest: ids[0] || '', wedding_id: state.wedding.id });
    setActionFeedback({ type: 'success', message: `Demo: ${ids.length} guest${ids.length > 1 ? 's' : ''} restored` });
    setSelectedIds(new Set());
    setConfirmRestore(null);
  };

  const handleBulkHousehold = (householdId: string) => {
    Array.from(selectedIds).forEach((gid) => {
      if (householdId) moveGuestToHousehold(gid, householdId);
      else removeGuestFromHousehold(gid);
    });
    setActionFeedback({ type: 'success', message: `Demo: ${selectedIds.size} guests moved` });
    setBulkHouseholdOpen(false);
    setSelectedIds(new Set());
  };

  const handleBulkGroup = (grp: string) => {
    Array.from(selectedIds).forEach((gid) => updateGuest(gid, { invitation_group: grp }));
    setActionFeedback({ type: 'success', message: `Demo: Group updated for ${selectedIds.size} guests` });
    setBulkGroupOpen(false);
    setSelectedIds(new Set());
  };

  const handleQuickRsvp = (guestId: string, status: DemoGuest['rsvp_status']) => {
    updateRsvp(guestId, status);
    // Unseat when declining
    if (status === 'declined' && seatingAssignments.has(guestId)) {
      demo.unassignGuest(guestId);
    }
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `Guest RSVP changed to ${getGuestRsvpLabel(status)}`, category: 'rsvp', related_guest: guestId, wedding_id: state.wedding.id });
    setQuickRsvpGuest(null);
    setActionFeedback({ type: 'success', message: `Demo: RSVP updated` });
  };

  // Auto-clear feedback
  useEffect(() => {
    if (actionFeedback) {
      const t = setTimeout(() => { setActionFeedback(null); setLastArchivedIds(null); }, 5000);
      return () => clearTimeout(t);
    }
  }, [actionFeedback]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Action feedback toast */}
        {actionFeedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${actionFeedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{actionFeedback.message}</span>
            <div className="flex items-center gap-2">
              {lastArchivedIds && (
                <button onClick={() => { handleRestore(lastArchivedIds); setLastArchivedIds(null); }} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">Undo</button>
              )}
              <button onClick={() => { setActionFeedback(null); setLastArchivedIds(null); }} className="cursor-pointer ml-1"><i className="ri-close-line" /></button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Guests</h1>
            <p className="text-sm text-foreground-500 mt-1">Manage invitations, RSVPs, households and guest requirements.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/app/guests/new')} className="btn-primary text-sm cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add guest</button>
            <button onClick={() => navigate('/app/guests/export')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1.5" />Export</button>
            <button onClick={() => navigate('/app/guests/households')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-home-4-line mr-1.5" />Households</button>
            <button onClick={() => navigate('/app/guests/tags')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-price-tag-3-line mr-1.5" />Tags</button>
          </div>
        </div>

        {/* Help banner */}
        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">How guest management works</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">Add guests individually or import a spreadsheet — group them into households, tag by family or dietary need, and track RSVP responses in real time. Click any guest row to view their full profile. This is demo data; no changes are saved permanently.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { icon: 'ri-group-line', label: 'Total invited', value: filteredStats.total, colour: 'bg-secondary-50 text-secondary-600' },
            { icon: 'ri-check-double-line', label: 'Attending', value: filteredStats.attending, colour: 'bg-accent-50 text-accent-600' },
            { icon: 'ri-time-line', label: 'Awaiting reply', value: filteredStats.awaiting, colour: 'bg-amber-50 text-amber-600' },
            { icon: 'ri-close-circle-line', label: 'Declined', value: filteredStats.declined, colour: 'bg-red-50 text-red-500' },
            { icon: 'ri-sticky-note-line', label: 'Dietary/allergy', value: filteredStats.dietary, colour: 'bg-secondary-50 text-secondary-600' },
            { icon: 'ri-home-4-line', label: 'Households', value: filteredStats.households, colour: 'bg-accent-50 text-accent-600' },
          ].map((card) => (
            <div key={card.label} className="card-default text-center p-4">
              <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-lg ${card.colour} mb-2`}>
                <i className={`${card.icon} text-sm`} />
              </div>
              <p className="text-xl font-heading font-semibold text-foreground-900">{card.value}</p>
              <p className="text-xs text-foreground-500 font-label whitespace-nowrap">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card-default mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
              <input
                type="text"
                className="input-field pl-9 text-sm"
                placeholder="Search name, email, household..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
              )}
            </div>
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              <select className="input-field text-sm w-auto" value={rsvpFilter} onChange={(e) => { setRsvpFilter(e.target.value); setPage(1); }}>
                <option value="">All RSVP</option>
                <option value="accepted">Attending</option>
                <option value="pending">Awaiting reply</option>
                <option value="declined">Declined</option>
              </select>
              <select className="input-field text-sm w-auto" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All types</option>
                <option value="day">Day guest</option>
                <option value="evening">Evening only</option>
                <option value="adult">Adult</option>
                <option value="child">Child</option>
              </select>
              <select className="input-field text-sm w-auto" value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}>
                <option value="">All groups</option>
                <option value="Family">Family</option>
                <option value="Wedding party">Wedding party</option>
                <option value="Friends">Friends</option>
                <option value="Work">Work</option>
              </select>
              <select className="input-field text-sm w-auto" value={reqFilter} onChange={(e) => { setReqFilter(e.target.value); setPage(1); }}>
                <option value="">All requirements</option>
                <option value="dietary">Dietary</option>
                <option value="allergy">Allergy</option>
                <option value="accessibility">Accessibility</option>
                <option value="transport">Transport</option>
              </select>
              <select className="input-field text-sm w-auto" value={householdFilter} onChange={(e) => { setHouseholdFilter(e.target.value); setPage(1); }}>
                <option value="">All households</option>
                {households.map((h) => <option key={h.id} value={h.id}>{h.display_name}</option>)}
              </select>
              <select className="input-field text-sm w-auto" value={seatedFilter} onChange={(e) => { setSeatedFilter(e.target.value); setPage(1); }}>
                <option value="">All seating</option>
                <option value="seated">Seated</option>
                <option value="unseated">Unseated</option>
              </select>
              <select className="input-field text-sm w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <select className="input-field text-sm w-auto" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="full_name_asc">Name A–Z</option>
                <option value="full_name_desc">Name Z–A</option>
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
              </select>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-ghost text-xs text-primary-600 cursor-pointer whitespace-nowrap">Clear filters</button>
              )}
            </div>
            <button onClick={() => setShowMobileFilters(true)} className="lg:hidden btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-equalizer-line mr-1.5" />Filters</button>
          </div>
          {hasFilters && (
            <div className="text-xs text-foreground-500 mt-2 pt-2 border-t border-secondary-100">
              {filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-label text-primary-700">{selectedIds.size} selected</span>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button onClick={() => setBulkHouseholdOpen(!bulkHouseholdOpen)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-home-4-line mr-1" />Move to household</button>
                {bulkHouseholdOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-2 z-20 min-w-[200px] max-h-[200px] overflow-y-auto">
                    <button onClick={() => handleBulkHousehold('')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">No household</button>
                    {households.map((h) => (
                      <button key={h.id} onClick={() => handleBulkHousehold(h.id)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">{h.display_name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setBulkGroupOpen(!bulkGroupOpen)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-folder-line mr-1" />Invitation group</button>
                {bulkGroupOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-2 z-20 min-w-[160px]">
                    {['Family', 'Wedding party', 'Friends', 'Work'].map((grp) => (
                      <button key={grp} onClick={() => handleBulkGroup(grp)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">{grp}</button>
                    ))}
                  </div>
                )}
              </div>
              {statusFilter === 'active' ? (
                <button onClick={() => setConfirmArchive(Array.from(selectedIds))} className="btn-outline text-xs py-1.5 text-red-500 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1" />Archive</button>
              ) : (
                <button onClick={() => setConfirmRestore(Array.from(selectedIds))} className="btn-outline text-xs py-1.5 text-accent-600 border-accent-200 hover:bg-accent-50 cursor-pointer whitespace-nowrap"><i className="ri-refresh-line mr-1" />Restore</button>
              )}
              <button onClick={() => navigate(`/app/guests/export?ids=${Array.from(selectedIds).join(',')}`)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1" />Export selected</button>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer ml-auto whitespace-nowrap">Deselect all</button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden lg:block card-default overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-background-50">
                  <th className="text-left px-4 py-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === displayedGuests.length && displayedGuests.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer" />
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Guest</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Household</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Group</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Type</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">RSVP</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Requirements</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Seating</th>
                  <th className="text-right px-4 py-3 text-xs font-label text-foreground-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {displayedGuests.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-foreground-400">{hasFilters ? 'No guests match your filters.' : 'No guests yet.'}</td></tr>
                ) : (
                  displayedGuests.map((g) => {
                    const household = households.find((h) => h.id === g.household_id);
                    const tags = getGuestDerivedTags(g);
                    const seat = seatingAssignments.get(g.id);
                    const seatTable = seat ? state.seatingPlan.tables.find((t) => t.id === seat.table_id) : null;
                    const hasDietary = !!(g.dietary_requirements || g.allergy_notes);
                    const hasAccessibility = !!(g.accessibility_needs || g.accessibility_notes);
                    const rsvpLabel = getGuestRsvpLabel(g.rsvp_status);
                    const rsvpClass = getGuestRsvpClass(g.rsvp_status);
                    const isDeclined = g.rsvp_status === 'declined';
                    return (
                      <tr key={g.id} className={`hover:bg-background-50 transition-colors ${g.status === 'archived' ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggleSelect(g.id)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer" />
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => navigate(`/app/guests/${g.id}`)} className="text-left cursor-pointer w-full">
                            <div className="flex items-center gap-2">
                              <span className="font-label font-medium text-foreground-900">{displayName(g)}</span>
                              {g.wedding_party_role && <span className="px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700 whitespace-nowrap">{g.wedding_party_role}</span>}
                              {g.guest_type === 'child' && <span className="px-1.5 py-0.5 rounded text-xs bg-accent-100 text-accent-700 whitespace-nowrap">Child</span>}
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-xs text-foreground-600">{household?.display_name || <span className="text-foreground-400">—</span>}</td>
                        <td className="px-3 py-3 text-xs text-foreground-600">{g.invitation_group || <span className="text-foreground-400">—</span>}</td>
                        <td className="px-3 py-3 text-xs text-foreground-600">
                          {g.ceremony_invited || g.reception_invited ? 'Day' : g.evening_invited ? 'Evening' : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <button onClick={() => setQuickRsvpGuest(quickRsvpGuest === g.id ? null : g.id)} className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap cursor-pointer ${rsvpClass}`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${g.rsvp_status === 'accepted' ? 'bg-accent-500' : g.rsvp_status === 'declined' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              {rsvpLabel}
                            </button>
                            {quickRsvpGuest === g.id && (
                              <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-1.5 z-20 min-w-[140px]">
                                {(['accepted', 'pending', 'declined'] as const).map((s) => (
                                  <button key={s} onClick={() => handleQuickRsvp(g.id, s)} className={`block w-full text-left px-3 py-1.5 text-xs rounded cursor-pointer hover:bg-background-100 whitespace-nowrap ${g.rsvp_status === s ? 'font-semibold' : ''}`}>
                                    {getGuestRsvpLabel(s)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {hasDietary && (
                              <span className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${g.allergy_notes ? 'bg-red-100 text-red-700' : 'bg-secondary-100 text-secondary-600'}`} title={g.dietary_requirements || g.allergy_notes || ''}>
                                {g.allergy_notes ? '⚠ Allergy' : 'Dietary'}
                              </span>
                            )}
                            {hasAccessibility && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-secondary-100 text-secondary-600 whitespace-nowrap" title={g.accessibility_needs || g.accessibility_notes || ''}>Access</span>
                            )}
                            {!hasDietary && !hasAccessibility && <span className="text-foreground-400 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {g.rsvp_status === 'declined' ? (
                            <span className="text-xs text-foreground-400">—</span>
                          ) : seatTable ? (
                            <span className="text-xs text-accent-600">{seatTable.name}{seat.seat_number ? ` #${seat.seat_number}` : ''}</span>
                          ) : (
                            <span className="text-xs text-amber-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/app/guests/${g.id}`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="View profile"><i className="ri-eye-line text-sm" /></button>
                            <button onClick={() => navigate(`/app/guests/${g.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="Edit"><i className="ri-pencil-line text-sm" /></button>
                            {statusFilter === 'active' ? (
                              <button onClick={() => handleArchive([g.id])} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Archive"><i className="ri-archive-line text-sm" /></button>
                            ) : (
                              <button onClick={() => handleRestore([g.id])} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-accent-600 hover:bg-accent-50 cursor-pointer" title="Restore"><i className="ri-refresh-line text-sm" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3">
          {displayedGuests.length === 0 ? (
            <div className="card-default text-center py-12 text-sm text-foreground-400">
              {hasFilters ? 'No guests match your filters.' : 'No guests yet.'}
            </div>
          ) : (
            displayedGuests.map((g) => {
              const household = households.find((h) => h.id === g.household_id);
              const tags = getGuestDerivedTags(g);
              const seat = seatingAssignments.get(g.id);
              const seatTable = seat ? state.seatingPlan.tables.find((t) => t.id === seat.table_id) : null;
              const rsvpLabel = getGuestRsvpLabel(g.rsvp_status);
              const rsvpClass = getGuestRsvpClass(g.rsvp_status);
              return (
                <div key={g.id} className={`card-default ${g.status === 'archived' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggleSelect(g.id)} className="mt-1 w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => navigate(`/app/guests/${g.id}`)} className="font-label font-medium text-sm text-foreground-900 text-left cursor-pointer">{displayName(g)}</button>
                        {g.wedding_party_role && <span className="px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700 whitespace-nowrap">{g.wedding_party_role}</span>}
                        {g.guest_type === 'child' && <span className="px-1.5 py-0.5 rounded text-xs bg-accent-100 text-accent-700 whitespace-nowrap">Child</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-500">
                        {household && <span><i className="ri-home-4-line mr-0.5" />{household.display_name}</span>}
                        {g.invitation_group && <span><i className="ri-folder-line mr-0.5" />{g.invitation_group}</span>}
                        <span className={rsvpClass + ' px-1.5 py-0.5 rounded-full text-xs'}>{rsvpLabel}</span>
                        {seatTable && <span className="text-accent-600"><i className="ri-map-pin-line mr-0.5" />{seatTable.name}</span>}
                        {!seatTable && g.rsvp_status !== 'declined' && <span className="text-amber-500"><i className="ri-map-pin-line mr-0.5" />Unassigned</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {g.email && <span className="text-xs text-foreground-600 truncate max-w-[160px]">{g.email}</span>}
                        {!g.email && !g.mobile_phone && <span className="text-xs text-red-400 flex items-center gap-1"><i className="ri-error-warning-line" />Missing contact</span>}
                        {g.dietary_requirements && <span className="text-xs text-secondary-600 px-1 py-0.5 bg-secondary-100 rounded">{g.allergy_notes ? '⚠ Allergy' : 'Dietary'}</span>}
                        {g.plus_one_status !== 'none' && <span className="text-xs text-accent-600">+1 {g.plus_one_status}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => navigate(`/app/guests/${g.id}`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 cursor-pointer"><i className="ri-eye-line text-sm" /></button>
                      <button onClick={() => navigate(`/app/guests/${g.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 cursor-pointer"><i className="ri-pencil-line text-sm" /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 text-sm">
            <span className="text-foreground-500">{filteredGuests.length} guests</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 flex items-center justify-center rounded border border-secondary-200 text-foreground-600 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-left-s-line" /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded text-xs cursor-pointer whitespace-nowrap ${p === page ? 'bg-primary-500 text-white' : 'border border-secondary-200 text-foreground-600 hover:bg-background-100'}`}>{p}</button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 flex items-center justify-center rounded border border-secondary-200 text-foreground-600 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-right-s-line" /></button>
            </div>
          </div>
        )}

        {/* Mobile filters drawer */}
        {showMobileFilters && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowMobileFilters(false)} />
            <div className="fixed inset-y-0 right-0 w-80 max-w-[90vw] bg-white z-50 shadow-xl p-5 overflow-y-auto lg:hidden">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading text-lg text-foreground-900">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded text-foreground-500 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-xs font-label text-foreground-600 mb-1">RSVP status</label><select className="input-field text-sm" value={rsvpFilter} onChange={(e) => { setRsvpFilter(e.target.value); setPage(1); }}><option value="">All</option><option value="accepted">Attending</option><option value="pending">Awaiting reply</option><option value="declined">Declined</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Guest type</label><select className="input-field text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}><option value="">All</option><option value="day">Day guest</option><option value="evening">Evening only</option><option value="adult">Adult</option><option value="child">Child</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Invitation group</label><select className="input-field text-sm" value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}><option value="">All</option><option value="Family">Family</option><option value="Wedding party">Wedding party</option><option value="Friends">Friends</option><option value="Work">Work</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Requirements</label><select className="input-field text-sm" value={reqFilter} onChange={(e) => { setReqFilter(e.target.value); setPage(1); }}><option value="">All</option><option value="dietary">Dietary</option><option value="allergy">Allergy</option><option value="accessibility">Accessibility</option><option value="transport">Transport</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Household</label><select className="input-field text-sm" value={householdFilter} onChange={(e) => { setHouseholdFilter(e.target.value); setPage(1); }}><option value="">All</option>{households.map((h) => <option key={h.id} value={h.id}>{h.display_name}</option>)}</select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Seating</label><select className="input-field text-sm" value={seatedFilter} onChange={(e) => { setSeatedFilter(e.target.value); setPage(1); }}><option value="">All</option><option value="seated">Seated</option><option value="unseated">Unseated</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Status</label><select className="input-field text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option value="active">Active</option><option value="archived">Archived</option></select></div>
                {hasFilters && <button onClick={() => { clearFilters(); setShowMobileFilters(false); }} className="btn-outline text-sm w-full cursor-pointer">Clear all filters</button>}
              </div>
            </div>
          </>
        )}

        {/* Confirmation modals */}
        {confirmArchive && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmArchive(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" role="dialog" aria-modal="true">
                <h3 className="font-heading text-lg text-foreground-900 mb-2">Archive {confirmArchive.length} guest{confirmArchive.length > 1 ? 's' : ''}?</h3>
                <p className="text-sm text-foreground-500 mb-5">Archived guests are hidden from active lists but can be restored later.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setConfirmArchive(null)} className="btn-outline text-sm cursor-pointer">Cancel</button>
                  <button onClick={() => handleArchive(confirmArchive)} className="btn-primary text-sm bg-red-500 hover:bg-red-600 cursor-pointer">Archive</button>
                </div>
              </div>
            </div>
          </>
        )}
        {confirmRestore && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmRestore(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" role="dialog" aria-modal="true">
                <h3 className="font-heading text-lg text-foreground-900 mb-2">Restore {confirmRestore.length} guest{confirmRestore.length > 1 ? 's' : ''}?</h3>
                <p className="text-sm text-foreground-500 mb-5">Restored guests will reappear in your active guest list.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setConfirmRestore(null)} className="btn-outline text-sm cursor-pointer">Cancel</button>
                  <button onClick={() => handleRestore(confirmRestore)} className="btn-primary text-sm cursor-pointer">Restore</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function GuestsListPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoGuestsListPage />;
  return <NormalGuestsListPage />;
}

// ── Original Supabase-based page ──

function NormalGuestsListPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const svc = useGuestService();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [households, setHouseholds] = useState<GuestHousehold[]>([]);
  const [tags, setTags] = useState<GuestTag[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, households: 0, day: 0, evening: 0, children: 0, plusOnes: 0, missingContact: 0, notReady: 0, dietary: 0, allergy: 0, access: 0 });
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    household_id: searchParams.get('household_id') || '',
    guest_type: searchParams.get('guest_type') || '',
    invitation_group: searchParams.get('invitation_group') || '',
    relationship: '',
    contact_complete: '',
    plus_one: '',
    tag_ids: [] as string[],
    status: searchParams.get('status') || 'active',
    sort: searchParams.get('sort') || 'full_name_asc',
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: PAGE_SIZE,
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastArchivedIds, setLastArchivedIds] = useState<string[] | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string[] | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string[] | null>(null);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkHouseholdOpen, setBulkHouseholdOpen] = useState(false);
  const [bulkGroupOpen, setBulkGroupOpen] = useState(false);
  const [guestTagMap, setGuestTagMap] = useState<Map<string, string[]>>(new Map());

  // Auto-clear feedback after 5s
  useEffect(() => {
    if (actionFeedback) {
      const t = setTimeout(() => { setActionFeedback(null); setLastArchivedIds(null); }, 5000);
      return () => clearTimeout(t);
    }
  }, [actionFeedback]);

  const fetchData = useCallback(async () => {
    if (!weddingId) return;
    setLoading(true);
    setError('');
    try {
      // Fetch guests, households, tags, and stats in parallel
      const [guestResult, hhs, tgs, gs] = await Promise.all([
        svc.listGuests(filters),
        svc.listHouseholds('active'),
        svc.listTags(),
        svc.getStats(),
      ]);

      setGuests(guestResult.guests);
      setTotalCount(guestResult.totalCount);
      setHouseholds(hhs);

      // Enrich tags with usage count and build guest-tag map
      const tagIds = new Set(tgs.map((t) => t.id));
      const tagCounts: Record<string, number> = {};
      const gtm = new Map<string, string[]>();
      const { data: assignments } = await supabase.from('guest_tag_assignments').select('tag_id, guest_id').eq('wedding_id', weddingId);
      (assignments || []).forEach((a: { tag_id: string; guest_id: string }) => {
        if (tagIds.has(a.tag_id)) {
          tagCounts[a.tag_id] = (tagCounts[a.tag_id] || 0) + 1;
          const existing = gtm.get(a.guest_id) || [];
          existing.push(a.tag_id);
          gtm.set(a.guest_id, existing);
        }
      });
      setGuestTagMap(gtm);
      setTags(tgs.map((t) => ({ ...t, usage_count: tagCounts[t.id] || 0 })));

      setStats({
        total: gs.total,
        households: gs.households,
        day: gs.dayGuests,
        evening: gs.eveningOnly,
        children: gs.children,
        plusOnes: gs.plusOnes,
        missingContact: gs.missingContact,
        notReady: gs.notReady,
        dietary: gs.dietaryCount,
        allergy: gs.allergyCount,
        access: gs.accessibilityCount,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  }, [weddingId, filters, svc]);

  // Re-fetch when filters or wedding changes
  useEffect(() => {
    if (weddingId) fetchData();
  }, [fetchData, weddingId]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.household_id) params.household_id = filters.household_id;
    if (filters.guest_type) params.guest_type = filters.guest_type;
    if (filters.invitation_group) params.invitation_group = filters.invitation_group;
    if (filters.contact_complete) params.contact_complete = filters.contact_complete;
    if (filters.tag_ids.length) params.tag_ids = filters.tag_ids.join(',');
    if (filters.status !== 'active') params.status = filters.status;
    if (filters.sort !== 'full_name_asc') params.sort = filters.sort;
    if (filters.page > 1) params.page = String(filters.page);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const updateFilter = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setFilters({ search: '', household_id: '', guest_type: '', invitation_group: '', relationship: '', contact_complete: '', plus_one: '', tag_ids: [], status: 'active', sort: 'full_name_asc', page: 1, pageSize: PAGE_SIZE });
  };

  const hasFilters = filters.search || filters.household_id || filters.guest_type || filters.invitation_group || filters.contact_complete || filters.tag_ids.length || filters.status !== 'active';

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === guests.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(guests.map((g) => g.id)));
  };

  const handleArchive = async (ids: string[]) => {
    const ok = await svc.archiveGuest(ids);
    if (!ok) { setActionFeedback({ type: 'error', message: 'Failed to archive' }); return; }
    svc.recordActivity('archived', `${ids.length} guest${ids.length > 1 ? 's' : ''} archived`, { metadata: { guest_ids: ids } });
    setLastArchivedIds(ids);
    setActionFeedback({ type: 'success', message: `${ids.length} guest${ids.length > 1 ? 's' : ''} archived` });
    setSelectedIds(new Set());
    setConfirmArchive(null);
    // Re-fetch silently
    fetchData();
  };

  const handleRestore = async (ids: string[]) => {
    const ok = await svc.restoreGuest(ids);
    if (!ok) { setActionFeedback({ type: 'error', message: 'Failed to restore' }); return; }
    svc.recordActivity('restored', `${ids.length} guest${ids.length > 1 ? 's' : ''} restored`, { metadata: { guest_ids: ids } });
    setActionFeedback({ type: 'success', message: `${ids.length} guest${ids.length > 1 ? 's' : ''} restored` });
    setSelectedIds(new Set());
    setConfirmRestore(null);
    fetchData();
  };

  const handleBulkTag = async (tagId: string) => {
    const ok = await svc.bulkAssignTag(Array.from(selectedIds), tagId);
    if (!ok) { setActionFeedback({ type: 'error', message: 'Failed to apply tag' }); return; }
    svc.recordActivity('tagged', `Tag applied to ${selectedIds.size} guests`);
    setActionFeedback({ type: 'success', message: `Tag applied to ${selectedIds.size} guests` });
    setBulkTagOpen(false);
    fetchData();
  };

  const handleBulkHousehold = async (householdId: string) => {
    const ok = await svc.bulkMoveHousehold(Array.from(selectedIds), householdId || null);
    if (!ok) { setActionFeedback({ type: 'error', message: 'Failed to move guests' }); return; }
    svc.recordActivity('moved', `${selectedIds.size} guests moved to household`);
    setActionFeedback({ type: 'success', message: `${selectedIds.size} guests moved` });
    setBulkHouseholdOpen(false);
    setSelectedIds(new Set());
    fetchData();
  };

  const handleBulkGroup = async (group: string) => {
    const ok = await svc.bulkUpdateGroup(Array.from(selectedIds), group);
    if (!ok) { setActionFeedback({ type: 'error', message: 'Failed to update group' }); return; }
    svc.recordActivity('updated_group', `Group updated for ${selectedIds.size} guests to ${group}`);
    setActionFeedback({ type: 'success', message: `Group updated for ${selectedIds.size} guests` });
    setBulkGroupOpen(false);
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / filters.pageSize);

  const displayName = (g: Guest) => g.preferred_name || g.full_name || 'Unnamed guest';

  if (loading && guests.length === 0) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading guests...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && guests.length === 0) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={fetchData} className="btn-outline text-xs cursor-pointer">Try again</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {actionFeedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${actionFeedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{actionFeedback.message}</span>
            <button onClick={() => setActionFeedback(null)} className="cursor-pointer ml-3"><i className="ri-close-line" /></button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Guests</h1>
            <p className="text-sm text-foreground-500 mt-1">Manage everyone invited to your wedding, organise households and prepare for invitations and RSVPs.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/app/guests/new')} className="btn-primary text-sm cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add guest</button>
            <button onClick={() => navigate('/app/guests/households')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-home-4-line mr-1.5" />Households</button>
            <button onClick={() => navigate('/app/guests/import')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-upload-line mr-1.5" />Import</button>
            <button onClick={() => navigate('/app/guests/export')} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1.5" />Export</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { icon: 'ri-group-line', label: 'Total people', value: stats.total, colour: 'bg-secondary-50 text-secondary-600' },
            { icon: 'ri-home-4-line', label: 'Households', value: stats.households, colour: 'bg-accent-50 text-accent-600' },
            { icon: 'ri-sun-line', label: 'Day guests', value: stats.day, colour: 'bg-primary-50 text-primary-600' },
            { icon: 'ri-moon-line', label: 'Evening only', value: stats.evening, colour: 'bg-secondary-50 text-secondary-600' },
            { icon: 'ri-user-heart-line', label: 'Children', value: stats.children, colour: 'bg-accent-50 text-accent-600' },
            { icon: 'ri-sticky-note-line', label: 'Dietary/allergy', value: stats.dietary, colour: stats.dietary > 0 ? 'bg-amber-50 text-amber-600' : 'bg-secondary-50 text-secondary-600' },
            { icon: 'ri-wheelchair-line', label: 'Accessibility', value: stats.access, colour: stats.access > 0 ? 'bg-primary-50 text-primary-600' : 'bg-secondary-50 text-secondary-600' },
            { icon: 'ri-mail-close-line', label: 'Missing contact', value: stats.missingContact, colour: stats.missingContact > 0 ? 'bg-red-50 text-red-500' : 'bg-secondary-50 text-secondary-600' },
          ].map((card) => (
            <div key={card.label} className="card-default text-center p-4">
              <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-lg ${card.colour} mb-2`}>
                <i className={`${card.icon} text-sm`} />
              </div>
              <p className="text-xl font-heading font-semibold text-foreground-900">{card.value}</p>
              <p className="text-xs text-foreground-500 font-label whitespace-nowrap">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="card-default mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
              <input type="text" className="input-field pl-9 text-sm" placeholder="Search name, email, preferred name..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
            </div>
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              <select className="input-field text-sm w-auto" value={filters.household_id} onChange={(e) => updateFilter('household_id', e.target.value)}>
                <option value="">All households</option>
                <option value="none">No household</option>
                {households.map((h) => <option key={h.id} value={h.id}>{h.display_name}</option>)}
              </select>
              <select className="input-field text-sm w-auto" value={filters.guest_type} onChange={(e) => updateFilter('guest_type', e.target.value)}>
                <option value="">All types</option>
                <option value="adult">Adult</option>
                <option value="child">Child</option>
                <option value="infant">Infant</option>
              </select>
              <select className="input-field text-sm w-auto" value={filters.invitation_group} onChange={(e) => updateFilter('invitation_group', e.target.value)}>
                <option value="">All groups</option>
                <option value="Family">Family</option>
                <option value="Wedding party">Wedding party</option>
                <option value="Friends">Friends</option>
                <option value="Work">Work</option>
              </select>
              <select className="input-field text-sm w-auto" value={filters.contact_complete} onChange={(e) => updateFilter('contact_complete', e.target.value)}>
                <option value="">All contact</option>
                <option value="complete">Has contact</option>
                <option value="missing">Missing contact</option>
              </select>
              <select className="input-field text-sm w-auto" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <select className="input-field text-sm w-auto" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                <option value="full_name_asc">Name A–Z</option>
                <option value="full_name_desc">Name Z–A</option>
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
              </select>
              {hasFilters && <button onClick={clearFilters} className="btn-ghost text-xs text-primary-600 cursor-pointer whitespace-nowrap">Clear filters</button>}
            </div>
            <button onClick={() => setShowMobileFilters(true)} className="lg:hidden btn-outline text-sm cursor-pointer"><i className="ri-equalizer-line mr-1.5" />Filters</button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-label text-primary-700">{selectedIds.size} selected</span>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button onClick={() => setBulkTagOpen(!bulkTagOpen)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-price-tag-3-line mr-1" />Tag</button>
                {bulkTagOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-2 z-20 min-w-[160px]">
                    {tags.map((t) => (
                      <button key={t.id} onClick={() => handleBulkTag(t.id)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">{t.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setBulkHouseholdOpen(!bulkHouseholdOpen)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-home-4-line mr-1" />Move to household</button>
                {bulkHouseholdOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-2 z-20 min-w-[200px] max-h-[200px] overflow-y-auto">
                    <button onClick={() => handleBulkHousehold('')} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">No household</button>
                    {households.map((h) => (
                      <button key={h.id} onClick={() => handleBulkHousehold(h.id)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">{h.display_name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setBulkGroupOpen(!bulkGroupOpen)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-folder-line mr-1" />Invitation group</button>
                {bulkGroupOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-secondary-200 rounded-lg shadow-lg p-2 z-20 min-w-[160px]">
                    {['Family', 'Wedding party', 'Friends', 'Work', 'Extended family', 'Neighbours'].map((grp) => (
                      <button key={grp} onClick={() => handleBulkGroup(grp)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">{grp}</button>
                    ))}
                  </div>
                )}
              </div>
              {filters.status === 'active' ? (
                <button onClick={() => setConfirmArchive(Array.from(selectedIds))} className="btn-outline text-xs py-1.5 text-red-500 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1" />Archive</button>
              ) : (
                <button onClick={() => setConfirmRestore(Array.from(selectedIds))} className="btn-outline text-xs py-1.5 text-accent-600 border-accent-200 hover:bg-accent-50 cursor-pointer whitespace-nowrap"><i className="ri-refresh-line mr-1" />Restore</button>
              )}
              <button onClick={() => navigate(`/app/guests/export?ids=${Array.from(selectedIds).join(',')}`)} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1" />Export selected</button>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer ml-auto whitespace-nowrap">Deselect all</button>
          </div>
        )}

        <div className="hidden lg:block card-default overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-background-50">
                  <th className="text-left px-4 py-3 w-10"><input type="checkbox" checked={selectedIds.size === guests.length && guests.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer" /></th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Guest</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Household</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Group</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Type</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Contact</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">+1</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Tags</th>
                  <th className="text-left px-3 py-3 text-xs font-label text-foreground-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-label text-foreground-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {guests.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-foreground-400">{hasFilters ? 'No guests match your filters.' : 'No guests yet.'}</td></tr>
                ) : (
                  guests.map((g) => {
                    const household = households.find((h) => h.id === g.household_id);
                    return (
                      <tr key={g.id} className="hover:bg-background-50 transition-colors">
                        <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggleSelect(g.id)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer" /></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-label font-medium text-foreground-900">{displayName(g)}</span>
                            {g.last_name && <span className="text-foreground-500">{g.last_name}</span>}
                            {g.relationship_label && <span className="text-xs text-foreground-400">({g.relationship_label})</span>}
                            {g.wedding_party_role && <span className="px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700 whitespace-nowrap">{g.wedding_party_role}</span>}
                            {g.guest_type === 'child' && <span className="px-1.5 py-0.5 rounded text-xs bg-accent-100 text-accent-700 whitespace-nowrap">Child</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-foreground-600">{household?.display_name || <span className="text-foreground-400">—</span>}</td>
                        <td className="px-3 py-3 text-xs text-foreground-600">{g.invitation_group || <span className="text-foreground-400">—</span>}</td>
                        <td className="px-3 py-3 text-xs text-foreground-600 capitalize">{g.guest_type}</td>
                        <td className="px-3 py-3">{(g.email || g.mobile_phone) ? <div className="text-xs"><div className="text-foreground-700 truncate max-w-[140px]">{g.email || g.mobile_phone}</div></div> : <span className="text-xs text-red-400 flex items-center gap-1"><i className="ri-error-warning-line" />Missing</span>}</td>
                        <td className="px-3 py-3 text-xs">{g.plus_one_status === 'none' ? <span className="text-foreground-400">—</span> : g.plus_one_status === 'allowed' ? <span className="text-secondary-500">Allowed</span> : <span className="text-accent-600">Named</span>}</td>
                        <td className="px-3 py-3">{(tags.filter((t) => (guestTagMap.get(g.id) || []).includes(t.id))).slice(0, 2).map((t) => <span key={t.id} className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap mr-1 ${TAG_COLOUR_CLASSES[t.colour_key] || 'bg-secondary-100 text-secondary-700'}`}>{t.name}</span>)}</td>
                        <td className="px-3 py-3">{filters.status === 'active' ? g.invite_preparation_status === 'ready' ? <span className="inline-flex items-center gap-1 text-xs text-accent-600"><span className="w-1.5 h-1.5 rounded-full bg-accent-500" />Ready</span> : <span className="inline-flex items-center gap-1 text-xs text-secondary-500"><span className="w-1.5 h-1.5 rounded-full bg-secondary-400" />Draft</span> : <span className="inline-flex items-center gap-1 text-xs text-foreground-400"><span className="w-1.5 h-1.5 rounded-full bg-foreground-300" />Archived</span>}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/app/guests/${g.id}`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="View"><i className="ri-eye-line text-sm" /></button>
                            <button onClick={() => navigate(`/app/guests/${g.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="Edit"><i className="ri-pencil-line text-sm" /></button>
                            {filters.status === 'active' ? <button onClick={() => handleArchive([g.id])} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Archive"><i className="ri-archive-line text-sm" /></button> : <button onClick={() => handleRestore([g.id])} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-accent-600 hover:bg-accent-50 cursor-pointer" title="Restore"><i className="ri-refresh-line text-sm" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:hidden space-y-3">
          {guests.length === 0 ? <div className="card-default text-center py-12 text-sm text-foreground-400">{hasFilters ? 'No guests match your filters.' : 'No guests yet.'}</div> : guests.map((g) => {
            const household = households.find((h) => h.id === g.household_id);
            return (
              <div key={g.id} className="card-default flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggleSelect(g.id)} className="mt-1 w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-label font-medium text-sm text-foreground-900">{displayName(g)} {g.last_name}</span>
                    {g.wedding_party_role && <span className="px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700 whitespace-nowrap">{g.wedding_party_role}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-500">
                    {g.relationship_label && <span>{g.relationship_label}</span>}
                    {household && <span><i className="ri-home-4-line mr-0.5" />{household.display_name}</span>}
                    {g.invitation_group && <span><i className="ri-folder-line mr-0.5" />{g.invitation_group}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {(g.email || g.mobile_phone) ? <span className="text-xs text-foreground-600">{g.email || g.mobile_phone}</span> : <span className="text-xs text-red-400 flex items-center gap-1"><i className="ri-error-warning-line" />Missing contact</span>}
                    {g.plus_one_status !== 'none' && <span className="text-xs text-accent-600">+1 {g.plus_one_status}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => navigate(`/app/guests/${g.id}`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 cursor-pointer"><i className="ri-eye-line text-sm" /></button>
                  <button onClick={() => navigate(`/app/guests/${g.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 cursor-pointer"><i className="ri-pencil-line text-sm" /></button>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 text-sm">
            <span className="text-foreground-500">{totalCount} guests</span>
            <div className="flex items-center gap-1">
              <button disabled={filters.page <= 1} onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))} className="w-8 h-8 flex items-center justify-center rounded border border-secondary-200 text-foreground-600 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-left-s-line" /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const start = Math.max(1, Math.min(filters.page - 3, totalPages - 6));
                const p = start + i;
                if (p > totalPages) return null;
                return <button key={p} onClick={() => setFilters((pr) => ({ ...pr, page: p }))} className={`w-8 h-8 flex items-center justify-center rounded text-xs cursor-pointer whitespace-nowrap ${p === filters.page ? 'bg-primary-500 text-white' : 'border border-secondary-200 text-foreground-600 hover:bg-background-100'}`}>{p}</button>;
              })}
              <button disabled={filters.page >= totalPages} onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))} className="w-8 h-8 flex items-center justify-center rounded border border-secondary-200 text-foreground-600 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-right-s-line" /></button>
            </div>
          </div>
        )}

        {showMobileFilters && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowMobileFilters(false)} />
            <div className="fixed inset-y-0 right-0 w-80 max-w-[90vw] bg-white z-50 shadow-xl p-5 overflow-y-auto lg:hidden">
              <div className="flex items-center justify-between mb-5"><h3 className="font-heading text-lg text-foreground-900">Filters</h3><button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded text-foreground-500 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button></div>
              <div className="space-y-4">
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Household</label><select className="input-field text-sm" value={filters.household_id} onChange={(e) => updateFilter('household_id', e.target.value)}><option value="">All</option><option value="none">No household</option>{households.map((h) => <option key={h.id} value={h.id}>{h.display_name}</option>)}</select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Type</label><select className="input-field text-sm" value={filters.guest_type} onChange={(e) => updateFilter('guest_type', e.target.value)}><option value="">All</option><option value="adult">Adult</option><option value="child">Child</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Group</label><select className="input-field text-sm" value={filters.invitation_group} onChange={(e) => updateFilter('invitation_group', e.target.value)}><option value="">All</option><option value="Family">Family</option><option value="Wedding party">Wedding party</option><option value="Friends">Friends</option><option value="Work">Work</option></select></div>
                <div><label className="block text-xs font-label text-foreground-600 mb-1">Status</label><select className="input-field text-sm" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="active">Active</option><option value="archived">Archived</option></select></div>
                {hasFilters && <button onClick={() => { clearFilters(); setShowMobileFilters(false); }} className="btn-outline text-sm w-full cursor-pointer">Clear all filters</button>}
              </div>
            </div>
          </>
        )}

        {confirmArchive && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmArchive(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"><h3 className="font-heading text-lg text-foreground-900 mb-2">Archive {confirmArchive.length} guest{confirmArchive.length > 1 ? 's' : ''}?</h3><p className="text-sm text-foreground-500 mb-5">Archived guests are hidden from active lists but can be restored later.</p>
                <div className="flex gap-3 justify-end"><button onClick={() => setConfirmArchive(null)} className="btn-outline text-sm cursor-pointer">Cancel</button><button onClick={() => handleArchive(confirmArchive)} className="btn-primary text-sm bg-red-500 hover:bg-red-600 cursor-pointer">Archive</button></div>
              </div>
            </div>
          </>
        )}
        {confirmRestore && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmRestore(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"><h3 className="font-heading text-lg text-foreground-900 mb-2">Restore {confirmRestore.length} guest{confirmRestore.length > 1 ? 's' : ''}?</h3><p className="text-sm text-foreground-500 mb-5">Restored guests will reappear in your active guest list.</p>
                <div className="flex gap-3 justify-end"><button onClick={() => setConfirmRestore(null)} className="btn-outline text-sm cursor-pointer">Cancel</button><button onClick={() => handleRestore(confirmRestore)} className="btn-primary text-sm cursor-pointer">Restore</button></div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}