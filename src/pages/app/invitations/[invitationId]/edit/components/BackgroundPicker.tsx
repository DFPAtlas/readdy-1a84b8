import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasBackground, BackgroundPattern } from '../types';
import { BACKGROUND_COLOR_PRESETS, BACKGROUND_PATTERN_LABELS } from '../types';

interface BackgroundPickerProps {
  background: CanvasBackground;
  onChange: (bg: CanvasBackground) => void;
}

export default function BackgroundPicker({ background, onChange }: BackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const [customHex, setCustomHex] = useState(background.color);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync custom hex when background changes externally
  useEffect(() => {
    setCustomHex(background.color);
  }, [background.color]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleColorSelect = useCallback(
    (color: string) => {
      onChange({ ...background, color });
    },
    [background, onChange],
  );

  const handlePatternSelect = useCallback(
    (pattern: BackgroundPattern) => {
      onChange({ ...background, pattern });
    },
    [background, onChange],
  );

  const handleCustomHexApply = useCallback(() => {
    const hex = customHex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange({ ...background, color: hex });
    }
  }, [customHex, background, onChange]);

  const handleCustomHexKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCustomHexApply();
      }
    },
    [handleCustomHexApply],
  );

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const patterns: BackgroundPattern[] = ['none', 'dots', 'lines', 'grid', 'chevron'];

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={toggleOpen}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer"
        title="Change background"
        aria-label="Change canvas background"
      >
        <i className="ri-palette-line text-lg" />
      </button>

      {/* Popover panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-full top-0 ml-2 w-64 bg-white rounded-xl border border-[#eee7df] shadow-lg z-50 p-4"
        >
          {/* Arrow pointer */}
          <div className="absolute left-0 top-4 -translate-x-full">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#eee7df]" />
          </div>

          {/* Section: Colors */}
          <h4 className="text-[11px] font-label font-semibold text-foreground-500 uppercase tracking-wider mb-2">
            Colour
          </h4>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {BACKGROUND_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleColorSelect(preset.value)}
                className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer hover:scale-110"
                style={{
                  backgroundColor: preset.value,
                  borderColor:
                    background.color === preset.value
                      ? '#b8925a'
                      : 'transparent',
                  boxShadow:
                    background.color === preset.value
                      ? '0 0 0 1px #b8925a'
                      : '0 0 0 1px rgba(0,0,0,0.08)',
                }}
                title={preset.label}
                aria-label={`Background colour: ${preset.label}`}
              />
            ))}
          </div>

          {/* Custom hex input */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              onBlur={handleCustomHexApply}
              onKeyDown={handleCustomHexKeyDown}
              placeholder="#fffaf5"
              maxLength={7}
              className="flex-1 h-8 px-2.5 text-xs font-mono border border-[#e8e0d5] rounded-md bg-[#faf7f2] text-foreground-700 outline-none focus:border-[#b8925a] transition-colors"
              aria-label="Custom hex colour"
            />
            <div
              className="w-8 h-8 rounded-lg border border-[#e8e0d5] flex-shrink-0"
              style={{ backgroundColor: customHex }}
            />
          </div>

          {/* Section: Pattern */}
          <h4 className="text-[11px] font-label font-semibold text-foreground-500 uppercase tracking-wider mb-2">
            Pattern
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {patterns.map((pat) => (
              <button
                key={pat}
                onClick={() => handlePatternSelect(pat)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all cursor-pointer hover:border-[#d4c5a9] ${
                  background.pattern === pat
                    ? 'border-[#b8925a] bg-[#faf7f0]'
                    : 'border-transparent bg-[#faf7f2]'
                }`}
                title={BACKGROUND_PATTERN_LABELS[pat]}
                aria-label={`Pattern: ${BACKGROUND_PATTERN_LABELS[pat]}`}
              >
                {/* Pattern preview swatch */}
                <div
                  className="w-8 h-8 rounded-md border border-[#e8e0d5]"
                  style={{
                    backgroundColor: '#fffaf5',
                    ...getPatternStyle(pat, '#d4c5a9'),
                    backgroundSize: '8px 8px',
                  }}
                />
                <span className="text-[9px] font-label text-foreground-600 whitespace-nowrap leading-none">
                  {BACKGROUND_PATTERN_LABELS[pat]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSS pattern generator ──

function getPatternStyle(
  pattern: BackgroundPattern,
  accent: string,
): React.CSSProperties {
  switch (pattern) {
    case 'dots':
      return {
        backgroundImage: `radial-gradient(circle, ${accent}40 0.8px, transparent 0.8px)`,
        backgroundSize: '10px 10px',
      };
    case 'lines':
      return {
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 9px, ${accent}30 9px, ${accent}30 10px)`,
        backgroundSize: '10px 10px',
      };
    case 'grid':
      return {
        backgroundImage: `
          linear-gradient(${accent}30 0.5px, transparent 0.5px),
          linear-gradient(90deg, ${accent}30 0.5px, transparent 0.5px)
        `,
        backgroundSize: '10px 10px',
      };
    case 'chevron':
      return {
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 6px, ${accent}25 6px, ${accent}25 7px),
          repeating-linear-gradient(-45deg, transparent, transparent 6px, ${accent}25 6px, ${accent}25 7px)
        `,
        backgroundSize: '14px 14px',
      };
    default:
      return {};
  }
}

// ── Exported utility for InvitationRenderer ──

export function getCanvasBackgroundStyle(bg?: CanvasBackground): React.CSSProperties {
  if (!bg) {
    return { backgroundColor: '#fffaf5' };
  }

  const base: React.CSSProperties = { backgroundColor: bg.color };

  if (bg.pattern === 'none') return base;

  const accent = getContrastColor(bg.color);

  switch (bg.pattern) {
    case 'dots':
      return {
        ...base,
        backgroundImage: `radial-gradient(circle, ${accent}40 0.8px, transparent 0.8px)`,
        backgroundSize: '10px 10px',
      };
    case 'lines':
      return {
        ...base,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 9px, ${accent}30 9px, ${accent}30 10px)`,
        backgroundSize: '10px 10px',
      };
    case 'grid':
      return {
        ...base,
        backgroundImage: `
          linear-gradient(${accent}30 0.5px, transparent 0.5px),
          linear-gradient(90deg, ${accent}30 0.5px, transparent 0.5px)
        `,
        backgroundSize: '10px 10px',
      };
    case 'chevron':
      return {
        ...base,
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 6px, ${accent}25 6px, ${accent}25 7px),
          repeating-linear-gradient(-45deg, transparent, transparent 6px, ${accent}25 6px, ${accent}25 7px)
        `,
        backgroundSize: '14px 14px',
      };
    default:
      return base;
  }
}

// Pick a pattern accent colour that contrasts with the background
function getContrastColor(bgHex: string): string {
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);

  // Luminance approximation
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  // For light backgrounds use gold, for darker use warm grey
  if (lum > 200) return '#b8925a';
  if (lum > 150) return '#8a8078';
  return '#d4c5a9';
}