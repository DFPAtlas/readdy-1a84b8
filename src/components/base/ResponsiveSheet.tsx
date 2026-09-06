import FocusTrap from './FocusTrap';
import type { ReactNode } from 'react';

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Side the sheet comes from on mobile (left or right) */
  side?: 'left' | 'right';
  /** On desktop, show as an inline panel instead of a sheet */
  desktopPanel?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function ResponsiveSheet({
  open,
  onClose,
  title,
  children,
  side = 'right',
  desktopPanel = false,
  className = '',
  ariaLabel,
}: ResponsiveSheetProps) {
  if (!open) return null;

  const isLeft = side === 'left';
  const translateClass = isLeft ? '-translate-x-full' : 'translate-x-full';

  return (
    <>
      {/* Backdrop — only on mobile */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / panel */}
      <FocusTrap
        active={open}
        onEscape={onClose}
        className={`${
          desktopPanel
            ? 'fixed inset-y-0 z-50 w-72 max-w-[90vw] bg-white shadow-xl lg:static lg:w-auto lg:max-w-none lg:shadow-none lg:border-none lg:z-auto'
            : 'fixed inset-y-0 z-50 w-72 max-w-[90vw] bg-white shadow-xl'
        } ${
          isLeft ? 'left-0' : 'right-0'
        } flex flex-col ${
          desktopPanel ? 'lg:translate-x-0' : ''
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100 flex-shrink-0 lg:hidden">
          <h2 className="font-label text-sm font-semibold text-foreground-900 truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-600 cursor-pointer flex-shrink-0"
            aria-label={`Close ${ariaLabel || title}`}
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </FocusTrap>
    </>
  );
}