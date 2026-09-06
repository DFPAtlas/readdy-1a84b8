import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import InvitationRenderer from './InvitationRenderer';
import FloatingToolbar from './FloatingToolbar';
import type {
  InvitationDocument,
  InvitationLayer,
  TextLayerProps,
  ResizeCorner,
  ActiveInteraction,
  InteractionCommitFn,
  PropertyCommitFn,
} from '../types';
import { RESIZE_SIGNS } from '../types';

// ── Constants ──

const MIN_TEXT_W = 40;
const MIN_TEXT_H = 24;
const MIN_ASSET_W = 24;
const MIN_ASSET_H = 24;
const MAX_SIZE_FACTOR = 2;
const SNAP_DEGREES = 15;
const TOOLBAR_OFFSET = 8;
const TOOLBAR_HEIGHT_EST = 44;

// ── Helpers ──

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const roundGeom = (v: number) => Math.round(v * 10) / 10;

const normalizeRotation = (angle: number) => ((angle % 360) + 360) % 360;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

// ── Custom MIME type for Vowora asset drag payload ──

const WEDORA_ASSET_MIME = 'application/x-wedora-asset';

// Grid pattern as encoded SVG background
const GRID_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0v20M0 20h20' stroke='%23e8e0d5' stroke-width='0.5' fill='none' /%3E%3C/svg%3E\")";

// ── Props ──

interface CanvasWorkspaceProps {
  document: InvitationDocument;
  selectedId: string | null;
  editingId: string | null;
  assetLookup?: Map<string, string>;
  assetsLoaded?: boolean;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onDocumentChange: (doc: InvitationDocument) => void;
  onInteractionCommit?: InteractionCommitFn;
  onPropertyCommit?: PropertyCommitFn;
  onTextEditCommit?: PropertyCommitFn;
  onEditingStart: (id: string, content: string) => void;
  onEditingFinish: (id: string, finalContent: string) => void;
  onCancelEditing?: (id: string) => void;
  onAssetDrop?: (assetId: string, localX: number, localY: number) => void;
  previewOpen?: boolean;
  interactionEpoch?: number;
}

// ── Component ──

export default function CanvasWorkspace({
  document,
  selectedId,
  editingId,
  assetLookup,
  assetsLoaded = false,
  onSelect,
  onDeselect,
  onDocumentChange,
  onInteractionCommit,
  onPropertyCommit,
  onTextEditCommit,
  onEditingStart,
  onEditingFinish,
  onCancelEditing,
  onAssetDrop,
  previewOpen = false,
  interactionEpoch,
}: CanvasWorkspaceProps) {
  // ── Zoom state ──
  const [zoomValue, setZoomValue] = useState(100);
  const zoomDecimal = zoomValue / 100;

  // ── Auto-fit zoom on mount / resize ──
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateOptimalZoom = () => {
      const ws = workspaceRef.current;
      if (!ws) return;

      const rect = ws.getBoundingClientRect();
      const padX = 64;
      const padY = 64;
      const availW = rect.width - padX;
      const availH = rect.height - padY;

      const canvasW = document.canvas.width;
      const canvasH = document.canvas.height;

      const scaleX = availW / canvasW;
      const scaleY = availH / canvasH;
      const optimal = Math.min(scaleX, scaleY, 1.5); // cap at 150%

      const rounded = Math.round(optimal * 100);
      setZoomValue(clamp(rounded, 25, 200));
    };

    calculateOptimalZoom();

    const ro = new ResizeObserver(calculateOptimalZoom);
    if (workspaceRef.current) {
      ro.observe(workspaceRef.current);
    }

    return () => ro.disconnect();
  }, [document.canvas.width, document.canvas.height]);

  // ── Drag-over state for asset drop target ──
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Refs for stable access in event handlers ──
  const zoomRef = useRef(zoomDecimal);
  zoomRef.current = zoomDecimal;

  const documentRef = useRef(document);
  documentRef.current = document;

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;

  const onDocumentChangeRef = useRef(onDocumentChange);
  onDocumentChangeRef.current = onDocumentChange;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;

  const onInteractionCommitRef = useRef(onInteractionCommit);
  onInteractionCommitRef.current = onInteractionCommit;

  const onPropertyCommitRef = useRef(onPropertyCommit);
  onPropertyCommitRef.current = onPropertyCommit;

  const onTextEditCommitRef = useRef(onTextEditCommit);
  onTextEditCommitRef.current = onTextEditCommit;

  const onEditingStartRef = useRef(onEditingStart);
  onEditingStartRef.current = onEditingStart;

  const onEditingFinishRef = useRef(onEditingFinish);
  onEditingFinishRef.current = onEditingFinish;

  const onCancelEditingRef = useRef(onCancelEditing);
  onCancelEditingRef.current = onCancelEditing;

  const onAssetDropRef = useRef(onAssetDrop);
  onAssetDropRef.current = onAssetDrop;

  // ── Artboard wrapper ref (for client → document coordinate conversion) ──
  const artboardWrapperRef = useRef<HTMLDivElement>(null);

  // ── Interaction session ref ──
  const interactionRef = useRef<ActiveInteraction | null>(null);

  // ── Movement detection for click-vs-drag ──
  const hasMovedRef = useRef(false);
  const wasAlreadySelectedRef = useRef(false);

  // ── Convert client coordinates to document coordinates ──
  const clientToDocument = useCallback((clientX: number, clientY: number) => {
    const rect = artboardWrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const z = zoomRef.current;
    return {
      x: (clientX - rect.left) / z,
      y: (clientY - rect.top) / z,
    };
  }, []);

  // ── Derived selected layer ──
  const selectedLayer = useMemo(
    () =>
      selectedId != null
        ? document.layers.find((l) => l.id === selectedId) ?? null
        : null,
    [document, selectedId],
  );

  // ── Text change during editing ──
  const handleTextChange = useCallback(
    (layerId: string, content: string) => {
      onDocumentChangeRef.current({
        ...documentRef.current,
        layers: documentRef.current.layers.map((l) =>
          l.id === layerId && l.type === 'text'
            ? { ...l, props: { ...l.props, content } }
            : l,
        ),
      });
    },
    [],
  );

  // ── Finish interaction cleanly ──
  const finishInteraction = useCallback(() => {
    const active = interactionRef.current;
    if (!active) return;

    if (
      !hasMovedRef.current &&
      wasAlreadySelectedRef.current &&
      active.mode === 'move'
    ) {
      const currentDoc = documentRef.current;
      const layer = currentDoc.layers.find((l) => l.id === active.layerId);
      if (layer && layer.type === 'text') {
        const props = layer.props as TextLayerProps;
        onEditingStartRef.current(layer.id, props.content);
      }
    }

    const afterDoc = documentRef.current;
    if (onInteractionCommitRef.current) {
      onInteractionCommitRef.current(active.startDocument, afterDoc);
    }

    interactionRef.current = null;
    hasMovedRef.current = false;
    wasAlreadySelectedRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  }, []);

  // ── Cancel interaction ──
  const cancelInteraction = useCallback((restoreDocument = false) => {
    const active = interactionRef.current;
    if (!active) return;

    if (restoreDocument) {
      onDocumentChangeRef.current(active.startDocument);
    }

    interactionRef.current = null;
    hasMovedRef.current = false;
    wasAlreadySelectedRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  }, []);

  // ── Pointer move handler ──
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const active = interactionRef.current;
    if (!active) return;

    const dx = Math.abs(e.clientX - active.startClientX);
    const dy = Math.abs(e.clientY - active.startClientY);
    if (dx > 1 || dy > 1) {
      hasMovedRef.current = true;
    }

    const z = zoomRef.current;
    const doc = documentRef.current;
    const canvasW = doc.canvas.width;
    const canvasH = doc.canvas.height;

    const currentLayer = doc.layers.find((l) => l.id === active.layerId);
    if (!currentLayer) {
      interactionRef.current = null;
      hasMovedRef.current = false;
      wasAlreadySelectedRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      return;
    }

    const startLayer = active.startLayer;
    const docDeltaX = (e.clientX - active.startClientX) / z;
    const docDeltaY = (e.clientY - active.startClientY) / z;

    let nextLayer: InvitationLayer;

    if (active.mode === 'move') {
      const clampedX = clamp(
        roundGeom(startLayer.x + docDeltaX),
        0,
        Math.max(0, canvasW - startLayer.width),
      );
      const clampedY = clamp(
        roundGeom(startLayer.y + docDeltaY),
        0,
        Math.max(0, canvasH - startLayer.height),
      );

      nextLayer = {
        ...startLayer,
        x: clampedX,
        y: clampedY,
      };
    } else if (active.mode === 'resize' && active.corner) {
      const signs = RESIZE_SIGNS[active.corner];
      const dirX = signs.x;
      const dirY = signs.y;

      const radians = toRadians(-startLayer.rotation);
      const cosR = Math.cos(radians);
      const sinR = Math.sin(radians);
      const localDX = docDeltaX * cosR - docDeltaY * sinR;
      const localDY = docDeltaX * sinR + docDeltaY * cosR;

      const isAsset = startLayer.type === 'asset';
      const minW = isAsset ? MIN_ASSET_W : MIN_TEXT_W;
      const minH = isAsset ? MIN_ASSET_H : MIN_TEXT_H;
      const maxW = canvasW * MAX_SIZE_FACTOR;
      const maxH = canvasH * MAX_SIZE_FACTOR;

      let nextW = clamp(
        roundGeom(startLayer.width + dirX * localDX),
        minW,
        maxW,
      );
      let nextH = clamp(
        roundGeom(startLayer.height + dirY * localDY),
        minH,
        maxH,
      );

      if (isAsset && startLayer.width > 0 && startLayer.height > 0) {
        const aspect = startLayer.width / startLayer.height;
        if (Math.abs(localDX) >= Math.abs(localDY)) {
          nextH = clamp(roundGeom(nextW / aspect), minH, maxH);
          nextW = clamp(roundGeom(nextH * aspect), minW, maxW);
        } else {
          nextW = clamp(roundGeom(nextH * aspect), minW, maxW);
          nextH = clamp(roundGeom(nextW / aspect), minH, maxH);
        }
      }

      const shiftLocalX = dirX * (nextW - startLayer.width) / 2;
      const shiftLocalY = dirY * (nextH - startLayer.height) / 2;

      const radPos = toRadians(startLayer.rotation);
      const worldShiftX = shiftLocalX * Math.cos(radPos) - shiftLocalY * Math.sin(radPos);
      const worldShiftY = shiftLocalX * Math.sin(radPos) + shiftLocalY * Math.cos(radPos);

      const startCenterX = startLayer.x + startLayer.width / 2;
      const startCenterY = startLayer.y + startLayer.height / 2;
      const nextCenterX = startCenterX + worldShiftX;
      const nextCenterY = startCenterY + worldShiftY;

      nextLayer = {
        ...startLayer,
        x: roundGeom(nextCenterX - nextW / 2),
        y: roundGeom(nextCenterY - nextH / 2),
        width: nextW,
        height: nextH,
      };
    } else if (active.mode === 'rotate') {
      const centerX = (active.centerX ?? startLayer.x + startLayer.width / 2);
      const centerY = (active.centerY ?? startLayer.y + startLayer.height / 2);

      const docPoint = clientToDocument(e.clientX, e.clientY);
      const currentAngle =
        Math.atan2(docPoint.y - centerY, docPoint.x - centerX) * (180 / Math.PI);

      let rawRotation = startLayer.rotation + (currentAngle - (active.startPointerAngle ?? 0));

      if (e.shiftKey) {
        rawRotation = Math.round(rawRotation / SNAP_DEGREES) * SNAP_DEGREES;
      }

      const nextRotation = roundGeom(normalizeRotation(rawRotation));

      nextLayer = {
        ...startLayer,
        rotation: nextRotation,
      };
    } else {
      return;
    }

    onDocumentChangeRef.current({
      ...doc,
      layers: doc.layers.map((l) =>
        l.id === active.layerId ? nextLayer : l,
      ),
    });
  }, [clientToDocument]);

  // ── Pointer up ──
  const handlePointerUp = useCallback((e: PointerEvent) => {
    const active = interactionRef.current;
    if (!active || e.pointerId !== active.pointerId) return;
    finishInteraction();
    try {
      (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  }, [finishInteraction]);

  // ── Pointer cancel ──
  const handlePointerCancel = useCallback((e: PointerEvent) => {
    const active = interactionRef.current;
    if (!active || e.pointerId !== active.pointerId) return;
    cancelInteraction(false);
  }, [cancelInteraction]);

  // ── Start handlers ──

  const startInteraction = useCallback((active: ActiveInteraction) => {
    interactionRef.current = active;
    hasMovedRef.current = false;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    try {
      artboardWrapperRef.current?.setPointerCapture?.(active.pointerId);
    } catch {
      // ignore
    }
  }, [handlePointerMove, handlePointerUp, handlePointerCancel]);

  const handleStartMove = useCallback(
    (event: React.PointerEvent, layer: InvitationLayer) => {
      event.preventDefault();
      event.stopPropagation();

      if (editingIdRef.current === layer.id) return;

      wasAlreadySelectedRef.current = selectedIdRef.current === layer.id;
      onSelectRef.current(layer.id);

      const active: ActiveInteraction = {
        mode: 'move',
        pointerId: event.pointerId,
        layerId: layer.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayer: { ...layer, props: { ...layer.props } },
        startDocument: JSON.parse(JSON.stringify(documentRef.current)),
      };

      startInteraction(active);
    },
    [startInteraction],
  );

  const handleStartResize = useCallback(
    (event: React.PointerEvent, layer: InvitationLayer, corner: ResizeCorner) => {
      event.preventDefault();
      event.stopPropagation();

      if (editingIdRef.current === layer.id && layer.type === 'text') {
        const props = layer.props as TextLayerProps;
        onEditingFinishRef.current(layer.id, props.content);
      }

      onSelectRef.current(layer.id);

      const active: ActiveInteraction = {
        mode: 'resize',
        pointerId: event.pointerId,
        layerId: layer.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayer: { ...layer, props: { ...layer.props } },
        startDocument: JSON.parse(JSON.stringify(documentRef.current)),
        corner,
      };

      startInteraction(active);
    },
    [startInteraction],
  );

  const handleStartRotate = useCallback(
    (event: React.PointerEvent, layer: InvitationLayer) => {
      event.preventDefault();
      event.stopPropagation();

      if (editingIdRef.current === layer.id && layer.type === 'text') {
        const props = layer.props as TextLayerProps;
        onEditingFinishRef.current(layer.id, props.content);
      }

      onSelectRef.current(layer.id);

      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      const docPoint = clientToDocument(event.clientX, event.clientY);
      const startPointerAngle =
        Math.atan2(docPoint.y - centerY, docPoint.x - centerX) * (180 / Math.PI);

      const active: ActiveInteraction = {
        mode: 'rotate',
        pointerId: event.pointerId,
        layerId: layer.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayer: { ...layer, props: { ...layer.props } },
        startDocument: JSON.parse(JSON.stringify(documentRef.current)),
        startPointerAngle,
        centerX,
        centerY,
      };

      startInteraction(active);
    },
    [startInteraction, clientToDocument],
  );

  // ── Double-click handler ──
  const handleDoubleClick = useCallback(
    (id: string) => {
      const doc = documentRef.current;
      const layer = doc.layers.find((l) => l.id === id);
      if (!layer || layer.type !== 'text') return;

      if (interactionRef.current) {
        cancelInteraction(false);
      }

      onSelectRef.current(id);
      const props = layer.props as TextLayerProps;
      onEditingStartRef.current(id, props.content);
    },
    [cancelInteraction],
  );

  // ── Editing blur handler ──
  const handleEditingBlur = useCallback(
    (id: string, content: string) => {
      const doc = documentRef.current;
      const before = JSON.parse(JSON.stringify(doc));

      const after = {
        ...doc,
        layers: doc.layers.map((l) =>
          l.id === id && l.type === 'text'
            ? { ...l, props: { ...l.props, content } }
            : l,
        ),
      };
      onDocumentChangeRef.current(after);

      if (onTextEditCommitRef.current) {
        onTextEditCommitRef.current(before, after);
      }

      onEditingFinishRef.current(id, content);
    },
    [],
  );

  // ── Toolbar action: update text props ──
  const handleToolbarPropertyChange = useCallback(
    (patch: Partial<TextLayerProps>) => {
      const doc = documentRef.current;
      if (!selectedIdRef.current) return;

      const layer = doc.layers.find((l) => l.id === selectedIdRef.current);
      if (!layer || layer.type !== 'text') return;

      const before = JSON.parse(JSON.stringify(doc));

      const after = {
        ...doc,
        layers: doc.layers.map((l) =>
          l.id === selectedIdRef.current && l.type === 'text'
            ? { ...l, props: { ...l.props, ...patch } }
            : l,
        ),
      };

      onDocumentChangeRef.current(after);

      if (onPropertyCommitRef.current) {
        onPropertyCommitRef.current(before, after);
      }
    },
    [],
  );

  // ── Toolbar: font size ──
  const handleFontSizeChange = useCallback(
    (size: number) => {
      handleToolbarPropertyChange({ fontSize: size });
    },
    [handleToolbarPropertyChange],
  );

  // ── Toolbar: bold toggle ──
  const handleBoldToggle = useCallback(() => {
    const doc = documentRef.current;
    if (!selectedIdRef.current) return;

    const layer = doc.layers.find((l) => l.id === selectedIdRef.current);
    if (!layer || layer.type !== 'text') return;

    const props = layer.props as TextLayerProps;
    const newWeight = props.weight >= 600 ? 400 : 700;
    handleToolbarPropertyChange({ weight: newWeight });
  }, [handleToolbarPropertyChange]);

  // ── Toolbar: alignment ──
  const handleAlignChange = useCallback(
    (align: 'left' | 'center' | 'right') => {
      handleToolbarPropertyChange({ align });
    },
    [handleToolbarPropertyChange],
  );

  // ── Toolbar: colour ──
  const handleColorChange = useCallback(
    (color: string) => {
      handleToolbarPropertyChange({ color });
    },
    [handleToolbarPropertyChange],
  );

  // ── Escape key ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (previewOpen) return;

      const active = interactionRef.current;
      if (active) {
        cancelInteraction(true);
        return;
      }

      const editId = editingIdRef.current;
      if (editId) {
        if (onCancelEditingRef.current) {
          onCancelEditingRef.current(editId);
        } else {
          onEditingFinishRef.current(editId, '');
        }
        return;
      }

      onDeselectRef.current();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewOpen, cancelInteraction]);

  // ── Cancel interaction when preview opens ──
  useEffect(() => {
    if (previewOpen && interactionRef.current) {
      cancelInteraction(false);
    }
    if (previewOpen && editingIdRef.current) {
      const doc = documentRef.current;
      const layer = doc.layers.find((l) => l.id === editingIdRef.current);
      if (layer && layer.type === 'text') {
        onEditingFinishRef.current(editingIdRef.current, (layer.props as TextLayerProps).content);
      }
    }
  }, [previewOpen, cancelInteraction]);

  // ── Cancel interaction when interactionEpoch changes ──
  useEffect(() => {
    if (interactionEpoch === undefined || interactionEpoch === 0) return;
    if (interactionRef.current) {
      cancelInteraction(false);
    }
    if (editingIdRef.current) {
      const doc = documentRef.current;
      const layer = doc.layers.find((l) => l.id === editingIdRef.current);
      if (layer && layer.type === 'text') {
        onEditingFinishRef.current(editingIdRef.current, (layer.props as TextLayerProps).content);
      } else {
        onEditingFinishRef.current(editingIdRef.current, '');
      }
    }
  }, [interactionEpoch, cancelInteraction]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (interactionRef.current) {
        interactionRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
      }
    };
  }, [handlePointerMove, handlePointerUp, handlePointerCancel]);

  // ── Zoom controls ──
  const zoomIn = useCallback(() => {
    setZoomValue((z) => Math.min(200, z + 10));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomValue((z) => Math.max(25, z - 10));
  }, []);

  const zoomFit = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const rect = ws.getBoundingClientRect();
    const padX = 64;
    const padY = 64;
    const availW = rect.width - padX;
    const availH = rect.height - padY;
    const canvasW = document.canvas.width;
    const canvasH = document.canvas.height;
    const optimal = Math.min(availW / canvasW, availH / canvasH, 1.5);
    setZoomValue(Math.round(optimal * 100));
  }, [document.canvas.width, document.canvas.height]);

  // ── Zoom input state ──
  const [zoomInputActive, setZoomInputActive] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState('');
  const zoomInputRef = useRef<HTMLInputElement>(null);

  const handleZoomBadgeClick = useCallback(() => {
    setZoomInputValue(String(zoomValue));
    setZoomInputActive(true);
    setTimeout(() => {
      zoomInputRef.current?.select();
    }, 0);
  }, [zoomValue]);

  const commitZoomInput = useCallback(() => {
    const parsed = parseInt(zoomInputValue, 10);
    if (!isNaN(parsed)) {
      setZoomValue(clamp(parsed, 25, 200));
    }
    setZoomInputActive(false);
  }, [zoomInputValue]);

  const handleZoomInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitZoomInput();
      if (e.key === 'Escape') setZoomInputActive(false);
    },
    [commitZoomInput],
  );

  // ── Ctrl/Cmd + scroll wheel zoom ──
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = e.deltaY;
      const step = Math.abs(delta) < 20 ? 5 : 10;
      const direction = delta > 0 ? -1 : 1;

      setZoomValue((z) => clamp(z + direction * step, 25, 200));
    };

    ws.addEventListener('wheel', handleWheel, { passive: false });
    return () => ws.removeEventListener('wheel', handleWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ctrl/Cmd + = / - keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
      }

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomValue((z) => Math.min(200, z + 10));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoomValue((z) => Math.max(25, z - 10));
      } else if (e.key === '0') {
        e.preventDefault();
        zoomFit();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomFit]);

  // ── Asset drop handlers ──

  const isValidAssetDrag = useCallback((e: React.DragEvent): string | null => {
    const wedoraData = e.dataTransfer.getData(WEDORA_ASSET_MIME);
    if (wedoraData) {
      try {
        const parsed = JSON.parse(wedoraData);
        if (parsed && typeof parsed.assetId === 'string' && parsed.assetId) {
          return parsed.assetId;
        }
      } catch {
        // fall through
      }
    }

    const textData = e.dataTransfer.getData('text/plain');
    if (textData && /^[a-f0-9-]{36}$/i.test(textData.trim())) {
      return textData.trim();
    }

    return null;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (previewOpen || !assetsLoaded) return;

    const assetId = isValidAssetDrag(e);
    if (!assetId) return;

    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) {
      setIsDragOver(true);
    }
  }, [previewOpen, assetsLoaded, isValidAssetDrag]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (previewOpen || !assetsLoaded) return;

    const assetId = isValidAssetDrag(e);
    if (!assetId) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [previewOpen, assetsLoaded, isValidAssetDrag]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragOver(false);

    if (previewOpen || !assetsLoaded) return;

    const assetId = isValidAssetDrag(e);
    if (!assetId) return;

    const artboardRect = artboardWrapperRef.current?.getBoundingClientRect();
    if (!artboardRect) return;

    const z = zoomRef.current;
    const localX = (e.clientX - artboardRect.left) / z;
    const localY = (e.clientY - artboardRect.top) / z;

    const doc = documentRef.current;
    if (
      localX < 0 || localY < 0 ||
      localX > doc.canvas.width ||
      localY > doc.canvas.height
    ) return;

    onAssetDropRef.current?.(assetId, localX, localY);
  }, [previewOpen, assetsLoaded, isValidAssetDrag]);

  // ── Toolbar visibility and positioning ──
  const toolbarVisible = selectedLayer?.type === 'text';
  const toolbarStyle = useMemo((): React.CSSProperties => {
    if (!toolbarVisible || !selectedLayer) return { display: 'none' };

    const layer = selectedLayer;
    const z = zoomDecimal;

    const layerCenterX = layer.x + layer.width / 2;
    const layerCenterY = layer.y + layer.height / 2;

    const radians = toRadians(layer.rotation);
    const halfVisualHeight =
      Math.abs((layer.height / 2) * Math.cos(radians)) +
      Math.abs((layer.width / 2) * Math.sin(radians));

    const visualTopDoc = layerCenterY - halfVisualHeight;
    const visualTop = visualTopDoc * z;

    const wsRect = workspaceRef.current?.getBoundingClientRect();
    const workspaceWidth = wsRect?.width ?? 800;

    const toolbarEstWidth = 340;
    let left = layerCenterX * z - toolbarEstWidth / 2;

    const leftMin = 8;
    const leftMax = workspaceWidth - toolbarEstWidth - 8;
    left = clamp(left, leftMin, leftMax);

    const positionAbove = visualTop >= TOOLBAR_HEIGHT_EST + TOOLBAR_OFFSET;
    const top = positionAbove
      ? visualTop - TOOLBAR_HEIGHT_EST - TOOLBAR_OFFSET
      : (layerCenterY + halfVisualHeight) * z + TOOLBAR_OFFSET;

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [toolbarVisible, selectedLayer, zoomDecimal]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#faf7f2] relative overflow-hidden">
      {/* Canvas area */}
      <div
        ref={workspaceRef}
        className="flex-1 flex items-center justify-center overflow-auto relative"
        style={{
          backgroundImage: GRID_PATTERN,
          backgroundSize: '20px 20px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onDeselect();
          }
        }}
      >
        <div
          ref={artboardWrapperRef}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative ${isDragOver ? 'ring-2 ring-[#b8925a] ring-offset-2 rounded-sm' : ''}`}
          style={{
            width: `${document.canvas.width * zoomDecimal}px`,
            height: `${document.canvas.height * zoomDecimal}px`,
            transition: 'box-shadow 0.15s ease-out',
            boxShadow: isDragOver
              ? '0 0 0 4px rgba(184, 146, 90, 0.25), 0 2px 24px rgba(0,0,0,0.06)'
              : '0 2px 24px rgba(0,0,0,0.06)',
          }}
        >
          <InvitationRenderer
            document={document}
            scale={zoomDecimal}
            assetLookup={assetLookup}
            interactive={true}
            selectedId={selectedId}
            editingId={editingId}
            onSelect={onSelect}
            onBackgroundClick={onDeselect}
            onDoubleClick={handleDoubleClick}
            onTextChange={handleTextChange}
            onEditingFocus={() => {}}
            onEditingBlur={handleEditingBlur}
            onStartMove={handleStartMove}
            onStartResize={handleStartResize}
            onStartRotate={handleStartRotate}
          />
        </div>

        {/* Floating toolbar */}
        <FloatingToolbar
          style={toolbarStyle}
          visible={toolbarVisible}
          fontSize={selectedLayer ? (selectedLayer.props as TextLayerProps).fontSize : 16}
          weight={selectedLayer ? (selectedLayer.props as TextLayerProps).weight : 400}
          align={selectedLayer ? (selectedLayer.props as TextLayerProps).align : 'center'}
          color={selectedLayer ? (selectedLayer.props as TextLayerProps).color : '#3a3430'}
          onFontSizeChange={handleFontSizeChange}
          onBoldToggle={handleBoldToggle}
          onAlignChange={handleAlignChange}
          onColorChange={handleColorChange}
        />
      </div>

      {/* Zoom controls — bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-full border border-[#eee7df] shadow-sm px-2 py-1.5 z-10">
        <button
          onClick={zoomOut}
          disabled={zoomValue <= 25}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out (Ctrl/⌘ –)"
          aria-label="Zoom out"
        >
          <i className="ri-subtract-line text-sm" />
        </button>

        <button
          onClick={zoomFit}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer"
          title="Fit to screen (Ctrl/⌘ 0)"
          aria-label="Fit to screen"
        >
          <i className="ri-fullscreen-line text-sm" />
        </button>

        {zoomInputActive ? (
          <div className="relative flex items-center">
            <input
              ref={zoomInputRef}
              type="text"
              inputMode="numeric"
              value={zoomInputValue}
              onChange={(e) => setZoomInputValue(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitZoomInput}
              onKeyDown={handleZoomInputKeyDown}
              className="w-14 text-center text-[11px] font-label font-medium text-foreground-700 bg-background-50 border border-background-200 rounded-md outline-none focus:ring-1 focus:ring-[#d9808d] py-0.5 px-1"
              aria-label="Zoom percentage"
            />
            <span className="absolute right-1.5 text-[10px] text-foreground-400 pointer-events-none">%</span>
          </div>
        ) : (
          <button
            onClick={handleZoomBadgeClick}
            className="w-10 text-[11px] font-label font-medium text-foreground-700 text-center select-none hover:bg-background-100 rounded-md py-0.5 cursor-pointer transition-colors"
            title="Click to enter a zoom value"
            aria-label="Current zoom level, click to change"
          >
            {zoomValue}%
          </button>
        )}

        <button
          onClick={zoomIn}
          disabled={zoomValue >= 200}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in (Ctrl/⌘ +)"
          aria-label="Zoom in"
        >
          <i className="ri-add-line text-sm" />
        </button>
      </div>
    </div>
  );
}