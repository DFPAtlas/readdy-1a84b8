import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { BudgetInfo, BudgetCategory, BudgetExpense, BudgetPayment } from '@/types/budget';

// ── Demo reports page ──
function DemoBudgetReportsPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const state = demo?.state;
  const categories = state?.budgetCategories || [];
  const expenses = state?.expenses || [];
  const payments = state?.payments || [];
  const suppliers = state?.suppliers || [];

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const planned = categories.reduce((s, c) => s + c.planned_amount, 0);
  const committed = expenses.filter((e) => e.status === 'active').reduce((s, e) => s + (e.agreed_amount || e.quoted_amount), 0);
  const paid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const outstanding = committed - paid;

  const pct = (v: number) => planned > 0 ? Math.round((v / planned) * 100) : 0;

  const categoryData = categories.map((cat) => {
    const catExp = expenses.filter((e) => e.category_id === cat.id && e.status === 'active');
    const catCommitted = catExp.reduce((s, e) => s + (e.agreed_amount || e.quoted_amount), 0);
    const catPaid = catExp.reduce((s, e) => s + payments.filter((p) => p.expense_id === e.id && p.status === 'paid').reduce((acc, p) => acc + p.amount, 0), 0);
    return { name: cat.name, planned: cat.planned_amount, committed: catCommitted, paid: catPaid, variance: catCommitted - cat.planned_amount };
  }).filter((c) => c.planned > 0 || c.committed > 0);

  const handleExportCSV = () => {
    const headers = ['Category','Planned','Committed','Paid','Variance'];
    const rows = categoryData.map((c) => `"${c.name}",${c.planned},${c.committed},${c.paid},${c.variance}`);
    const summary = [
      `"SUMMARY",${planned},${committed},${paid},${planned - committed}`,
    ];
    const csv = '\uFEFF' + [headers.join(','), '', ...summary, '', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-budget-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Budget reports</h1>
          </div>
          <button onClick={handleExportCSV} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1.5" /> Export CSV</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Planned', value: formatGBP(planned), color: 'text-foreground-900' },
            { label: 'Committed', value: formatGBP(committed), color: 'text-accent-600' },
            { label: 'Paid', value: formatGBP(paid), color: 'text-emerald-600' },
            { label: 'Outstanding', value: formatGBP(outstanding), color: outstanding > 0 ? 'text-amber-600' : 'text-foreground-500' },
          ].map((s) => (
            <div key={s.label} className="card-default text-center">
              <p className="text-xs text-foreground-500 font-label mb-1">{s.label}</p>
              <p className={`text-lg font-heading font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Planned vs actual</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-foreground-600">Committed</span><span className="font-label text-foreground-900">{pct(committed)}%</span></div>
              <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden"><div className="h-full bg-accent-500 rounded-full" style={{ width: `${Math.min(100, pct(committed))}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-foreground-600">Paid</span><span className="font-label text-foreground-900">{pct(paid)}%</span></div>
              <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct(paid))}%` }} /></div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Category breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100">
                  <th className="text-left py-2 px-3 text-xs font-label text-foreground-500">Category</th>
                  <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Planned</th>
                  <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Committed</th>
                  <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Paid</th>
                  <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Variance</th>
                  <th className="py-2 px-3 text-xs font-label text-foreground-500" />
                </tr>
              </thead>
              <tbody>
                {categoryData.map((c, i) => (
                  <tr key={i} className="border-b border-secondary-50">
                    <td className="py-2 px-3 text-xs font-label text-foreground-800">{c.name}</td>
                    <td className="py-2 px-3 text-right text-xs text-foreground-700">{formatGBP(c.planned)}</td>
                    <td className="py-2 px-3 text-right text-xs text-foreground-700">{formatGBP(c.committed)}</td>
                    <td className="py-2 px-3 text-right text-xs text-foreground-700">{formatGBP(c.paid)}</td>
                    <td className={`py-2 px-3 text-right text-xs font-label ${c.variance > 0 ? 'text-red-600' : c.variance < 0 ? 'text-emerald-600' : 'text-foreground-500'}`}>
                      {c.variance === 0 ? '—' : `${c.variance > 0 ? '+' : ''}${formatGBP(c.variance)}`}
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-16 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.variance > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, c.planned > 0 ? Math.abs(c.committed / c.planned) * 100 : 0)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key figures */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Key figures</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-foreground-500">Categories</p><p className="font-heading font-semibold text-foreground-900">{categories.length}</p></div>
            <div><p className="text-xs text-foreground-500">Expenses</p><p className="font-heading font-semibold text-foreground-900">{expenses.length}</p></div>
            <div><p className="text-xs text-foreground-500">Payments</p><p className="font-heading font-semibold text-foreground-900">{payments.length}</p></div>
            <div><p className="text-xs text-foreground-500">Remaining</p><p className={`font-heading font-semibold ${planned - committed < 0 ? 'text-red-600' : 'text-foreground-900'}`}>{formatGBP(planned - committed)}</p></div>
          </div>
        </div>

        {/* Monthly payments preview */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Payment schedule overview</h2>
          <div className="space-y-2">
            {payments.filter((p) => p.status !== 'cancelled').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 12).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background-50">
                <span className="text-xs text-foreground-700">{p.description}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground-500">{new Date(p.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className={`text-xs font-label ${p.status === 'paid' ? 'text-emerald-600' : p.status === 'overdue' ? 'text-red-600' : 'text-foreground-700'}`}>{p.status === 'paid' ? formatGBP(p.amount) : formatGBP(p.amount)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-label ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'overdue' ? 'bg-red-100 text-red-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-foreground-100 text-foreground-600'}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-default">
          <p className="text-xs text-foreground-500">
            <strong className="text-foreground-700">Demo Mode —</strong> Full reporting with charts, trends, and supplier analysis is available in production mode with a Supabase connection.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

// ── Original Supabase-backed page ──
function NormalBudgetReportsPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState<BudgetInfo | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [payments, setPayments] = useState<BudgetPayment[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bRes, cRes, eRes, pRes] = await Promise.all([
          supabase.from('wedding_budgets').select('*').eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('budget_categories').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('sort_order'),
          supabase.from('budget_expenses').select('*, budget_categories(name)').eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('budget_payments').select('*').eq('wedding_id', weddingId),
        ]);
        if (bRes.error) throw bRes.error;
        setBudget(bRes.data as BudgetInfo | null);
        setCategories((cRes.data || []) as BudgetCategory[]);
        setExpenses((eRes.data || []) as BudgetExpense[]);
        setPayments((pRes.data || []) as BudgetPayment[]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const totalPlanned = budget?.planned_total || 0;

  const totalCommitted = expenses
    .filter((e) => ['booked', 'deposit_paid', 'part_paid', 'paid'].includes(e.payment_status))
    .reduce((s, e) => s + (e.agreed_amount || e.quoted_amount || 0), 0);
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = totalCommitted - totalPaid;

  const guestCount = (budget?.setup_profile as Record<string, unknown>)?.guest_count as number || 100;
  const perGuest = guestCount > 0 ? totalCommitted / guestCount : 0;

  const pct = (v: number) => totalPlanned > 0 ? Math.round((v / totalPlanned) * 100) : 0;

  const categoryData = categories.map((cat) => {
    const catExp = expenses.filter((e) => e.category_id === cat.id);
    const committed = catExp.filter((e) => ['booked', 'deposit_paid', 'part_paid', 'paid'].includes(e.payment_status)).reduce((s, e) => s + (e.agreed_amount || 0), 0);
    const paid = catExp.reduce((s, e) => s + e.amount_paid, 0);
    return { name: cat.name, planned: cat.planned_amount, committed, paid, variance: committed - cat.planned_amount };
  }).filter((c) => c.planned > 0 || c.committed > 0);

  const monthlyPayments: Record<string, number> = {};
  payments.filter((p) => p.paid_at && p.status === 'paid').forEach((p) => {
    const m = (p.paid_at as string).substring(0, 7);
    monthlyPayments[m] = (monthlyPayments[m] || 0) + p.amount;
  });

  const generateCSV = () => {
    const header = 'Category,Planned,Committed,Paid,Variance';
    const rows = categoryData.map((c) => `"${c.name}",${c.planned},${c.committed},${c.paid},${c.variance}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-budget-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <AppShell><div className="max-w-6xl mx-auto py-20 text-center text-sm text-foreground-500"><i className="ri-loader-4-line animate-spin mr-2" />Loading...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Budget reports</h1>
          </div>
          <button onClick={generateCSV} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1.5" /> Download CSV</button>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6">{error}</div>}

        {!budget ? (
          <div className="card-default text-center py-12">
            <p className="text-sm text-foreground-500">Set up your budget first to view reports.</p>
            <button onClick={() => navigate('/app/budget/setup')} className="btn-primary text-xs mt-4 cursor-pointer whitespace-nowrap">Set up budget</button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Planned', value: formatGBP(totalPlanned), color: 'text-foreground-900' },
                { label: 'Committed', value: formatGBP(totalCommitted), color: 'text-accent-600' },
                { label: 'Paid', value: formatGBP(totalPaid), color: 'text-emerald-600' },
                { label: 'Outstanding', value: formatGBP(totalOutstanding), color: totalOutstanding > 0 ? 'text-amber-600' : 'text-foreground-500' },
              ].map((s) => (
                <div key={s.label} className="card-default text-center">
                  <p className="text-xs text-foreground-500 font-label mb-1">{s.label}</p>
                  <p className={`text-lg font-heading font-semibold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bars */}
            <div className="card-default mb-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Planned vs actual</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-foreground-600">Committed</span><span className="font-label text-foreground-900">{pct(totalCommitted)}%</span></div>
                  <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden"><div className="h-full bg-accent-500 rounded-full" style={{ width: `${Math.min(100, pct(totalCommitted))}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-foreground-600">Paid</span><span className="font-label text-foreground-900">{pct(totalPaid)}%</span></div>
                  <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct(totalPaid))}%` }} /></div>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="card-default mb-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Category breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100">
                      <th className="text-left py-2 px-3 text-xs font-label text-foreground-500">Category</th>
                      <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Planned</th>
                      <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Committed</th>
                      <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Paid</th>
                      <th className="text-right py-2 px-3 text-xs font-label text-foreground-500">Variance</th>
                      <th className="py-2 px-3 text-xs font-label text-foreground-500" />
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((c, i) => (
                      <tr key={i} className="border-b border-secondary-50">
                        <td className="py-2 px-3 text-xs font-label text-foreground-800">{c.name}</td>
                        <td className="py-2 px-3 text-right text-xs text-foreground-700">{formatGBP(c.planned)}</td>
                        <td className="py-2 px-3 text-right text-xs text-foreground-700">{formatGBP(c.committed)}</td>
                        <td className="py-2 px-3 text-right text-xs text-foreground-700">{formatGBP(c.paid)}</td>
                        <td className={`py-2 px-3 text-right text-xs font-label ${c.variance > 0 ? 'text-red-600' : c.variance < 0 ? 'text-emerald-600' : 'text-foreground-500'}`}>
                          {c.variance === 0 ? '—' : `${c.variance > 0 ? '+' : ''}${formatGBP(c.variance)}`}
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-16 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${c.variance > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, c.planned > 0 ? Math.abs(c.committed / c.planned) * 100 : 0)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick stats */}
            <div className="card-default mb-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Key figures</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-foreground-500">Cost per guest</p><p className="font-heading font-semibold text-foreground-900">{formatGBP(perGuest)}</p></div>
                <div><p className="text-xs text-foreground-500">Total expenses</p><p className="font-heading font-semibold text-foreground-900">{expenses.length}</p></div>
                <div><p className="text-xs text-foreground-500">Total payments</p><p className="font-heading font-semibold text-foreground-900">{payments.length}</p></div>
                <div><p className="text-xs text-foreground-500">Contingency mode</p><p className="font-heading font-semibold text-foreground-900 capitalize">{budget.contingency_mode}</p></div>
              </div>
            </div>

            {/* Monthly forecast */}
            {Object.keys(monthlyPayments).length > 0 && (
              <div className="card-default mb-6">
                <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Monthly payments</h2>
                <div className="space-y-2">
                  {Object.entries(monthlyPayments).sort().map(([month, amount]) => (
                    <div key={month} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background-50">
                      <span className="text-xs text-foreground-700">{new Date(month + '-01').toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}</span>
                      <span className="text-xs font-label text-foreground-900">{formatGBP(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <button onClick={() => window.print()} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-printer-line mr-1.5" /> Print-friendly summary</button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Page export ──
export default function BudgetReportsPage() {
  if (isDemoMode) return <DemoBudgetReportsPage />;
  return <NormalBudgetReportsPage />;
}