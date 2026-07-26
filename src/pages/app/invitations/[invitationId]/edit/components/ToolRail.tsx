import BackgroundPicker from './BackgroundPicker';
import type { CanvasBackground } from '../types';

interface ToolRailProps {
  selectedLayerId: string | null;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
  canBringForward?: boolean;
  canSendBackward?: boolean;
  background?: CanvasBackground;
  onBackgroundChange?: (bg: CanvasBackground) => void;
}

export default function ToolRail({
  selectedLayerId,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onDelete,
  canBringForward,
  canSendBackward,
  background,
  onBackgroundChange,
}: ToolRailProps) {
  const hasSelection = selectedLayerId !== null;

  return (
    <div className="w-16 bg-white border-r border-[#eee7df] flex flex-col items-center py-4 flex-shrink-0">
      {/* Background picker */}
      {background && onBackgroundChange && (
        <div className="pb-3 mb-3 border-b border-[#eee7df]">
          <BackgroundPicker background={background} onChange={onBackgroundChange} />
        </div>
      )}

      {/* Top actions */}
      <div className="flex flex-col items-center gap-2">
        {/* Duplicate */}
        <button
          onClick={onDuplicate}
          disabled={!hasSelection}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Duplicate"
          aria-label="Duplicate selected layer"
        >
          <i className="ri-file-copy-line text-lg" />
        </button>

        {/* Bring Forward */}
        <button
          onClick={onBringForward}
          disabled={canBringForward === false || !hasSelection}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title={canBringForward === false ? 'Already frontmost' : 'Bring Forward'}
          aria-label="Bring forward"
        >
          <i className="ri-bring-forward text-lg" />
        </button>

        {/* Send Backward */}
        <button
          onClick={onSendBackward}
          disabled={canSendBackward === false || !hasSelection}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title={canSendBackward === false ? 'Already backmost' : 'Send Backward'}
          aria-label="Send backward"
        >
          <i className="ri-send-backward text-lg" />
        </button>
      </div>

      {/* Spacer pushes Delete to bottom */}
      <div className="flex-1" />

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        title="Delete"
        aria-label="Delete selected layer"
      >
        <i className="ri-delete-bin-line text-lg" />
      </button>
    </div>
  );
}