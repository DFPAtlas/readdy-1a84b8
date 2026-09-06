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
  showLayersPanel?: boolean;
  onToggleLayersPanel?: () => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
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
  showLayersPanel = false,
  onToggleLayersPanel,
  opacity,
  onOpacityChange,
}: ToolRailProps) {
  const hasSelection = selectedLayerId !== null;

  return (
    <div className="w-16 bg-white border-r border-[#eee7df] flex flex-col items-center py-4 flex-shrink-0">
      {/* Background picker */}
      {background && onBackgroundChange && (
        <div className="pb-3 mb-3 border-b border-[#eee7df] w-full flex justify-center">
          <BackgroundPicker background={background} onChange={onBackgroundChange} />
        </div>
      )}

      {/* Top actions */}
      <div className="flex flex-col items-center gap-2">
        {/* Layers panel toggle */}
        <button
          onClick={onToggleLayersPanel}
          className={[
            'w-10 h-10 flex items-center justify-center rounded-lg transition-colors cursor-pointer',
            showLayersPanel
              ? 'bg-[#fdf0f2] text-[#d9808d]'
              : 'text-foreground-500 hover:bg-background-100 hover:text-foreground-700',
          ].join(' ')}
          title={showLayersPanel ? 'Hide layers panel' : 'Show layers panel'}
          aria-label={showLayersPanel ? 'Hide layers panel' : 'Show layers panel'}
          aria-pressed={showLayersPanel}
        >
          <i className="ri-stack-line text-lg" />
        </button>

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

      {/* Opacity control — shown when a layer is selected */}
      {hasSelection && opacity !== undefined && onOpacityChange && (
        <div className="mt-3 pt-3 border-t border-[#eee7df] w-full flex flex-col items-center gap-1.5">
          <i
            className="ri-contrast-drop-2-line text-sm text-foreground-400"
            title="Opacity"
            aria-hidden="true"
          />
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="opacity-slider-vertical w-24 h-1.5 appearance-none bg-[#e8e0d5] rounded-full cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d9808d] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm"
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              height: '96px',
            }}
            aria-label="Layer opacity"
            aria-valuemin={10}
            aria-valuemax={100}
            aria-valuenow={Math.round(opacity * 100)}
            title={`${Math.round(opacity * 100)}%`}
          />
          <span className="text-[10px] font-label font-medium text-foreground-500 whitespace-nowrap">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}

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