import { useState, useRef, useEffect } from 'react';
import type { SeatingPlan, UndoEntry, CanvasWarning } from '@/types/seating';
import { PLAN_STATUS_LABELS, PLAN_STATUS_COLOURS, EVENT_TYPE_LABELS } from '@/types/seating';

interface ToolbarProps {
  plan: SeatingPlan; planId: string; weddingId: string;
  saveStatus: 'saved' | 'unsaved' | 'saving' | 'failed'; saving: boolean; isReadOnly: boolean;
  zoom: number; showGrid: boolean; snapEnabled: boolean; showGuides: boolean;
  undoStack: UndoEntry[]; redoStack: UndoEntry[];
  canvasWarnings: CanvasWarning[];
  selectedCount: number; allTableCount: number;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onZoomIn: () => void; onZoomOut: () => void; onZoomReset: () => void;
  onFit: (w: number, h: number) => void;
  onToggleGrid: () => void; onToggleSnap: () => void; onToggleGuides: () => void;
  onShowWarnings: () => void; onShowRoomSettings: () => void; onShowBackground: () => void;
  onUndo: () => void; onRedo: () => void;
  onAddTable: () => void; onAddObject: () => void;
  onSaveNow: () => void; onDeleteSelected: () => void;
}

export default function Toolbar({
  plan, planId, saveStatus, isReadOnly, zoom, showGrid, snapEnabled, showGuides,
  undoStack, redoStack, canvasWarnings, selectedCount, allTableCount,
  onBack, onNavigate, onZoomIn, onZoomOut, onZoomReset, onFit,
  onToggleGrid, onToggleSnap, onToggleGuides, onShowWarnings, onShowRoomSettings, onShowBackground,
  onUndo, onRedo, onAddTable, onAddObject, onSaveNow, onDeleteSelected,
}: ToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const btnClass = 'w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';
  const activeBtn = 'w-7 h-7 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer';

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); };
    if (moreOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [moreOpen]);

  const moreItems = [
    { path: 'groups', label: 'Guest groups', icon: 'ri-team-line' },
    { path: 'rules', label: 'Seating rules', icon: 'ri-file-list-3-line' },
    { path: 'conflicts', label: 'Conflict analysis', icon: 'ri-error-warning-line' },
    { path: 'assistant', label: 'Smart assistant', icon: 'ri-magic-line' },
    { path: 'reports', label: 'Reports', icon: 'ri-file-chart-line' },
    { path: 'exports', label: 'Exports', icon: 'ri-download-2-line' },
    { path: 'day-mode', label: 'Day mode', icon: 'ri-sun-line' },
    { path: 'table-cards', label: 'Table cards', icon: 'ri-file-list-3-line' },
    { path: 'place-cards', label: 'Place cards', icon: 'ri-price-tag-3-line' },
    { path: 'audit', label: 'Audit', icon: 'ri-shield-check-line' },
    { path: 'settings', label: 'Settings', icon: 'ri-tools-line' },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-secondary-100 flex-shrink-0 h-12">
      {/* Left: back + plan info */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <button onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer" title="Back to plans"><i className="ri-arrow-left-line text-sm" /></button>
        <div className="min-w-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-sm text-foreground-900 truncate max-w-[180px]">{plan.name}</h1>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-label font-semibold flex-shrink-0 ${PLAN_STATUS_COLOURS[plan.status]}`}>{PLAN_STATUS_LABELS[plan.status]}</span>
          </div>
        </div>
      </div>

      {/* Centre: tools */}
      <div className="flex items-center gap-0.5 flex-1 justify-center min-w-0">
        {/* Undo/redo */}
        <button onClick={onUndo} disabled={undoStack.length === 0 || isReadOnly} className={btnClass} title="Undo (Ctrl+Z)"><i className="ri-arrow-go-back-line" style={{ fontSize: '14px' }} /></button>
        <button onClick={onRedo} disabled={redoStack.length === 0 || isReadOnly} className={btnClass} title="Redo (Ctrl+Shift+Z)"><i className="ri-arrow-go-forward-line" style={{ fontSize: '14px' }} /></button>
        <div className="w-px h-5 bg-secondary-200 mx-0.5" />

        {/* Zoom */}
        <button onClick={onZoomOut} className={btnClass} title="Zoom out"><i className="ri-zoom-out-line" style={{ fontSize: '14px' }} /></button>
        <button onClick={onZoomReset} className="text-[11px] font-label text-foreground-600 px-1.5 min-w-[44px] text-center cursor-pointer hover:bg-background-100 rounded whitespace-nowrap h-7 flex items-center" title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <button onClick={onZoomIn} className={btnClass} title="Zoom in"><i className="ri-zoom-in-line" style={{ fontSize: '14px' }} /></button>
        <button onClick={() => onFit(plan.canvas_width || 1200, plan.canvas_height || 900)} className={btnClass} title="Fit room"><i className="ri-aspect-ratio-line" style={{ fontSize: '14px' }} /></button>
        <div className="w-px h-5 bg-secondary-200 mx-0.5 hidden lg:block" />

        {/* Toggles — collapse at md breakpoint */}
        <div className="hidden lg:flex items-center gap-0.5">
          <button onClick={onToggleGrid} className={showGrid ? activeBtn : btnClass} title="Toggle grid"><i className="ri-grid-line" style={{ fontSize: '14px' }} /></button>
          <button onClick={onToggleSnap} className={snapEnabled ? activeBtn : btnClass} title="Toggle snap"><i className="ri-links-line" style={{ fontSize: '14px' }} /></button>
          <button onClick={onToggleGuides} className={showGuides ? activeBtn : btnClass} title="Toggle guides"><i className="ri-ruler-line" style={{ fontSize: '14px' }} /></button>
          <div className="w-px h-5 bg-secondary-200 mx-0.5" />
        </div>

        {/* Add buttons */}
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <button onClick={onAddTable} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-[11px] font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap h-7 flex items-center" title="Add table">
              <i className="ri-add-line mr-1" style={{ fontSize: '12px' }} />Table
            </button>
            <button onClick={onAddObject} className="hidden sm:flex px-3 py-1.5 border border-secondary-200 text-foreground-600 rounded-lg text-[11px] font-label hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap h-7 items-center" title="Add object">
              <i className="ri-shape-line mr-1" style={{ fontSize: '11px' }} />Object
            </button>
            <button onClick={onShowBackground} className={`${btnClass} hidden sm:flex`} title="Floor plan background"><i className="ri-image-line" style={{ fontSize: '14px' }} /></button>
          </div>
        )}

        {/* Warnings */}
        {canvasWarnings.length > 0 && (
          <button onClick={onShowWarnings} className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 cursor-pointer relative" title="Warnings">
            <i className="ri-error-warning-line" style={{ fontSize: '14px' }} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-label">{canvasWarnings.length}</span>
          </button>
        )}

        {/* Multi-select delete */}
        {selectedCount > 1 && (
          <button onClick={onDeleteSelected} className="px-2 py-1.5 text-[11px] text-red-600 font-label hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-delete-bin-line mr-1" />Delete {selectedCount}
          </button>
        )}
      </div>

      {/* Right: save, publish, more */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`hidden sm:flex text-[11px] font-label items-center gap-1 whitespace-nowrap ${saveStatus === 'saved' ? 'text-emerald-600' : saveStatus === 'saving' ? 'text-amber-600' : saveStatus === 'unsaved' ? 'text-foreground-500' : 'text-red-600'}`}>
          <i className={`${saveStatus === 'saved' ? 'ri-check-line' : saveStatus === 'saving' ? 'ri-loader-4-line animate-spin' : saveStatus === 'unsaved' ? 'ri-circle-line' : 'ri-error-warning-line'}`} />
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'unsaved' ? 'Unsaved' : 'Failed'}
        </span>

        {!isReadOnly && (
          <button onClick={() => onNavigate(`/app/seating/plans/${planId}/publish`)} className="px-3 py-1.5 bg-accent-500 text-white rounded-lg text-[11px] font-label font-semibold hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap h-7 flex items-center" title="Publish seating plan">
            <i className="ri-send-plane-line mr-1" style={{ fontSize: '12px' }} />Publish
          </button>
        )}

        {/* More dropdown */}
        <div ref={moreRef} className="relative">
          <button onClick={() => setMoreOpen((o) => !o)} className={btnClass} title="More options">
            <i className="ri-more-2-line" style={{ fontSize: '14px' }} />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-secondary-200 py-1 w-52 z-50">
              {moreItems.map((item) => (
                <button key={item.path}
                  onClick={() => { setMoreOpen(false); onNavigate(`/app/seating/plans/${planId}/${item.path}`); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground-600 hover:bg-background-50 hover:text-foreground-900 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className={`${item.icon} text-sm text-foreground-400`} />
                  <span className="font-label">{item.label}</span>
                </button>
              ))}
              <div className="border-t border-secondary-100 mt-1 pt-1">
                <button
                  onClick={() => { setMoreOpen(false); onShowRoomSettings(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-settings-3-line text-sm text-foreground-400" />
                  <span className="font-label">Room settings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}