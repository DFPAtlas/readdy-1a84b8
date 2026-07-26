import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInvitationAutosave } from '../useInvitationAutosave';
import type { InvitationDocument } from '../types';
import type { SaveResult } from '../persistenceService';

// ── Helpers ──

function makeDoc(layers = 0): InvitationDocument {
  const result: InvitationDocument = {
    canvas: { width: 560, height: 560 },
    layers: [],
  };
  for (let i = 0; i < layers; i++) {
    result.layers.push({
      id: `layer-${i}`,
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      rotation: 0,
      zIndex: i,
      props: {
        content: `Layer ${i}`,
        fontSize: 16,
        weight: 400,
        color: '#3a3430',
        align: 'center',
        letterSpacing: 0,
      },
    });
  }
  return result;
}

function makeRefs(doc: InvitationDocument, title = 'Test Invitation') {
  const docRef = { current: structuredClone(doc) };
  const titleRef = { current: title };
  return { docRef, titleRef };
}

function makeSuccessfulSave(delayMs = 0): ReturnType<typeof vi.fn> {
  return vi.fn(
    (_id: string, _doc: InvitationDocument, _title: string): Promise<SaveResult> =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ success: true }), delayMs),
      ),
  );
}

function makeFailingSave(delayMs = 0): ReturnType<typeof vi.fn> {
  return vi.fn(
    (_id: string, _doc: InvitationDocument, _title: string): Promise<SaveResult> =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'Network error' }), delayMs),
      ),
  );
}

// ── Setup ──

describe('useInvitationAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ────────────────────────────────────────────────────────
  // 600ms debounce
  // ────────────────────────────────────────────────────────

  it('does not save before 600ms debounce elapses', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // Initial state: saved (revision 0 == lastSavedRevision 0)
    expect(result.current.saveState).toBe('saved');

    // Mark dirty
    act(() => {
      result.current.markDirty();
    });
    expect(result.current.saveState).toBe('unsaved');

    // Advance less than 600ms — no save yet
    vi.advanceTimersByTime(300);
    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('unsaved');

    // Advance past 600ms
    vi.advanceTimersByTime(301);
    // Flush microtasks
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────
  // Timer reset after another commit
  // ────────────────────────────────────────────────────────

  it('resets the debounce timer when another change commits before 600ms', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });

    // Advance 400ms — not enough to fire
    vi.advanceTimersByTime(400);
    expect(saveFn).not.toHaveBeenCalled();

    // Another change resets the timer
    act(() => {
      result.current.markDirty();
    });

    // Another 400ms — still not 600ms since last change
    vi.advanceTimersByTime(400);
    expect(saveFn).not.toHaveBeenCalled();

    // Now 600ms since the second change
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────
  // One request after rapid edits
  // ────────────────────────────────────────────────────────

  it('coalesces multiple rapid edits into a single save request', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // Simulate 10 rapid edits
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.markDirty();
        vi.advanceTimersByTime(50);
      }
    });

    // 600ms after the last edit
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────
  // No overlapping writes
  // ────────────────────────────────────────────────────────

  it('does not fire overlapping Supabase update calls', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    // Slow save — takes 200ms
    const saveFn = makeSuccessfulSave(200);

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // First edit
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.advanceTimersByTimeAsync(0); // flush timer microtask

    // Second edit while first save is in flight
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);

    // Only the first save is in flight
    expect(saveFn).toHaveBeenCalledTimes(1);

    // Complete the first save
    await vi.advanceTimersByTimeAsync(200);

    // Now the queued save should fire
    await vi.advanceTimersByTimeAsync(200);

    // Should be 2 calls total (first save + queued follow-up)
    expect(saveFn).toHaveBeenCalledTimes(2);
  });

  // ────────────────────────────────────────────────────────
  // Stale success doesn't show saved
  // ────────────────────────────────────────────────────────

  it('does not show saved when a stale request completes but newer edits exist', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    // Slow save to create race condition
    let resolveFirst: (v: SaveResult) => void;
    const saveFn = vi.fn(
      (_id: string, _doc: InvitationDocument, _title: string): Promise<SaveResult> =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // Start first save
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.advanceTimersByTimeAsync(0);

    expect(saveFn).toHaveBeenCalledTimes(1);

    // Edit happens while save is in flight
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    // This queues a second save

    // First save completes — stale
    resolveFirst!({ success: true });
    await vi.advanceTimersByTimeAsync(0);

    // Should NOT show 'saved' — newer edits exist
    // It should either be 'saving' (queued) or 'unsaved'
    expect(result.current.saveState).not.toBe('saved');
  });

  // ────────────────────────────────────────────────────────
  // Failure preserves state
  // ────────────────────────────────────────────────────────

  it('shows error on save failure and preserves document', async () => {
    const doc = makeDoc(2);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeFailingSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe('error');

    // Document should still be intact
    expect(docRef.current.layers).toHaveLength(2);
  });

  // ────────────────────────────────────────────────────────
  // Retry saves newest revision
  // ────────────────────────────────────────────────────────

  it('retry saves the newest revision after a failure', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // First save fails
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);

    // Click retry
    act(() => {
      result.current.retry();
    });
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(2);
  });

  // ────────────────────────────────────────────────────────
  // Route change ignores old completion
  // ────────────────────────────────────────────────────────

  it('ignores save completions after route change', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    let resolveDelayed: (v: SaveResult) => void;
    const saveFn = vi.fn(
      (_id: string, _doc: InvitationDocument, _title: string): Promise<SaveResult> =>
        new Promise((resolve) => {
          resolveDelayed = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ invitationId }) =>
        useInvitationAutosave({
          invitationId,
          titleRef,
          documentRef: docRef,
          enabled: true,
          saveFn,
        }),
      { initialProps: { invitationId: 'inv-1' } },
    );

    // Start a save for invitation-1
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.advanceTimersByTimeAsync(0);

    expect(saveFn).toHaveBeenCalledTimes(1);

    // Switch to invitation-2 while save is in flight
    rerender({ invitationId: 'inv-2' });

    // Complete the stale save
    resolveDelayed!({ success: true });
    await vi.advanceTimersByTimeAsync(0);

    // Should be back to 'saved' for the new invitation (no dirty edits yet)
    expect(result.current.saveState).toBe('saved');
  });

  // ────────────────────────────────────────────────────────
  // Unmount clears timers
  // ────────────────────────────────────────────────────────

  it('clears debounce timer on unmount', () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result, unmount } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });

    // Unmount before timer fires
    unmount();

    // Advance well past debounce — save should not fire
    vi.advanceTimersByTime(5000);

    expect(saveFn).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────
  // Manual save flushes immediately
  // ────────────────────────────────────────────────────────

  it('manual save flushes immediately without waiting for debounce', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });

    // Call manual save immediately — don't wait for debounce
    await act(async () => {
      await result.current.manualSave();
    });
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────
  // beforeunload attaches only while dirty
  // ────────────────────────────────────────────────────────

  it('beforeunload prevents close only when unsaved changes exist', () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { result, unmount } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // Handler registered on mount
    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    // Mark dirty
    act(() => {
      result.current.markDirty();
    });

    // Trigger beforeunload manually
    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'beforeunload',
    )?.[1] as ((e: BeforeUnloadEvent) => void) | undefined;

    if (handler) {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'returnValue', {
        value: '',
        writable: true,
      });
      handler(event);
      // With dirty state, preventDefault should have been called
      expect(event.preventDefault).toHaveBeenCalled();
    }

    // Cleanup removes listener
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  // ────────────────────────────────────────────────────────
  // New edit after failure recovers via debounce
  // ────────────────────────────────────────────────────────

  it('recovers from error state when a new edit commits', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeFailingSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // Fail the first save
    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(result.current.saveState).toBe('error');

    // New edit — should become 'unsaved' and start a fresh debounce
    act(() => {
      result.current.markDirty();
    });
    expect(result.current.saveState).toBe('unsaved');
  });

  // ────────────────────────────────────────────────────────
  // Title change triggers markDirty
  // ────────────────────────────────────────────────────────

  it('title change marks dirty and schedules save', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    // Change title via ref (simulating handleTitleChange)
    act(() => {
      titleRef.current = 'New Wedding Title';
      result.current.markDirty();
    });

    expect(result.current.saveState).toBe('unsaved');

    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledTimes(1);
    // Verify title was captured
    expect(saveFn).toHaveBeenCalledWith(
      'inv-1',
      expect.any(Object),
      'New Wedding Title',
    );
  });

  // ────────────────────────────────────────────────────────
  // Disabled autosave does nothing
  // ────────────────────────────────────────────────────────

  it('does not save when enabled is false', () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: false,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });

    vi.advanceTimersByTime(600);

    expect(saveFn).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────
  // Empty title becomes "Untitled Invitation"
  // ────────────────────────────────────────────────────────

  it('sends "Untitled Invitation" when title is empty', async () => {
    const doc = makeDoc(1);
    const { docRef, titleRef } = makeRefs(doc, '');
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(saveFn).toHaveBeenCalledWith(
      'inv-1',
      expect.any(Object),
      'Untitled Invitation',
    );
  });

  // ────────────────────────────────────────────────────────
  // Document is normalized before save
  // ────────────────────────────────────────────────────────

  it('normalizes document zIndex before saving', async () => {
    // Create a doc with non-normalized z-indices
    const doc: InvitationDocument = {
      canvas: { width: 560, height: 560 },
      layers: [
        {
          id: 'a',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          rotation: 0,
          zIndex: 5,
          props: { content: 'A', fontSize: 16, weight: 400, color: '#000', align: 'center', letterSpacing: 0 },
        },
        {
          id: 'b',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          rotation: 0,
          zIndex: 2,
          props: { content: 'B', fontSize: 16, weight: 400, color: '#000', align: 'center', letterSpacing: 0 },
        },
      ],
    };
    const { docRef, titleRef } = makeRefs(doc);
    const saveFn = makeSuccessfulSave();

    const { result } = renderHook(() =>
      useInvitationAutosave({
        invitationId: 'inv-1',
        titleRef,
        documentRef: docRef,
        enabled: true,
        saveFn,
      }),
    );

    act(() => {
      result.current.markDirty();
    });
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    const savedDoc = saveFn.mock.calls[0][1] as InvitationDocument;
    // After normalization, z-indices should be 0 and 1 (sorted)
    expect(savedDoc.layers[0].zIndex).toBe(0);
    expect(savedDoc.layers[1].zIndex).toBe(1);
    // Layer 'b' (zIndex 2 originally) should come first after sort
    expect(savedDoc.layers[0].id).toBe('b');
    expect(savedDoc.layers[1].id).toBe('a');
  });
});