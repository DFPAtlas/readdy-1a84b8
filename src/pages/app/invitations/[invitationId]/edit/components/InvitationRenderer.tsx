import { useRef, useCallback, useEffect, useState } from 'react';
import type {
  InvitationDocument,
  InvitationLayer,
  TextLayerProps,
  AssetLayerProps,
  ResizeCorner,
} from '../types';
import { getCanvasBackgroundStyle } from './BackgroundPicker';

// ── Props ──

export interface InvitationRendererProps {
  document: InvitationDocument;
  scale: number;
  assetLookup?: Map<string, string>;
  interactive?: boolean;
  selectedId?: string | null;
  editingId?: string | null;
  onSelect?: (id: string) => void;
  onBackgroundClick?: () => void;
  onDoubleClick?: (id: string) => void;
  onTextChange?: (layerId: string, content: string) => void;
  onEditingFocus?: (layerId: string) => void;
  onEditingBlur?: (layerId: string, content: string) => void;
  onStartMove?: (event: React.PointerEvent, layer: InvitationLayer) => void;
  onStartResize?: (
    event: React.PointerEvent,
    layer: InvitationLayer,
    corner: ResizeCorner,
  ) => void;
  onStartRotate?: (event: React.PointerEvent, layer: InvitationLayer) => void;
}

// ── Styles ──

const HANDLE_SIZE = 8;
const HANDLE_HIT = 16;
const SELECTION_COLOR = '#d9808d';

// ── Rule line (thin gold line rendered as a styled div) ──

function RuleLine({ layer, scale }: { layer: InvitationLayer; scale: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${layer.width * scale}px`,
        height: `${Math.max(1, scale)}px`,
        backgroundColor: '#d4c5a9',
        zIndex: layer.zIndex,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Text layer content (read-only mode) ──

function TextContentReadOnly({
  layer,
  scale,
}: {
  layer: InvitationLayer;
  scale: number;
}) {
  const props = layer.props as TextLayerProps;

  if (!props.content && props.fontSize === 0) {
    return <RuleLine layer={layer} scale={scale} />;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${layer.width * scale}px`,
        height: `${layer.height * scale}px`,
        zIndex: layer.zIndex,
        fontSize: `${props.fontSize * scale}px`,
        fontFamily: props.fontFamily,
        fontWeight: props.weight,
        color: props.color,
        textAlign: props.align as React.CSSProperties['textAlign'],
        lineHeight: props.lineHeight,
        letterSpacing: `${props.letterSpacing * scale}px`,
        textTransform: props.textTransform || 'none',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          props.align === 'center'
            ? 'center'
            : props.align === 'right'
              ? 'flex-end'
              : 'flex-start',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {props.content}
    </div>
  );
}

// ── Text layer content (editable mode) ──

interface TextContentEditableProps {
  layer: InvitationLayer;
  scale: number;
  onTextChange: (layerId: string, content: string) => void;
  onFocus: (layerId: string) => void;
  onBlur: (layerId: string, content: string) => void;
}

function TextContentEditable({
  layer,
  scale,
  onTextChange,
  onFocus,
  onBlur,
}: TextContentEditableProps) {
  const props = layer.props as TextLayerProps;
  const editableRef = useRef<HTMLDivElement>(null);

  // Focus and place caret at end on mount
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    // Place caret at end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [layer.id]);

  // Handle paste: plain text only
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // Insert at current selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  // Track innerText changes
  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const text = el.innerText ?? '';
    onTextChange(layer.id, text);
  }, [layer.id, onTextChange]);

  // Prevent Enter from submitting forms
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Control+Enter or Meta+Enter → finish editing
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const el = editableRef.current;
        if (el) {
          onBlur(layer.id, el.innerText ?? '');
        }
      }
      // Normal Enter: let it insert a line break (default behavior)
    },
    [layer.id, onBlur],
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    onFocus(layer.id);
  }, [layer.id, onFocus]);

  // Handle blur — save content
  const handleBlur = useCallback(() => {
    const el = editableRef.current;
    if (el) {
      onBlur(layer.id, el.innerText ?? '');
    }
  }, [layer.id, onBlur]);

  return (
    <div
      ref={editableRef}
      contentEditable
      suppressContentEditableWarning
      onPaste={handlePaste}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${layer.width * scale}px`,
        height: `${layer.height * scale}px`,
        zIndex: layer.zIndex + 200,
        fontSize: `${props.fontSize * scale}px`,
        fontFamily: props.fontFamily,
        fontWeight: props.weight,
        color: props.color,
        textAlign: props.align as React.CSSProperties['textAlign'],
        lineHeight: props.lineHeight,
        letterSpacing: `${props.letterSpacing * scale}px`,
        textTransform: props.textTransform || 'none',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          props.align === 'center'
            ? 'center'
            : props.align === 'right'
              ? 'flex-end'
              : 'flex-start',
        outline: 'none',
        cursor: 'text',
        minHeight: `${Math.max(24, props.fontSize * scale * props.lineHeight!) * 1.0}px`,
      }}
    >
      {props.content}
    </div>
  );
}

// ── Asset layer content ──

function AssetContent({
  layer,
  scale,
  assetUrl,
}: {
  layer: InvitationLayer;
  scale: number;
  assetUrl: string | undefined;
}) {
  const [loadError, setLoadError] = useState(false);
  const props = layer.props as AssetLayerProps;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${layer.width * scale}px`,
        height: `${layer.height * scale}px`,
        zIndex: layer.zIndex,
        transform: layer.rotation
          ? `rotate(${layer.rotation}deg)`
          : undefined,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {assetUrl && !loadError ? (
        <img
          src={assetUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: props.flipX ? 'scaleX(-1)' : undefined,
          }}
          draggable={false}
          onError={() => setLoadError(true)}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#faf7f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: `${Math.max(2, 4 * scale)}px`,
            border: `${Math.max(0.5, scale * 0.5)}px dashed #d4c5a9`,
            borderRadius: `${Math.max(1, 2 * scale)}px`,
          }}
        >
          <i
            className="ri-image-line"
            style={{
              fontSize: `${Math.max(10, 16 * scale)}px`,
              color: '#c4b8a8',
              opacity: 0.6,
            }}
          />
          <span
            style={{
              fontSize: `${Math.max(7, 10 * scale)}px`,
              color: '#a89a8a',
              fontFamily: 'var(--font-label), Inter, sans-serif',
            }}
          >
            Image unavailable
          </span>
        </div>
      )}
    </div>
  );
}

// ── Selection overlay ──

function SelectionOverlay({
  layer,
  scale,
  onStartResize,
  onStartRotate,
}: {
  layer: InvitationLayer;
  scale: number;
  onStartResize?: (
    event: React.PointerEvent,
    l: InvitationLayer,
    corner: ResizeCorner,
  ) => void;
  onStartRotate?: (event: React.PointerEvent, l: InvitationLayer) => void;
}) {
  const w = layer.width * scale;
  const h = layer.height * scale;
  const handleOffset = HANDLE_SIZE / 2;

  const corners: { corner: ResizeCorner; left: number; top: number; cursor: string }[] = [
    { corner: 'nw', left: -handleOffset, top: -handleOffset, cursor: 'nwse-resize' },
    { corner: 'ne', left: w - handleOffset, top: -handleOffset, cursor: 'nesw-resize' },
    { corner: 'sw', left: -handleOffset, top: h - handleOffset, cursor: 'nesw-resize' },
    { corner: 'se', left: w - handleOffset, top: h - handleOffset, cursor: 'nwse-resize' },
  ];

  const handlePointerDown = (
    e: React.PointerEvent,
    corner: ResizeCorner,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onStartResize?.(e, layer, corner);
  };

  const rotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onStartRotate?.(e, layer);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${layer.x * scale}px`,
        top: `${layer.y * scale}px`,
        width: `${w}px`,
        height: `${h}px`,
        zIndex: 9999,
        pointerEvents: 'none',
        transform: layer.rotation
          ? `rotate(${layer.rotation}deg)`
          : undefined,
        transformOrigin: 'center center',
      }}
      aria-label={`Selected: ${
        layer.type === 'text'
          ? (layer.props as TextLayerProps).content?.slice(0, 32) || 'Text layer'
          : 'Asset layer'
      }`}
    >
      {/* Dashed outline */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px dashed ${SELECTION_COLOR}`,
          borderRadius: '2px',
        }}
      />

      {/* Corner resize handles */}
      {corners.map(({ corner, left, top, cursor }) => (
        <div
          key={corner}
          onPointerDown={(e) => handlePointerDown(e, corner)}
          data-corner={corner}
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${HANDLE_SIZE}px`,
            height: `${HANDLE_SIZE}px`,
            borderRadius: '50%',
            backgroundColor: SELECTION_COLOR,
            border: '1.5px solid white',
            cursor,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
          }}
          role="button"
          aria-label={`Resize from ${corner === 'nw' ? 'top left' : corner === 'ne' ? 'top right' : corner === 'sw' ? 'bottom left' : 'bottom right'}`}
          tabIndex={-1}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${HANDLE_HIT}px`,
              height: `${HANDLE_HIT}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      ))}

      {/* Rotation handle above top centre */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${-20 * scale}px`,
          width: 0,
          height: `${20 * scale}px`,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      >
        {/* Connector line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${HANDLE_SIZE / 2}px`,
            width: '1px',
            height: `${20 * scale - HANDLE_SIZE}px`,
            backgroundColor: SELECTION_COLOR,
            transform: 'translateX(-50%)',
          }}
        />
        {/* Rotation handle dot */}
        <div
          onPointerDown={rotatePointerDown}
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: `${HANDLE_SIZE}px`,
            height: `${HANDLE_SIZE}px`,
            borderRadius: '50%',
            backgroundColor: SELECTION_COLOR,
            border: '1.5px solid white',
            transform: 'translate(-50%, -50%)',
            cursor: 'grab',
            pointerEvents: 'auto',
          }}
          role="button"
          aria-label="Rotate object"
          tabIndex={-1}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${HANDLE_HIT}px`,
              height: `${HANDLE_HIT}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main renderer ──

export default function InvitationRenderer({
  document,
  scale,
  assetLookup,
  interactive = false,
  selectedId = null,
  editingId = null,
  onSelect,
  onBackgroundClick,
  onDoubleClick,
  onTextChange,
  onEditingFocus,
  onEditingBlur,
  onStartMove,
  onStartResize,
  onStartRotate,
}: InvitationRendererProps) {
  const canvasW = document.canvas.width;
  const canvasH = document.canvas.height;

  const bgStyle = getCanvasBackgroundStyle(document.canvas.background);

  // Sort layers once — immutable
  const sortedLayers = [...document.layers].sort(
    (a, b) => a.zIndex - b.zIndex,
  );

  // Find selected layer (derived, not stored separately)
  const selectedLayer =
    selectedId != null
      ? document.layers.find((l) => l.id === selectedId) ?? null
      : null;

  // Click handler on a layer
  const handleLayerClick = (layerId: string) => (e: React.MouseEvent) => {
    if (!interactive) return;
    // If we're editing, clicks on content should go to the editable element
    if (editingId === layerId) return;
    e.stopPropagation();
    onSelect?.(layerId);
  };

  // Double-click handler — enter edit mode for text layers
  const handleLayerDoubleClick = (layerId: string) => (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onDoubleClick?.(layerId);
  };

  // Pointer down for move — suppressed when editing
  const handleLayerPointerDown =
    (layer: InvitationLayer) => (e: React.PointerEvent) => {
      if (!interactive) return;
      // Don't start move when editing this layer — browser handles caret
      if (editingId === layer.id) return;
      onStartMove?.(e, layer);
    };

  return (
    <div
      style={{
        position: 'relative',
        width: `${canvasW * scale}px`,
        height: `${canvasH * scale}px`,
        ...bgStyle,
        overflow: 'hidden',
        boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
        cursor: interactive ? 'default' : 'default',
      }}
      onClick={() => {
        if (interactive) onBackgroundClick?.();
      }}
      role={interactive ? 'region' : undefined}
      aria-label={interactive ? 'Invitation canvas' : undefined}
    >
      {/* Inner gold border */}
      <div
        style={{
          position: 'absolute',
          inset: `${4 * scale}px`,
          border: `${Math.max(1, scale)}px solid rgba(184, 146, 90, 0.35)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Render layers */}
      {sortedLayers.map((layer) => {
        const isSelected = interactive && selectedId === layer.id;
        const isEditing = interactive && editingId === layer.id && layer.type === 'text';

        // When editing, render the editable version instead of the read-only one
        if (isEditing) {
          return (
            <div key={layer.id} style={{ zIndex: layer.zIndex + 200, opacity: layer.opacity ?? 1 }}>
              <TextContentEditable
                layer={layer}
                scale={scale}
                onTextChange={onTextChange!}
                onFocus={onEditingFocus!}
                onBlur={onEditingBlur!}
              />
            </div>
          );
        }

        // Read-only hit area wrapping content
        return (
          <div
            key={layer.id}
            onClick={handleLayerClick(layer.id)}
            onDoubleClick={handleLayerDoubleClick(layer.id)}
            onPointerDown={handleLayerPointerDown(layer)}
            style={{
              position: 'absolute',
              left: `${layer.x * scale}px`,
              top: `${layer.y * scale}px`,
              width: `${layer.width * scale}px`,
              height: `${layer.height * scale}px`,
              cursor: interactive ? 'grab' : 'default',
              touchAction: interactive ? 'none' : undefined,
              zIndex: layer.zIndex,
              opacity: layer.opacity ?? 1,
            }}
            role={interactive ? 'button' : undefined}
            aria-label={
              layer.type === 'text'
                ? (layer.props as TextLayerProps).content?.slice(0, 40) || 'Text'
                : 'Asset'
            }
            tabIndex={interactive ? 0 : undefined}
          >
            {layer.type === 'text' && (
              <TextContentReadOnly layer={layer} scale={scale} />
            )}

            {layer.type === 'asset' && (
              <AssetContent
                layer={layer}
                scale={scale}
                assetUrl={assetLookup?.get(
                  (layer.props as AssetLayerProps).assetId,
                )}
              />
            )}
          </div>
        );
      })}

      {/* Selection overlay — show even during editing, but the hit areas still work */}
      {interactive && selectedLayer && (
        <SelectionOverlay
          layer={selectedLayer}
          scale={scale}
          onStartResize={onStartResize}
          onStartRotate={onStartRotate}
        />
      )}
    </div>
  );
}