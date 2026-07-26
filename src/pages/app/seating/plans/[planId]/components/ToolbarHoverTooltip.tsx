import { useState, useRef, useEffect, type ReactNode } from 'react';

interface ToolbarHoverTooltipProps {
  children: ReactNode;
  title: string;
  description: string;
  shortcut?: string;
  icon?: string;
}

export default function ToolbarHoverTooltip({ children, title, description, shortcut, icon }: ToolbarHoverTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom + 120 > window.innerHeight) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [show]);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 400);
  };

  const handleLeave = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setShow(false);
  };

  return (
    <div ref={triggerRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-[150] pointer-events-none animate-[fadeIn_150ms_ease-out] ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}`}
        >
          <div className="bg-foreground-900 text-white rounded-xl shadow-2xl p-3 w-[240px]">
            {/* Arrow */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-foreground-900 ${position === 'bottom' ? '-top-1' : '-bottom-1'}`} />

            {/* Header */}
            <div className="flex items-center gap-2 mb-1.5">
              {icon && (
                <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-accent-500/20 text-accent-400 flex-shrink-0">
                  <i className={`${icon} text-xs`} />
                </div>
              )}
              <p className="text-xs font-label font-semibold text-white leading-tight">{title}</p>
              {shortcut && (
                <span className="ml-auto text-[10px] font-label text-foreground-400 bg-foreground-800/50 px-1.5 py-0.5 rounded whitespace-nowrap">{shortcut}</span>
              )}
            </div>

            {/* Description */}
            <p className="text-[11px] leading-relaxed text-foreground-200">{description}</p>

            {/* Footer hint */}
            <p className="mt-2 pt-1.5 border-t border-foreground-700/50 text-[10px] text-foreground-500">
              <i className="ri-lightbulb-line mr-1" />
              These helpers only appear in demo mode
            </p>
          </div>
        </div>
      )}
    </div>
  );
}