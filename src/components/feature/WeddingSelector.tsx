import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { getRoleLabel } from '@/lib/permissions';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function WeddingSelector() {
  const { weddings, activeWedding, weddingState, loading, selectWedding, refreshWeddings } = useActiveWedding();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Hide if loading, error, or only one wedding
  if (loading || weddingState === 'loading' || weddingState === 'error') return null;
  if (weddings.length <= 1 && weddingState === 'ready') return null;

  const activeName = activeWedding
    ? (activeWedding.title || `${activeWedding.partner_one_name} & ${activeWedding.partner_two_name}`)
    : 'Select wedding';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-background-50 text-sm font-label text-foreground-700 transition-colors cursor-pointer whitespace-nowrap"
        aria-label={activeWedding ? `Current wedding: ${activeName}` : 'Select a wedding'}
      >
        <span className="max-w-[160px] truncate">{activeName}</span>
        <i className={`ri-arrow-down-s-line text-foreground-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-secondary-100 rounded-xl shadow-lg z-40 py-1 animate-[fadeIn_0.15s_ease-out]">
          <div className="px-4 py-2.5 border-b border-secondary-100">
            <p className="text-xs font-label font-semibold text-foreground-900">Your weddings</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">
              {weddings.length} wedding{weddings.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {weddings.map((w) => {
              const isActive = activeWedding?.id === w.id;
              const displayName = w.title || `${w.partner_one_name} & ${w.partner_two_name}`;
              return (
                <button
                  key={w.id}
                  onClick={async () => {
                    setOpen(false);
                    if (!isActive) await selectWedding(w.id);
                  }}
                  disabled={isActive}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary-50 cursor-default'
                      : 'hover:bg-background-50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-primary-500' : 'bg-secondary-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-label truncate ${isActive ? 'font-semibold text-primary-700' : 'text-foreground-800'}`}>
                      {displayName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {w.wedding_date && (
                        <span className="text-[10px] text-foreground-400">{formatDate(w.wedding_date)}</span>
                      )}
                      <span className="text-[10px] text-foreground-400 font-label px-1.5 py-0.5 rounded-full bg-background-100">
                        {getRoleLabel(w.role)}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <i className="ri-check-line text-primary-500 text-sm flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-secondary-100 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                refreshWeddings();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-foreground-500 hover:bg-background-50 transition-colors cursor-pointer text-left whitespace-nowrap"
            >
              <i className="ri-refresh-line text-sm" />
              Refresh list
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/app/onboarding');
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer text-left whitespace-nowrap"
            >
              <i className="ri-add-line text-sm" />
              Create another wedding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}