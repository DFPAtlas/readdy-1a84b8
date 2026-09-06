import { useEffect, useRef, useCallback } from 'react';
import FocusTrap from '@/components/base/FocusTrap';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  description?: string;
  descriptionId?: string;
  children: React.ReactNode;
  /** Make dialog full-screen on mobile (default: true) */
  fullScreenMobile?: boolean;
  /** Max width class, e.g. "max-w-md" (default: "max-w-lg") */
  maxWidth?: string;
  /** Additional class names for the dialog panel */
  className?: string;
  /** Show close button in top-right corner? (default: true) */
  showCloseButton?: boolean;
  /** Prevent closing on backdrop click (default: false) */
  disableBackdropClose?: boolean;
}

/**
 * Standardized accessible dialog/modal.
 *
 * Uses FocusTrap for keyboard focus management, and follows
 * WAI-ARIA dialog pattern with correct labelling, escape-to-close,
 * and focus restoration on close.
 *
 * On mobile, becomes full-screen by default.
 */
export default function Dialog({
  isOpen,
  onClose,
  title,
  titleId,
  description,
  descriptionId,
  children,
  fullScreenMobile = true,
  maxWidth = 'max-w-lg',
  className = '',
  showCloseButton = true,
  disableBackdropClose = false,
}: DialogProps) {
  const generatedTitleId = useRef(`dialog-title-${Math.random().toString(36).slice(2, 9)}`);
  const generatedDescId = useRef(`dialog-desc-${Math.random().toString(36).slice(2, 9)}`);

  const finalTitleId = titleId || generatedTitleId.current;
  const finalDescId = descriptionId || generatedDescId.current;

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!disableBackdropClose && e.target === e.currentTarget) {
      onClose();
    }
  }, [disableBackdropClose, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={disableBackdropClose ? undefined : handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <FocusTrap
        active={isOpen}
        onEscape={onClose}
        className={`
          relative bg-white shadow-xl overflow-hidden flex flex-col
          ${fullScreenMobile
            ? 'fixed inset-0 md:relative md:inset-auto md:rounded-xl md:max-h-[90vh] md:m-4'
            : 'rounded-xl max-h-[90vh] m-4'
          }
          w-full ${maxWidth}
          ${className}
        `}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? finalTitleId : undefined}
          aria-describedby={description ? finalDescId : undefined}
          className="flex flex-col h-full"
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 flex-shrink-0">
              {title ? (
                <h2
                  id={finalTitleId}
                  className="font-heading text-lg text-foreground-900"
                >
                  {title}
                </h2>
              ) : (
                <div />
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 hover:text-foreground-600 cursor-pointer transition-colors flex-shrink-0"
                  aria-label="Close dialog"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              )}
            </div>
          )}

          {/* Description (hidden visually but available for screen readers) */}
          {description && (
            <p id={finalDescId} className="sr-only">
              {description}
            </p>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}