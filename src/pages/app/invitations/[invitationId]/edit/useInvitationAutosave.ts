import { useState, useRef, useCallback, useEffect } from 'react';
import type { SaveState, InvitationDocument } from '../types';
import type { SaveResult } from '../persistenceService';
import { normalizeDocument } from './components/InvitationEditor';

// ── Revision tracking ──

interface RevisionState {
  currentRevision: number;
  lastSavedRevision: number;
  inFlightRevision: number | null;
}

// ── Snapshot captured at save time ──

interface SaveSnapshot {
  invitationId: string;
  revision: number;
  title: string;
  document: InvitationDocument;
}

// ── Hook options ──

export interface UseInvitationAutosaveOptions {
  invitationId: string | null;
  titleRef: React.MutableRefObject<string>;
  documentRef: React.MutableRefObject<InvitationDocument>;
  enabled: boolean;
  saveFn: (id: string, document: InvitationDocument, title: string) => Promise<SaveResult>;
}

// ── Hook result ──

export interface UseInvitationAutosaveResult {
  saveState: SaveState;
  markDirty: () => void;
  retry: () => void;
  manualSave: () => Promise<void>;
  isManualSaving: boolean;
}

// ── Constants ──

const DEBOUNCE_MS = 600;
const MAX_TITLE_LENGTH = 120;

// ── Helpers ──

function trimTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return 'Untitled Invitation';
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

function captureSnapshot(
  invitationId: string,
  revision: number,
  titleRef: React.MutableRefObject<string>,
  documentRef: React.MutableRefObject<InvitationDocument>,
): SaveSnapshot {
  return {
    invitationId,
    revision,
    title: trimTitle(titleRef.current),
    document: normalizeDocument(structuredClone(documentRef.current)),
  };
}

// ── Hook ──

export function useInvitationAutosave({
  invitationId,
  titleRef,
  documentRef,
  enabled,
  saveFn,
}: UseInvitationAutosaveOptions): UseInvitationAutosaveResult {
  // ── Save state ──
  const [saveState, setSaveState] = useState<SaveState>(enabled ? 'saved' : 'saved');

  // ── Revision tracking ──
  const revisionRef = useRef<RevisionState>({
    currentRevision: 0,
    lastSavedRevision: 0,
    inFlightRevision: null,
  });

  // ── Timer refs ──
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Queue ──
  const queuedSaveRef = useRef(false);
  const savingRef = useRef(false);
  const manualSavePromiseRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  // ── Generation guard — prevents stale completions after route change ──
  const generationRef = useRef(0);

  // ── Mount guard — prevents state updates after unmount ──
  const mountedRef = useRef(true);

  // ── isManualSaving for button state ──
  const [isManualSaving, setIsManualSaving] = useState(false);

  // ── Build a safe save-state setter that respects mount + generation ──
  const guardedSetSaveState = useCallback(
    (state: SaveState, gen: number) => {
      if (!mountedRef.current) return;
      if (gen !== generationRef.current) return;
      setSaveState(state);
    },
    [],
  );

  // ── Clear all timers ──

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // ── Perform the actual save ──

  const performSave = useCallback(
    async (snapshot: SaveSnapshot, gen: number) => {
      if (savingRef.current) return; // Should not happen, but guard

      savingRef.current = true;
      revisionRef.current.inFlightRevision = snapshot.revision;

      guardedSetSaveState('saving', gen);

      const result = await saveFn(snapshot.invitationId, snapshot.document, snapshot.title);

      // Check generation — ignore stale completions
      if (gen !== generationRef.current) {
        savingRef.current = false;
        revisionRef.current.inFlightRevision = null;
        return;
      }

      savingRef.current = false;
      revisionRef.current.inFlightRevision = null;

      const rev = revisionRef.current;

      if (result.success) {
        // Only mark saved if no newer revision exists
        if (snapshot.revision >= rev.currentRevision) {
          rev.lastSavedRevision = snapshot.revision;
          guardedSetSaveState('saved', gen);

          // Resolve manual save promise
          if (manualSavePromiseRef.current) {
            manualSavePromiseRef.current.resolve();
            manualSavePromiseRef.current = null;
            if (mountedRef.current) setIsManualSaving(false);
          }
        } else {
          // Stale success — newer changes exist
          // Remain in saving/unsaved and queue the latest
          guardedSetSaveState('saving', gen);
          queuedSaveRef.current = true;
        }

        // Check if a queued save is needed
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          const latestRev = rev.currentRevision;
          if (latestRev > snapshot.revision && invitationId) {
            const newSnapshot = captureSnapshot(invitationId, latestRev, titleRef, documentRef);
            performSave(newSnapshot, gen);
          }
        }
      } else {
        // Failure
        rev.lastSavedRevision = Math.max(rev.lastSavedRevision, 0);

        // Reject manual save promise
        if (manualSavePromiseRef.current) {
          manualSavePromiseRef.current.reject(new Error(result.error || 'Save failed'));
          manualSavePromiseRef.current = null;
          if (mountedRef.current) setIsManualSaving(false);
        }

        // If there are newer edits waiting, remain unsaved/saving
        if (rev.currentRevision > snapshot.revision) {
          guardedSetSaveState('unsaved', gen);
          // The debounce will be restarted by the next markDirty call
          // or already scheduled
        } else {
          guardedSetSaveState('error', gen);
        }
      }
    },
    [saveFn, invitationId, titleRef, documentRef, guardedSetSaveState],
  );

  // ── Schedule a debounced save ──

  const scheduleDebouncedSave = useCallback(
    (gen: number) => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;

        if (gen !== generationRef.current) return;
        if (!invitationId) return;

        const rev = revisionRef.current;
        const snapshot = captureSnapshot(invitationId, rev.currentRevision, titleRef, documentRef);

        if (savingRef.current) {
          // Another save is in flight — queue
          queuedSaveRef.current = true;
          // Mark lastSavedRevision for the queued save
          return;
        }

        performSave(snapshot, gen);
      }, DEBOUNCE_MS);
    },
    [invitationId, titleRef, documentRef, performSave],
  );

  // ── markDirty — called on every committed persistent change ──

  const markDirty = useCallback(() => {
    if (!enabled || !invitationId) return;

    const gen = generationRef.current;
    const rev = revisionRef.current;
    rev.currentRevision += 1;

    // Transition: saved → unsaved, error → unsaved
    // If saving, stay in saving but the queue will handle it
    setSaveState((prev) => {
      if (prev === 'saved' || prev === 'error') return 'unsaved';
      return prev; // Keep 'saving' or 'unsaved'
    });

    scheduleDebouncedSave(gen);
  }, [enabled, invitationId, scheduleDebouncedSave]);

  // ── retry — save newest revision immediately ──

  const retry = useCallback(() => {
    if (!enabled || !invitationId) return;

    const gen = generationRef.current;

    // Clear pending debounce
    clearTimers();

    const rev = revisionRef.current;
    const snapshot = captureSnapshot(invitationId, rev.currentRevision, titleRef, documentRef);

    if (savingRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    performSave(snapshot, gen);
  }, [enabled, invitationId, titleRef, documentRef, performSave, clearTimers]);

  // ── manualSave — flushes immediately, joins queue ──

  const manualSave = useCallback(async () => {
    if (!enabled || !invitationId) {
      throw new Error('Cannot save: editor not ready');
    }

    const gen = generationRef.current;

    // Cancel pending debounce
    clearTimers();

    const rev = revisionRef.current;
    const snapshot = captureSnapshot(invitationId, rev.currentRevision, titleRef, documentRef);

    return new Promise<void>((resolve, reject) => {
      manualSavePromiseRef.current = { resolve, reject };
      if (mountedRef.current) setIsManualSaving(true);

      if (savingRef.current) {
        // Join existing queue
        queuedSaveRef.current = true;
        return;
      }

      performSave(snapshot, gen);
    });
  }, [enabled, invitationId, titleRef, documentRef, performSave, clearTimers]);

  // ── Initialize revision state when invitation loads ──

  useEffect(() => {
    if (!invitationId || !enabled) return;

    // Bump generation to invalidate any in-flight from previous invitation
    generationRef.current += 1;
    const gen = generationRef.current;

    // Reset revisions
    revisionRef.current = {
      currentRevision: 0,
      lastSavedRevision: 0,
      inFlightRevision: null,
    };

    // Clear any pending timers from previous invitation
    clearTimers();
    queuedSaveRef.current = false;

    if (manualSavePromiseRef.current) {
      manualSavePromiseRef.current.reject(new Error('Route changed'));
      manualSavePromiseRef.current = null;
      if (mountedRef.current) setIsManualSaving(false);
    }

    guardedSetSaveState('saved', gen);
  }, [invitationId, enabled, clearTimers, guardedSetSaveState]);

  // ── beforeunload — warn only when genuinely unsaved ──

  useEffect(() => {
    if (!enabled || !invitationId) return;

    const handler = (e: BeforeUnloadEvent) => {
      const rev = revisionRef.current;
      const isDirty = rev.currentRevision !== rev.lastSavedRevision ||
        savingRef.current;

      if (!isDirty || !mountedRef.current) return;

      e.preventDefault();
      // Modern browsers ignore custom text but require returnValue
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [invitationId, enabled]);

  // ── Cleanup on unmount ──

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      if (manualSavePromiseRef.current) {
        manualSavePromiseRef.current.reject(new Error('Unmounted'));
        manualSavePromiseRef.current = null;
      }
    };
  }, [clearTimers]);

  return {
    saveState,
    markDirty,
    retry,
    manualSave,
    isManualSaving,
  };
}