import { useEffect, useRef, useState } from 'react';

export type HoverTarget =
  | { kind: 'table'; id: string; name: string }
  | { kind: 'object'; id: string; name: string; type: string }
  | { kind: 'seat'; id: string; assigned: boolean; guestName?: string }
  | { kind: 'room-boundary' }
  | { kind: 'empty-canvas' }
  | { kind: 'rotation-handle' }
  | null;

interface DemoHoverTooltipProps {
  target: HoverTarget;
  mouseX: number;
  mouseY: number;
}

const TOOLTIP_CONTENT: Record<string, { icon: string; title: string; tips: string[] }> = {
  table: {
    icon: 'ri-information-line',
    title: 'Table',
    tips: [
      'Click to select (Shift+click for multi-select)',
      'Drag to reposition on the canvas',
      'Drag guests from the sidebar onto tables to assign seats',
      'Use the rotation handle above to rotate the table',
      'Inspect & edit properties in the right panel',
    ],
  },
  object: {
    icon: 'ri-information-line',
    title: 'Venue object',
    tips: [
      'Click to select and move it around',
      'Drag corner handles to resize',
      'Duplicate or delete from the right panel',
    ],
  },
  seat: {
    icon: 'ri-user-location-line',
    title: 'Seat',
    tips: [
      'Green = occupied · White = available',
      'Click to inspect the assigned guest',
      'Remove or reassign guests from the right panel',
    ],
  },
  'room-boundary': {
    icon: 'ri-aspect-ratio-line',
    title: 'Room boundary',
    tips: [
      'Drag the corner handles to resize the room',
    ],
  },
  'empty-canvas': {
    icon: 'ri-mouse-line',
    title: 'Canvas',
    tips: [
      'Scroll to zoom in/out',
      'Hold Space + drag to pan around',
      'Click empty space to deselect everything',
      'Ctrl+Z to undo · Ctrl+Shift+Z to redo · Delete to remove selected',
      'Use arrow keys to nudge selected items',
    ],
  },
  'rotation-handle': {
    icon: 'ri-refresh-line',
    title: 'Rotation handle',
    tips: [
      'Drag this handle to rotate the table',
      'Hold Shift to snap to 15° increments',
    ],
  },
};

export default function DemoHoverTooltip({ target, mouseX, mouseY }: DemoHoverTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: mouseX, y: mouseY });
  const [visible, setVisible] = useState(false);

  // Delay appearance so quick mouse passes don't flash tooltips
  useEffect(() => {
    if (!target) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => {
      setVisible(true);
      setPosition({ x: mouseX, y: mouseY });
    }, 400);
    return () => clearTimeout(timer);
  }, [target, mouseX, mouseY]);

  // Smooth-follow the cursor with limited updates
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      setPosition({ x: mouseX, y: mouseY });
    });
    return () => cancelAnimationFrame(raf);
  }, [visible, mouseX, mouseY]);

  if (!target || !visible) return null;

  const kind = target.kind === 'empty-canvas' ? 'empty-canvas' :
    target.kind === 'room-boundary' ? 'room-boundary' :
    target.kind === 'rotation-handle' ? 'rotation-handle' :
    target.kind === 'seat' ? 'seat' :
    target.kind === 'object' ? 'object' : 'table';

  const content = TOOLTIP_CONTENT[kind];
  if (!content) return null;

  // Position tooltip to the right of cursor, clamping to viewport
  const tooltipWidth = 280;
  const tooltipHeight = content.tips.length * 28 + 60;
  const offsetX = 20;
  const offsetY = -20;

  let finalX = position.x + offsetX;
  let finalY = position.y + offsetY;

  // Clamp to viewport
  if (finalX + tooltipWidth > window.innerWidth - 16) {
    finalX = position.x - tooltipWidth - offsetX;
  }
  if (finalY + tooltipHeight > window.innerHeight - 16) {
    finalY = position.y - tooltipHeight - offsetY;
  }
  if (finalY < 16) finalY = 16;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[200] pointer-events-none"
      style={{ left: finalX, top: finalY }}
    >
      <div className="bg-foreground-900 text-white rounded-xl shadow-2xl p-4 w-[280px] animate-[fadeIn_150ms_ease-out]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent-500/20 text-accent-400 flex-shrink-0">
            <i className={`${content.icon} text-sm`} />
          </div>
          <div>
            <p className="text-xs font-label font-semibold text-white leading-tight">
              {content.title}
              {target.kind === 'table' && target.name && (
                <span className="font-normal text-foreground-300 ml-1">— {target.name}</span>
              )}
              {target.kind === 'object' && target.name && (
                <span className="font-normal text-foreground-300 ml-1">— {target.name}</span>
              )}
            </p>
            {target.kind === 'seat' && target.guestName && (
              <p className="text-[10px] text-foreground-400 leading-tight">{target.guestName}</p>
            )}
          </div>
        </div>

        {/* Tips */}
        <ul className="space-y-1.5">
          {content.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-foreground-200">
              <span className="mt-[3px] w-1 h-1 rounded-full bg-accent-400 flex-shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <p className="mt-3 pt-2 border-t border-foreground-700/50 text-[10px] text-foreground-500">
          <i className="ri-lightbulb-line mr-1" />
          Tip: these helpers disappear when you switch to a real wedding plan
        </p>
      </div>
    </div>
  );
}