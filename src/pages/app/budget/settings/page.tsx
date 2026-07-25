import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { BudgetInfo } from '@/types/budget';

// ── Demo settings page ──
function DemoBudgetSettingsPage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground-500 mb-1">
            <button onClick={() => navigate('/app/budget')} className="hover:text-foreground-800 cursor-pointer whitespace-nowrap">Budget</button>
            <i className="ri-arrow-right-s-line text-xs" />
            <span className="text-foreground-700">Set Budget</span>
          </div>
          <h1 className="font-heading text-2xl text-foreground-900">Set Budget</h1>
        </div>

        <div className="card-default text-center py-12">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-settings-3-line text-2xl" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Demo Mode</h2>
          <p className="text-sm text-foreground-500 mb-6 max-w-sm mx-auto">
            Set Budget (contingency mode, included items, and data management) are available in the production application with a Supabase connection.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/app/budget')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line mr-1.5" />Back to budget
            </button>
            <button onClick={() => navigate('/app/budget/categories')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-list-check mr-1.5" />Manage categories
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Original Supabase-backed page ──
function NormalBudgetSettingsPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [budget, setBudget] = useState<BudgetInfo | null>(null);

  const [contingencyMode, setContingencyMode] = useState<'inside' | 'outside' | 'disabled'>('inside');
  const [contingencyPct, setContingencyPct] = useState(10);
  const [honeymoonIncluded, setHoneymoonIncluded] = useState(false);
  const [ringIncluded, setRingIncluded] = useState(false);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const { data, error: err } = await supabase
          .from('wedding_budgets')
          .select('*')
          .eq('wedding_id', weddingId)
          .maybeSingle();
        if (err) throw err;
        if (data) {
          const b = data as BudgetInfo;
          setBudget(b);
          setContingencyMode(b.contingency_mode);
          setContingencyPct(b.contingency_percentage);
          setHoneymoonIncluded(b.honeymoon_included);
          setRingIncluded(b.engagement_ring_included);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error: updErr } = await supabase
        .from('wedding_budgets')
        .update({
          contingency_mode: contingencyMode,
          contingency_percentage: contingencyPct,
          honeymoon_included: honeymoonIncluded,
          engagement_ring_included: ringIncluded,
          updated_at: new Date().toISOString(),
        })
        .eq('wedding_id', weddingId);

      if (updErr) throw updErr;
      setSuccess('Settings saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AppShell><div className="max-w-3xl mx-auto py-20 text-center text-sm text-foreground-500"><i className="ri-loader-4-line animate-spin mr-2" />Loading...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground-500 mb-1">
            <button onClick={() => navigate('/app/budget')} className="hover:text-foreground-800 cursor-pointer whitespace-nowrap">Budget</button>
            <i className="ri-arrow-right-s-line text-xs" />
            <span className="text-foreground-700">Set Budget</span>
          </div>
          <h1 className="font-heading text-2xl text-foreground-900">Set Budget</h1>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6">{error}</div>}
        {success && <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 mb-6">{success}</div>}

        {!budget ? (
          <div className="card-default text-center py-12">
            <p className="text-sm text-foreground-500 mb-4">No budget set up yet.</p>
            <button onClick={() => navigate('/app/budget/setup')} className="btn-primary text-xs cursor-pointer whitespace-nowrap">Set up budget</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Contingency</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-2">Contingency mode</label>
                  <div className="flex flex-wrap gap-2">
                    {(['inside', 'outside', 'disabled'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setContingencyMode(m)}
                        className={`px-4 py-2 rounded-lg text-xs font-label border transition-colors cursor-pointer capitalize whitespace-nowrap ${
                          contingencyMode === m ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-secondary-200 text-foreground-600 hover:bg-background-100'
                        }`}
                      >
                        {m === 'inside' ? 'Inside total' : m === 'outside' ? 'On top of total' : 'Disabled'}
                      </button>
                    ))}
                  </div>
                </div>
                {contingencyMode !== 'disabled' && (
                  <div>
                    <label className="block text-xs font-label text-foreground-600 mb-1.5">Contingency percentage</label>
                    <div className="flex items-center gap-3">
                      <input type="number" value={contingencyPct} onChange={(e) => setContingencyPct(Number(e.target.value))} className="w-20 px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" min="1" max="50" />
                      <span className="text-sm text-foreground-500">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Included items</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={honeymoonIncluded} onChange={(e) => setHoneymoonIncluded(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-foreground-700">Include honeymoon in wedding budget</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={ringIncluded} onChange={(e) => setRingIncluded(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-foreground-700">Include engagement ring in wedding budget</span>
                </label>
              </div>
            </div>

            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Danger zone</h2>
              <p className="text-xs text-foreground-500 mb-4">This will delete all your budget data including categories, expenses, payments and settings. This action cannot be undone.</p>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete all budget data? This cannot be undone.')) return;
                  try {
                    await supabase.from('wedding_budgets').delete().eq('wedding_id', weddingId);
                    navigate('/app/budget');
                  } catch {
                    setError('Failed to delete budget data');
                  }
                }}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-label hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-delete-bin-line mr-1.5" /> Delete all budget data
              </button>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap">
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Page export ──
export default function BudgetSettingsPage() {
  if (isDemoMode) return <DemoBudgetSettingsPage />;
  return <NormalBudgetSettingsPage />;
}