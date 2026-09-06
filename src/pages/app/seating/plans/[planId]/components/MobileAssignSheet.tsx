import { useState, useMemo } from 'react';
import type { UnseatedGuest, TableWithData } from '@/types/seating';

interface MobileAssignSheetProps {
  unseatedGuests: UnseatedGuest[];
  tables: TableWithData[];
  onAssignGuest: (guestId: string, tableId: string) => Promise<void>;
  onClose: () => void;
}

export default function MobileAssignSheet({
  unseatedGuests,
  tables,
  onAssignGuest,
  onClose,
}: MobileAssignSheetProps) {
  const [search, setSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [assigningGuest, setAssigningGuest] = useState<string | null>(null);

  const filteredGuests = useMemo(() => {
    if (!search.trim()) return unseatedGuests;
    const q = search.toLowerCase();
    return unseatedGuests.filter((g) => g.full_name.toLowerCase().includes(q));
  }, [unseatedGuests, search]);

  const handleAssign = async (guestId: string, tableId: string) => {
    setAssigningGuest(guestId);
    try {
      await onAssignGuest(guestId, tableId);
      setSelectedGuestId(null);
    } catch {
      // Silent fail — parent shows toast
    } finally {
      setAssigningGuest(null);
    }
  };

  const selectedGuest = unseatedGuests.find((g) => g.id === selectedGuestId);
  const availableTables = tables.filter((t) => t.seated_count < t.capacity);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-secondary-100">
        <div className="relative">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search unseated guests"
          />
        </div>
      </div>

      {selectedGuestId && selectedGuest ? (
        /* Step 2: Pick a table */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-secondary-100 flex items-center gap-3">
            <button
              onClick={() => setSelectedGuestId(null)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 cursor-pointer"
              aria-label="Back to guest list"
            >
              <i className="ri-arrow-left-line text-sm" />
            </button>
            <div>
              <p className="font-label text-sm font-medium text-foreground-900">{selectedGuest.full_name}</p>
              <p className="text-xs text-foreground-500">Choose a table</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {availableTables.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                  <i className="ri-error-warning-line text-foreground-400" />
                </div>
                <p className="text-sm text-foreground-500">All tables are full</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleAssign(selectedGuest.id, table.id)}
                    disabled={assigningGuest === selectedGuest.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer disabled:opacity-50 text-left"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: table.colour === 'rose' ? '#fecaca' : table.colour === 'sage' ? '#a7f3d0' : table.colour === 'amber' ? '#fde68a' : table.colour === 'lavender' ? '#ddd6fe' : table.colour === 'coral' ? '#fecaca' : table.colour === 'mint' ? '#99f6e4' : table.colour === 'cream' ? '#fef3c7' : table.colour === 'slate' ? '#e2e8f0' : '#bae6fd',
                        border: '1px solid #d1d5db',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-label font-medium text-foreground-900">{table.name}</p>
                      <p className="text-xs text-foreground-500">
                        {table.seated_count}/{table.capacity} seats ·{' '}
                        {table.capacity - table.seated_count} available
                      </p>
                    </div>
                    <div className="w-full max-w-[60px]">
                      <div className="h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${table.seated_count >= table.capacity ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(100, (table.seated_count / Math.max(1, table.capacity)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Step 1: Pick a guest */
        <div className="flex-1 overflow-y-auto">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-3">
                <i className="ri-check-double-line text-lg" />
              </div>
              <p className="text-sm text-foreground-500">All guests seated!</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => setSelectedGuestId(guest.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background-50 transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-background-100 text-foreground-600 font-label font-medium text-xs">
                    {guest.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-label font-medium text-foreground-900 truncate">
                      {guest.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {guest.has_dietary && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">Dietary</span>
                      )}
                      {guest.has_accessibility && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-100 text-sky-700">Access</span>
                      )}
                      {guest.wedding_party_role && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700">{guest.wedding_party_role}</span>
                      )}
                      <span className="text-[10px] text-foreground-400">{guest.guest_type}</span>
                    </div>
                  </div>
                  <i className="ri-arrow-right-s-line text-foreground-400 text-sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom stats */}
      <div className="px-4 py-3 border-t border-secondary-100 flex items-center justify-between text-xs text-foreground-500">
        <span>
          {unseatedGuests.length} unseated · {tables.length} tables
        </span>
        <span>
          {tables.reduce((sum, t) => sum + (t.capacity - t.seated_count), 0)} seats free
        </span>
      </div>
    </div>
  );
}