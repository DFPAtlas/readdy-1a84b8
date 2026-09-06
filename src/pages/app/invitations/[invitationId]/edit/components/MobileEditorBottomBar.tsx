import type { SaveState } from '../types';

interface MobileEditorBottomBarProps {
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  canBringForward?: boolean;
  canSendBackward?: boolean;
  onOpenAssets: () => void;
  onOpenLayers: () => void;
  onOpenSend: () => void;
  onOpenPreview: () => void;
  layerCount: number;
}

const SAVE_STATE_MAP: Record<SaveState, { label: string; showDot: boolean; dotClass: string }> = {
  loading: { label: '…', showDot: true, dotClass: 'bg-foreground-300' },
  saving: { label: 'Saving', showDot: true, dotClass: 'bg-amber-400 animate-pulse' },
  saved: { label: 'Saved', showDot: true, dotClass: 'bg-accent-400' },
  unsaved: { label: 'Unsaved', showDot: true, dotClass: 'bg-amber-400' },
  error: { label: 'Error', showDot: true, dotClass: 'bg-red-400' },
};

export default function MobileEditorBottomBar({
  saveState,
  canUndo,
  canRedo,
  hasSelection,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  canBringForward,
  canSendBackward,
  onOpenAssets,
  onOpenLayers,
  onOpenSend,
  onOpenPreview,
  layerCount,
}: MobileEditorBottomBarProps) {
  const status = SAVE_STATE_MAP[saveState] || SAVE_STATE_MAP.loading;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-secondary-200 shadow-lg safe-area-bottom">
      {/* Save status strip */}
      <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-background-50 border-b border-secondary-100">
        {status.showDot && (
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dotClass}`} />
        )}
        <span className="text-[10px] font-label text-foreground-500">{status.label}</span>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between px-2 py-1.5">
        {/* Left: undo/redo + layer actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Undo"
            title="Undo"
          >
            <i className="ri-arrow-go-back-line text-lg" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Redo"
            title="Redo"
          >
            <i className="ri-arrow-go-forward-line text-lg" />
          </button>

          <div className="w-px h-5 bg-secondary-200 mx-1" />

          <button
            onClick={onDuplicate}
            disabled={!hasSelection}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Duplicate"
            title="Duplicate"
          >
            <i className="ri-file-copy-line text-lg" />
          </button>
          <button
            onClick={onBringForward}
            disabled={!canBringForward || !hasSelection}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Bring forward"
            title="Bring forward"
          >
            <i className="ri-bring-forward text-lg" />
          </button>
          <button
            onClick={onSendBackward}
            disabled={!canSendBackward || !hasSelection}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Send backward"
            title="Send backward"
          >
            <i className="ri-send-backward text-lg" />
          </button>
          <button
            onClick={onDelete}
            disabled={!hasSelection}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Delete"
            title="Delete"
          >
            <i className="ri-delete-bin-line text-lg" />
          </button>
        </div>

        {/* Right: panels + preview */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onOpenAssets}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
            aria-label="Open asset library"
          >
            <i className="ri-image-line text-base" />
            <span className="text-[10px] font-label font-medium">Assets</span>
          </button>
          <button
            onClick={onOpenLayers}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer relative"
            aria-label="Open layers panel"
          >
            <i className="ri-stack-line text-base" />
            <span className="text-[10px] font-label font-medium">Layers</span>
            {layerCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[9px] font-label font-bold">{layerCount}</span>
            )}
          </button>
          <div className="w-px h-5 bg-secondary-200 mx-0.5" />
          <button
            onClick={onOpenPreview}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
            aria-label="Preview"
            title="Preview"
          >
            <i className="ri-eye-line text-lg" />
          </button>
          <button
            onClick={onOpenSend}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer"
            aria-label="Send invitation"
          >
            <i className="ri-send-plane-line text-sm" />
            <span className="text-[10px] font-label font-semibold">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}