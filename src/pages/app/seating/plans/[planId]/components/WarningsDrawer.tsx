import type { CanvasWarning } from '@/types/seating';

interface Props {
  warnings: CanvasWarning[];
  onClose: () => void;
  onFocusTable: (tableId: string) => void;
}

const WARNING_ICONS: Record<string, string> = {
  table_outside: 'ri-alert-line',
  table_overlap: 'ri-contrast-drop-line',
  seat_outside: 'ri-alert-line',
  over_capacity: 'ri-user-received-line',
  under_min: 'ri-user-unfollow-line',
  no_table_number: 'ri-hashtag',
  duplicate_number: 'ri-hashtag',
  accessible_route_blocked: 'ri-wheelchair-line',
  no_table_zone_overlap: 'ri-forbid-line',
  emergency_exit_blocked: 'ri-alarm-warning-line',
  floor_plan_not_calibrated: 'ri-ruler-line',
  occupied_seat_removed: 'ri-close-circle-line',
  locked_object_move: 'ri-lock-line',
};

export default function WarningsDrawer({ warnings, onClose, onFocusTable }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative w-full max-w-sm bg-white shadow-xl h-full flex flex-col z-10 animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-secondary-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-50 text-amber-600"><i className="ri-error-warning-line text-sm" /></div>
            <h2 className="font-heading text-sm text-foreground-900">Warnings ({warnings.length})</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {warnings.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-check-line text-2xl text-emerald-400 mb-2 block" />
              <p className="text-xs text-foreground-500">No warnings</p>
            </div>
          ) : (
            warnings.map((w) => (
              <div key={w.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                <i className={`${WARNING_ICONS[w.type] || 'ri-error-warning-line'} text-amber-500 text-sm mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground-800">{w.message}</p>
                  {w.tableId && (
                    <button onClick={() => onFocusTable(w.tableId!)} className="text-[10px] text-primary-600 font-label hover:underline mt-1 cursor-pointer whitespace-nowrap">
                      Select table
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}