import { useState, useMemo } from 'react';
import type { UnseatedGuest, TableWithData, RoomObject, SeatingZone } from '@/types/seating';

type LayerKey = 'Tables' | 'Seats' | 'Venue objects' | 'Background' | 'Grid' | 'Zones' | 'Guest labels';

interface LeftPanelProps {
  planId: string;
  unseatedGuests: UnseatedGuest[];
  tables: TableWithData[];
  roomObjects: RoomObject[];
  zones: SeatingZone[];
  isReadOnly: boolean;
  onAssignGuest: (guestId: string, tableId: string, seatId?: string) => Promise<void>;
  onSelectTable: (id: string, multi: boolean) => void;
  onSelectObject: (id: string, multi: boolean) => void;
  selectedTableIds: Set<string>;
  selectedObjectIds: Set<string>;
  layerVisibility?: Record<string, boolean>;
  onToggleLayer?: (key: LayerKey) => void;
}

type Tab = 'guests' | 'tables' | 'layers';

export default function LeftPanel({
  planId, unseatedGuests, tables, roomObjects, zones, isReadOnly,
  onAssignGuest, onSelectTable, onSelectObject, selectedTableIds, selectedObjectIds,
  layerVisibility, onToggleLayer,
}: LeftPanelProps) {
  const [tab, setTab] = useState<Tab>('guests');
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState({ household: '', type: '', rsvp: '', party: '', dietary: false, accessibility: false });

  // Group unseated guests by household
  const householdGroups = useMemo(() => {
    const map = new Map<string, UnseatedGuest[]>();
    const orphans: UnseatedGuest[] = [];

    for (const guest of unseatedGuests) {
      if (!guest.household_id) {
        orphans.push(guest);
        continue;
      }
      const existing = map.get(guest.household_id) || [];
      existing.push(guest);
      map.set(guest.household_id, existing);
    }

    return { groups: Array.from(map.entries()), orphans };
  }, [unseatedGuests]);

  const filteredGuests = useMemo(() => {
    return unseatedGuests.filter((g) => {
      if (search && !g.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (guestFilter.type && g.guest_type !== guestFilter.type) return false;
      if (guestFilter.rsvp && g.rsvp_status !== guestFilter.rsvp) return false;
      if (guestFilter.party && g.wedding_party_role !== guestFilter.party) return false;
      if (guestFilter.dietary && !g.has_dietary) return false;
      if (guestFilter.accessibility && !g.has_accessibility) return false;
      return true;
    });
  }, [unseatedGuests, search, guestFilter]);

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'guests', label: 'Guests', icon: 'ri-group-line', count: unseatedGuests.length },
    { key: 'tables', label: 'Tables', icon: 'ri-layout-grid-line', count: tables.length },
    { key: 'layers', label: 'Layers', icon: 'ri-stack-line', count: 0 },
  ];

  const guestTypes = useMemo(() => [...new Set(unseatedGuests.map((g) => g.guest_type))].sort(), [unseatedGuests]);
  const rsvpStatuses = useMemo(() => [...new Set(unseatedGuests.map((g) => g.rsvp_status))].sort(), [unseatedGuests]);

  // Collapsed view
  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 border-r border-secondary-100 flex flex-col bg-accent-200/80 items-center py-2 gap-1">
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-300/70 text-accent-600 hover:text-accent-800 cursor-pointer transition-colors mb-2"
          title="Expand sidebar"
        >
          <i className="ri-layout-right-2-line text-sm" />
        </button>
        <div className="w-8 h-px bg-accent-300/70 mb-2" />
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setCollapsed(false); }}
            className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-[11px] font-label transition-colors cursor-pointer ${
              tab === t.key ? 'bg-accent-300/80 text-accent-800' : 'text-accent-500 hover:text-accent-700 hover:bg-accent-200/70'
            }`}
            title={t.label}
          >
            <i className={t.icon} style={{ fontSize: '13px' }} />
            {t.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-accent-600 text-white text-[9px] px-0.5 font-label">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-secondary-100 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-secondary-50">
        <h3 className="font-label text-[11px] font-semibold text-foreground-500 uppercase tracking-wide">Plan</h3>
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background-50 text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors"
          title="Collapse sidebar"
        >
          <i className="ri-layout-left-2-line text-sm" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-secondary-100">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-label transition-colors cursor-pointer whitespace-nowrap ${tab === t.key ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50' : 'text-foreground-400 hover:text-foreground-600 hover:bg-background-50'}`}>
            <i className={t.icon} style={{ fontSize: '11px' }} />
            <span className="text-[10px]">{t.label}</span>
            {t.count > 0 && <span className="text-[9px]">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== 'layers' && (
        <div className="p-3 border-b border-secondary-50">
          <div className="relative">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" placeholder={tab === 'guests' ? 'Search guests...' : 'Search tables...'} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-xs font-label text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'guests' && (
          <div>
            {/* Quick filters */}
            <div className="px-3 py-2 border-b border-secondary-50 flex flex-wrap gap-1">
              {guestFilter.type && <FilterChip label={guestFilter.type} onRemove={() => setGuestFilter((f) => ({ ...f, type: '' }))} />}
              {guestFilter.rsvp && <FilterChip label={guestFilter.rsvp} onRemove={() => setGuestFilter((f) => ({ ...f, rsvp: '' }))} />}
              {guestFilter.dietary && <FilterChip label="Dietary" onRemove={() => setGuestFilter((f) => ({ ...f, dietary: false }))} />}
              {guestFilter.accessibility && <FilterChip label="Accessibility" onRemove={() => setGuestFilter((f) => ({ ...f, accessibility: false }))} />}
              <div className="relative group">
                <button className="px-1.5 py-0.5 text-[10px] text-foreground-400 hover:text-foreground-600 rounded border border-secondary-100 cursor-pointer whitespace-nowrap">
                  <i className="ri-filter-3-line text-xs" /> Filter
                </button>
                <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-secondary-200 p-2 w-44 z-30 hidden group-hover:block">
                  {guestTypes.length > 0 && <div className="mb-2"><p className="text-[9px] text-foreground-400 mb-1 uppercase">Type</p>{guestTypes.map((t) => <button key={t} onClick={() => setGuestFilter((f) => ({ ...f, type: t }))} className="block w-full text-left text-[11px] text-foreground-600 hover:text-primary-600 py-0.5 cursor-pointer whitespace-nowrap">{t}</button>)}</div>}
                  {rsvpStatuses.length > 0 && <div className="mb-2"><p className="text-[9px] text-foreground-400 mb-1 uppercase">RSVP</p>{rsvpStatuses.map((t) => <button key={t} onClick={() => setGuestFilter((f) => ({ ...f, rsvp: t }))} className="block w-full text-left text-[11px] text-foreground-600 hover:text-primary-600 py-0.5 cursor-pointer whitespace-nowrap capitalize">{t}</button>)}</div>}
                  <button onClick={() => setGuestFilter((f) => ({ ...f, dietary: !f.dietary }))} className={`block w-full text-left text-[11px] py-0.5 cursor-pointer whitespace-nowrap ${guestFilter.dietary ? 'text-primary-600 font-medium' : 'text-foreground-600'}`}>Dietary needs</button>
                  <button onClick={() => setGuestFilter((f) => ({ ...f, accessibility: !f.accessibility }))} className={`block w-full text-left text-[11px] py-0.5 cursor-pointer whitespace-nowrap ${guestFilter.accessibility ? 'text-primary-600 font-medium' : 'text-foreground-600'}`}>Accessibility</button>
                </div>
              </div>
            </div>

            {filteredGuests.length === 0 ? (
              <p className="text-xs text-foreground-400 text-center py-8">All guests seated!</p>
            ) : (
              <div className="p-2 space-y-3">
                {/* Household groups */}
                {householdGroups.groups.map(([householdId, members]) => {
                  const filteredMembers = members.filter((g) => filteredGuests.includes(g));
                  if (filteredMembers.length === 0) return null;
                  return (
                    <HouseholdGroup
                      key={householdId}
                      members={filteredMembers}
                      isReadOnly={isReadOnly}
                      onAssignGuest={onAssignGuest}
                    />
                  );
                })}

                {/* Orphans */}
                {householdGroups.orphans.filter((g) => filteredGuests.includes(g)).length > 0 && (
                  <HouseholdGroup
                    members={householdGroups.orphans.filter((g) => filteredGuests.includes(g))}
                    isReadOnly={isReadOnly}
                    onAssignGuest={onAssignGuest}
                    label="Other guests"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'tables' && (
          <div className="p-2 space-y-0.5">
            {tables
              .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
              .map((table) => (
                <button key={table.id}
                  onClick={() => onSelectTable(table.id, false)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors cursor-pointer whitespace-nowrap ${selectedTableIds.has(table.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-background-50 text-foreground-700'}`}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${table.shape === 'round' || table.shape === 'oval' || table.shape === 'sweetheart' ? 'rounded-full' : 'rounded-sm'}`} style={{ backgroundColor: table.colour === 'rose' ? '#fecaca' : table.colour === 'sage' ? '#a7f3d0' : table.colour === 'amber' ? '#fde68a' : table.colour === 'lavender' ? '#ddd6fe' : table.colour === 'coral' ? '#fecaca' : table.colour === 'mint' ? '#99f6e4' : table.colour === 'cream' ? '#fef3c7' : table.colour === 'slate' ? '#e2e8f0' : '#bae6fd', border: '1px solid #d1d5db' }} />
                  <span className="flex-1 text-[11px] font-label truncate">{table.name}</span>
                  <span className={`text-[10px] ${table.seated_count > table.capacity ? 'text-red-500' : 'text-foreground-400'}`}>{table.seated_count}/{table.capacity}</span>
                </button>
              ))}
          </div>
        )}

        {tab === 'layers' && (
          <div className="p-3 space-y-0.5">
            {([
              { label: 'Tables' as LayerKey, icon: 'ri-layout-grid-line', count: tables.length },
              { label: 'Seats' as LayerKey, icon: 'ri-circle-line', count: tables.reduce((s, t) => s + t.seats.length, 0) },
              { label: 'Venue objects' as LayerKey, icon: 'ri-shape-line', count: roomObjects.length },
              { label: 'Background' as LayerKey, icon: 'ri-image-line', count: 0 },
              { label: 'Grid' as LayerKey, icon: 'ri-grid-line', count: 0 },
              { label: 'Zones' as LayerKey, icon: 'ri-map-pin-line', count: zones.length },
              { label: 'Guest labels' as LayerKey, icon: 'ri-font-size', count: 0 },
            ] as const).map((layer) => {
              const visible = layerVisibility?.[layer.label] !== false;
              return (
                <div key={layer.label} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-background-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <i className={`${layer.icon} text-xs ${visible ? 'text-foreground-500' : 'text-foreground-300'}`} />
                    <span className={`text-[11px] font-label ${visible ? 'text-foreground-700' : 'text-foreground-400'}`}>{layer.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {layer.count > 0 && <span className="text-[10px] text-foreground-400">{layer.count}</span>}
                    {onToggleLayer && (
                      <button
                        onClick={() => onToggleLayer(layer.label)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${visible ? 'text-foreground-500 hover:bg-background-100' : 'text-foreground-300 hover:bg-background-50'}`}
                        title={visible ? `Hide ${layer.label}` : `Show ${layer.label}`}
                        aria-label={`Toggle ${layer.label} visibility`}
                      >
                        <i className={`${visible ? 'ri-eye-line' : 'ri-eye-off-line'} text-sm`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 text-[9px] font-label">
      {label}
      <button onClick={onRemove} className="cursor-pointer hover:text-primary-800"><i className="ri-close-line text-[10px]" /></button>
    </span>
  );
}

function HouseholdGroup({
  members, isReadOnly, onAssignGuest, label,
}: {
  members: UnseatedGuest[];
  isReadOnly: boolean;
  onAssignGuest: (guestId: string, tableId: string, seatId?: string) => Promise<void>;
  label?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (members.length === 0) return null;

  const headerName = label || (members.length > 1 ? `${members[0].full_name.split(' ').pop()}'s party` : members[0].full_name);

  return (
    <div>
      {members.length > 1 ? (
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 w-full text-left py-1 px-1 rounded hover:bg-background-50 transition-colors cursor-pointer"
        >
          <i className={`${collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'} text-[10px] text-foreground-400`} />
          <span className="text-[10px] font-label text-foreground-500 uppercase tracking-wide">{headerName}</span>
          <span className="text-[9px] text-foreground-400">{members.length}</span>
        </button>
      ) : (
        <div className="py-1 px-1">
          <span className="text-[10px] font-label text-foreground-500 uppercase tracking-wide">{headerName}</span>
        </div>
      )}

      {!collapsed && (
        <div className="space-y-0.5 ml-1">
          {members.map((guest) => (
            <div key={guest.id}
              draggable={!isReadOnly}
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', guest.id); e.dataTransfer.effectAllowed = 'move'; }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-background-50 transition-colors group cursor-grab active:cursor-grabbing">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 text-[10px] font-label">{guest.full_name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-label text-foreground-800 truncate">{guest.full_name}</p>
                <div className="flex items-center gap-1">
                  {guest.has_dietary && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Dietary" />}
                  {guest.has_accessibility && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title="Accessibility" />}
                  <span className="text-[9px] text-foreground-400">{guest.guest_type}</span>
                </div>
              </div>
              {!isReadOnly && <i className="ri-drag-move-line text-foreground-300 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}