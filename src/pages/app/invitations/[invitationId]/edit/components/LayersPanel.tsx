import type * as React from "react";
import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { InvitationLayer, TextLayerProps, AssetLayerProps } from '../types';

// ── Props ──

interface LayersPanelProps {
  layers: InvitationLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIdsFrontToBack: string[]) => void;
}

// ── Helpers ──

function getLayerLabel(layer: InvitationLayer): string {
  if (layer.type === 'text') {
    const text = (layer.props as TextLayerProps).content?.trim();
    if (!text) return 'Empty text';
    return text.length > 22 ? text.slice(0, 22) + '…' : text;
  }
  const assetId = (layer.props as AssetLayerProps).assetId;
  return `Image ${assetId.slice(-4)}`;
}

function getLayerIcon(layer: InvitationLayer): string {
  return layer.type === 'text' ? 'ri-text' : 'ri-image-line';
}

// ── Single sortable row ──

interface SortableLayerRowProps {
  layer: InvitationLayer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  layerIndex: number;
  totalLayers: number;
}

function SortableLayerRow({
  layer,
  isSelected,
  onSelect,
  layerIndex,
  totalLayers,
}: SortableLayerRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // Position label: "Front" for first, "Back" for last, blank otherwise
  const positionHint =
    layerIndex === 0 ? 'Front' : layerIndex === totalLayers - 1 ? 'Back' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(layer.id)}
      className={[
        'flex items-center gap-1.5 px-2 py-1.5 mx-1.5 rounded-lg cursor-pointer select-none group transition-colors',
        isSelected
          ? 'bg-[#fdf0f2] border border-[#d9808d]/40'
          : 'hover:bg-background-100 border border-transparent',
      ].join(' ')}
      role="button"
      aria-label={`Select layer: ${getLayerLabel(layer)}`}
      aria-pressed={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(layer.id);
        }
      }}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-center justify-center w-4 h-4 flex-shrink-0 text-foreground-300 hover:text-foreground-500 cursor-grab active:cursor-grabbing transition-colors"
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <i className="ri-draggable text-sm" />
      </div>

      {/* Type icon */}
      <div
        className={[
          'w-5 h-5 flex items-center justify-center rounded flex-shrink-0 text-xs',
          isSelected
            ? 'text-[#d9808d]'
            : 'text-foreground-400 group-hover:text-foreground-600',
        ].join(' ')}
      >
        <i className={getLayerIcon(layer)} />
      </div>

      {/* Label */}
      <span
        className={[
          'flex-1 text-xs truncate leading-tight font-label',
          isSelected ? 'text-foreground-800 font-medium' : 'text-foreground-600',
        ].join(' ')}
        title={getLayerLabel(layer)}
      >
        {getLayerLabel(layer)}
      </span>

      {/* Position hint badge */}
      {positionHint && (
        <span className="text-[9px] font-label text-foreground-300 flex-shrink-0 leading-none">
          {positionHint}
        </span>
      )}
    </div>
  );
}

// ── Main panel ──

export default function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onReorder,
}: LayersPanelProps) {
  // Sort layers front-to-back: highest zIndex first
  const sortedFrontToBack = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const layerIds = sortedFrontToBack.map((l) => l.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = layerIds.indexOf(active.id as string);
      const newIndex = layerIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(layerIds, oldIndex, newIndex);
      onReorder(newOrder);
    },
    [layerIds, onReorder],
  );

  return (
    <div className="w-48 flex-shrink-0 bg-white border-r border-[#eee7df] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#eee7df] flex-shrink-0">
        <span className="text-xs font-label font-semibold text-foreground-600 uppercase tracking-wide">
          Layers
        </span>
        <span className="text-[10px] font-label text-foreground-300">
          {layers.length}
        </span>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100">
              <i className="ri-stack-line text-sm text-foreground-300" />
            </div>
            <p className="text-[11px] text-foreground-400 font-label leading-snug">
              No layers yet.<br />Drag assets onto the canvas.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layerIds}
              strategy={verticalListSortingStrategy}
            >
              {sortedFrontToBack.map((layer, index) => (
                <SortableLayerRow
                  key={layer.id}
                  layer={layer}
                  isSelected={selectedId === layer.id}
                  onSelect={onSelect}
                  layerIndex={index}
                  totalLayers={sortedFrontToBack.length}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer hint */}
      {layers.length > 0 && (
        <div className="px-3 py-2 border-t border-[#eee7df] flex-shrink-0">
          <p className="text-[10px] text-foreground-300 font-label leading-tight">
            Drag rows to reorder layers
          </p>
        </div>
      )}
    </div>
  );
}