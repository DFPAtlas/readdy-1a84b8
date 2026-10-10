import type * as React from "react";
import { useState, useCallback, useEffect, useRef } from 'react';
import { TEXT_PALETTE, TEXT_PALETTE_LABELS } from '../types';

// ── Props ──

export interface FloatingToolbarProps {
  style: React.CSSProperties;
  visible: boolean;
  // Current text props from the selected layer
  fontSize: number;
  weight: number;
  align: 'left' | 'center' | 'right';
  color: string;
  // Callbacks
  onFontSizeChange: (size: number) => void;
  onBoldToggle: () => void;
  onAlignChange: (align: 'left' | 'center' | 'right') => void;
  onColorChange: (color: string) => void;
}

// ── Component ──

export default function FloatingToolbar({
  style,
  visible,
  fontSize,
  weight,
  align,
  color,
  onFontSizeChange,
  onBoldToggle,
  onAlignChange,
  onColorChange,
}: FloatingToolbarProps) {
  const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;

  // Sync input when fontSize changes externally
  useEffect(() => {
    setFontSizeInput(String(fontSize));
  }, [fontSize]);

  const handleFontSizeBlur = useCallback(() => {
    const parsed = parseInt(fontSizeInput, 10);
    if (isNaN(parsed) || parsed < 8) {
      setFontSizeInput(String(fontSizeRef.current));
      return;
    }
    const clamped = Math.min(120, Math.max(8, parsed));
    setFontSizeInput(String(clamped));
    onFontSizeChange(clamped);
  }, [fontSizeInput, onFontSizeChange]);

  const handleFontSizeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setFontSizeInput(String(fontSizeRef.current));
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  const isBold = weight >= 600;

  if (!visible) return null;

  return (
    <div
      style={style}
      className="absolute z-[10000] bg-white border border-[#eee7df] rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-1 select-none"
      onPointerDown={(e) => {
        // Prevent toolbar clicks from triggering canvas background/deselection
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      {/* ── Font size ── */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] font-label font-medium text-foreground-500 whitespace-nowrap">
          Size
        </label>
        <input
          type="number"
          value={fontSizeInput}
          onChange={(e) => setFontSizeInput(e.target.value)}
          onBlur={handleFontSizeBlur}
          onKeyDown={handleFontSizeKeyDown}
          min={8}
          max={120}
          step={1}
          className="w-12 h-7 text-xs text-center border border-[#eee7df] rounded-md bg-white text-foreground-800 font-label focus:outline-none focus:border-[#d9808d] focus:ring-1 focus:ring-[#d9808d]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Font size"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#eee7df] mx-0.5" />

      {/* ── Bold ── */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onBoldToggle();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors cursor-pointer ${
          isBold
            ? 'bg-[#f5e8eb] text-[#d9808d]'
            : 'text-foreground-500 hover:bg-background-100'
        }`}
        aria-label="Bold"
        aria-pressed={isBold}
      >
        <strong>B</strong>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[#eee7df] mx-0.5" />

      {/* ── Alignment ── */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onAlignChange('left');
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors cursor-pointer ${
          align === 'left'
            ? 'bg-[#f5e8eb] text-[#d9808d]'
            : 'text-foreground-500 hover:bg-background-100'
        }`}
        aria-label="Align left"
        aria-pressed={align === 'left'}
      >
        <i className="ri-align-left" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          onAlignChange('center');
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors cursor-pointer ${
          align === 'center'
            ? 'bg-[#f5e8eb] text-[#d9808d]'
            : 'text-foreground-500 hover:bg-background-100'
        }`}
        aria-label="Align centre"
        aria-pressed={align === 'center'}
      >
        <i className="ri-align-center" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          onAlignChange('right');
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors cursor-pointer ${
          align === 'right'
            ? 'bg-[#f5e8eb] text-[#d9808d]'
            : 'text-foreground-500 hover:bg-background-100'
        }`}
        aria-label="Align right"
        aria-pressed={align === 'right'}
      >
        <i className="ri-align-right" />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[#eee7df] mx-0.5" />

      {/* ── Colour swatches ── */}
      {TEXT_PALETTE.map((swatchColor) => {
        const isActive = color === swatchColor;
        const label = TEXT_PALETTE_LABELS[swatchColor] || swatchColor;

        return (
          <button
            key={swatchColor}
            onClick={(e) => {
              e.preventDefault();
              onColorChange(swatchColor);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-5 h-5 rounded-full flex-shrink-0 cursor-pointer transition-all ${
              isActive
                ? 'ring-2 ring-[#d9808d] ring-offset-1 ring-offset-white scale-110'
                : 'hover:scale-110'
            } ${swatchColor === '#ffffff' ? 'border border-[#e8e0d5]' : ''}`}
            style={{ backgroundColor: swatchColor }}
            aria-label={`Text colour: ${label}`}
            aria-pressed={isActive}
          />
        );
      })}
    </div>
  );
}