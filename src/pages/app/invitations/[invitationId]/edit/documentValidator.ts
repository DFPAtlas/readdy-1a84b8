import type { InvitationDocument, InvitationLayer, TextLayerProps, AssetLayerProps } from '../types';

// ── Validation result ──

export interface ValidationResult {
  valid: boolean;
  document: InvitationDocument | null;
  error: string | null;
}

// ── Parses and validates an untrusted jsonb value into an InvitationDocument ──

export function parseInvitationDocument(value: unknown): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, document: null, error: 'Document is null or undefined' };
  }

  if (typeof value !== 'object') {
    return { valid: false, document: null, error: 'Document is not an object' };
  }

  const raw = value as Record<string, unknown>;

  // Validate canvas
  const canvas = raw.canvas;
  if (!canvas || typeof canvas !== 'object') {
    return { valid: false, document: null, error: 'Missing or invalid canvas' };
  }

  const canvasObj = canvas as Record<string, unknown>;
  const canvasWidth = Number(canvasObj.width);
  const canvasHeight = Number(canvasObj.height);

  if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) {
    return { valid: false, document: null, error: 'Invalid canvas width' };
  }

  if (!Number.isFinite(canvasHeight) || canvasHeight <= 0) {
    return { valid: false, document: null, error: 'Invalid canvas height' };
  }

  // Validate layers
  const layers = raw.layers;
  if (!Array.isArray(layers)) {
    return { valid: false, document: null, error: 'Layers is not an array' };
  }

  const validatedLayers: InvitationLayer[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!layer || typeof layer !== 'object') {
      continue; // Skip invalid entries
    }

    const l = layer as Record<string, unknown>;

    // Validate id
    const id = String(l.id || '');
    if (!id) continue;

    // Skip duplicate IDs
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    // Validate type
    const type = l.type;
    if (type !== 'text' && type !== 'asset') continue;

    // Validate geometry
    const x = Number(l.x);
    const y = Number(l.y);
    const w = Number(l.width);
    const h = Number(l.height);
    const rotation = Number(l.rotation);
    const zIndex = Number(l.zIndex);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(w) || w <= 0 ||
      !Number.isFinite(h) || h <= 0 ||
      !Number.isFinite(rotation) ||
      !Number.isFinite(zIndex)
    ) {
      continue; // Skip layer with invalid geometry
    }

    // Validate props based on type
    const props = l.props;
    if (!props || typeof props !== 'object') continue;

    if (type === 'text') {
      const tp = props as Record<string, unknown>;
      const validProps: TextLayerProps = {
        content: String(tp.content ?? ''),
        fontSize: clamp(Number(tp.fontSize) || 16, 8, 120),
        weight: Number.isFinite(Number(tp.weight)) ? Number(tp.weight) : 400,
        color: typeof tp.color === 'string' ? tp.color : '#3a3430',
        align: (tp.align === 'left' || tp.align === 'center' || tp.align === 'right') ? tp.align : 'center',
        letterSpacing: Number.isFinite(Number(tp.letterSpacing)) ? Number(tp.letterSpacing) : 0,
        fontFamily: typeof tp.fontFamily === 'string' ? tp.fontFamily : undefined,
        lineHeight: Number.isFinite(Number(tp.lineHeight)) ? Number(tp.lineHeight) : undefined,
        textTransform: (tp.textTransform === 'none' || tp.textTransform === 'uppercase' || tp.textTransform === 'lowercase' || tp.textTransform === 'capitalize')
          ? tp.textTransform as TextLayerProps['textTransform']
          : undefined,
      };
      validatedLayers.push({ id, type, x, y, width: w, height: h, rotation, zIndex, props: validProps });
    } else {
      const ap = props as Record<string, unknown>;
      const validProps: AssetLayerProps = {
        assetId: String(ap.assetId ?? ''),
        flipX: Boolean(ap.flipX),
      };
      validatedLayers.push({ id, type, x, y, width: w, height: h, rotation, zIndex, props: validProps });
    }
  }

  // Normalize zIndex
  const normalized = normalizedLayers(validatedLayers);

  return {
    valid: true,
    document: {
      canvas: { width: canvasWidth, height: canvasHeight },
      layers: normalized,
    },
    error: null,
  };
}

// ── Helpers ──

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function normalizedLayers(layers: InvitationLayer[]): InvitationLayer[] {
  return [...layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer, index) => ({
      ...layer,
      zIndex: index,
    }));
}