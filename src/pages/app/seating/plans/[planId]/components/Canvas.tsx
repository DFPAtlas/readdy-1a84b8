import { useState, useRef, useCallback, useEffect, useMemo, forwardRef } from 'react';
import type { SeatingPlan, TableWithData, RoomObject, BackgroundAsset, SeatingZone, SeatingSeat } from '@/types/seating';
import DemoHoverTooltip, { type HoverTarget } from './DemoHoverTooltip';

interface CanvasProps {
  plan: SeatingPlan; tables: TableWithData[]; roomObjects: RoomObject[];
  zones: SeatingZone[]; backgroundAsset: BackgroundAsset | null;
  zoom: number; panOffset: { x: number; y: number };
  showGrid: boolean; snapEnabled: boolean; showGuides: boolean;
  isReadOnly: boolean;
  selectedTableIds: Set<string>; selectedObjectIds: Set<string>;
  selectedSeatId: string | null;
  draggingTableId: string | null; draggingObjectId: string | null;
  dragOverTableId: string | null;
  isDemo?: boolean;
  layerVisibility?: Record<string, boolean>;
  onSelectTable: (id: string, multi: boolean) => void;
  onSelectObject: (id: string, multi: boolean) => void;
  onSelectSeat: (id: string | null) => void;
  onMoveTableLocal: (id: string, x: number, y: number) => void;
  onMoveObjectLocal: (id: string, x: number, y: number) => void;
  onCommitMove: (id: string, kind: 'table' | 'object', x: number, y: number, startX: number, startY: number) => Promise<void>;
  onRotateTableLocal: (id: string, rot: number) => void;
  onRotateTable: (id: string, rot: number) => Promise<void>;
  onResizeObject: (id: string, w: number, h: number) => Promise<void>;
  onAssignGuestToSeat: (guestId: string, tableId: string, seatId?: string) => Promise<void>;
  onRemoveGuest: (assignmentId: string, guestId: string, seatId?: string) => Promise<void>;
  onDeleteTable: (id: string) => Promise<void>;
  onDeleteObject: (id: string) => Promise<void>;
  onDeleteSelected: () => void;
  onZoomChange: (z: number) => void;
  onPanChange: (p: { x: number; y: number }) => void;
  onSetDraggingTable: (id: string | null) => void;
  onSetDraggingObject: (id: string | null) => void;
  onSetDragOverTable: (id: string | null) => void;
  onUpdatePlan?: (updates: Partial<SeatingPlan>) => void;
}

const SNAP_THRESHOLD = 5;
const CANVAS_PADDING = 100;
const HANDLE_SIZE = 12;
const LONG_PRESS_MS = 250;

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

const colourMap: Record<string, { fill: string; border: string; text: string; ring: string }> = {
  rose: { fill: 'rgba(253,230,224,0.85)', border: 'rgba(244,163,154,0.9)', text: '#be123c', ring: 'rgba(244,163,154,0.6)' },
  sage: { fill: 'rgba(213,239,220,0.85)', border: 'rgba(139,201,160,0.9)', text: '#166534', ring: 'rgba(139,201,160,0.6)' },
  lavender: { fill: 'rgba(226,222,245,0.85)', border: 'rgba(181,168,228,0.9)', text: '#6d28d9', ring: 'rgba(181,168,228,0.6)' },
  amber: { fill: 'rgba(254,235,200,0.85)', border: 'rgba(251,191,86,0.9)', text: '#92400e', ring: 'rgba(251,191,86,0.6)' },
  sky: { fill: 'rgba(214,234,248,0.85)', border: 'rgba(142,199,234,0.9)', text: '#075985', ring: 'rgba(142,199,234,0.6)' },
  coral: { fill: 'rgba(255,218,210,0.85)', border: 'rgba(245,158,138,0.9)', text: '#b33a27', ring: 'rgba(245,158,138,0.6)' },
  mint: { fill: 'rgba(200,244,230,0.85)', border: 'rgba(113,212,185,0.9)', text: '#0d6b5c', ring: 'rgba(113,212,185,0.6)' },
  cream: { fill: 'rgba(254,244,218,0.85)', border: 'rgba(243,212,130,0.9)', text: '#7c6800', ring: 'rgba(243,212,130,0.6)' },
  slate: { fill: 'rgba(234,236,240,0.85)', border: 'rgba(184,190,200,0.9)', text: '#4b5563', ring: 'rgba(184,190,200,0.6)' },
};

const objectStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  stage: { bg: 'rgba(248,248,250,0.9)', border: 'rgba(200,200,210,0.8)', text: '#6b7280', icon: 'ri-mic-line' },
  dance_floor: { bg: 'rgba(254,243,199,0.9)', border: 'rgba(252,211,77,0.8)', text: '#92400e', icon: 'ri-music-line' },
  bar: { bg: 'rgba(255,228,230,0.9)', border: 'rgba(251,164,164,0.8)', text: '#9f1239', icon: 'ri-goblet-line' },
  buffet: { bg: 'rgba(209,250,229,0.9)', border: 'rgba(110,231,183,0.8)', text: '#065f46', icon: 'ri-restaurant-line' },
  dj_area: { bg: 'rgba(237,233,254,0.9)', border: 'rgba(196,181,253,0.8)', text: '#5b21b6', icon: 'ri-disc-line' },
  cake_table: { bg: 'rgba(252,231,243,0.9)', border: 'rgba(249,168,212,0.8)', text: '#9d174d', icon: 'ri-cake-line' },
  gift_table: { bg: 'rgba(219,234,254,0.9)', border: 'rgba(147,197,253,0.8)', text: '#1e40af', icon: 'ri-gift-line' },
  photo_booth: { bg: 'rgba(254,249,195,0.9)', border: 'rgba(253,224,71,0.8)', text: '#854d0e', icon: 'ri-camera-line' },
};

function snapValue(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

function getCapacityColour(pct: number): string {
  if (pct > 1) return '#ef4444';
  if (pct > 0.75) return '#f59e0b';
  return '#10b981';
}

export default forwardRef<HTMLDivElement, CanvasProps>(function Canvas({
  plan, tables, roomObjects, zones, backgroundAsset,
  zoom, panOffset, showGrid, snapEnabled, showGuides, isReadOnly,
  selectedTableIds, selectedObjectIds, selectedSeatId,
  draggingTableId, draggingObjectId, dragOverTableId,
  isDemo = false,
  layerVisibility,
  onSelectTable, onSelectObject, onSelectSeat,
  onMoveTableLocal, onMoveObjectLocal, onCommitMove,
  onRotateTableLocal, onRotateTable,
  onAssignGuestToSeat, onRemoveGuest, onDeleteTable, onDeleteObject,
  onZoomChange, onPanChange, onSetDraggingTable, onSetDraggingObject, onSetDragOverTable,
  onUpdatePlan,
}, ref) {
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle>(null);
  const [rotateStartRotation, setRotateStartRotation] = useState<number>(0);
  const [alignmentGuides, setAlignmentGuides] = useState<{ horizontal: { y: number; x1: number; x2: number }[]; vertical: { x: number; y1: number; y2: number }[] }>({ horizontal: [], vertical: [] });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, handle: null as ResizeHandle });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragTargetRef = useRef<{ id: string; kind: 'table' | 'object'; startX: number; startY: number } | null>(null);
  const hasMovedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDragReadyRef = useRef(false);
  const touchDragTargetRef = useRef<{ id: string; kind: 'table' | 'object'; startX: number; startY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStateRef = useRef<{
    pinching: boolean; initialDist: number; initialZoom: number;
    initialPanX: number; initialPanY: number; centerX: number; centerY: number;
    lastPanX: number; lastPanY: number; lastCenterX: number; lastCenterY: number;
  }>({ pinching: false, initialDist: 0, initialZoom: 1, initialPanX: 0, initialPanY: 0, centerX: 0, centerY: 0, lastPanX: 0, lastPanY: 0, lastCenterX: 0, lastCenterY: 0 });

  // ── Demo hover tooltip state ──
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const canvasW = plan.canvas_width || 1200;
  const canvasH = plan.canvas_height || 900;
  const gridSize = plan.grid_size || 20;

  // Merge forwarded ref into our internal container ref
  useEffect(() => {
    if (ref && 'current' in ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = containerRef.current;
    }
  }, [ref]);

  // ── Keyboard modifiers ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSpaceHeld(true); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Convert screen coords to canvas coords ──
  const screenToCanvas = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!containerRef.current) return { x: clientX, y: clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panOffset.x) / zoom - CANVAS_PADDING,
      y: (clientY - rect.top - panOffset.y) / zoom - CANVAS_PADDING,
    };
  }, [zoom, panOffset]);

  // ── Canvas mouse down (pan on empty canvas, or on elements with space held) ──
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const isOnElement = e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-canvas-object]');
    // Space+click on element = pan (table/object handlers bail out when spaceHeld)
    if (isOnElement && !spaceHeld) return;
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      setPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  }, [panOffset, spaceHeld]);

  useEffect(() => {
    if (!panning) return;
    const move = (e: MouseEvent) => {
      let newX = e.clientX - panStartRef.current.x;
      let newY = e.clientY - panStartRef.current.y;
      // Clamp pan so at least 200px of canvas content stays visible
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const canvasScreenW = (canvasW + CANVAS_PADDING * 2) * zoom;
        const canvasScreenH = (canvasH + CANVAS_PADDING * 2) * zoom;
        const minX = -(canvasScreenW - 200);
        const maxX = rect.width - 200;
        const minY = -(canvasScreenH - 200);
        const maxY = rect.height - 200;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }
      onPanChange({ x: newX, y: newY });
    };
    const up = () => setPanning(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [panning, onPanChange, canvasW, canvasH, zoom]);

  // ── Resize ──
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    if (isReadOnly || !onUpdatePlan || !handle) return;
    e.stopPropagation(); e.preventDefault();
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: canvasW, h: canvasH, handle };
    setResizingHandle(handle);
  }, [isReadOnly, onUpdatePlan, canvasW, canvasH]);

  useEffect(() => {
    if (!resizingHandle) return;
    const move = (e: MouseEvent) => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => {
        const { x, y, w, h, handle } = resizeStartRef.current;
        if (!handle) return;
        let dx = (e.clientX - x) / zoom;
        let dy = (e.clientY - y) / zoom;
        if (snapEnabled) { dx = snapValue(dx, gridSize, snapEnabled); dy = snapValue(dy, gridSize, snapEnabled); }
        let nw = w, nh = h;
        switch (handle) {
          case 'e': nw = Math.max(400, w + dx); break;
          case 'w': nw = Math.max(400, w - dx); break;
          case 's': nh = Math.max(300, h + dy); break;
          case 'n': nh = Math.max(300, h - dy); break;
          case 'se': nw = Math.max(400, w + dx); nh = Math.max(300, h + dy); break;
          case 'sw': nw = Math.max(400, w - dx); nh = Math.max(300, h + dy); break;
          case 'ne': nw = Math.max(400, w + dx); nh = Math.max(300, h - dy); break;
          case 'nw': nw = Math.max(400, w - dx); nh = Math.max(300, h - dy); break;
        }
        if (Math.round(nw) !== Math.round(w) || Math.round(nh) !== Math.round(h)) {
          onUpdatePlan({ canvas_width: Math.round(nw), canvas_height: Math.round(nh) });
        }
      });
    };
    const up = () => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      setResizingHandle(null);
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [resizingHandle, zoom, snapEnabled, gridSize, onUpdatePlan]);

  // ── Zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    onZoomChange(Math.max(0.1, Math.min(5, +(zoom + delta).toFixed(1))));
  }, [zoom, onZoomChange]);

  // ── Table drag (local + RAF) ──
  const handleTableMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
    if (isReadOnly || e.button !== 0) return;
    // Space+left-click on element = pan (let canvas handler deal with it)
    if (spaceHeld) return;
    e.stopPropagation();
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.locked) return;
    dragTargetRef.current = { id: tableId, kind: 'table', startX: table.position_x, startY: table.position_y };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    onSetDraggingTable(tableId);
    if (!e.shiftKey || !selectedTableIds.has(tableId)) {
      onSelectTable(tableId, e.shiftKey);
    }
  }, [tables, isReadOnly, onSetDraggingTable, onSelectTable, selectedTableIds, spaceHeld]);

  // ── Object drag (local + RAF) ──
  const handleObjectMouseDown = useCallback((e: React.MouseEvent, objectId: string) => {
    if (isReadOnly || e.button !== 0) return;
    // Space+left-click on element = pan (let canvas handler deal with it)
    if (spaceHeld) return;
    e.stopPropagation();
    const obj = roomObjects.find((o) => o.id === objectId);
    if (!obj || obj.locked) return;
    dragTargetRef.current = { id: objectId, kind: 'object', startX: obj.x_position, startY: obj.y_position };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    onSetDraggingObject(objectId);
    if (!e.shiftKey || !selectedObjectIds.has(objectId)) {
      onSelectObject(objectId, e.shiftKey);
    }
  }, [roomObjects, isReadOnly, onSetDraggingObject, onSelectObject, selectedObjectIds, spaceHeld]);

  // ── Global mouse move (drag with RAF) ──
  useEffect(() => {
    if (!draggingTableId && !draggingObjectId) return;
    const move = (e: MouseEvent) => {
      if (!dragTargetRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      if (!hasMovedRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) hasMovedRef.current = true;
      if (!hasMovedRef.current) return;

      // RAF-throttle
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const start = dragTargetRef.current!;
        let nx = start.startX + (e.clientX - dragStartRef.current.x) / zoom;
        let ny = start.startY + (e.clientY - dragStartRef.current.y) / zoom;
        if (snapEnabled) { nx = snapValue(nx, gridSize, snapEnabled); ny = snapValue(ny, gridSize, snapEnabled); }

        // Alignment guides
        let finalNx = nx; let finalNy = ny;
        const guides: { horizontal: { y: number; x1: number; x2: number }[]; vertical: { x: number; y1: number; y2: number }[] } = { horizontal: [], vertical: [] };
        if (showGuides && snapEnabled) {
          const allItems = [
            ...tables.filter((t) => t.id !== start.id).map((t) => ({ x: t.position_x, y: t.position_y, w: t.width, h: t.height, cx: t.position_x + t.width / 2, cy: t.position_y + t.height / 2, name: t.name })),
            ...roomObjects.filter((o) => o.id !== start.id && o.visible).map((o) => ({ x: o.x_position, y: o.y_position, w: o.width, h: o.height, cx: o.x_position + o.width / 2, cy: o.y_position + o.height / 2, name: o.name })),
          ];
          const srcItem = start.kind === 'table' ? tables.find((t) => t.id === start.id) : roomObjects.find((o) => o.id === start.id);
          if (srcItem) {
            const sw = start.kind === 'table' ? (srcItem as TableWithData).width : (srcItem as RoomObject).width;
            const sh = start.kind === 'table' ? (srcItem as TableWithData).height : (srcItem as RoomObject).height;
            const scx = finalNx + sw / 2; const scy = finalNy + sh / 2;
            const sr = finalNx + sw; const sb = finalNy + sh;
            for (const item of allItems) {
              const ir = item.x + item.w; const ib = item.y + item.h;
              // centre x alignment
              if (Math.abs(scx - item.cx) < SNAP_THRESHOLD) { finalNx = item.cx - sw / 2; guides.vertical.push({ x: item.cx, y1: Math.min(scy, item.cy), y2: Math.max(scy, item.cy) }); }
              // centre y alignment
              if (Math.abs(scy - item.cy) < SNAP_THRESHOLD) { finalNy = item.cy - sh / 2; guides.horizontal.push({ y: item.cy, x1: Math.min(scx, item.cx), x2: Math.max(scx, item.cx) }); }
              // left edge to left edge
              if (Math.abs(finalNx - item.x) < SNAP_THRESHOLD) { finalNx = item.x; guides.vertical.push({ x: item.x, y1: Math.min(scy, item.cy) - 20, y2: Math.max(scy, item.cy) + 20 }); }
              // left edge to right edge
              if (Math.abs(finalNx - ir) < SNAP_THRESHOLD) { finalNx = ir; guides.vertical.push({ x: ir, y1: Math.min(scy, item.cy) - 20, y2: Math.max(scy, item.cy) + 20 }); }
              // right edge to left edge
              if (Math.abs(sr - item.x) < SNAP_THRESHOLD) { finalNx = item.x - sw; guides.vertical.push({ x: item.x, y1: Math.min(scy, item.cy) - 20, y2: Math.max(scy, item.cy) + 20 }); }
              // right edge to right edge
              if (Math.abs(sr - ir) < SNAP_THRESHOLD) { finalNx = ir - sw; guides.vertical.push({ x: ir, y1: Math.min(scy, item.cy) - 20, y2: Math.max(scy, item.cy) + 20 }); }
              // top edge to top edge
              if (Math.abs(finalNy - item.y) < SNAP_THRESHOLD) { finalNy = item.y; guides.horizontal.push({ y: item.y, x1: Math.min(scx, item.cx) - 20, x2: Math.max(scx, item.cx) + 20 }); }
              // top edge to bottom edge
              if (Math.abs(finalNy - ib) < SNAP_THRESHOLD) { finalNy = ib; guides.horizontal.push({ y: ib, x1: Math.min(scx, item.cx) - 20, x2: Math.max(scx, item.cx) + 20 }); }
              // bottom edge to top edge
              if (Math.abs(sb - item.y) < SNAP_THRESHOLD) { finalNy = item.y - sh; guides.horizontal.push({ y: item.y, x1: Math.min(scx, item.cx) - 20, x2: Math.max(scx, item.cx) + 20 }); }
              // bottom edge to bottom edge
              if (Math.abs(sb - ib) < SNAP_THRESHOLD) { finalNy = ib - sh; guides.horizontal.push({ y: ib, x1: Math.min(scx, item.cx) - 20, x2: Math.max(scx, item.cx) + 20 }); }
            }
          }
          setAlignmentGuides(guides);
        }

        if (dragTargetRef.current!.kind === 'table') {
          onMoveTableLocal(dragTargetRef.current!.id, finalNx, finalNy);
        } else {
          onMoveObjectLocal(dragTargetRef.current!.id, finalNx, finalNy);
        }
      });
    };
    const up = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setAlignmentGuides({ horizontal: [], vertical: [] });
      if (dragTargetRef.current && hasMovedRef.current) {
        const start = dragTargetRef.current;
        const item = start.kind === 'table' ? tables.find((t) => t.id === start.id) : roomObjects.find((o) => o.id === start.id);
        if (item) {
          const finalX = start.kind === 'table' ? (item as TableWithData).position_x : (item as RoomObject).x_position;
          const finalY = start.kind === 'table' ? (item as TableWithData).position_y : (item as RoomObject).y_position;
          if (finalX !== start.startX || finalY !== start.startY) {
            onCommitMove(start.id, start.kind, finalX, finalY, start.startX, start.startY);
          }
        }
      }
      onSetDraggingTable(null); onSetDraggingObject(null);
      dragTargetRef.current = null;
      hasMovedRef.current = false;
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [draggingTableId, draggingObjectId, zoom, snapEnabled, gridSize, showGuides, onMoveTableLocal, onMoveObjectLocal, onCommitMove, onSetDraggingTable, onSetDraggingObject, tables, roomObjects]);

  // ── Touch gesture (pinch-zoom + pan) ──
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    if (touches.length === 2) {
      const t1Target = document.elementFromPoint(touches[0].clientX, touches[0].clientY);
      const t2Target = document.elementFromPoint(touches[1].clientX, touches[1].clientY);
      if ((t1Target as HTMLElement | null)?.closest('[data-canvas-object]') ||
          (t2Target as HTMLElement | null)?.closest('[data-canvas-object]')) return;
      e.preventDefault();
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const cx = (touches[0].clientX + touches[1].clientX) / 2;
      const cy = (touches[0].clientY + touches[1].clientY) / 2;
      touchStateRef.current = {
        pinching: true, initialDist: dist, initialZoom: zoom,
        initialPanX: panOffset.x, initialPanY: panOffset.y,
        centerX: cx, centerY: cy,
        lastPanX: panOffset.x, lastPanY: panOffset.y,
        lastCenterX: cx, lastCenterY: cy,
      };
    } else if (touches.length === 1) {
      const target = document.elementFromPoint(touches[0].clientX, touches[0].clientY);
      if ((target as HTMLElement | null)?.closest('[data-canvas-object]')) return;
      e.preventDefault();
      setPanning(true);
      panStartRef.current = { x: touches[0].clientX - panOffset.x, y: touches[0].clientY - panOffset.y };
    }
  }, [zoom, panOffset]);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current;
    if (ts.pinching && e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (ts.initialDist > 0) {
        const scale = dist / ts.initialDist;
        const newZoom = Math.max(0.1, Math.min(5, +(ts.initialZoom * scale).toFixed(2)));
        const panDx = cx - ts.lastCenterX;
        const panDy = cy - ts.lastCenterY;
        const zoomRatio = newZoom / ts.initialZoom;
        const anchorCanvasX = (ts.centerX - ts.initialPanX) / ts.initialZoom;
        const anchorCanvasY = (ts.centerY - ts.initialPanY) / ts.initialZoom;
        const newPanX = ts.centerX + panDx - anchorCanvasX * newZoom;
        const newPanY = ts.centerY + panDy - anchorCanvasY * newZoom;
        onZoomChange(newZoom);
        onPanChange({ x: Math.round(newPanX), y: Math.round(newPanY) });
        ts.lastCenterX = cx; ts.lastCenterY = cy;
        ts.lastPanX = newPanX; ts.lastPanY = newPanY;
      }
    } else if (panning && e.touches.length === 1) {
      let newX = e.touches[0].clientX - panStartRef.current.x;
      let newY = e.touches[0].clientY - panStartRef.current.y;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const canvasScreenW = (canvasW + CANVAS_PADDING * 2) * zoom;
        const canvasScreenH = (canvasH + CANVAS_PADDING * 2) * zoom;
        newX = Math.max(-(canvasScreenW - 200), Math.min(rect.width - 200, newX));
        newY = Math.max(-(canvasScreenH - 200), Math.min(rect.height - 200, newY));
      }
      onPanChange({ x: newX, y: newY });
    } else if (touchDragReadyRef.current && touchDragTargetRef.current && e.touches.length === 1) {
      // Touch drag for table/object
      const dx = (e.touches[0].clientX - touchStartRef.current.x) / zoom;
      const dy = (e.touches[0].clientY - touchStartRef.current.y) / zoom;
      if (!hasMovedRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) hasMovedRef.current = true;
      if (!hasMovedRef.current) return;
      let nx = touchDragTargetRef.current.startX + dx;
      let ny = touchDragTargetRef.current.startY + dy;
      if (snapEnabled) { nx = snapValue(nx, gridSize, snapEnabled); ny = snapValue(ny, gridSize, snapEnabled); }
      if (touchDragTargetRef.current.kind === 'table') {
        onMoveTableLocal(touchDragTargetRef.current.id, nx, ny);
      } else {
        onMoveObjectLocal(touchDragTargetRef.current.id, nx, ny);
      }
    }
  }, [panning, zoom, panOffset, snapEnabled, gridSize, onMoveTableLocal, onMoveObjectLocal, onZoomChange, onPanChange]);

  const handleCanvasTouchEnd = useCallback(() => {
    touchStateRef.current.pinching = false;
    setPanning(false);

    if (touchLongPressRef.current) { clearTimeout(touchLongPressRef.current); touchLongPressRef.current = null; }

    if (touchDragReadyRef.current && touchDragTargetRef.current && hasMovedRef.current) {
      const start = touchDragTargetRef.current;
      const item = start.kind === 'table' ? tables.find((t) => t.id === start.id) : roomObjects.find((o) => o.id === start.id);
      if (item) {
        const finalX = start.kind === 'table' ? (item as TableWithData).position_x : (item as RoomObject).x_position;
        const finalY = start.kind === 'table' ? (item as TableWithData).position_y : (item as RoomObject).y_position;
        if (finalX !== start.startX || finalY !== start.startY) {
          onCommitMove(start.id, start.kind, finalX, finalY, start.startX, start.startY);
        }
      }
    }
    touchDragReadyRef.current = false;
    touchDragTargetRef.current = null;
    hasMovedRef.current = false;
    onSetDraggingTable(null); onSetDraggingObject(null);
  }, [tables, roomObjects, onCommitMove, onSetDraggingTable, onSetDraggingObject]);

  // ── Touch handlers for tables/objects (long-press to drag) ──
  const handleTableTouchStart = useCallback((e: React.TouchEvent, tableId: string) => {
    if (isReadOnly) return;
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.locked) return;
    e.stopPropagation();
    touchDragTargetRef.current = { id: tableId, kind: 'table', startX: table.position_x, startY: table.position_y };
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    hasMovedRef.current = false;
    touchDragReadyRef.current = false;
    touchLongPressRef.current = setTimeout(() => {
      touchDragReadyRef.current = true;
      navigator.vibrate?.(10);
      onSetDraggingTable(tableId);
      onSelectTable(tableId, false);
    }, LONG_PRESS_MS);
  }, [tables, isReadOnly, onSetDraggingTable, onSelectTable]);

  const handleTableTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchLongPressRef.current) { clearTimeout(touchLongPressRef.current); touchLongPressRef.current = null; }
    if (!touchDragReadyRef.current && touchDragTargetRef.current) {
      // Short tap — select
      onSelectTable(touchDragTargetRef.current.id, false);
    }
    if (!touchDragReadyRef.current && !hasMovedRef.current) {
      onSetDraggingTable(null);
      touchDragTargetRef.current = null;
    }
  }, [onSelectTable, onSetDraggingTable]);

  const handleObjectTouchStart = useCallback((e: React.TouchEvent, objectId: string) => {
    if (isReadOnly) return;
    const obj = roomObjects.find((o) => o.id === objectId);
    if (!obj || obj.locked) return;
    e.stopPropagation();
    touchDragTargetRef.current = { id: objectId, kind: 'object', startX: obj.x_position, startY: obj.y_position };
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    hasMovedRef.current = false;
    touchDragReadyRef.current = false;
    touchLongPressRef.current = setTimeout(() => {
      touchDragReadyRef.current = true;
      navigator.vibrate?.(10);
      onSetDraggingObject(objectId);
      onSelectObject(objectId, false);
    }, LONG_PRESS_MS);
  }, [roomObjects, isReadOnly, onSetDraggingObject, onSelectObject]);

  const handleObjectTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchLongPressRef.current) { clearTimeout(touchLongPressRef.current); touchLongPressRef.current = null; }
    if (!touchDragReadyRef.current && touchDragTargetRef.current) {
      onSelectObject(touchDragTargetRef.current.id, false);
    }
    if (!touchDragReadyRef.current && !hasMovedRef.current) {
      onSetDraggingObject(null);
      touchDragTargetRef.current = null;
    }
  }, [onSelectObject, onSetDraggingObject]);

  // ── Drop ──
  const handleTableDragOver = (e: React.DragEvent, tableId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onSetDragOverTable(tableId); };
  const handleTableDrop = (e: React.DragEvent, tableId: string) => { e.preventDefault(); onSetDragOverTable(null); const guestId = e.dataTransfer.getData('text/plain'); if (guestId) onAssignGuestToSeat(guestId, tableId); };
  const handleTableDragLeave = () => onSetDragOverTable(null);

  // ── Seat click ──
  const handleSeatClick = (e: React.MouseEvent, seatId: string, tableId: string) => {
    e.stopPropagation();
    onSelectSeat(selectedSeatId === seatId ? null : seatId);
    onSelectTable(tableId, false);
  };

  // ── Memoised table list ──
  const renderedTables = useMemo(() => tables, [tables]);

  // ── Memoised object list ──
  const renderedObjects = useMemo(() => roomObjects.filter((o) => o.visible), [roomObjects]);

  // ── Background ──
  const bgImageUrl = backgroundAsset?.storage_path || null;

  // ── Resize handle cursor map ──
  const handleCursors: Record<string, string> = {
    nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
    e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
    sw: 'nesw-resize', w: 'ew-resize',
  };

  // Resize handles relative to room boundary (not CANVAS_PADDING)
  const handles: { key: string; style: React.CSSProperties }[] = [
    { key: 'nw', style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
    { key: 'n', style: { left: canvasW / 2 - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
    { key: 'ne', style: { left: canvasW - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
    { key: 'e', style: { left: canvasW - HANDLE_SIZE / 2, top: canvasH / 2 - HANDLE_SIZE / 2 } },
    { key: 'se', style: { left: canvasW - HANDLE_SIZE / 2, top: canvasH - HANDLE_SIZE / 2 } },
    { key: 's', style: { left: canvasW / 2 - HANDLE_SIZE / 2, top: canvasH - HANDLE_SIZE / 2 } },
    { key: 'sw', style: { left: -HANDLE_SIZE / 2, top: canvasH - HANDLE_SIZE / 2 } },
    { key: 'w', style: { left: -HANDLE_SIZE / 2, top: canvasH / 2 - HANDLE_SIZE / 2 } },
  ];

  // Object resize handles for selected object
  const objectHandles: { key: string; style: React.CSSProperties }[] = useMemo(() => {
    const sel = roomObjects.find((o) => selectedObjectIds.has(o.id));
    if (!sel) return [];
    const w = sel.width, h = sel.height;
    return [
      { key: 'nw', style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
      { key: 'n', style: { left: w / 2 - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
      { key: 'ne', style: { left: w - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
      { key: 'e', style: { left: w - HANDLE_SIZE / 2, top: h / 2 - HANDLE_SIZE / 2 } },
      { key: 'se', style: { left: w - HANDLE_SIZE / 2, top: h - HANDLE_SIZE / 2 } },
      { key: 's', style: { left: w / 2 - HANDLE_SIZE / 2, top: h - HANDLE_SIZE / 2 } },
      { key: 'sw', style: { left: -HANDLE_SIZE / 2, top: h - HANDLE_SIZE / 2 } },
      { key: 'w', style: { left: -HANDLE_SIZE / 2, top: h / 2 - HANDLE_SIZE / 2 } },
    ];
  }, [roomObjects, selectedObjectIds]);

  const objectResizeRef = useRef<{ objId: string; handle: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleObjectResizeStart = useCallback((e: React.MouseEvent, objId: string, handle: string) => {
    e.stopPropagation(); e.preventDefault();
    const obj = roomObjects.find((o) => o.id === objId);
    if (!obj) return;
    objectResizeRef.current = { objId, handle, startX: e.clientX, startY: e.clientY, startW: obj.width, startH: obj.height };
  }, [roomObjects]);

  useEffect(() => {
    if (!objectResizeRef.current) return;
    const r = objectResizeRef.current;
    const move = (e: MouseEvent) => {
      let dx = (e.clientX - r.startX) / zoom;
      let dy = (e.clientY - r.startY) / zoom;
      if (snapEnabled) { dx = snapValue(dx, gridSize, snapEnabled); dy = snapValue(dy, gridSize, snapEnabled); }
      let nw = r.startW, nh = r.startH;
      switch (r.handle) {
        case 'e': nw = Math.max(40, r.startW + dx); break;
        case 'w': nw = Math.max(40, r.startW - dx); break;
        case 's': nh = Math.max(40, r.startH + dy); break;
        case 'n': nh = Math.max(40, r.startH - dy); break;
        case 'se': nw = Math.max(40, r.startW + dx); nh = Math.max(40, r.startH + dy); break;
        case 'sw': nw = Math.max(40, r.startW - dx); nh = Math.max(40, r.startH + dy); break;
        case 'ne': nw = Math.max(40, r.startW + dx); nh = Math.max(40, r.startH - dy); break;
        case 'nw': nw = Math.max(40, r.startW - dx); nh = Math.max(40, r.startH - dy); break;
      }
      onMoveObjectLocal(r.objId, (roomObjects.find((o) => o.id === r.objId) as RoomObject | undefined)?.x_position ?? 0, (roomObjects.find((o) => o.id === r.objId) as RoomObject | undefined)?.y_position ?? 0);
    };
    const up = () => { objectResizeRef.current = null; };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [zoom, snapEnabled, gridSize, onMoveObjectLocal, roomObjects]);

  // ── Derived visibility ──
  const showTables = layerVisibility?.Tables !== false;
  const showSeats = layerVisibility?.Seats !== false;
  const showVenueObjects = layerVisibility?.['Venue objects'] !== false;
  const showBg = layerVisibility?.Background !== false;
  const showZones = layerVisibility?.Zones !== false;
  const showGuestLabels = layerVisibility?.['Guest labels'] !== false;

  const hideGridBelow = zoom < 0.4;
  const cursorStyle = panning ? 'grabbing' : 'grab';

  // ── Demo hover helpers ──
  const handleDemoMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDemo) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  }, [isDemo]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-background-50 overflow-hidden relative select-none touch-none"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleDemoMouseMove}
      onMouseEnter={() => isDemo && setHoverTarget({ kind: 'empty-canvas' })}
      onMouseLeave={() => isDemo && setHoverTarget(null)}
      onWheel={handleWheel}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleCanvasTouchMove}
      onTouchEnd={handleCanvasTouchEnd}
      onTouchCancel={handleCanvasTouchEnd}
      style={{ cursor: cursorStyle }}
    >
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          width: canvasW + CANVAS_PADDING * 2,
          height: canvasH + CANVAS_PADDING * 2,
        }}
      >
        {/* Room boundary */}
        <div
          className="absolute border-2 border-secondary-200 bg-white rounded-xl group/room"
          onMouseEnter={() => isDemo && setHoverTarget({ kind: 'room-boundary' })}
          onMouseLeave={() => isDemo && setHoverTarget(null)}
          style={{ left: CANVAS_PADDING, top: CANVAS_PADDING, width: canvasW, height: canvasH }}
        >
          {/* Grid — fixed backgroundSize (parent transform handles zoom) */}
          {showGrid && !hideGridBelow && (
            <div className="absolute inset-0 overflow-hidden rounded-xl" style={{
              backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
              backgroundSize: `${gridSize}px ${gridSize}px`,
              opacity: 0.5,
            }} />
          )}

          {/* Background image */}
          {bgImageUrl && backgroundAsset?.visible && showBg && (
            <div
              className="absolute"
              style={{
                left: backgroundAsset.x_position, top: backgroundAsset.y_position,
                width: backgroundAsset.width || canvasW, height: backgroundAsset.height || canvasH,
                opacity: backgroundAsset.opacity,
                transform: `rotate(${backgroundAsset.rotation || 0}deg)`,
                backgroundImage: `url(${bgImageUrl})`,
                backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                pointerEvents: backgroundAsset.locked ? 'none' : 'auto',
              }}
            />
          )}

          {/* Room label */}
          <span className="absolute top-3 left-4 text-[11px] text-foreground-300 font-label uppercase tracking-wider pointer-events-none">
            {plan.room_name || plan.room_label || 'Room'} · {plan.canvas_width}×{plan.canvas_height} {plan.measurement_unit || 'px'}
          </span>

          {/* Zones */}
          {showZones && zones.filter((z) => z.visible).map((zone) => (
            <div key={zone.id} className="absolute border border-dashed" style={{
              left: (zone.geometry_data as Record<string, number>)?.x || 0,
              top: (zone.geometry_data as Record<string, number>)?.y || 0,
              width: (zone.geometry_data as Record<string, number>)?.w || 100,
              height: (zone.geometry_data as Record<string, number>)?.h || 100,
              borderColor: zone.style_key || '#e5e7eb',
            }}>
              <span className="absolute top-1 left-1 text-[9px] text-foreground-400 pointer-events-none">{zone.name}</span>
            </div>
          ))}

          {/* Room objects */}
          {showVenueObjects && renderedObjects.map((obj) => {
            const isSelected = selectedObjectIds.has(obj.id);
            const isDragging = draggingObjectId === obj.id;
            const style = objectStyles[obj.object_type] || { bg: 'rgba(248,248,250,0.9)', border: 'rgba(200,200,210,0.8)', text: '#6b7280', icon: 'ri-shape-line' };
            return (
              <div key={obj.id} data-canvas-object="true"
                onMouseDown={(e) => handleObjectMouseDown(e, obj.id)}
                onTouchStart={(e) => handleObjectTouchStart(e, obj.id)}
                onTouchEnd={handleObjectTouchEnd}
                onMouseEnter={() => isDemo && setHoverTarget({ kind: 'object', id: obj.id, name: obj.name, type: obj.object_type })}
                onMouseLeave={() => isDemo && setHoverTarget(null)}
                className={`absolute flex flex-col items-center justify-center border-2 transition-shadow ${isSelected ? 'ring-2 ring-primary-400 z-10' : ''} ${isDragging ? 'opacity-70 scale-105 z-20' : ''} ${obj.locked ? 'cursor-default' : isReadOnly ? 'cursor-default' : 'cursor-grab'}`}
                style={{
                  left: 0, top: 0,
                  width: obj.width, height: obj.height,
                  transform: `translate3d(${obj.x_position}px, ${obj.y_position}px, 0) rotate(${obj.rotation || 0}deg)`,
                  transformOrigin: 'center',
                  backgroundColor: style.bg,
                  borderColor: style.border,
                  color: style.text,
                  opacity: obj.opacity,
                  borderRadius: obj.object_type === 'dance_floor' || obj.object_type === 'custom_circle' ? '50%' : '8px',
                  willChange: isDragging ? 'transform' : undefined,
                  boxShadow: isDragging ? '0 4px 14px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <i className={`${style.icon} text-lg mb-0.5`} />
                <span className="text-[10px] font-label text-center px-1 leading-tight" style={{ transform: `rotate(${-(obj.rotation || 0)}deg)` }}>{obj.name}</span>
                {obj.locked && <i className="ri-lock-line absolute top-1 right-1 text-[8px] opacity-50" />}

                {/* Object resize handles */}
                {!isReadOnly && isSelected && !obj.locked && objectHandles.map((h) => (
                  <div key={h.key}
                    className="absolute z-20"
                    style={{ ...h.style, width: HANDLE_SIZE, height: HANDLE_SIZE, cursor: handleCursors[h.key] }}
                    onMouseDown={(e) => handleObjectResizeStart(e, obj.id, h.key)}
                  >
                    <div className="w-full h-full rounded-full border-2 border-primary-400 bg-white hover:scale-110 transition-transform" />
                  </div>
                ))}
              </div>
            );
          })}

          {/* Tables */}
          {showTables && renderedTables.map((table) => {
            const isSelected = selectedTableIds.has(table.id);
            const isDragging = draggingTableId === table.id;
            const isDragOver = dragOverTableId === table.id;
            const colours = colourMap[table.colour || ''] || colourMap.sage;
            const shapeStyle = getShapeStyle(table);
            const capPct = table.capacity > 0 ? table.seated_count / table.capacity : 0;
            const overCap = capPct > 1;

            // Drop feedback
            const dragOverValid = isDragOver && table.seated_count < table.capacity;
            const dragOverFull = isDragOver && table.seated_count >= table.capacity;
            const dragOverRing = dragOverValid ? '0 0 0 3px rgba(16,185,129,0.6)' : dragOverFull ? '0 0 0 3px rgba(239,68,68,0.6)' : undefined;

            return (
              <div key={table.id} data-canvas-object="true"
                onMouseDown={(e) => handleTableMouseDown(e, table.id)}
                onTouchStart={(e) => handleTableTouchStart(e, table.id)}
                onTouchEnd={handleTableTouchEnd}
                onDragOver={(e) => handleTableDragOver(e, table.id)}
                onDragLeave={handleTableDragLeave}
                onDrop={(e) => handleTableDrop(e, table.id)}
                onMouseEnter={() => isDemo && setHoverTarget({ kind: 'table', id: table.id, name: table.name })}
                onMouseLeave={() => isDemo && setHoverTarget(null)}
                className={`absolute flex items-center justify-center transition-all ${isSelected ? 'z-10' : ''} ${isDragging ? 'z-20' : ''} ${isDragOver && dragOverValid ? 'z-10' : ''} ${table.locked ? 'cursor-default' : isReadOnly ? 'cursor-default' : 'cursor-grab'}`}
                style={{
                  left: 0, top: 0,
                  width: shapeStyle.width, height: shapeStyle.height,
                  borderRadius: shapeStyle.borderRadius,
                  transform: `translate3d(${table.position_x}px, ${table.position_y}px, 0) rotate(${table.rotation || 0}deg)`,
                  transformOrigin: 'center',
                  backgroundColor: colours.fill,
                  border: `2px solid ${colours.border}`,
                  color: colours.text,
                  boxShadow: isDragging
                    ? '0 8px 24px rgba(0,0,0,0.15)'
                    : isSelected
                      ? `0 0 0 2px oklch(var(--primary-400)), 0 2px 6px rgba(0,0,0,0.08)`
                      : dragOverRing
                        ? dragOverRing
                        : '0 2px 5px rgba(0,0,0,0.07)',
                  willChange: isDragging ? 'transform' : undefined,
                  opacity: (isDragOver && dragOverFull && !overCap) ? 0.4 : undefined,
                }}
              >
                {/* Seats */}
                {showSeats && table.seats.filter((s) => s.seat_status !== 'removed').map((seat) => {
                  const isAssigned = seat.seat_status === 'assigned';
                  const isBlocked = seat.seat_status === 'blocked';
                  const isSeatSelected = selectedSeatId === seat.id;
                  const assignment = table.assignments.find((a) => a.seating_seat_id === seat.id);
                  const guestName = assignment?.guests?.full_name;
                  const initials = guestName ? guestName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '';

                  // Zoom-adaptive rendering
                  const showFullDetail = zoom >= 1.2;
                  const showDots = zoom >= 0.5;

                  if (!showDots) {
                    // Low zoom: no individual seats
                    return null;
                  }

                  const seatSize = showFullDetail ? 24 : 18;

                  return (
                    <div key={seat.id}
                      onClick={(e) => handleSeatClick(e, seat.id, table.id)}
                      onMouseEnter={() => isDemo && setHoverTarget({ kind: 'seat', id: seat.id, assigned: !!assignment, guestName: guestName || undefined })}
                      onMouseLeave={() => isDemo && setHoverTarget(null)}
                      title={guestName || `Seat ${seat.seat_label}`}
                      className={`absolute flex items-center justify-center rounded-full transition-all cursor-pointer ${isSeatSelected ? 'z-30 scale-125' : 'hover:scale-110'}`}
                      style={{
                        left: `calc(50% + ${seat.relative_x}px - ${seatSize / 2}px)`,
                        top: `calc(50% + ${seat.relative_y}px - ${seatSize / 2}px)`,
                        width: seatSize, height: seatSize,
                        backgroundColor: isBlocked ? '#e5e7eb' : isAssigned ? '#10b981' : '#f9fafb',
                        borderColor: isBlocked ? '#9ca3af' : isAssigned ? '#059669' : '#d1d5db',
                        borderWidth: 1.5,
                        boxShadow: isSeatSelected ? '0 0 0 2px oklch(var(--primary-500))' : undefined,
                      }}
                    >
                      {/* Invisible padded wrapper for touch hit area */}
                      <div className="absolute inset-[-6px]" />

                      {showFullDetail && initials && (
                        <span className="text-[8px] font-label font-semibold text-white leading-none pointer-events-none" style={{ transform: `rotate(${-(table.rotation || 0)}deg)` }}>{initials}</span>
                      )}
                      {showFullDetail && !isAssigned && !isBlocked && (
                        <span className="text-[8px] text-foreground-400 font-label pointer-events-none" style={{ transform: `rotate(${-(table.rotation || 0)}deg)` }}>{seat.seat_number}</span>
                      )}
                      {!showFullDetail && isAssigned && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white pointer-events-none" />
                      )}
                      {showFullDetail && isBlocked && (
                        <i className="ri-close-line text-[8px] text-foreground-400 pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {/* Low zoom: solid fill + capacity ring */}
                {showSeats && zoom < 0.5 && (
                  <div className="absolute inset-0 rounded-[inherit] flex items-center justify-center">
                    <div className="text-center pointer-events-none">
                      <span className="text-[12px] font-label font-semibold leading-tight" style={{ transform: `rotate(${-(table.rotation || 0)}deg)` }}>{table.name}</span>
                    </div>
                  </div>
                )}

                {/* Mid/high zoom: table details */}
                {showSeats && zoom >= 0.5 && (
                  <>
                    {/* Capacity gauge ring */}
                    <CapacityRing pct={Math.min(capPct, 1)} overCap={overCap} size={Math.min(table.width, table.height)} />

                    {/* Table name + count */}
                    <div className="text-center pointer-events-none px-1 z-10">
                      <span className="text-[11px] font-label font-semibold leading-tight" style={{ transform: `rotate(${-(table.rotation || 0)}deg)` }}>{table.name}</span>
                      {zoom >= 1.2 && (
                        <span className="text-[10px] opacity-70 block" style={{ transform: `rotate(${-(table.rotation || 0)}deg)` }}>{table.seated_count}/{table.capacity}</span>
                      )}
                    </div>
                  </>
                )}

                {/* Over-capacity warning */}
                {overCap && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-label z-20">!</span>
                )}
                {table.locked && (
                  <i className="ri-lock-line absolute top-1.5 right-1.5 text-[8px] z-20" style={{ opacity: 0.5 }} />
                )}

                {/* Drag-over ghost seat */}
                {isDragOver && dragOverValid && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-400/20" />
                  </div>
                )}
                {isDragOver && dragOverFull && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <span className="bg-red-500 text-white text-[9px] font-label px-2 py-0.5 rounded-full">Full</span>
                  </div>
                )}

                {/* Rotation handle */}
                {!isReadOnly && isSelected && !table.locked && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30">
                    <div className="w-px h-3 bg-foreground-300 mx-auto" />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation(); e.preventDefault();
                        const startRotation = table.rotation || 0;
                        setRotateStartRotation(startRotation);
                        const move = (ev: MouseEvent) => {
                          const canvasPos = screenToCanvas(ev.clientX, ev.clientY);
                          const cx = table.position_x + table.width / 2;
                          const cy = table.position_y + table.height / 2;
                          const angle = Math.atan2(canvasPos.y - cy, canvasPos.x - cx);
                          let deg = Math.round(angle * (180 / Math.PI)) + 90;
                          if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
                          deg = ((deg % 360) + 360) % 360;
                          onRotateTableLocal(table.id, deg);
                        };
                        const up = () => {
                          const currentTable = tables.find((t) => t.id === table.id);
                          const finalRot = currentTable?.rotation ?? startRotation;
                          onRotateTable(table.id, finalRot);
                          window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
                        };
                        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
                      }}
                      className="w-6 h-6 rounded-full bg-white border-2 border-foreground-300 hover:border-primary-400 flex items-center justify-center shadow-sm transition-colors cursor-grab"
                      title="Rotate table"
                    >
                      <i className="ri-refresh-line text-foreground-500 text-[10px]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Resize handles — on hover when not read-only */}
          {!isReadOnly && onUpdatePlan && (
            <>
              {handles.map((h) => (
                <div
                  key={h.key}
                  className="absolute z-20 opacity-0 group-hover/room:opacity-100 transition-opacity"
                  style={{
                    ...h.style,
                    width: HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    cursor: handleCursors[h.key],
                  }}
                  onMouseDown={(e) => handleResizeStart(e, h.key as ResizeHandle)}
                >
                  <div className={`w-full h-full rounded-full border-2 border-primary-400 bg-white ${resizingHandle === h.key ? 'scale-125 ring-2 ring-primary-300' : 'hover:scale-110'} transition-transform`} />
                </div>
              ))}
            </>
          )}

          {/* Alignment guide lines */}
          {(alignmentGuides.horizontal.length > 0 || alignmentGuides.vertical.length > 0) && (
            <svg className="absolute inset-0 pointer-events-none z-50" width="100%" height="100%">
              {alignmentGuides.horizontal.map((h, i) => (
                <line key={`h-${i}`} x1={h.x1} y1={h.y} x2={h.x2} y2={h.y}
                  stroke="oklch(var(--accent-400))" strokeWidth="0.5" strokeDasharray="4 3" opacity={0.8} />
              ))}
              {alignmentGuides.vertical.map((v, i) => (
                <line key={`v-${i}`} x1={v.x} y1={v.y1} x2={v.x} y2={v.y2}
                  stroke="oklch(var(--accent-400))" strokeWidth="0.5" strokeDasharray="4 3" opacity={0.8} />
              ))}
            </svg>
          )}

          {/* Dimension tooltip */}
          {!isReadOnly && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/room:opacity-100 transition-opacity pointer-events-none">
              <span className="bg-foreground-800 text-white text-[10px] font-label px-2 py-1 rounded whitespace-nowrap">
                {canvasW} × {canvasH} {plan.measurement_unit || 'px'} · drag edges to resize
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {tables.length === 0 && roomObjects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm max-w-xs">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
              <i className="ri-layout-grid-line text-xl" />
            </div>
            <p className="text-sm text-foreground-700 font-label font-semibold mb-1">No tables yet</p>
            <p className="text-xs text-foreground-400 mb-0">Click "Add your first table" in the toolbar to start building your floor plan.</p>
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-label text-foreground-500 border border-secondary-100">
        {Math.round(zoom * 100)}%
      </div>

      {/* Demo hover tooltip */}
      {isDemo && <DemoHoverTooltip target={hoverTarget} mouseX={mousePos.x} mouseY={mousePos.y} />}
    </div>
  );
});

// ── Capacity ring ──
function CapacityRing({ pct, overCap, size }: { pct: number; overCap: boolean; size: number }) {
  const r = Math.max(size / 2 - 6, 10);
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 1));
  const colour = overCap ? '#ef4444' : pct > 0.75 ? '#f59e0b' : '#10b981';

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ transform: 'rotate(-90deg)' }} width="100%" height="100%">
      <circle cx="50%" cy="50%" r={r} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={3} />
      <circle cx="50%" cy="50%" r={r} fill="none" stroke={colour} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

// ── Shape style ──
function getShapeStyle(table: { shape: string; width: number; height: number }) {
  switch (table.shape) {
    case 'round': return { width: table.width, height: table.height, borderRadius: '50%' };
    case 'oval': return { width: table.width, height: table.height, borderRadius: '50%' };
    case 'square': return { width: table.width, height: table.height, borderRadius: '10px' };
    case 'head_table': return { width: table.width, height: table.height, borderRadius: '14px' };
    case 'banquet': return { width: table.width, height: table.height, borderRadius: '10px' };
    case 'sweetheart': return { width: table.width, height: table.height, borderRadius: '50%' };
    default: return { width: table.width, height: table.height, borderRadius: '8px' };
  }
}