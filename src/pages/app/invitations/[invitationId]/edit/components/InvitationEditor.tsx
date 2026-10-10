import { isDemoMode } from '@/demo/demoConfig';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import LayersPanel from './LayersPanel';
import EditorTopbar from './EditorTopbar';
import type { ExportState } from './EditorTopbar';
import AssetLibrary from './AssetLibrary';
import ToolRail from './ToolRail';
import CanvasWorkspace from './CanvasWorkspace';
import SendPanel from './SendPanel';
import PreviewModal from './PreviewModal';
import InvitationRenderer from './InvitationRenderer';
import MobileEditorBottomBar from './MobileEditorBottomBar';
import ResponsiveSheet from '@/components/base/ResponsiveSheet';
import type {
  InvitationDocument,
  InvitationLayer,
  DocumentHistory,
  SaveState,
  InteractionCommitFn,
  PropertyCommitFn,
  CanvasBackground,
} from '../types';
import type { SendFormState, SubmissionState, SubmissionResult } from './SendPanel';
import { DEFAULT_INVITATION } from '../data';
import { parseInvitationDocument } from '../documentValidator';
import {
  loadInvitationDesign,
  createInvitationDesign,
  saveInvitationDesign,
} from '../persistenceService';
import { loadAssetLibrary, invalidateSignedUrlCache } from '../assetService';
import { useInvitationAutosave } from '../useInvitationAutosave';
import { loadVerifiedSenders } from '../senderService';
import type { VerifiedSender } from '../senderService';
import { sendInvitationDesign } from '../invitationSendService';
import {
  sanitizeFilename,
  waitForImages,
  waitForFonts,
  prepareImagesForExport,
  capturePng,
  validatePngBlob,
  downloadBlob,
  generateThumbnail,
  uploadThumbnail,
} from '../exportService';
import { supabase } from '@/lib/supabase';

// ── Helpers ──

function cloneDocument(doc: InvitationDocument): InvitationDocument {
  return structuredClone(doc);
}

function normalizeLayerOrder(layers: InvitationLayer[]): InvitationLayer[] {
  return [...layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer, index) => ({
      ...layer,
      zIndex: index,
    }));
}

export function normalizeDocument(doc: InvitationDocument): InvitationDocument {
  return {
    ...doc,
    layers: normalizeLayerOrder(doc.layers),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const roundGeom = (v: number) => Math.round(v * 10) / 10;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const HISTORY_LIMIT = 100;
const MAX_TITLE_LENGTH = 120;

// ── Props ──

interface InvitationEditorProps {
  invitationId: string | null;
  userId: string | null;
  onCreated?: (newId: string) => void;
}

// ── Component ──

export default function InvitationEditor({
  invitationId,
  userId,
  onCreated,
}: InvitationEditorProps) {
  const { weddingId } = useActiveWedding();
  // ── Document state — single source of truth ──
  const [document, setDocument] = useState<InvitationDocument>(() =>
    normalizeDocument(DEFAULT_INVITATION),
  );

  // ── History state ──
  const initialCloned = cloneDocument(normalizeDocument(DEFAULT_INVITATION));
  const [history, setHistory] = useState<DocumentHistory>({
    snapshots: [initialCloned],
    index: 0,
  });

  const documentRef = useRef(document);
  documentRef.current = document;

  const historyRef = useRef(history);
  historyRef.current = history;

  const [title, setTitle] = useState('Untitled Invitation');
  const titleRef = useRef(title);
  titleRef.current = title;

  // ── Persisted metadata ──
  const persistedIdRef = useRef<string | null>(invitationId);
  const persistedUpdatedAtRef = useRef<string | null>(null);

  // ── Creation guard — prevents double creation from React StrictMode ──
  const creationGuardRef = useRef(false);

  // ── Layers panel visibility ──
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  const handleToggleLayersPanel = useCallback(() => {
    setShowLayersPanel((prev) => !prev);
  }, []);

  // ── Mobile sheet state ──
  const [mobileSheet, setMobileSheet] = useState<'assets' | 'layers' | 'send' | null>(null);

  const handleOpenMobileSheet = useCallback((sheet: 'assets' | 'layers' | 'send') => {
    setMobileSheet(sheet);
  }, []);

  const handleCloseMobileSheet = useCallback(() => {
    setMobileSheet(null);
  }, []);

  // ── Loading guard — prevent actions while loading ──
  const [loading, setLoading] = useState(false);

  // ── Selection state — derived, never duplicated ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // ── Editing state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;

  const editingStartContentRef = useRef<string | null>(null);

  // ── Interaction epoch — incremented on undo/redo to cancel active interactions ──
  const [interactionEpoch, setInteractionEpoch] = useState(0);

  // ── Asset lookup — populated from Supabase, shared across all renderers ──
  const [assetLookup, setAssetLookup] = useState<Map<string, string>>(new Map());
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [seedingAssets, setSeedingAssets] = useState(false);
  const seedAttemptedRef = useRef(false);

  // ── Autosave hook — 600ms debounce, serial queue, revision tracking ──
  const {
    saveState,
    markDirty,
    retry: handleRetrySave,
    manualSave,
    isManualSaving,
  } = useInvitationAutosave({
    invitationId: persistedIdRef.current,
    titleRef,
    documentRef,
    enabled: !loading && !!userId && !!persistedIdRef.current,
    saveFn: saveInvitationDesign,
  });

  // ── Wrap commitDocument to also mark dirty for autosave ──
  const commitAndMarkDirty = useCallback(
    (before: InvitationDocument, after: InvitationDocument) => {
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      const cloned = cloneDocument(after);
      setHistory((prev) => {
        const snapshots = prev.snapshots.slice(0, prev.index + 1);
        snapshots.push(cloned);
        while (snapshots.length > HISTORY_LIMIT) snapshots.shift();
        return { snapshots, index: snapshots.length - 1 };
      });
      markDirty();
    },
    [markDirty],
  );

  // ── Load assets from Supabase on mount ──
  useEffect(() => {
    let cancelled = false;

    const loadAndMaybeSeed = async () => {
      // 1. Load assets from the database with signed URL resolution
      const result = await loadAssetLibrary();
      if (cancelled) return;

      if (result.success && result.data) {
        const map = new Map<string, string>();
        let emptyCount = 0;

        for (const a of result.data) {
          if (a.fileUrl) {
            map.set(a.id, a.fileUrl);
          } else {
            emptyCount++;
          }
        }

        setAssetLookup(map);

        // 2. If most assets have empty URLs, the bucket likely has no files — seed it
        const totalAssets = result.data.length;
        if (emptyCount > 0 && emptyCount >= totalAssets * 0.5 && !seedAttemptedRef.current) {
          seedAttemptedRef.current = true;
          setSeedingAssets(true);

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (token) {
              await supabase.functions.invoke('seed-invitation-assets', {
                body: {},
              });
            }
          } catch {
            // Seeding failed silently — assets will show as unavailable
          }

          if (cancelled) return;

          // 3. Reload assets after seeding — invalidate cache so we get fresh signed URLs
          invalidateSignedUrlCache();
          const reloadResult = await loadAssetLibrary();
          if (cancelled) return;

          if (reloadResult.success && reloadResult.data) {
            const newMap = new Map<string, string>();
            for (const a of reloadResult.data) {
              if (a.fileUrl) {
                newMap.set(a.id, a.fileUrl);
              }
            }
            setAssetLookup(newMap);
          }

          setSeedingAssets(false);
        }
      }

      setAssetsLoaded(true);
    };

    loadAndMaybeSeed();

    return () => { cancelled = true; };
  }, []);

  // ── Preview modal ──
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // ── Verified senders ──
  const [verifiedSenders, setVerifiedSenders] = useState<VerifiedSender[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [sendersError, setSendersError] = useState<string | null>(null);

  // ── Submission state ──
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // ── Export state ──
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportSurface, setShowExportSurface] = useState(false);
  const exportSnapshotRef = useRef<{
    document: InvitationDocument;
    assetLookup: Map<string, string>;
    title: string;
  } | null>(null);
  const exportSurfaceRef = useRef<HTMLDivElement | null>(null);
  const exportActiveRef = useRef(false);
  const exportGenRef = useRef(0);

  // ── Load senders from Supabase ──
  const loadSenders = useCallback(async () => {
    setSendersLoading(true);
    setSendersError(null);
    if (!weddingId) {setVerifiedSenders([]);setSendersLoading(false);return;}
    const result = await loadVerifiedSenders(weddingId);
    if (result.success && result.data) {
      setVerifiedSenders(result.data);
    } else {
      setSendersError(result.error || 'Failed to load senders');
    }
    setSendersLoading(false);
  }, [weddingId]);

  useEffect(() => {
    loadSenders();
  }, [loadSenders]);

  // ── Load or create on mount ──

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Cancel any in-progress export on route change
      exportActiveRef.current = false;
      exportSnapshotRef.current = null;
      setShowExportSurface(false);
      setExportState('idle');
      setExportError(null);
      exportGenRef.current += 1;

      if (invitationId) {
        // Load existing
        setLoading(true);

        const result = await loadInvitationDesign(invitationId);

        if (cancelled) return;

        if (result.success && result.data) {
          const validation = parseInvitationDocument(result.data.document);
          if (validation.valid && validation.document) {
            const clean = normalizeDocument(validation.document);
            const cloned = cloneDocument(clean);
            setDocument(clean);
            setHistory({ snapshots: [cloned], index: 0 });
            setTitle(result.data.title || 'Untitled Invitation');
            titleRef.current = result.data.title || 'Untitled Invitation';
            persistedIdRef.current = result.data.id;
            persistedUpdatedAtRef.current = result.data.updated_at;
            setSelectedId(null);
            setEditingId(null);
            editingStartContentRef.current = null;
            setInteractionEpoch((e) => e + 1);
          } else {
            // Document is invalid — show error but don't overwrite
          }
        } else {
          // No data returned
        }

        setLoading(false);
      } else if (userId && (weddingId || isDemoMode)) {
        // Create new — guard against double-create in StrictMode
        if (creationGuardRef.current) return;
        creationGuardRef.current = true;

        setLoading(true);

        const normalized = normalizeDocument(DEFAULT_INVITATION);
        const result = await createInvitationDesign(userId, normalized, 'Untitled Invitation', weddingId);

        if (cancelled) return;

        if (result.success && result.id) {
          persistedIdRef.current = result.id;
          persistedUpdatedAtRef.current = result.updatedAt ?? null;
          const cloned = cloneDocument(normalized);
          setDocument(normalized);
          setHistory({ snapshots: [cloned], index: 0 });
          setTitle('Untitled Invitation');
          setSelectedId(null);
          setEditingId(null);

          // Notify parent to update URL
          if (onCreated) {
            // Small delay to let state settle before navigation
            setTimeout(() => onCreated(result.id!), 0);
          }
        } else {
          // No data returned
        }

        setLoading(false);
      } else {
        // No userId and no invitationId — show default but can't save
        setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [invitationId, userId, weddingId, onCreated]);

  // ── Derived history availability ──
  const canUndo = history.index > 0;
  const canRedo = history.index < history.snapshots.length - 1;

  // ── Derived boundary states for ToolRail ──
  const sortedLayers = useMemo(
    () => [...document.layers].sort((a, b) => a.zIndex - b.zIndex),
    [document.layers],
  );

  const selectedLayer = useMemo(() => {
    if (!selectedId) return null;
    return document.layers.find((l) => l.id === selectedId) ?? null;
  }, [document.layers, selectedId]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return sortedLayers.findIndex((l) => l.id === selectedId);
  }, [sortedLayers, selectedId]);

  const canBringForward = selectedId != null && selectedIndex >= 0 && selectedIndex < sortedLayers.length - 1;
  const canSendBackward = selectedId != null && selectedIndex > 0;

  // ── Central commit function (also triggers autosave) ──
  const commitDocument = commitAndMarkDirty;

  // ── Undo / Redo ──

  const handleUndo = useCallback(() => {
    const h = historyRef.current;
    if (h.index <= 0) return;

    // Cancel any active interaction / editing in CanvasWorkspace
    setInteractionEpoch((e) => e + 1);

    const restored = cloneDocument(h.snapshots[h.index - 1]);
    setDocument(restored);
    setHistory((prev) => ({ ...prev, index: prev.index - 1 }));

    // Fix selection if layer no longer exists
    setSelectedId((prev) => {
      if (prev && restored.layers.some((l) => l.id === prev)) return prev;
      return null;
    });
    setEditingId(null);
    editingStartContentRef.current = null;
  }, []);

  const handleRedo = useCallback(() => {
    const h = historyRef.current;
    if (h.index >= h.snapshots.length - 1) return;

    setInteractionEpoch((e) => e + 1);

    const restored = cloneDocument(h.snapshots[h.index + 1]);
    setDocument(restored);
    setHistory((prev) => ({ ...prev, index: prev.index + 1 }));

    setSelectedId((prev) => {
      if (prev && restored.layers.some((l) => l.id === prev)) return prev;
      return null;
    });
    setEditingId(null);
    editingStartContentRef.current = null;
  }, []);

  // ── Document replacement (for database loading) ──

  const replaceDocument = useCallback((loaded: InvitationDocument) => {
    const clean = normalizeDocument(loaded);
    const cloned = cloneDocument(clean);
    setDocument(clean);
    setHistory({
      snapshots: [cloned],
      index: 0,
    });
    setSelectedId(null);
    setEditingId(null);
    editingStartContentRef.current = null;
    setInteractionEpoch((e) => e + 1);
  }, []);

  // ── Save & Download — full export flow ──

  const handleSaveDownload = useCallback(async () => {
    if (!persistedIdRef.current) return;
    if (exportActiveRef.current) return;

    exportActiveRef.current = true;
    const gen = ++exportGenRef.current;
    setExportState('saving');
    setExportError(null);

    // Step 1: Flush autosave and wait for confirmation
    try {
      await manualSave();
    } catch {
      if (gen !== exportGenRef.current) return;
      setExportState('error');
      setExportError("Couldn't save your invitation. Try again before downloading.");
      exportActiveRef.current = false;
      return;
    }

    if (gen !== exportGenRef.current) {
      exportActiveRef.current = false;
      return;
    }

    // Step 2: Capture immutable snapshot
    const doc = documentRef.current;
    const snapshot = {
      document: structuredClone(doc),
      assetLookup: new Map(assetLookup),
      title: titleRef.current,
    };
    exportSnapshotRef.current = snapshot;
    setShowExportSurface(true);
    setExportState('preparing');

    // The export effect (useEffect below) will handle the rest
  }, [manualSave, assetLookup]);

  // ── Export effect — runs when exportSnapshot is set ──

  useEffect(() => {
    const snapshot = exportSnapshotRef.current;
    if (!snapshot) return;

    let cancelled = false;

    const runExport = async () => {
      // Wait a tick for React to render the export surface
      await new Promise((r) => setTimeout(r, 100));

      if (cancelled) return;
      const surface = exportSurfaceRef.current;
      if (!surface) {
        setExportState('error');
        setExportError("Couldn't create the invitation image");
        exportSnapshotRef.current = null;
        setShowExportSurface(false);
        exportActiveRef.current = false;
        return;
      }

      // Wait for images to load
      const imgResult = await waitForImages(surface);
      if (cancelled) return;

      if (!imgResult.ready) {
        setExportState('error');
        setExportError('One or more invitation images couldn\'t be prepared');
        exportSnapshotRef.current = null;
        setShowExportSurface(false);
        exportActiveRef.current = false;
        return;
      }

      // Wait for fonts
      const fontsReady = await waitForFonts();
      if (cancelled) return;

      if (!fontsReady) {
        setExportState('error');
        setExportError("Invitation fonts aren't ready yet");
        exportSnapshotRef.current = null;
        setShowExportSurface(false);
        exportActiveRef.current = false;
        return;
      }

      // Prepare images for CORS
      prepareImagesForExport(surface);

      // Wait for layout readiness — two animation frames
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      if (cancelled) return;

      // Capture PNG
      setExportState('downloading');
      const blob = await capturePng(surface);
      if (cancelled) return;

      if (!blob) {
        setExportState('error');
        setExportError("Couldn't create the invitation image");
        exportSnapshotRef.current = null;
        setShowExportSurface(false);
        exportActiveRef.current = false;
        return;
      }

      // Validate
      const canvasW = snapshot.document.canvas.width;
      const canvasH = snapshot.document.canvas.height;
      const validation = await validatePngBlob(blob, canvasW * 2, canvasH * 2);

      if (!validation.valid) {
        setExportState('error');
        setExportError("Couldn't create the invitation image");
        exportSnapshotRef.current = null;
        setShowExportSurface(false);
        exportActiveRef.current = false;
        return;
      }

      // Download
      const filename = sanitizeFilename(snapshot.title) + '.png';
      downloadBlob(blob, filename);

      if (cancelled) return;

      // Generate and upload thumbnail
      setExportState('updating-thumbnail');

      const thumbnailBlob = await generateThumbnail(blob, canvasW, canvasH);

      if (cancelled) return;

      if (thumbnailBlob && persistedIdRef.current) {
        const thumbResult = await uploadThumbnail(persistedIdRef.current, thumbnailBlob);

        if (cancelled) return;

        if (thumbResult.success) {
          setExportState('success');
          setExportError(null);
        } else {
          setExportState('partial-error');
          setExportError("Downloaded, but preview thumbnail couldn't be updated");
        }
      } else {
        // Thumbnail generation failed but download succeeded
        setExportState('partial-error');
        setExportError("Downloaded, but preview thumbnail couldn't be updated");
      }

      exportSnapshotRef.current = null;
      setShowExportSurface(false);
      exportActiveRef.current = false;
    };

    runExport();

    return () => {
      cancelled = true;
    };
  }, [exportState === 'preparing' ? exportState : 0]);

  // ── Keyboard shortcuts ──

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when focus is in form controls or contentEditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd+Z → Undo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl/Cmd+Shift+Z or Ctrl+Y → Redo
      if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl/Cmd+D → Duplicate
      if (mod && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // Delete/Backspace → Delete (only when not editing text)
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedIdRef.current &&
        !editingIdRef.current
      ) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ── Canvas selection ──

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedId(null);
  }, []);

  // ── Document change (from CanvasWorkspace interactions) ──

  const handleDocumentChange = useCallback((doc: InvitationDocument) => {
    setDocument(doc);
  }, []);

  // ── Interaction commit (Phase 5 — one entry per move/resize/rotate completion) ──

  const handleInteractionCommit: InteractionCommitFn = useCallback(
    (before: InvitationDocument, after: InvitationDocument) => {
      commitDocument(before, after);
    },
    [commitDocument],
  );

  // ── Property commit (Phase 5 — one entry per toolbar action) ──

  const handlePropertyCommit: PropertyCommitFn = useCallback(
    (before: InvitationDocument, after: InvitationDocument) => {
      commitDocument(before, after);
    },
    [commitDocument],
  );

  // ── Text edit commit (Phase 5 — one entry per editing session) ──

  const handleTextEditCommit: PropertyCommitFn = useCallback(
    (before: InvitationDocument, after: InvitationDocument) => {
      commitDocument(before, after);
    },
    [commitDocument],
  );

  // ── Editing start — store original content, set editing ID ──

  const handleEditingStart = useCallback((id: string, content: string) => {
    editingStartContentRef.current = content;
    setEditingId(id);
  }, []);

  // ── Editing finish — clear editing state ──

  const handleEditingFinish = useCallback((_id: string, _finalContent: string) => {
    setEditingId(null);
    editingStartContentRef.current = null;
  }, []);

  // ── Cancel editing — restore original content and exit ──

  const handleCancelEditing = useCallback((id: string) => {
    const originalContent = editingStartContentRef.current ?? '';
    setDocument((current) => ({
      ...current,
      layers: current.layers.map((l) =>
        l.id === id && l.type === 'text'
          ? { ...l, props: { ...l.props, content: originalContent } }
          : l,
      ),
    }));
    setEditingId(null);
    editingStartContentRef.current = null;
  }, []);

  // ── Title change ──

  const handleTitleChange = useCallback((newTitle: string) => {
    const trimmed = newTitle.trim().slice(0, MAX_TITLE_LENGTH) || 'Untitled Invitation';
    setTitle(trimmed);
    titleRef.current = trimmed;
    markDirty();
  }, [markDirty]);

  // ── Tool rail actions ──

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    const doc = documentRef.current;
    const layer = doc.layers.find((l) => l.id === selectedId);
    if (!layer) return;

    const before = cloneDocument(doc);
    const newId = generateId();

    const dupX = clamp(layer.x + 16, 0, Math.max(0, doc.canvas.width - layer.width));
    const dupY = clamp(layer.y + 16, 0, Math.max(0, doc.canvas.height - layer.height));

    const newLayer: InvitationLayer = {
      ...structuredClone(layer),
      id: newId,
      x: dupX,
      y: dupY,
    };

    const withDup = [...doc.layers, newLayer];
    const normalized = normalizeLayerOrder(withDup);

    const after: InvitationDocument = { ...doc, layers: normalized };
    setDocument(after);
    commitDocument(before, after);
    setSelectedId(newId);
    setEditingId(null);
    editingStartContentRef.current = null;
  }, [selectedId, commitDocument]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    const doc = documentRef.current;

    // Clear editing if the deleted layer was being edited
    if (editingIdRef.current === selectedId) {
      setEditingId(null);
      editingStartContentRef.current = null;
    }

    const remaining = doc.layers.filter((l) => l.id !== selectedId);
    const normalized = normalizeLayerOrder(remaining);

    const before = cloneDocument(doc);
    const after: InvitationDocument = { ...doc, layers: normalized };
    setDocument(after);
    commitDocument(before, after);
    setSelectedId(null);
    setEditingId(null);
    editingStartContentRef.current = null;
  }, [selectedId, commitDocument]);

  const handleBringForward = useCallback(() => {
    if (!selectedId) return;
    const doc = documentRef.current;

    const ordered = [...doc.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = ordered.findIndex((l) => l.id === selectedId);
    if (idx < 0 || idx >= ordered.length - 1) return;

    const before = cloneDocument(doc);

    // Swap zIndex values so normalizeLayerOrder preserves the new order
    const tempZ = ordered[idx].zIndex;
    ordered[idx] = { ...ordered[idx], zIndex: ordered[idx + 1].zIndex };
    ordered[idx + 1] = { ...ordered[idx + 1], zIndex: tempZ };

    const normalized = normalizeLayerOrder(ordered);

    const after: InvitationDocument = { ...doc, layers: normalized };
    setDocument(after);
    commitDocument(before, after);
  }, [selectedId, commitDocument]);

  // ── Layer reorder (from LayersPanel drag) ──
  // orderedIdsFrontToBack: layer IDs sorted front→back (index 0 = highest zIndex)
  const handleLayerReorder = useCallback(
    (orderedIdsFrontToBack: string[]) => {
      const doc = documentRef.current;
      const before = cloneDocument(doc);

      const totalLayers = orderedIdsFrontToBack.length;
      const updatedLayers = doc.layers.map((layer) => {
        const pos = orderedIdsFrontToBack.indexOf(layer.id);
        if (pos === -1) return layer;
        // Front (pos 0) → highest zIndex (totalLayers - 1)
        // Back (pos N-1) → zIndex 0
        return { ...layer, zIndex: totalLayers - 1 - pos };
      });

      const normalized = normalizeLayerOrder(updatedLayers);
      const after: InvitationDocument = { ...doc, layers: normalized };
      setDocument(after);
      commitDocument(before, after);
    },
    [commitDocument],
  );

  const handleSendBackward = useCallback(() => {
    if (!selectedId) return;
    const doc = documentRef.current;

    const ordered = [...doc.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = ordered.findIndex((l) => l.id === selectedId);
    if (idx <= 0) return;

    const before = cloneDocument(doc);

    // Swap zIndex values so normalizeLayerOrder preserves the new order
    const tempZ = ordered[idx].zIndex;
    ordered[idx] = { ...ordered[idx], zIndex: ordered[idx - 1].zIndex };
    ordered[idx - 1] = { ...ordered[idx - 1], zIndex: tempZ };

    const normalized = normalizeLayerOrder(ordered);

    const after: InvitationDocument = { ...doc, layers: normalized };
    setDocument(after);
    commitDocument(before, after);
  }, [selectedId, commitDocument]);

  // ── Opacity change (undoable) ──

  const handleOpacityChange = useCallback(
    (newOpacity: number) => {
      if (!selectedId) return;
      const doc = documentRef.current;
      const before = cloneDocument(doc);

      const updatedLayers = doc.layers.map((l) =>
        l.id === selectedId ? { ...l, opacity: clamp(newOpacity, 0.1, 1) } : l,
      );

      const after: InvitationDocument = { ...doc, layers: updatedLayers };
      setDocument(after);
      commitDocument(before, after);
    },
    [selectedId, commitDocument],
  );

  // ── Asset drop handler — create a new asset layer at zoom-correct position ──

  const handleAssetDrop = useCallback(
    (assetId: string, localX: number, localY: number) => {
      const doc = documentRef.current;
      const fileUrl = assetLookup.get(assetId);
      if (!fileUrl) return;

      const before = cloneDocument(doc);

      // Default fallback size for assets whose images haven't loaded
      const DEFAULT_ASSET_SIZE = 150;

      // Try to preload and get natural dimensions
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        if (naturalW > 0 && naturalH > 0) {
          // Fit within max dimension while maintaining aspect ratio
          const MAX_DIM = 200;
          let w = naturalW;
          let h = naturalH;

          if (w > h) {
            w = Math.min(w, MAX_DIM);
            h = (w / naturalW) * naturalH;
          } else {
            h = Math.min(h, MAX_DIM);
            w = (h / naturalH) * naturalW;
          }

          createAssetLayer(doc, before, assetId, localX, localY, w, h);
        } else {
          createAssetLayer(doc, before, assetId, localX, localY, DEFAULT_ASSET_SIZE, DEFAULT_ASSET_SIZE);
        }
      };

      img.onerror = () => {
        createAssetLayer(doc, before, assetId, localX, localY, DEFAULT_ASSET_SIZE, DEFAULT_ASSET_SIZE);
      };

      img.src = fileUrl;

      function createAssetLayer(
        doc: InvitationDocument,
        before: InvitationDocument,
        assetId: string,
        x: number,
        y: number,
        w: number,
        h: number,
      ) {
        // Centre the asset at the drop point
        const clampedX = clamp(x - w / 2, 0, Math.max(0, doc.canvas.width - w));
        const clampedY = clamp(y - h / 2, 0, Math.max(0, doc.canvas.height - h));

        const newId = generateId();
        const maxZ = doc.layers.length > 0
          ? Math.max(...doc.layers.map((l) => l.zIndex))
          : -1;

        const newLayer: InvitationLayer = {
          id: newId,
          type: 'asset',
          x: roundGeom(clampedX),
          y: roundGeom(clampedY),
          width: roundGeom(w),
          height: roundGeom(h),
          rotation: 0,
          zIndex: maxZ + 1,
          opacity: 1,
          props: {
            assetId,
            flipX: false,
          },
        };

        const after: InvitationDocument = {
          ...doc,
          layers: normalizeLayerOrder([...doc.layers, newLayer]),
        };

        setDocument(after);
        commitDocument(before, after);
        setSelectedId(newId);
        setEditingId(null);
        editingStartContentRef.current = null;
      }
    },
    [assetLookup, commitDocument],
  );

  // ── Clear canvas ──

  const handleClearCanvas = useCallback(() => {
    const doc = documentRef.current;
    if (doc.layers.length === 0) return;

    const before = cloneDocument(doc);
    const after: InvitationDocument = {
      ...doc,
      layers: [],
    };
    setDocument(after);
    commitDocument(before, after);
    setSelectedId(null);
    setEditingId(null);
    editingStartContentRef.current = null;
  }, [commitDocument]);

  // ── Background change ──

  const handleBackgroundChange = useCallback(
    (bg: CanvasBackground) => {
      const doc = documentRef.current;
      const before = cloneDocument(doc);
      const after: InvitationDocument = {
        ...doc,
        canvas: {
          ...doc.canvas,
          background: bg,
        },
      };
      setDocument(after);
      commitDocument(before, after);
    },
    [commitDocument],
  );

  // ── Preview actions ──

  const handlePreview = useCallback(() => {
    setPreviewDevice('desktop');
    setPreviewOpen(true);
  }, []);

  const handleMobilePreview = useCallback(() => {
    setPreviewDevice('mobile');
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // ── Send (save-before-send coordination + edge function call) ──

  const handleSend = useCallback(
    async (formData: SendFormState) => {
      if (!persistedIdRef.current) return;
      if (submissionState !== 'idle') return;

      setSubmissionState('saving');
      setSubmissionResult(null);

      try {
        // 1. Flush save queue and wait for latest revision to be confirmed
        await manualSave();
      } catch {
        setSubmissionState('error');
        setSubmissionResult({
          acceptedCount: 0,
          rejectedCount: formData.recipients.length,
          mode: formData.mode,
          error: 'Couldn\'t save your design. Please try again.',
        });
        return;
      }

      // 2. Save confirmed — now send via edge function
      setSubmissionState('submitting');

      const submissionId = crypto.randomUUID();

      try {
        const result = await sendInvitationDesign({
          invitationId: persistedIdRef.current,
          senderId: formData.senderId,
          recipients: formData.recipients,
          subject: formData.subject,
          message: formData.message,
          mode: formData.mode,
          scheduledFor: formData.scheduledFor,
          timezone: formData.timezone,
          submissionId,
        });

        if (result.accepted) {
          setSubmissionState('success');
          setSubmissionResult({
            acceptedCount: result.acceptedCount,
            rejectedCount: result.rejectedCount,
            mode: formData.mode,
          });
        } else {
          setSubmissionState('error');
          setSubmissionResult({
            acceptedCount: result.acceptedCount,
            rejectedCount: result.rejectedCount,
            mode: formData.mode,
            error: result.error || result.rejectionReasons.join('; ') || 'Failed to send',
          });
        }
      } catch (err) {
        setSubmissionState('error');
        setSubmissionResult({
          acceptedCount: 0,
          rejectedCount: formData.recipients.length,
          mode: formData.mode,
          error: err instanceof Error ? err.message : 'Failed to send',
        });
      }
    },
    [manualSave, submissionState],
  );

  const handleDismissResult = useCallback(() => {
    setSubmissionState('idle');
    setSubmissionResult(null);
  }, []);

  // ── Export retry / dismiss ──

  const handleRetryExport = useCallback(() => {
    setExportState('idle');
    setExportError(null);
    // Trigger a fresh export
    handleSaveDownload();
  }, [handleSaveDownload]);

  const handleDismissExportError = useCallback(() => {
    setExportState('idle');
    setExportError(null);
    exportSnapshotRef.current = null;
    setShowExportSurface(false);
    exportActiveRef.current = false;
  }, []);

  // ── Thumbnail-only retry (from partial-error state) ──

  return (
    <div className="h-full flex flex-col relative">
      {/* Row 1: Topbar */}
      <EditorTopbar
        title={title}
        onTitleChange={handleTitleChange}
        saveState={saveState}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPreview={handlePreview}
        onMobilePreview={handleMobilePreview}
        onSaveDownload={handleSaveDownload}
        onClearCanvas={handleClearCanvas}
        invitationId={persistedIdRef.current ?? undefined}
        isManualSaving={isManualSaving}
        exportState={exportState}
        exportError={exportError}
        onRetryExport={handleRetryExport}
        onDismissExportError={handleDismissExportError}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60">
          <div className="flex items-center gap-3 bg-white rounded-xl border border-[#eee7df] shadow-md px-6 py-4">
            <i className="ri-loader-4-line animate-spin text-xl text-foreground-500" />
            <span className="text-sm font-label text-foreground-600">Loading…</span>
          </div>
        </div>
      )}

      {/* Error overlay with retry */}
      {saveState === 'error' && !loading && (
        <div className="absolute top-[56px] left-0 right-0 z-40 flex items-center justify-center bg-red-50/90 border-b border-red-200 px-4 py-2">
          <span className="text-xs text-red-600 mr-3">
            <i className="ri-error-warning-line mr-1" />
            Couldn't save your changes
          </span>
          <button
            onClick={handleRetrySave}
            className="text-xs font-label text-red-700 underline cursor-pointer hover:text-red-800 whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Row 2: Main workspace (AssetLibrary | ToolRail | Canvas | SendPanel) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left asset library sidebar — desktop only */}
        <div className="hidden lg:block border-r border-[#eee7df]">
          <AssetLibrary seeding={seedingAssets} />
        </div>

        {/* Left tool rail — desktop only */}
        <div className="hidden lg:block">
          <ToolRail
            selectedLayerId={selectedId}
            onDuplicate={handleDuplicate}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onDelete={handleDelete}
            canBringForward={canBringForward}
            canSendBackward={canSendBackward}
            background={document.canvas.background}
            onBackgroundChange={handleBackgroundChange}
            showLayersPanel={showLayersPanel}
            onToggleLayersPanel={handleToggleLayersPanel}
            opacity={selectedLayer?.opacity}
            onOpacityChange={handleOpacityChange}
          />
        </div>

        {/* Layers panel — desktop only */}
        {showLayersPanel && (
          <div className="hidden lg:block">
            <LayersPanel
              layers={document.layers}
              selectedId={selectedId}
              onSelect={handleSelect}
              onReorder={handleLayerReorder}
            />
          </div>
        )}

        {/* Centre canvas — full width on mobile with bottom padding for the action bar */}
        <div className="flex-1 min-w-0 lg:pb-0 pb-[64px]">
          <CanvasWorkspace
            document={document}
            selectedId={selectedId}
            editingId={editingId}
            assetLookup={assetLookup}
            assetsLoaded={assetsLoaded}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
            onDocumentChange={handleDocumentChange}
            onInteractionCommit={handleInteractionCommit}
            onPropertyCommit={handlePropertyCommit}
            onTextEditCommit={handleTextEditCommit}
            onEditingStart={handleEditingStart}
            onEditingFinish={handleEditingFinish}
            onCancelEditing={handleCancelEditing}
            onAssetDrop={handleAssetDrop}
            previewOpen={previewOpen}
            interactionEpoch={interactionEpoch}
          />
        </div>

        {/* Right send panel — desktop only */}
        <div className="hidden lg:block">
          <SendPanel
            document={document}
            assetLookup={assetLookup}
            verifiedSenders={verifiedSenders}
            sendersLoading={sendersLoading}
            sendersError={sendersError}
            onRetrySenders={loadSenders}
            onSend={handleSend}
            submissionState={submissionState}
            submissionResult={submissionResult}
            onDismissResult={handleDismissResult}
          />
        </div>
      </div>

      {/* ── Mobile sheets ── */}

      {/* Mobile: Asset Library sheet */}
      <ResponsiveSheet
        open={mobileSheet === 'assets'}
        onClose={handleCloseMobileSheet}
        side="left"
        title="Asset Library"
        className="lg:hidden"
      >
        <div className="h-full flex flex-col w-full [&>div]:!w-full [&>div]:!flex-shrink">
          <AssetLibrary seeding={seedingAssets} />
        </div>
      </ResponsiveSheet>

      {/* Mobile: Layers sheet */}
      <ResponsiveSheet
        open={mobileSheet === 'layers'}
        onClose={handleCloseMobileSheet}
        side="left"
        title="Layers"
        className="lg:hidden"
      >
        <div className="h-full flex flex-col overflow-hidden w-full [&>div]:!w-full">
          <LayersPanel
            layers={document.layers}
            selectedId={selectedId}
            onSelect={(id) => { handleSelect(id); handleCloseMobileSheet(); }}
            onReorder={handleLayerReorder}
          />
        </div>
      </ResponsiveSheet>

      {/* Mobile: Send sheet */}
      <ResponsiveSheet
        open={mobileSheet === 'send'}
        onClose={handleCloseMobileSheet}
        side="right"
        title="Send Invitation"
        className="lg:hidden"
      >
        <div className="h-full flex flex-col overflow-hidden w-full [&>div]:!w-full">
          <SendPanel
            document={document}
            assetLookup={assetLookup}
            verifiedSenders={verifiedSenders}
            sendersLoading={sendersLoading}
            sendersError={sendersError}
            onRetrySenders={loadSenders}
            onSend={handleSend}
            submissionState={submissionState}
            submissionResult={submissionResult}
            onDismissResult={handleDismissResult}
          />
        </div>
      </ResponsiveSheet>

      {/* Mobile: Bottom action bar */}
      <MobileEditorBottomBar
        saveState={saveState}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedId !== null}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        canBringForward={canBringForward}
        canSendBackward={canSendBackward}
        onOpenAssets={() => handleOpenMobileSheet('assets')}
        onOpenLayers={() => handleOpenMobileSheet('layers')}
        onOpenSend={() => handleOpenMobileSheet('send')}
        onOpenPreview={handlePreview}
        layerCount={document.layers.length}
      />

      {/* Full preview modal — read-only */}
      <PreviewModal
        isOpen={previewOpen}
        onClose={handleClosePreview}
        document={document}
        title={title}
        assetLookup={assetLookup}
        defaultDevice={previewDevice}
      />

      {/* Export progress — polite live region */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {exportState === 'saving' && 'Saving your invitation…'}
        {exportState === 'preparing' && 'Preparing invitation image…'}
        {exportState === 'downloading' && 'Downloading invitation…'}
        {exportState === 'updating-thumbnail' && 'Updating preview thumbnail…'}
        {exportState === 'success' && 'Invitation downloaded'}
        {exportState === 'error' && exportError}
        {exportState === 'partial-error' && exportError}
      </div>

      {/* Offscreen export surface — rendered when exporting */}
      {showExportSurface && exportSnapshotRef.current && (
        <div
          ref={exportSurfaceRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            zIndex: -1,
            width: `${exportSnapshotRef.current.document.canvas.width * 2}px`,
            height: `${exportSnapshotRef.current.document.canvas.height * 2}px`,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <InvitationRenderer
            document={exportSnapshotRef.current.document}
            assetLookup={exportSnapshotRef.current.assetLookup}
            interactive={false}
            scale={2}
          />
        </div>
      )}
    </div>
  );
}