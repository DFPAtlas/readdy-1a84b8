import { useState, useEffect, useCallback, useRef } from 'react';

export interface WalkthroughStep {
  target: string; // CSS selector for the element to highlight (data-tour attribute)
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface WalkthroughTour {
  key: string;
  title: string;
  steps: WalkthroughStep[];
}

const TOUR_STATE_KEY = 'vowora.tour.state';

interface TourState {
  started: Record<string, boolean>;
  completed: Record<string, boolean>;
  dismissed: Record<string, boolean>;
  lastStep: Record<string, number>;
}

function loadTourState(): TourState {
  try {
    const raw = localStorage.getItem(TOUR_STATE_KEY);
    return raw ? JSON.parse(raw) : { started: {}, completed: {}, dismissed: {}, lastStep: {} };
  } catch {
    return { started: {}, completed: {}, dismissed: {}, lastStep: {} };
  }
}

function saveTourState(state: TourState) {
  try {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function getTourState(tourKey: string): { completed: boolean; dismissed: boolean; lastStep: number } {
  const state = loadTourState();
  return {
    completed: !!state.completed[tourKey],
    dismissed: !!state.dismissed[tourKey],
    lastStep: state.lastStep[tourKey] || 0,
  };
}

export function markTourCompleted(tourKey: string) {
  const state = loadTourState();
  state.completed[tourKey] = true;
  state.started[tourKey] = true;
  saveTourState(state);
}

export function markTourDismissed(tourKey: string, currentStep: number) {
  const state = loadTourState();
  state.dismissed[tourKey] = true;
  state.lastStep[tourKey] = currentStep;
  saveTourState(state);
}

export function resetAllTours() {
  localStorage.removeItem(TOUR_STATE_KEY);
}

// ── The walkthrough overlay component ──

interface FeatureWalkthroughProps {
  tour: WalkthroughTour;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function FeatureWalkthrough({ tour, isOpen, onClose, onComplete }: FeatureWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('bottom');
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = tour.steps[currentStep];
  const isLast = currentStep === tour.steps.length - 1;

  const positionTooltip = useCallback(() => {
    if (!step) return;

    if (step.placement === 'center') {
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160,
      });
      setTooltipPlacement('bottom');
      return;
    }

    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      // Fallback to center
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160,
      });
      setTooltipPlacement('bottom');
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 160;
    const gap = 16;

    // Highlight the target
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Position below by default
    let top = rect.bottom + gap;
    let left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16));
    let placement: 'top' | 'bottom' = 'bottom';

    // If not enough space below, put above
    if (top + tooltipHeight > window.innerHeight - 16) {
      top = rect.top - tooltipHeight - gap;
      placement = 'top';
    }

    // If still not enough space above, put in center
    if (top < 16) {
      top = window.innerHeight / 2 - tooltipHeight / 2;
      left = window.innerWidth / 2 - tooltipWidth / 2;
    }

    setTooltipPos({ top, left });
    setTooltipPlacement(placement);
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    // Delay to allow DOM to settle after scroll
    const timer = setTimeout(positionTooltip, 300);
    window.addEventListener('resize', positionTooltip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', positionTooltip);
    };
  }, [isOpen, currentStep, positionTooltip]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markTourDismissed(tour.key, currentStep);
        onClose();
      } else if (e.key === 'ArrowRight' && !isLast) {
        setCurrentStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((s) => s - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentStep, isLast, onClose, tour.key]);

  // Highlight the target element
  useEffect(() => {
    if (!isOpen || !step || step.placement === 'center') return;

    const targetEl = document.querySelector(step.target) as HTMLElement;
    if (!targetEl) return;

    const originalOutline = targetEl.style.outline;
    const originalZIndex = targetEl.style.zIndex;
    const originalPosition = targetEl.style.position;
    const originalBoxShadow = targetEl.style.boxShadow;

    targetEl.style.position = 'relative';
    targetEl.style.zIndex = '10001';
    targetEl.style.outline = '3px solid var(--primary-500, #6366f1)';
    targetEl.style.outlineOffset = '2px';
    targetEl.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.45)';
    targetEl.style.borderRadius = '8px';

    return () => {
      targetEl.style.outline = originalOutline;
      targetEl.style.zIndex = originalZIndex;
      targetEl.style.position = originalPosition;
      targetEl.style.boxShadow = originalBoxShadow;
    };
  }, [isOpen, currentStep, step]);

  const handleNext = () => {
    if (isLast) {
      markTourCompleted(tour.key);
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    markTourDismissed(tour.key, currentStep);
    onClose();
  };

  if (!isOpen || !step) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[10000]" style={{ pointerEvents: 'none' }}>
      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl border border-secondary-200 p-5 max-w-[320px] pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
        role="dialog"
        aria-label={`Walkthrough step ${currentStep + 1} of ${tour.steps.length}: ${step.title}`}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {tour.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-primary-400' : 'bg-background-200'}`}
            />
          ))}
        </div>

        {/* Arrow pointing to target */}
        {step.placement !== 'center' && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 ${
              tooltipPlacement === 'top'
                ? 'bottom-0 translate-y-full border-t-8 border-t-white border-transparent'
                : 'top-0 -translate-y-full border-b-8 border-b-white border-transparent'
            }`}
          />
        )}

        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">{step.title}</h3>
        <p className="text-xs text-foreground-600 leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors whitespace-nowrap"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs font-label font-medium text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-foreground-400 mt-3 text-center">
          Step {currentStep + 1} of {tour.steps.length}
        </p>
      </div>

      {/* Center-mode dark overlay for step.placement === 'center' */}
      {step.placement === 'center' && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      )}
    </div>
  );
}