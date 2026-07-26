import React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { SeatingPlan, UndoEntry, CanvasWarning } from '@/types/seating';
import { PLAN_STATUS_LABELS, PLAN_STATUS_COLOURS, EVENT_TYPE_LABELS } from '@/types/seating';
import ToolbarHoverTooltip from './ToolbarHoverTooltip';

interface ToolbarProps {
  plan: SeatingPlan; planId: string; weddingId: string;
  saveStatus: 'saved' | 'unsaved' | 'saving' | 'failed'; saving: boolean; isReadOnly: boolean;
  zoom: number; showGrid: boolean; snapEnabled: boolean; showGuides: boolean;
  undoStack: UndoEntry[]; redoStack: UndoEntry[];
  canvasWarnings: CanvasWarning[];
  selectedCount: number; allTableCount: number;
  isDemo?: boolean;
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

function MaybeTooltip({ isDemo, children, ...tooltip }: { isDemo?: boolean; children: React.ReactNode } & Omit<React.ComponentProps<typeof ToolbarHoverTooltip>, 'children'>) {
  if (!isDemo) return <>{children}</>;
  return <ToolbarHoverTooltip {...tooltip}>{children}</ToolbarHoverTooltip>;
}

export default function Toolbar({
  plan, planId, saveStatus, isReadOnly, zoom, showGrid, snapEnabled, showGuides,
  undoStack, redoStack, canvasWarnings, selectedCount, allTableCount,
  isDemo,
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
        <MaybeTooltip isDemo={isDemo} title="Undo" description="Revert your last action — move a table back, restore a deleted item, or undo a seating change." shortcut="Ctrl+Z" icon="ri-arrow-go-back-line">
          <button onClick={onUndo} disabled={undoStack.length === 0 || isReadOnly} className={btnClass} title="Undo (Ctrl+Z)"><i className="ri-arrow-go-back-line" style={{ fontSize: '14px' }} /></button>
        </MaybeTooltip>
        <MaybeTooltip isDemo={isDemo} title="Redo" description="Restore an action you just undid — bring back that move or change you reverted." shortcut="Ctrl+Shift+Z" icon="ri-arrow-go-forward-line">
          <button onClick={onRedo} disabled={redoStack.length === 0 || isReadOnly} className={btnClass} title="Redo (Ctrl+Shift+Z)"><i className="ri-arrow-go-forward-line" style={{ fontSize: '14px' }} /></button>
        </MaybeTooltip>
        <div className="w-px h-5 bg-secondary-200 mx-0.5" />

        {/* Zoom */}
        <MaybeTooltip isDemo={isDemo} title="Zoom out" description="Pull back to see more of the floor plan at once." icon="ri-zoom-out-line">
          <button onClick={onZoomOut} className={btnClass} title="Zoom out"><i className="ri-zoom-out-line" style={{ fontSize: '14px' }} /></button>
        </MaybeTooltip>
        <MaybeTooltip isDemo={isDemo} title="Zoom level" description="Current zoom percentage. Click to reset to the default view." icon="ri-contrast-line">
          <button onClick={onZoomReset} className="text-[11px] font-label text-foreground-600 px-1.5 min-w-[44px] text-center cursor-pointer hover:bg-background-100 rounded whitespace-nowrap h-7 flex items-center" title="Reset zoom">{Math.round(zoom * 100)}%</button>
        </MaybeTooltip>
        <MaybeTooltip isDemo={isDemo} title="Zoom in" description="Get closer to fine-tune table positions and seat assignments." icon="ri-zoom-in-line">
          <button onClick={onZoomIn} className={btnClass} title="Zoom in"><i className="ri-zoom-in-line" style={{ fontSize: '14px' }} /></button>
        </MaybeTooltip>
        <MaybeTooltip isDemo={isDemo} title="Fit to view" description="Automatically adjust zoom and pan so the entire room fits in your viewport." icon="ri-aspect-ratio-line">
          <button onClick={() => onFit(plan.canvas_width || 1200, plan.canvas_height || 900)} className={btnClass} title="Fit room"><i className="ri-aspect-ratio-line" style={{ fontSize: '14px' }} /></button>
        </MaybeTooltip>
        <div className="w-px h-5 bg-secondary-200 mx-0.5 hidden lg:block" />

        {/* Toggles — collapse at md breakpoint */}
        <div className="hidden lg:flex items-center gap-0.5">
          <MaybeTooltip isDemo={isDemo} title="Grid overlay" description="Show or hide the alignment grid. Helps you position tables and objects precisely on the floor plan." icon="ri-grid-line">
            <button onClick={onToggleGrid} className={showGrid ? activeBtn : btnClass} title="Toggle grid"><i className="ri-grid-line" style={{ fontSize: '14px' }} /></button>
          </MaybeTooltip>
          <MaybeTooltip isDemo={isDemo} title="Snap to grid" description="When enabled, tables and objects lock to the nearest grid line as you drag them — perfect for keeping everything aligned." icon="ri-links-line">
            <button onClick={onToggleSnap} className={snapEnabled ? activeBtn : btnClass} title="Toggle snap"><i className="ri-links-line" style={{ fontSize: '14px' }} /></button>
          </MaybeTooltip>
          <MaybeTooltip isDemo={isDemo} title="Alignment guides" description="Smart magenta lines appear when you drag elements near others — helps you align edges and centres perfectly." icon="ri-ruler-line">
            <button onClick={onToggleGuides} className={showGuides ? activeBtn : btnClass} title="Toggle guides"><i className="ri-ruler-line" style={{ fontSize: '14px' }} /></button>
          </MaybeTooltip>
          <div className="w-px h-5 bg-secondary-200 mx-0.5" />
        </div>

        {/* Add buttons */}
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <MaybeTooltip isDemo={isDemo} title="Add guest table" description="Place a new dining table on the floor plan. Choose the shape, capacity, and colour — then drag it into position." icon="ri-add-line">
              <button onClick={onAddTable} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-[11px] font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap h-7 flex items-center" title="Add table">
                <i className="ri-add-line mr-1" style={{ fontSize: '12px' }} />Table
              </button>
            </MaybeTooltip>
            <MaybeTooltip isDemo={isDemo} title="Add venue object" description="Place venue features like a stage, dance floor, bar, buffet, cake table, gift table, or photo booth on the floor plan." icon="ri-shape-line">
              <button onClick={onAddObject} className="hidden sm:flex px-3 py-1.5 border border-secondary-200 text-foreground-600 rounded-lg text-[11px] font-label hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap h-7 items-center" title="Add object">
                <i className="ri-shape-line mr-1" style={{ fontSize: '11px' }} />Object
              </button>
            </MaybeTooltip>
            <MaybeTooltip isDemo={isDemo} title="Floor plan background" description="Upload a venue layout image to use as a reference background — trace over it to build an accurate floor plan." icon="ri-image-line">
              <button onClick={onShowBackground} className={`${btnClass} hidden sm:flex`} title="Floor plan background"><i className="ri-image-line" style={{ fontSize: '14px' }} /></button>
            </MaybeTooltip>
          </div>
        )}

        {/* Warnings */}
        {canvasWarnings.length > 0 && (
          <MaybeTooltip isDemo={isDemo} title="Canvas warnings" description="View issues detected on your floor plan — overlapping tables, elements outside the room boundary, or over-capacity tables." icon="ri-error-warning-line">
            <button onClick={onShowWarnings} className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 cursor-pointer relative" title="Warnings">
              <i className="ri-error-warning-line" style={{ fontSize: '14px' }} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-label">{canvasWarnings.length}</span>
            </button>
          </MaybeTooltip>
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
        <MaybeTooltip isDemo={isDemo} title="Save status" description="All changes save automatically as you work — no need to manually save. This indicator shows the current sync state." icon="ri-check-line">
          <span className={`hidden sm:flex text-[11px] font-label items-center gap-1 whitespace-nowrap ${saveStatus === 'saved' ? 'text-emerald-600' : saveStatus === 'saving' ? 'text-amber-600' : saveStatus === 'unsaved' ? 'text-foreground-500' : 'text-red-600'}`}>
            <i className={`${saveStatus === 'saved' ? 'ri-check-line' : saveStatus === 'saving' ? 'ri-loader-4-line animate-spin' : saveStatus === 'unsaved' ? 'ri-circle-line' : 'ri-error-warning-line'}`} />
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving' : saveStatus === 'unsaved' ? 'Unsaved' : 'Failed'}
          </span>
        </MaybeTooltip>

        {!isReadOnly && (
          <MaybeTooltip isDemo={isDemo} title="Publish seating plan" description="Generate a shareable link so guests can look up their table assignments. You can also export table and place cards from the publishing panel." icon="ri-send-plane-line">
            <button onClick={() => onNavigate(`/app/seating/plans/${planId}/publish`)} className="px-3 py-1.5 bg-accent-500 text-white rounded-lg text-[11px] font-label font-semibold hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap h-7 flex items-center" title="Publish seating plan">
              <i className="ri-send-plane-line mr-1" style={{ fontSize: '12px' }} />Publish
            </button>
          </MaybeTooltip>
        )}

        {/* More dropdown */}
        <div ref={moreRef} className="relative">
          <MaybeTooltip isDemo={isDemo} title="More tools" description="Access additional features — guest groups, seating rules, conflict analysis, smart assistant, reports, exports, day mode, table cards, place cards, audit log, and settings." icon="ri-more-2-line">
            <button onClick={() => setMoreOpen((o) => !o)} className={btnClass} title="More options">
              <i className="ri-more-2-line" style={{ fontSize: '14px' }} />
            </button>
          </MaybeTooltip>
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