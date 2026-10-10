import type * as React from "react";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SaveState } from '../types';

interface EditorTopbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onMobilePreview: () => void;
  onSaveDownload: () => void;
  onClearCanvas: () => void;
  invitationId?: string;
  isManualSaving?: boolean;
  exportState?: ExportState;
  exportError?: string | null;
  onRetryExport?: () => void;
  onDismissExportError?: () => void;
}

export type ExportState =
  | 'idle'
  | 'saving'
  | 'preparing'
  | 'downloading'
  | 'updating-thumbnail'
  | 'success'
  | 'partial-error'
  | 'error';

const EXPORT_LABELS: Record<ExportState, string> = {
  idle: '',
  saving: 'Saving…',
  preparing: 'Preparing image…',
  downloading: 'Downloading…',
  'updating-thumbnail': 'Updating preview…',
  success: '',
  'partial-error': '',
  error: '',
};

const SAVE_STATE_MAP: Record<SaveState, { label: string; className: string; showSpinner: boolean }> = {
  loading: { label: 'Loading…', className: 'text-foreground-400', showSpinner: true },
  saving: { label: 'Saving…', className: 'text-amber-600', showSpinner: true },
  saved: { label: 'All changes saved', className: 'text-accent-600', showSpinner: false },
  unsaved: { label: 'Unsaved changes', className: 'text-amber-600', showSpinner: false },
  error: { label: "Couldn't save", className: 'text-red-500', showSpinner: false },
};

export default function EditorTopbar({
  title,
  onTitleChange,
  saveState,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onMobilePreview,
  onSaveDownload,
  onClearCanvas,
  invitationId,
  isManualSaving,
  exportState = 'idle',
  exportError,
  onRetryExport,
  onDismissExportError,
}: EditorTopbarProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Show brief confirmation on success
  useEffect(() => {
    if (exportState === 'success') {
      setShowConfirm(true);
      const t = setTimeout(() => setShowConfirm(false), 2000);
      return () => clearTimeout(t);
    }
    setShowConfirm(false);
  }, [exportState]);

  const handleBlur = () => {
    setEditing(false);
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange(trimmed);
    } else if (!trimmed) {
      setDraftTitle(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setDraftTitle(title);
      setEditing(false);
    }
  };

  const handleBack = () => {
    const base = __BASE_PATH__ || '';
    navigate(`${base}/app/invitations`);
  };

  const status = SAVE_STATE_MAP[saveState] || SAVE_STATE_MAP.loading;
  const isExporting = exportState !== 'idle' && exportState !== 'success' && exportState !== 'partial-error' && exportState !== 'error';
  const exportLabel = EXPORT_LABELS[exportState];
  const isButtonBusy = isManualSaving || isExporting;

  return (
    <div className="h-[56px] bg-white border-b border-[#eee7df] flex items-center justify-between px-3 flex-shrink-0 relative z-20">
      {/* Left — back + title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer flex-shrink-0"
          title="Back to Invitations"
          aria-label="Back to Invitations"
        >
          <i className="ri-arrow-left-s-line text-xl" />
        </button>

        <div className="h-5 w-px bg-[#eee7df] flex-shrink-0" />

        {/* Editable title */}
        <div className="min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="text-sm font-label font-semibold text-foreground-900 bg-transparent border-none outline-none p-0 w-full min-w-[200px] placeholder:text-foreground-400"
              placeholder="Untitled Invitation"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-label font-semibold text-foreground-900 hover:text-primary-600 transition-colors cursor-pointer text-left whitespace-nowrap truncate max-w-[280px] block"
              title="Click to rename"
            >
              {draftTitle || 'Untitled Invitation'}
            </button>
          )}
          <p className={`text-[10px] font-label ${status.className}`} aria-live="polite" aria-atomic="true">
            {saveState === 'saving' && (
              <i className="ri-loader-4-line animate-spin mr-1" />
            )}
            {saveState === 'saved' && (
              <i className="ri-check-line mr-1" />
            )}
            {saveState === 'error' && (
              <i className="ri-error-warning-line mr-1" />
            )}
            {status.label}
          </p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <i className="ri-arrow-go-back-line text-base" />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <i className="ri-arrow-go-forward-line text-base" />
        </button>

        <div className="w-px h-5 bg-[#eee7df] mx-1" />

        {/* Clear canvas */}
        <button
          onClick={onClearCanvas}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
          title="Clear canvas"
          aria-label="Clear canvas"
        >
          <i className="ri-delete-bin-line text-base" />
        </button>

        {/* Mobile preview icon */}
        <button
          onClick={onMobilePreview}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
          title="Mobile preview"
          aria-label="Mobile preview"
        >
          <i className="ri-smartphone-line text-base" />
        </button>

        {/* Preview button */}
        <button
          onClick={onPreview}
          className="btn-ghost text-xs py-1.5 px-2.5 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-eye-line mr-1" />
          Preview
        </button>

        {/* Save & Download */}
        <button
          onClick={onSaveDownload}
          disabled={isButtonBusy}
          className="btn-primary text-xs py-1.5 px-3 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isButtonBusy ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-1" />
              {exportLabel || 'Saving…'}
            </>
          ) : showConfirm ? (
            <>
              <i className="ri-check-line mr-1" />
              Downloaded
            </>
          ) : (
            <>
              <i className="ri-download-line mr-1" />
              Save &amp; Download
            </>
          )}
        </button>
      </div>

      {/* Export error banner */}
      {exportState === 'error' && exportError && (
        <div className="absolute top-[56px] left-0 right-0 z-40 flex items-center justify-between bg-red-50/90 border-b border-red-200 px-4 py-2">
          <span className="text-xs text-red-600 flex items-center gap-1.5">
            <i className="ri-error-warning-line" />
            {exportError}
          </span>
          <div className="flex items-center gap-2">
            {onRetryExport && (
              <button
                onClick={onRetryExport}
                className="text-xs font-label text-red-700 underline cursor-pointer hover:text-red-800 whitespace-nowrap"
              >
                Retry
              </button>
            )}
            {onDismissExportError && (
              <button
                onClick={onDismissExportError}
                className="text-xs font-label text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Partial error banner */}
      {exportState === 'partial-error' && exportError && (
        <div className="absolute top-[56px] left-0 right-0 z-40 flex items-center justify-between bg-amber-50/90 border-b border-amber-200 px-4 py-2">
          <span className="text-xs text-amber-700 flex items-center gap-1.5">
            <i className="ri-alert-line" />
            {exportError}
          </span>
          <div className="flex items-center gap-2">
            {onRetryExport && (
              <button
                onClick={onRetryExport}
                className="text-xs font-label text-amber-700 underline cursor-pointer hover:text-amber-800 whitespace-nowrap"
              >
                Retry thumbnail
              </button>
            )}
            {onDismissExportError && (
              <button
                onClick={onDismissExportError}
                className="text-xs font-label text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}