import { useState, useEffect } from 'react';
import type { TableWithData, RoomObject, UnseatedGuest } from '@/types/seating';
import { OBJECT_TYPE_LABELS } from '@/types/seating';

interface RightPanelProps {
  selectedTable: TableWithData | null;
  selectedObject: RoomObject | null;
  selectedSeatId: string | null;
  tables: TableWithData[];
  isReadOnly: boolean;
  onDeleteTable: (id: string) => Promise<void>;
  onDeleteObject: (id: string) => Promise<void>;
  onRotateTable: (id: string, rot: number) => Promise<void>;
  onUpdateTable: (id: string, updates: Partial<TableWithData>) => Promise<void>;
  onResizeObject: (id: string, w: number, h: number) => Promise<void>;
  onRemoveGuest: (assignmentId: string, guestId: string, seatId?: string) => Promise<void>;
  onAssignGuestToSeat: (guestId: string, tableId: string, seatId?: string) => Promise<void>;
  onDuplicateObject: (objId: string) => Promise<void>;
  unseatedGuests: UnseatedGuest[];
  onClose: () => void;
}

const COLOURS = [
  { value: 'rose', hex: '#f4a39a', bg: 'bg-rose-300' },
  { value: 'sage', hex: '#8bc9a0', bg: 'bg-emerald-300' },
  { value: 'lavender', hex: '#b5a8e4', bg: 'bg-violet-300' },
  { value: 'amber', hex: '#fbbf56', bg: 'bg-amber-300' },
  { value: 'sky', hex: '#8ec7ea', bg: 'bg-sky-300' },
  { value: 'coral', hex: '#f59e8a', bg: 'bg-orange-300' },
  { value: 'mint', hex: '#71d4b9', bg: 'bg-teal-300' },
  { value: 'cream', hex: '#f3d482', bg: 'bg-yellow-300' },
  { value: 'slate', hex: '#b8bec8', bg: 'bg-slate-300' },
];

export default function RightPanel({
  selectedTable, selectedObject, selectedSeatId, tables, isReadOnly,
  onDeleteTable, onDeleteObject, onRotateTable, onUpdateTable, onResizeObject,
  onRemoveGuest, onAssignGuestToSeat, onDuplicateObject, unseatedGuests, onClose,
}: RightPanelProps) {
  const [guestSearch, setGuestSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSelection = !!(selectedTable || selectedObject);

  // Auto-expand when something is selected; let user collapse manually
  useEffect(() => {
    if (hasSelection) setIsExpanded(true);
  }, [hasSelection]);

  const togglePanel = () => setIsExpanded((prev) => !prev);

  // ── Collapsed state: thin toggle tab ──
  if (!isExpanded) {
    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={togglePanel}
          className="w-8 h-full flex items-center justify-center border-l border-secondary-100 bg-accent-200/80 hover:bg-accent-300/80 transition-colors cursor-pointer group rounded-l-lg"
          title="Open inspector"
          aria-label="Open inspector panel"
        >
          <div className="flex flex-col items-center gap-2 text-accent-600 group-hover:text-accent-800 transition-colors">
            <i className="ri-layout-left-line text-sm" />
            <span className="text-[9px] font-label whitespace-nowrap [writing-mode:vertical-lr] rotate-180 tracking-wider">Inspector</span>
          </div>
        </button>
      </div>
    );
  }

  // ── Empty state (expanded, nothing selected) ──
  if (!hasSelection) {
    return (
      <div className="w-64 flex-shrink-0 border-l border-secondary-100 bg-white flex flex-col">
        <div className="flex items-center justify-end p-2 border-b border-secondary-50">
          <button
            onClick={togglePanel}
            className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-50 cursor-pointer"
            title="Collapse panel"
            aria-label="Collapse inspector panel"
          >
            <i className="ri-layout-right-line text-sm" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center px-4">
            <i className="ri-cursor-line text-2xl text-foreground-200 mb-3 block" />
            <p className="text-xs text-foreground-400">Select a table or object to inspect</p>
            <p className="text-[10px] text-foreground-300 mt-1">Shift+click for multi-select</p>
          </div>
        </div>
      </div>
    );
  }

  // Table inspector
  if (selectedTable) {
    return (
      <div className="w-64 flex-shrink-0 border-l border-secondary-100 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-secondary-50">
          <h2 className="font-label text-xs font-semibold text-foreground-700 truncate">{selectedTable.name}</h2>
          <div className="flex items-center gap-1">
            {!isReadOnly && (
              <button onClick={() => onDeleteTable(selectedTable.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete"><i className="ri-delete-bin-line text-xs" /></button>
            )}
            <button onClick={togglePanel} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-50 cursor-pointer" title="Collapse panel"><i className="ri-layout-right-line text-sm" /></button>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-50 cursor-pointer"><i className="ri-close-line text-sm" /></button>
          </div>
        </div>

        {/* Table properties */}
        <div className="p-3 border-b border-secondary-50 space-y-2">
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Shape</span><span className="font-label text-foreground-700 capitalize">{selectedTable.shape.replace('_', ' ')}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Capacity</span><span className="font-label text-foreground-700">{selectedTable.capacity} seats</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Seated</span><span className={`font-label ${selectedTable.seated_count > selectedTable.capacity ? 'text-red-600' : selectedTable.seated_count >= selectedTable.capacity ? 'text-amber-600' : 'text-foreground-700'}`}>{selectedTable.seated_count} guests</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Position</span><span className="font-label text-foreground-700">{Math.round(selectedTable.position_x)}, {Math.round(selectedTable.position_y)}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Size</span><span className="font-label text-foreground-700">{Math.round(selectedTable.width)}×{Math.round(selectedTable.height)}</span></div>
          {!isReadOnly && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] text-foreground-500">Rotation</span><span className="text-[11px] font-label text-foreground-700">{selectedTable.rotation || 0}°</span></div>
                <div className="grid grid-cols-4 gap-1 mb-1.5">
                  {[0, 15, 45, 90, 135, 180, 270, 315].map((a) => (
                    <button key={a} onClick={() => onRotateTable(selectedTable.id, a)}
                      className={`px-1 py-0.5 rounded text-[9px] font-label border cursor-pointer whitespace-nowrap ${(selectedTable.rotation || 0) === a ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>{a}°</button>
                  ))}
                </div>
                <input type="range" min={0} max={359} value={selectedTable.rotation || 0} onChange={(e) => onRotateTable(selectedTable.id, Number(e.target.value))} className="w-full h-1.5 accent-primary-500 cursor-pointer" />
              </div>

              {/* Colour swatches */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground-500">Colour</span>
                <div className="flex gap-1">
                  {COLOURS.map((c) => (
                    <button key={c.value}
                      onClick={() => onUpdateTable(selectedTable.id, { colour: c.value } as Partial<TableWithData>)}
                      className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${selectedTable.colour === c.value ? 'border-foreground-700 scale-110 ring-1 ring-offset-1 ring-foreground-300' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.value}
                      aria-label={`Set colour to ${c.value}`}
                    />
                  ))}
                </div>
              </div>

              {/* Lock toggle */}
              <button onClick={() => onUpdateTable(selectedTable.id, { locked: !selectedTable.locked } as Partial<TableWithData>)}
                className={`w-full px-3 py-1.5 text-[11px] font-label rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${selectedTable.locked ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-secondary-200 text-foreground-600 hover:bg-background-50'}`}
                title={selectedTable.locked ? 'Unlock position' : 'Lock position'}
              >
                <i className={`${selectedTable.locked ? 'ri-lock-line' : 'ri-lock-unlock-line'} mr-1`} />{selectedTable.locked ? 'Unlock' : 'Lock'} position
              </button>
            </>
          )}
          <div className="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${selectedTable.seated_count > selectedTable.capacity ? 'bg-red-400' : selectedTable.seated_count / selectedTable.capacity > 0.75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, (selectedTable.seated_count / Math.max(1, selectedTable.capacity)) * 100)}%` }} />
          </div>
        </div>

        {/* Seated guests */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] text-foreground-400 uppercase tracking-wide px-2 mb-2">Seated guests ({selectedTable.assignments.length})</p>
          {selectedTable.assignments.length === 0 ? (
            <p className="text-[11px] text-foreground-400 text-center py-6">{isReadOnly ? 'No guests here' : 'Drag guests from the sidebar'}</p>
          ) : (
            <div className="space-y-0.5">
              {selectedTable.assignments.map((assign) => (
                <div key={assign.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-background-50 transition-colors group">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary-50 text-primary-600 text-[9px] font-label">{assign.seat_label || '—'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-label text-foreground-800 truncate">{assign.guests?.full_name || 'Unknown'}</p>
                    {assign.guests?.dietary_requirements && <p className="text-[9px] text-foreground-400 truncate">{assign.guests.dietary_requirements}</p>}
                  </div>
                  {!isReadOnly && (
                    <button onClick={() => onRemoveGuest(assign.id, assign.guest_id, assign.seating_seat_id || undefined)} className="w-4 h-4 flex items-center justify-center rounded text-foreground-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer" title="Remove guest">
                      <i className="ri-close-line text-[10px]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick assign from unseated */}
          {!isReadOnly && selectedTable.seated_count < selectedTable.capacity && (
            <div className="mt-3 pt-2 border-t border-secondary-50">
              <div className="relative mb-2">
                <i className="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-foreground-400 text-[10px]" />
                <input type="text" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Quick assign..." className="w-full pl-6 pr-2 py-1 rounded border border-secondary-200 text-[10px] focus:outline-none focus:border-primary-400" />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {unseatedGuests.filter((g) => !guestSearch || g.full_name.toLowerCase().includes(guestSearch.toLowerCase())).slice(0, 10).map((g) => (
                  <button key={g.id} onClick={() => onAssignGuestToSeat(g.id, selectedTable.id)}
                    className="w-full flex items-center gap-1.5 p-1.5 rounded text-left hover:bg-background-50 transition-colors cursor-pointer">
                    <span className="text-[10px] font-label text-foreground-700 truncate flex-1">{g.full_name}</span>
                    <i className="ri-add-line text-[10px] text-foreground-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Object inspector
  if (selectedObject) {
    return (
      <div className="w-64 flex-shrink-0 border-l border-secondary-100 bg-white flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-secondary-50">
          <h2 className="font-label text-xs font-semibold text-foreground-700 truncate">{selectedObject.name}</h2>
          <div className="flex items-center gap-1">
            {!isReadOnly && (
              <button onClick={() => onDeleteObject(selectedObject.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete"><i className="ri-delete-bin-line text-xs" /></button>
            )}
            <button onClick={togglePanel} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-50 cursor-pointer" title="Collapse panel"><i className="ri-layout-right-line text-sm" /></button>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-50 cursor-pointer"><i className="ri-close-line text-sm" /></button>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Type</span><span className="font-label text-foreground-700">{OBJECT_TYPE_LABELS[selectedObject.object_type] || selectedObject.object_type}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Position</span><span className="font-label text-foreground-700">{Math.round(selectedObject.x_position)}, {Math.round(selectedObject.y_position)}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Size</span><span className="font-label text-foreground-700">{Math.round(selectedObject.width)}×{Math.round(selectedObject.height)}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Rotation</span><span className="font-label text-foreground-700">{selectedObject.rotation || 0}°</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Opacity</span><span className="font-label text-foreground-700">{Math.round((selectedObject.opacity || 1) * 100)}%</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-foreground-500">Layer</span><span className="font-label text-foreground-700">{selectedObject.layer_order}</span></div>
          {selectedObject.notes && <div className="text-[10px] text-foreground-500 bg-background-50 rounded p-2">{selectedObject.notes}</div>}
          {!isReadOnly && (
            <button onClick={() => onDuplicateObject(selectedObject.id)}
              className="w-full px-3 py-1.5 text-[11px] font-label rounded-lg border border-secondary-200 text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
              title="Duplicate object">
              <i className="ri-file-copy-line mr-1" />Duplicate
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}