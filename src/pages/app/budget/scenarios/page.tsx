import type * as React from "react";
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { formatMajor, toMinor, sumMinor, type CurrencyCode } from '@/lib/budgetMoney';
import type { BudgetScenario, BudgetCategory, BudgetExpense } from '@/types/budget';

// ── Normal (Supabase) Scenarios page ──
function NormalBudgetScenariosPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scenarios, setScenarios] = useState<BudgetScenario[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', total_budget: '', guest_count: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<BudgetScenario | null>(null);

  const currency: CurrencyCode = 'GBP';

  useEffect(() => {
    let cancelled = false;
    if (!weddingId) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [scRes, cRes, eRes] = await Promise.all([
          supabase.from('budget_scenarios').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
          supabase.from('budget_categories').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('sort_order'),
          supabase.from('budget_expenses').select('*').eq('wedding_id', weddingId).eq('status', 'active'),
        ]);
        if (cancelled) return;
        if (scRes.error) throw scRes.error;
        setScenarios((scRes.data || []) as BudgetScenario[]);
        setCategories((cRes.data || []) as BudgetCategory[]);
        setExpenses((eRes.data || []) as BudgetExpense[]);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [weddingId]);

  const currentPlanned = sumMinor(categories.map((c) => c.planned_amount));
  const currentCommitted = sumMinor(expenses.filter((e) => ['booked', 'deposit_paid', 'part_paid', 'paid'].includes(e.payment_status)).map((e) => e.agreed_amount || e.quoted_amount || 0));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) { setCreateError('Please enter a scenario name'); return; }
    const total = parseFloat(createForm.total_budget);
    if (!total || total <= 0) { setCreateError('Please enter a valid budget total'); return; }
    setCreating(true);
    try {
      const allocations: Record<string, number> = {};
      categories.forEach((cat) => {
        allocations[cat.category_key] = cat.suggested_percentage;
      });
      const { data, error: insErr } = await supabase.from('budget_scenarios').insert({
        wedding_id: weddingId,
        name: createForm.name.trim(),
        total_budget: total,
        guest_count: parseInt(createForm.guest_count) || null,
        category_allocations: allocations,
        assumptions: { source: 'manual', based_on: 'current_categories' },
      }).select('*').single();
      if (insErr) throw insErr;
      if (data) setScenarios((prev) => [data as BudgetScenario, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', total_budget: '', guest_count: '' });
      setToastMsg('Scenario created.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scenario?')) return;
    try {
      await supabase.from('budget_scenarios').delete().eq('id', id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (selectedScenario?.id === id) setSelectedScenario(null);
      setToastMsg('Scenario deleted.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const scenarioCategoryAmounts = (scenario: BudgetScenario): { key: string; pct: number; amount: number }[] => {
    const allocs = (scenario.category_allocations || {}) as Record<string, number>;
    return Object.entries(allocs).map(([key, pct]) => ({
      key, pct, amount: Math.round(scenario.total_budget * (pct / 100)),
    }));
  };

  if (loading) return <AppShell><div className="max-w-6xl mx-auto py-20 text-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /><p className="text-sm text-foreground-500 mt-3">Loading scenarios...</p></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-foreground-500 mb-1">
              <button onClick={() => navigate('/app/budget')} className="hover:text-foreground-800 cursor-pointer whitespace-nowrap">Budget</button>
              <i className="ri-arrow-right-s-line text-xs" />
              <span className="text-foreground-700">Scenarios</span>
            </div>
            <h1 className="font-heading text-2xl text-foreground-900">Budget scenarios</h1>
          </div>
          <button onClick={() => { setCreateError(''); setShowCreate(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />New scenario</button>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6">{error}</div>}

        {/* Current vs scenarios summary */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Compare scenarios</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100">
                  <th className="text-left py-2.5 px-3 text-xs font-label text-foreground-500">Scenario</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Total</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Guests</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Per head</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">vs. Current</th>
                  <th className="text-center py-2.5 px-3 text-xs font-label text-foreground-500 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-secondary-100 bg-accent-50/20">
                  <td className="py-2.5 px-3"><span className="text-xs font-label font-semibold text-accent-700">Current budget</span></td>
                  <td className="py-2.5 px-3 text-right text-xs font-label text-foreground-700">{formatMajor(currentPlanned, currency)}</td>
                  <td className="py-2.5 px-3 text-right text-xs text-foreground-500">—</td>
                  <td className="py-2.5 px-3 text-right text-xs text-foreground-500">—</td>
                  <td className="py-2.5 px-3 text-right text-xs text-foreground-400">baseline</td>
                  <td className="py-2.5 px-3" />
                </tr>
                {scenarios.map((s) => {
                  const diff = s.total_budget - currentPlanned;
                  const perHead = s.guest_count && s.guest_count > 0 ? s.total_budget / s.guest_count : null;
                  return (
                    <tr key={s.id} className={`border-b border-secondary-50 hover:bg-background-50 cursor-pointer ${selectedScenario?.id === s.id ? 'bg-primary-50/20' : ''}`} onClick={() => setSelectedScenario(selectedScenario?.id === s.id ? null : s)}>
                      <td className="py-2.5 px-3"><span className="text-xs font-label text-foreground-800">{s.name}</span></td>
                      <td className="py-2.5 px-3 text-right text-xs font-label text-foreground-700">{formatMajor(s.total_budget, currency)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-foreground-500">{s.guest_count || '—'}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-foreground-500">{perHead ? formatMajor(perHead, currency, true) : '—'}</td>
                      <td className={`py-2.5 px-3 text-right text-xs font-label ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-foreground-500'}`}>
                        {diff === 0 ? 'Same' : `${diff > 0 ? '+' : ''}${formatMajor(Math.abs(diff), currency)}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={(ev) => { ev.stopPropagation(); handleDelete(s.id); }} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete"><i className="ri-delete-bin-line text-xs" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected scenario detail */}
        {selectedScenario && (
          <div className="card-default mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-label text-sm font-semibold text-foreground-900">{selectedScenario.name} — category breakdown</h2>
              <button onClick={() => setSelectedScenario(null)} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100">
                    <th className="text-left py-2 px-3 text-xs font-label text-foreground-500">Category</th>
                    <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">%</th>
                    <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Amount</th>
                    <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Current</th>
                    <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioCategoryAmounts(selectedScenario).map((sc) => {
                    const curCat = categories.find((c) => c.category_key === sc.key);
                    const curAmt = curCat?.planned_amount || 0;
                    const diff = sc.amount - curAmt;
                    return (
                      <tr key={sc.key} className="border-b border-secondary-50">
                        <td className="py-2 px-3 text-xs text-foreground-700">{curCat?.name || sc.key}</td>
                        <td className="py-2 px-3 text-right text-xs text-foreground-500">{sc.pct}%</td>
                        <td className="py-2 px-3 text-right text-xs font-label text-foreground-800">{formatMajor(sc.amount, currency)}</td>
                        <td className="py-2 px-3 text-right text-xs text-foreground-500">{formatMajor(curAmt, currency)}</td>
                        <td className={`py-2 px-3 text-right text-xs font-label ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-foreground-400'}`}>
                          {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatMajor(Math.abs(diff), currency)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {scenarios.length === 0 && (
          <div className="card-default text-center py-12">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4"><i className="ri-scales-3-line text-2xl" /></div>
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">No scenarios yet</h2>
            <p className="text-sm text-foreground-500 mb-6 max-w-sm mx-auto">Create what-if scenarios to compare different budget allocations without changing your live budget.</p>
            <button onClick={() => { setCreateError(''); setShowCreate(true); }} className="btn-primary text-sm cursor-pointer whitespace-nowrap">Create first scenario</button>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">New scenario</h3>
              {createError && <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 mb-4">{createError}</div>}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Name *</label>
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Reduced guest list" />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Total budget (£) *</label>
                  <input type="number" value={createForm.total_budget} onChange={(e) => setCreateForm({ ...createForm, total_budget: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder={formatMajor(currentPlanned, currency).replace('£', '')} min="0" step="100" />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Guest count (optional)</label>
                  <input type="number" value={createForm.guest_count} onChange={(e) => setCreateForm({ ...createForm, guest_count: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. 80" min="1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                  <button type="submit" disabled={creating} className="px-5 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                    {creating ? 'Creating...' : 'Create scenario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toastMsg && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-foreground-900 text-white text-sm shadow-lg">{toastMsg}</div>}
      </div>
    </AppShell>
  );
}

// ── Demo scenarios page ──
function DemoBudgetScenariosPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const state = demo?.state;
  const categories = state?.budgetCategories || [];
  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const currentTotal = categories.reduce((s, c) => s + c.planned_amount, 0);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-foreground-500 mb-1">
              <button onClick={() => navigate('/app/budget')} className="hover:text-foreground-800 cursor-pointer whitespace-nowrap">Budget</button>
              <i className="ri-arrow-right-s-line text-xs" />
              <span className="text-foreground-700">Scenarios</span>
            </div>
            <h1 className="font-heading text-2xl text-foreground-900">Budget scenarios</h1>
          </div>
        </div>
        <div className="card-default text-center py-12">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-scales-3-line text-2xl" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Scenario comparison</h2>
          <p className="text-sm text-foreground-500 mb-6 max-w-sm mx-auto">
            Create what-if scenarios with different guest counts or budget totals. Scenarios never change your actual budget until you choose to apply them.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/app/budget')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to budget</button>
            <button onClick={() => navigate('/app/budget/setup')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Set up budget</button>
          </div>
          <p className="text-xs text-foreground-400 mt-4">Current planned: {formatGBP(currentTotal)}</p>
        </div>
      </div>
    </AppShell>
  );
}

export default function BudgetScenariosPage() {
  const demo = useDemoDataSafe();
  if (isDemoMode && demo) return <DemoBudgetScenariosPage />;
  return <NormalBudgetScenariosPage />;
}