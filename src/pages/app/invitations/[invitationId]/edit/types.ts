import type * as React from "react";
// ── Invitation Editor Document Model ──

export type InvitationLayerType = 'text' | 'asset';

// ── Canvas background types ──

export type BackgroundPattern = 'none' | 'dots' | 'lines' | 'grid' | 'chevron';

export interface CanvasBackground {
  color: string;
  pattern: BackgroundPattern;
}

export const BACKGROUND_COLOR_PRESETS = [
  { value: '#fffaf5', label: 'Warm White' },
  { value: '#fdf6f0', label: 'Cream' },
  { value: '#faf5ef', label: 'Ivory' },
  { value: '#f8f0e8', label: 'Linen' },
  { value: '#f5ebe0', label: 'Blush Tint' },
  { value: '#f2f0eb', label: 'Stone' },
  { value: '#e8e4db', label: 'Warm Grey' },
  { value: '#fdf2f4', label: 'Soft Blush' },
  { value: '#f0f4eb', label: 'Sage White' },
  { value: '#f4f0f7', label: 'Lavender' },
  { value: '#f9f5ec', label: 'Parchment' },
  { value: '#fcf9f2', label: 'Almond' },
] as const;

export const BACKGROUND_PATTERN_LABELS: Record<BackgroundPattern, string> = {
  none: 'Solid',
  dots: 'Dotted',
  lines: 'Lined',
  grid: 'Grid',
  chevron: 'Chevron',
};

export const DEFAULT_BACKGROUND: CanvasBackground = {
  color: '#fffaf5',
  pattern: 'none',
};

export interface InvitationDocument {
  canvas: {
    width: number;
    height: number;
    background?: CanvasBackground;
  };
  layers: InvitationLayer[];
}

export interface InvitationLayer {
  id: string;
  type: InvitationLayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  props: TextLayerProps | AssetLayerProps;
}

// ── Text layer specific props ──

export interface TextLayerProps {
  content: string;
  fontSize: number;
  weight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  fontFamily?: string;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

// ── Asset layer specific props ──

export interface AssetLayerProps {
  assetId: string;
  flipX: boolean;
}

// ── Asset library types ──

export interface AssetLibraryItem {
  id: string;
  category: string;
  name: string | null;
  file_url: string;
  thumbnail_url: string;
  tags: string[] | null;
  is_premium: boolean;
}

export interface EditorAsset {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string;
  tags: string[];
  isPremium: boolean;
}

export type AssetCategory = 'all' | 'florals' | 'leaves' | 'frames' | 'icons' | 'illustrations' | 'patterns';

export const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'florals', label: 'Florals' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'frames', label: 'Frames' },
  { value: 'icons', label: 'Icons' },
  { value: 'illustrations', label: 'Illustrations' },
  { value: 'patterns', label: 'Patterns' },
];

// ── Save status ──

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Editor-level save state (for Supabase persistence) ──

export type SaveState = 'loading' | 'saved' | 'unsaved' | 'saving' | 'error';

// ── Zoom state ──

export interface ZoomState {
  value: number;
  min: number;
  max: number;
  step: number;
  default: number;
}

// ── Preview mode ──

export type PreviewDevice = 'desktop' | 'mobile';

// ── Pointer event preparation (Phase 3 stubs) ──

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export interface PointerCallbacks {
  onStartMove?: (event: React.PointerEvent, layer: InvitationLayer) => void;
  onStartResize?: (event: React.PointerEvent, layer: InvitationLayer, corner: ResizeCorner) => void;
  onStartRotate?: (event: React.PointerEvent, layer: InvitationLayer) => void;
}

// ── Interaction session (Phase 3: drag, resize, rotate) ──

export type InteractionMode = 'move' | 'resize' | 'rotate';

export interface ActiveInteraction {
  mode: InteractionMode;
  pointerId: number;
  layerId: string;
  startClientX: number;
  startClientY: number;
  startLayer: InvitationLayer;
  startDocument: InvitationDocument;
  corner?: ResizeCorner;
  startPointerAngle?: number;
  centerX?: number;
  centerY?: number;
}

// ── Resize direction signs ──

export const RESIZE_SIGNS: Record<ResizeCorner, { x: -1 | 1; y: -1 | 1 }> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  sw: { x: -1, y: 1 },
  se: { x: 1, y: 1 },
};

// ── Interaction commit boundary (for Phase 5 history) ──

export type InteractionCommitFn = (
  before: InvitationDocument,
  after: InvitationDocument,
) => void;

// ── Property commit boundary (for Phase 5 history, toolbar + text edits) ──

export type PropertyCommitFn = (
  before: InvitationDocument,
  after: InvitationDocument,
) => void;

// ── Undo/Redo history (Phase 5) ──

export interface DocumentHistory {
  snapshots: InvitationDocument[];
  index: number;
}

// ── Fixed text colour palette ──

export const TEXT_PALETTE = [
  '#3a3430', // Ink
  '#b8925a', // Gold
  '#d9808d', // Blush
  '#8a9a7e', // Sage
  '#8a8078', // Soft grey
  '#ffffff', // White
] as const;

export const TEXT_PALETTE_LABELS: Record<string, string> = {
  '#3a3430': 'Ink',
  '#b8925a': 'Gold',
  '#d9808d': 'Blush',
  '#8a9a7e': 'Sage',
  '#8a8078': 'Soft grey',
  '#ffffff': 'White',
};