import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import { listGiftFundsForWedding } from '@/lib/giftFundingRepository';
import type { GiftFundListItem } from '@/types/giftFunding';
import GiftFundSummarySection from '@/components/feature/GiftFundSummarySection';
import type { BudgetInfo, BudgetCategory, BudgetExpense, BudgetPayment } from '@/types/budget';
import type { DemoExpense, DemoPayment, DemoBudgetCategory } from '@/demo/demoTypes';

// ── Normal (Supabase) Budget Dashboard ──
function NormalBudgetDashboardPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState<BudgetInfo | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [payments, setPayments] = useState<BudgetPayment[]>([]);
  const [showGuestCalc, setShowGuestCalc] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [giftFunds, setGiftFunds] = useState<GiftFundListItem[]>([]);
  const [giftFundsLoading, setGiftFundsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!weddingId) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [bRes, cRes, eRes, pRes] = await Promise.all([
          supabase.from('wedding_budgets').select('*').eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('budget_categories').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('sort_order'),
          supabase.from('budget_expenses').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
          supabase.from('budget_payments').select('*').eq('wedding_id', weddingId).order('due_at', { ascending: true }),
        ]);
        if (cancelled) return;
        if (bRes.error) throw bRes.error;
        setBudget(bRes.data as BudgetInfo | null);
        setCategories((cRes.data || []) as BudgetCategory[]);
        setExpenses((eRes.data || []) as BudgetExpense[]);
        setPayments((pRes.data || []) as BudgetPayment[]);

        // Auto-detect overdue payments (client-side check)
        const today = new Date().toISOString().split('T')[0];
        const paymentsData = (pRes.data || []) as BudgetPayment[];
        const newlyOverdue = paymentsData.filter(
          (p) => p.status === 'scheduled' && p.due_at && p.due_at < today
        );
        if (newlyOverdue.length > 0) {
          const { error: overdueErr } = await supabase
            .from('budget_payments')
            .update({ status: 'overdue', updated_at: new Date().toISOString() })
            .in('id', newlyOverdue.map((p) => p.id));
          if (!overdueErr) {
            setPayments((prev) =>
              prev.map((p) =>
                newlyOverdue.some((n) => n.id === p.id) ? { ...p, status: 'overdue' as const } : p
              )
            );
          }
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load budget');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [weddingId]);

  // Fetch gift fund summaries
  useEffect(() => {
    if (!weddingId) return;
    let cancelled = false;
    setGiftFundsLoading(true);
    listGiftFundsForWedding(weddingId)
      .then((funds) => { if (!cancelled) setGiftFunds(funds); })
      .catch(() => { /* silent — gift fund summary is non-critical */ })
      .finally(() => { if (!cancelled) setGiftFundsLoading(false); });
    return () => { cancelled = true; };
  }, [weddingId]);

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

  const planned = budget?.planned_total || 0;
  const committed = expenses
    .filter((e) => ['booked', 'deposit_paid', 'part_paid', 'paid'].includes(e.payment_status) && e.status === 'active')
    .reduce((s, e) => s + (e.agreed_amount || e.quoted_amount || 0), 0);
  const paid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const outstanding = committed - paid;
  const remaining = planned - committed;

  const upcomingPayments = payments.filter((p) => p.status === 'scheduled' || p.status === 'overdue').sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime());
  const overduePayments = payments.filter((p) => p.status === 'overdue');

  const pctC = planned > 0 ? Math.min(100, Math.round((committed / planned) * 100)) : 0;
  const pctP = planned > 0 ? Math.min(100, Math.round((paid / planned) * 100)) : 0;

  const expensePaidAmount = (expId: string) => payments.filter((p) => p.expense_id === expId && p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (statusFilter === 'active') list = list.filter((e) => e.status === 'active');
    if (statusFilter === 'cancelled') list = list.filter((e) => e.status !== 'active');
    if (catFilter !== 'all') list = list.filter((e) => e.category_id === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.title || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, statusFilter, catFilter, search]);

  const statusLabel = (ps: string) => {
    const map: Record<string, string> = { idea: 'Idea', researching: 'Researching', booked: 'Booked', deposit_paid: 'Deposit paid', part_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled', quote_received: 'Quote received', shortlisted: 'Shortlisted' };
    return map[ps] || ps;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading budget...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !budget) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-outline text-xs cursor-pointer whitespace-nowrap">Try again</button>
        </div>
      </AppShell>
    );
  }

  if (!budget) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-money-pound-circle-line text-2xl" />
          </div>
          <h2 className="font-heading text-xl text-foreground-900 mb-2">No budget set up yet</h2>
          <p className="text-sm text-foreground-500 mb-6">Set your wedding budget to start tracking costs, supplier commitments and payments.</p>
          <button onClick={() => navigate('/app/budget/setup')} className="btn-primary text-sm cursor-pointer whitespace-nowrap">Set up budget</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding Budget</h1>
            <p className="text-sm text-foreground-500 mt-1">Plan costs, track supplier commitments and stay ahead of payments.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/app/budget/payments')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bank-card-line mr-1.5" />Payments</button>
            <button onClick={() => navigate('/app/budget/categories')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add expense</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Planned budget', value: formatGBP(planned), icon: 'ri-funds-line', colour: 'primary' },
            { label: 'Committed', value: formatGBP(committed), icon: 'ri-hand-coin-line', colour: 'accent' },
            { label: 'Paid', value: formatGBP(paid), icon: 'ri-check-double-line', colour: 'emerald' },
            { label: 'Outstanding', value: formatGBP(outstanding), icon: 'ri-hourglass-line', colour: outstanding > 0 ? 'amber' : 'emerald' },
            { label: 'Remaining', value: formatGBP(remaining), icon: 'ri-wallet-3-line', colour: 'sky' },
            { label: 'Upcoming', value: formatGBP(upcomingPayments.filter((p) => p.status === 'scheduled').reduce((s, p) => s + p.amount, 0)), icon: 'ri-calendar-check-line', colour: overduePayments.length > 0 ? 'red' : 'secondary' },
          ].map((card, i) => (
            <div key={card.label} className="card-default">
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg mb-2 ${
                i === 0 ? 'bg-primary-50 text-primary-600' :
                i === 1 ? 'bg-accent-50 text-accent-600' :
                i === 2 ? 'bg-emerald-50 text-emerald-600' :
                i === 3 ? (outstanding > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600') :
                i === 4 ? 'bg-sky-50 text-sky-600' :
                'bg-secondary-50 text-secondary-600'
              }`}>
                <i className={`${card.icon} text-sm`} />
              </div>
              <p className="text-lg font-heading font-semibold text-foreground-900">{card.value}</p>
              <p className="text-xs text-foreground-500 font-label mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Budget progress */}
        <div className="card-default mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-label text-foreground-600">Budget progress</span>
            <span className="text-xs font-label font-semibold text-foreground-900">{pctC}% committed · {pctP}% paid</span>
          </div>
          <div className="w-full h-4 bg-secondary-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-accent-500 transition-all duration-500" style={{ width: `${pctP}%` }} />
            <div className="h-full bg-accent-300/60 transition-all duration-500" style={{ width: `${pctC - pctP}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-foreground-400">
            <span>£0</span>
            <span>{formatGBP(planned)}</span>
          </div>
          {remaining < 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
              <i className="ri-error-warning-line" />
              <span>{formatGBP(Math.abs(remaining))} over budget</span>
            </div>
          )}
        </div>

        {/* Gift Fund Contributions */}
        {giftFunds.length > 0 && (
          <GiftFundSummarySection
            funds={giftFunds}
            onManage={() => navigate('/app/budget/gift-funding')}
          />
        )}

        {/* Category overview */}
        <div className="card-default mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">Categories</h2>
            <button onClick={() => navigate('/app/budget/categories')} className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap">Manage all</button>
          </div>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-foreground-500">No categories yet. Set up your budget to create category allocations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-200">
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Category</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Allocated</th>
                    <th className="text-center py-2.5 px-2 text-xs font-label text-foreground-500 w-24">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const catExps = expenses.filter((e) => e.category_id === cat.id && e.status === 'active');
                    const catCommitted = catExps.reduce((s, e) => s + (e.agreed_amount || e.quoted_amount || 0), 0);
                    const catPct = cat.planned_amount > 0 ? Math.min(100, Math.round((catCommitted / cat.planned_amount) * 100)) : 0;
                    return (
                      <tr key={cat.id} className="border-b border-background-100 hover:bg-background-50 transition-colors">
                        <td className="py-2.5 px-2"><span className="text-xs font-label text-foreground-800">{cat.name}</span></td>
                        <td className="py-2.5 px-2 text-right text-xs font-label text-foreground-700">{formatGBP(cat.planned_amount)}</td>
                        <td className="py-2.5 px-2">
                          <div className="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${catCommitted > cat.planned_amount ? 'bg-red-500' : catPct > 90 ? 'bg-amber-500' : 'bg-accent-500'}`} style={{ width: `${catPct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="card-default mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">Expenses ({filteredExpenses.length})</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-8 pr-8 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 w-48" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-xs" /></button>}
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-bill-line text-xl" /></div>
              <p className="text-sm text-foreground-500 mb-2">No expenses match your filters.</p>
              <button onClick={() => navigate('/app/budget/categories')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Add your first expense</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-200">
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Expense</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Category</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Agreed</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Paid</th>
                    <th className="text-center py-2.5 px-2 text-xs font-label text-foreground-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => {
                    const ePaid = expensePaidAmount(e.id);
                    const cat = categories.find((c) => c.id === e.category_id);
                    return (
                      <tr key={e.id} className={`border-b border-background-100 hover:bg-background-50 transition-colors ${e.status !== 'active' ? 'opacity-50' : ''}`}>
                        <td className="py-2.5 px-2"><span className="text-xs font-label text-foreground-800">{e.description || e.title}</span></td>
                        <td className="py-2.5 px-2 text-xs text-foreground-500">{cat?.name || '—'}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-label text-foreground-700">{formatGBP(e.agreed_amount || e.quoted_amount || 0)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-label text-emerald-600">{ePaid > 0 ? formatGBP(ePaid) : '—'}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-label whitespace-nowrap ${e.status !== 'active' ? 'bg-red-100 text-red-600' : e.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : e.payment_status === 'booked' ? 'bg-secondary-100 text-secondary-700' : e.payment_status === 'deposit_paid' ? 'bg-accent-100 text-accent-700' : 'bg-amber-100 text-amber-700'}`}>
                            {statusLabel(e.payment_status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/app/budget/categories')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bill-line mr-1.5" />Add expense</button>
            <button onClick={() => navigate('/app/budget/payments')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bank-card-line mr-1.5" />Record payment</button>
            <button onClick={() => navigate('/app/budget/suppliers')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-file-list-3-line mr-1.5" />Supplier quotes</button>
            <button onClick={() => setShowGuestCalc(!showGuestCalc)} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-calculator-line mr-1.5" />Guest cost calculator</button>
            <button onClick={() => navigate('/app/budget/reports')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bar-chart-line mr-1.5" />Reports</button>
            <button onClick={() => navigate('/app/budget/scenarios')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-scales-3-line mr-1.5" />Scenarios</button>
          </div>
        </div>

        {overduePayments.length > 0 && (
          <div className="card-default mb-6 border-red-200 bg-red-50/30">
            <div className="flex items-center gap-2 mb-3">
              <i className="ri-error-warning-line text-red-600 text-sm" />
              <h3 className="font-label text-sm font-semibold text-red-700">Payment warnings</h3>
            </div>
            <div className="space-y-1.5">
              {overduePayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-red-700">
                  <span>{p.notes || 'Payment overdue'} — {formatGBP(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Demo budget dashboard ──
function DemoBudgetDashboardPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [showGuestCalc, setShowGuestCalc] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const state = demo?.state;
  const categories = state?.budgetCategories || [];
  const expenses = state?.expenses || [];
  const payments = state?.payments || [];
  const suppliers = state?.suppliers || [];
  const demoGiftFunds = state?.giftFunds || [];
  const demoGiftFundContribs = state?.giftFundContributions || [];

  const demoGiftFundList: GiftFundListItem[] = useMemo(() => {
    return demoGiftFunds.map((f) => {
      const fundContribs = demoGiftFundContribs.filter((c) => c.fund_id === f.id && c.payment_status === 'paid');
      const raised = fundContribs.reduce((s, c) => s + c.amount_minor, 0);
      return {
        id: f.id,
        wedding_id: f.wedding_id,
        title: f.title,
        description: f.description,
        category: f.category as GiftFundListItem['category'],
        target_amount_minor: f.target_amount_minor,
        currency: (f.currency || 'GBP').toUpperCase() as GiftFundListItem['currency'],
        cover_image_path: f.cover_image_path,
        is_active: f.is_active,
        is_public: f.is_public,
        show_total_raised: f.show_total_raised,
        show_contributor_names: f.show_contributor_names,
        closes_at: f.closes_at,
        created_at: f.created_at,
        raised_amount_minor: raised,
        contributor_count: fundContribs.length,
      };
    });
  }, [demoGiftFunds, demoGiftFundContribs]);

  const planned = useMemo(() => categories.reduce((s, c) => s + c.planned_amount, 0), [categories]);
  const committed = useMemo(() => expenses.filter((e) => e.status === 'active').reduce((s, e) => s + (e.agreed_amount || e.quoted_amount), 0), [expenses]);
  const paid = useMemo(() => payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0), [payments]);
  const outstanding = committed - paid;
  const remaining = planned - committed;

  const upcomingPayments = useMemo(() => payments.filter((p) => p.status === 'pending' || p.status === 'overdue').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()), [payments]);
  const upcomingTotal = upcomingPayments.reduce((s, p) => s + p.amount, 0);
  const overduePayments = useMemo(() => payments.filter((p) => p.status === 'overdue'), [payments]);
  const overdueTotal = overduePayments.reduce((s, p) => s + p.amount, 0);

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const pctC = planned > 0 ? Math.min(100, Math.round((committed / planned) * 100)) : 0;
  const pctP = planned > 0 ? Math.min(100, Math.round((paid / planned) * 100)) : 0;

  const supplierName = (e: DemoExpense) => {
    if (!e.supplier_id) return null;
    const sup = suppliers.find((s) => s.id === e.supplier_id);
    return sup?.name || null;
  };

  const catName = (catId: string) => categories.find((c) => c.id === catId)?.name || '—';

  const expensePaidAmount = (expId: string) => payments.filter((p) => p.expense_id === expId && p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const expBalance = (e: DemoExpense) => (e.agreed_amount || e.quoted_amount) - expensePaidAmount(e.id);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (statusFilter === 'active') list = list.filter((e) => e.status === 'active');
    if (statusFilter === 'cancelled') list = list.filter((e) => e.status === 'cancelled');
    if (catFilter !== 'all') list = list.filter((e) => e.category_id === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.description.toLowerCase().includes(q) || catName(e.category_id).toLowerCase().includes(q) || (supplierName(e) || '').toLowerCase().includes(q));
    }
    return list;
  }, [expenses, statusFilter, catFilter, search]);

  const statusBg = (ps: string) => {
    switch (ps) {
      case 'booked': return 'bg-secondary-100 text-secondary-700';
      case 'deposit_paid': return 'bg-accent-100 text-accent-700';
      case 'part_paid': return 'bg-amber-100 text-amber-700';
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-foreground-100 text-foreground-600';
    }
  };
  const statusLabel = (ps: string) => {
    const map: Record<string, string> = { booked: 'Booked', deposit_paid: 'Deposit paid', part_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled', quoted: 'Quoted' };
    return map[ps] || ps;
  };

  const handleMarkPaid = (payment: DemoPayment) => {
    demo?.markPaymentPaid(payment.id);
    demo?.addDemoActivity({
      id: `demo-activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: `Payment of ${formatGBP(payment.amount)} for "${payment.description}" was marked as paid. Demo payment recorded. No real money was transferred.`,
      category: 'budget',
      related_guest: '',
      wedding_id: state?.wedding?.id || '',
    });
    setToastMsg('Demo payment recorded. No real money was transferred.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['Expense','Supplier','Category','Status','Agreed amount','Paid amount','Outstanding','Next payment due','Notes'];
    const rows = filteredExpenses.map((e) => {
      const paidAmt = expensePaidAmount(e.id);
      const nxt = payments.filter((p) => p.expense_id === e.id && (p.status === 'pending' || p.status === 'overdue')).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      return [
        e.description,
        supplierName(e) || '—',
        catName(e.category_id),
        statusLabel(e.payment_status),
        formatGBP(e.agreed_amount || e.quoted_amount),
        formatGBP(paidAmt),
        formatGBP((e.agreed_amount || e.quoted_amount) - paidAmt),
        nxt[0]?.due_date ? new Date(nxt[0].due_date).toLocaleDateString('en-GB') : '—',
        e.description,
      ];
    });
    const summaryRows = [
      ['SUMMARY','','','','','','','',''],
      ['Planned budget','','','',formatGBP(planned),'','','',''],
      ['Committed','','','',formatGBP(committed),'','','',''],
      ['Paid','','','',formatGBP(paid),'','','',''],
      ['Outstanding','','','',formatGBP(outstanding),'','','',''],
      ['Remaining uncommitted','','','',formatGBP(remaining),'','','',''],
      ['','','','','','','','',''],
    ];
    const all = [headers, ...summaryRows, ...rows];
    const csv = '\uFEFF' + all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-budget.csv';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setToastMsg('Budget CSV exported.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / 86400000);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding Budget</h1>
            <p className="text-sm text-foreground-500 mt-1">Plan costs, track supplier commitments and stay ahead of payments.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-3 py-1.5 rounded-full bg-accent-100 text-accent-700 font-label whitespace-nowrap">Demo Account</span>
            <button onClick={() => setShowExportModal(true)} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1.5" />Export</button>
            <button onClick={() => navigate('/app/budget/payments')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bank-card-line mr-1.5" />Payments</button>
            <button onClick={() => navigate('/app/budget/categories')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add expense</button>
          </div>
        </div>

        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">How the budget works</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">Set a planned budget across categories, add supplier expenses and log payments as you go. Mark payments as paid to track exactly what&rsquo;s left outstanding. Use the Export button to download a full CSV. This is demo data; no real payments are processed.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Planned budget', value: formatGBP(planned), icon: 'ri-funds-line', color: 'primary' },
            { label: 'Committed', value: formatGBP(committed), icon: 'ri-hand-coin-line', color: 'accent' },
            { label: 'Paid', value: formatGBP(paid), icon: 'ri-check-double-line', color: 'emerald' },
            { label: 'Outstanding', value: formatGBP(outstanding), icon: 'ri-hourglass-line', color: outstanding > 0 ? 'amber' : 'emerald' },
            { label: 'Remaining', value: formatGBP(remaining), icon: 'ri-wallet-3-line', color: 'sky' },
            { label: 'Upcoming', value: formatGBP(upcomingTotal), icon: 'ri-calendar-check-line', color: overdueTotal > 0 ? 'red' : 'secondary' },
          ].map((card, i) => (
            <div key={card.label} className="card-default">
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg mb-2 ${
                i === 0 ? 'bg-primary-50 text-primary-600' :
                i === 1 ? 'bg-accent-50 text-accent-600' :
                i === 2 ? 'bg-emerald-50 text-emerald-600' :
                i === 3 ? (outstanding > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600') :
                i === 4 ? 'bg-sky-50 text-sky-600' :
                'bg-secondary-50 text-secondary-600'
              }`}>
                <i className={`${card.icon} text-sm`} />
              </div>
              <p className="text-lg font-heading font-semibold text-foreground-900">{card.value}</p>
              <p className="text-xs text-foreground-500 font-label mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="card-default mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-label text-foreground-600">Budget progress</span>
            <span className="text-xs font-label font-semibold text-foreground-900">{pctC}% committed · {pctP}% paid</span>
          </div>
          <div className="w-full h-4 bg-secondary-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-accent-500 transition-all duration-500" style={{ width: `${pctP}%` }} />
            <div className="h-full bg-accent-300/60 transition-all duration-500" style={{ width: `${pctC - pctP}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-foreground-400">
            <span>£0</span>
            <span>{formatGBP(planned)}</span>
          </div>
          {remaining < 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
              <i className="ri-error-warning-line" />
              <span>{formatGBP(Math.abs(remaining))} over budget — committed spend exceeds planned budget</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`card-default ${remaining < 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <i className={`${remaining < 0 ? 'ri-error-warning-line' : 'ri-check-line'} text-sm`} />
              </div>
              <div>
                <p className={`text-xs font-label font-semibold ${remaining < 0 ? 'text-red-700' : 'text-foreground-900'}`}>{remaining < 0 ? 'Over budget' : 'On track'}</p>
                <p className={`text-xs ${remaining < 0 ? 'text-red-600' : 'text-foreground-500'}`}>{remaining < 0 ? `${formatGBP(Math.abs(remaining))} over your limit` : 'Spending within planned budget'}</p>
              </div>
            </div>
          </div>
          <div className="card-default">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <i className="ri-shield-check-line text-sm" />
              </div>
              <div>
                <p className="text-xs font-label font-semibold text-foreground-900">Contingency</p>
                <p className="text-xs text-foreground-500">{formatGBP(categories.find((c) => c.name === 'Contingency')?.planned_amount || 0)}</p>
              </div>
            </div>
          </div>
          <div className={`card-default ${overdueTotal > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${overdueTotal > 0 ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600'}`}>
                <i className={`${overdueTotal > 0 ? 'ri-error-warning-line' : 'ri-timer-line'} text-sm`} />
              </div>
              <div>
                <p className={`text-xs font-label font-semibold ${overdueTotal > 0 ? 'text-red-700' : 'text-foreground-900'}`}>{overdueTotal > 0 ? 'Overdue' : 'Payments due soon'}</p>
                <p className={`text-xs ${overdueTotal > 0 ? 'text-red-600' : 'text-foreground-500'}`}>{overdueTotal > 0 ? `${formatGBP(overdueTotal)} overdue` : `${upcomingPayments.length} upcoming`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-default mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">Categories</h2>
            <button onClick={() => navigate('/app/budget/categories')} className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap">Manage all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Category</th>
                  <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Allocated</th>
                  <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Committed</th>
                  <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Paid</th>
                  <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Variance</th>
                  <th className="text-center py-2.5 px-2 text-xs font-label text-foreground-500 w-24">Progress</th>
                </tr>
              </thead>
              <tbody>
                {categories.filter((c) => c.planned_amount > 0).map((cat) => {
                  const catExps = expenses.filter((e) => e.category_id === cat.id && e.status === 'active');
                  const catCommitted = catExps.reduce((s, e) => s + (e.agreed_amount || e.quoted_amount), 0);
                  const catPaid = catExps.reduce((s, e) => s + expensePaidAmount(e.id), 0);
                  const catVar = catCommitted - cat.planned_amount;
                  const catPct = cat.planned_amount > 0 ? Math.min(100, Math.round((catCommitted / cat.planned_amount) * 100)) : 0;
                  return (
                    <tr key={cat.id} className="border-b border-background-100 hover:bg-background-50 transition-colors">
                      <td className="py-2.5 px-2">
                        <span className="text-xs font-label text-foreground-800">{cat.name}</span>
                        <span className="text-xs text-foreground-400 ml-1">({catExps.length})</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs font-label text-foreground-700">{formatGBP(cat.planned_amount)}</td>
                      <td className="py-2.5 px-2 text-right text-xs font-label text-foreground-700">{formatGBP(catCommitted)}</td>
                      <td className="py-2.5 px-2 text-right text-xs font-label text-foreground-700">{catPaid > 0 ? formatGBP(catPaid) : '—'}</td>
                      <td className={`py-2.5 px-2 text-right text-xs font-label ${catVar > 0 ? 'text-red-600' : catVar < 0 ? 'text-emerald-600' : 'text-foreground-500'}`}>
                        {catVar === 0 ? '—' : `${catVar > 0 ? '+' : ''}${formatGBP(catVar)}`}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-400 ${catVar > 0 ? 'bg-red-500' : catPct > 90 ? 'bg-amber-500' : 'bg-accent-500'}`} style={{ width: `${catPct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-default mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">Expenses ({filteredExpenses.length})</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-8 pr-8 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors w-48" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-xs" /></button>}
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                <option value="all">All statuses</option><option value="active">Active</option><option value="cancelled">Cancelled</option>
              </select>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {(search || statusFilter !== 'all' || catFilter !== 'all') && (
                <button onClick={() => { setSearch(''); setStatusFilter('all'); setCatFilter('all'); }} className="text-xs text-accent-600 hover:text-accent-700 font-label cursor-pointer whitespace-nowrap">Clear filters</button>
              )}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-bill-line text-xl" /></div>
              <p className="text-sm text-foreground-500 mb-2">No expenses match your filters.</p>
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setCatFilter('all'); }} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Clear all filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-200">
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Expense</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Supplier</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500">Category</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Agreed</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Paid</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500">Balance</th>
                    <th className="text-center py-2.5 px-2 text-xs font-label text-foreground-500">Status</th>
                    <th className="text-center py-2.5 px-2 text-xs font-label text-foreground-500 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => {
                    const ePaid = expensePaidAmount(e.id);
                    const bal = (e.agreed_amount || e.quoted_amount) - ePaid;
                    const sup = supplierName(e);
                    return (
                      <tr key={e.id} className={`border-b border-background-100 hover:bg-background-50 transition-colors ${e.status === 'cancelled' ? 'opacity-50' : ''}`}>
                        <td className="py-2.5 px-2">
                          <span className="text-xs font-label text-foreground-800">{e.description}</span>
                          {e.status === 'cancelled' && <span className="text-xs text-red-500 ml-1">(cancelled)</span>}
                        </td>
                        <td className="py-2.5 px-2 text-xs text-foreground-500">{sup || '—'}</td>
                        <td className="py-2.5 px-2 text-xs text-foreground-500">{catName(e.category_id)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-label text-foreground-700">{formatGBP(e.agreed_amount || e.quoted_amount)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-label text-emerald-600">{ePaid > 0 ? formatGBP(ePaid) : '—'}</td>
                        <td className={`py-2.5 px-2 text-right text-xs font-label ${bal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{bal > 0 ? formatGBP(bal) : '—'}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-label ${statusBg(e.payment_status)}`}>{statusLabel(e.payment_status)}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button onClick={() => navigate('/app/budget/categories')} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer" title="View details"><i className="ri-arrow-right-s-line text-sm" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-default mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">Payment schedule</h2>
            <button onClick={() => navigate('/app/budget/payments')} className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap">View all</button>
          </div>
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-foreground-400">No upcoming payments.</p>
          ) : (
            <div className="space-y-2">
              {upcomingPayments.slice(0, 6).map((p) => {
                const days = daysUntil(p.due_date);
                const exp = expenses.find((e) => e.id === p.expense_id);
                const sup = exp ? supplierName(exp) : null;
                return (
                  <div key={p.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${p.status === 'overdue' ? 'bg-red-50 border border-red-100' : 'bg-background-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${p.status === 'overdue' ? 'bg-red-500' : days <= 30 ? 'bg-amber-500' : 'bg-secondary-400'}`} />
                      <div>
                        <p className="text-xs font-label text-foreground-800">{p.description}</p>
                        <p className="text-xs text-foreground-400">{sup || catName(exp?.category_id || '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-label text-foreground-700">{formatGBP(p.amount)}</span>
                      <span className={`text-xs ${p.status === 'overdue' ? 'text-red-600 font-semibold' : days <= 30 ? 'text-amber-600' : 'text-foreground-500'}`}>
                        {p.status === 'overdue' ? `${Math.abs(days)}d overdue` : days <= 0 ? 'Due today' : `${days}d`}
                      </span>
                      <button onClick={() => handleMarkPaid(p)} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-label cursor-pointer whitespace-nowrap">Mark paid</button>
                    </div>
                  </div>
                );
              })}
              {upcomingPayments.length > 6 && (
                <p className="text-xs text-foreground-400 pl-3">+{upcomingPayments.length - 6} more payments</p>
              )}
            </div>
          )}
        </div>

        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/app/budget/categories')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bill-line mr-1.5" />Add expense</button>
            <button onClick={() => navigate('/app/budget/payments')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-bank-card-line mr-1.5" />Record payment</button>
            <button onClick={() => navigate('/app/budget/suppliers')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-file-list-3-line mr-1.5" />Supplier quotes</button>
            <button onClick={() => setShowGuestCalc(!showGuestCalc)} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-calculator-line mr-1.5" />Guest cost calculator</button>
            <button onClick={() => setShowExportModal(true)} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-download-line mr-1.5" />Export CSV</button>
          </div>
        </div>

        {showGuestCalc && <GuestCostCalculator />}

        {overdueTotal > 0 && (
          <div className="card-default mb-6 border-red-200 bg-red-50/30">
            <div className="flex items-center gap-2 mb-3">
              <i className="ri-error-warning-line text-red-600 text-sm" />
              <h3 className="font-label text-sm font-semibold text-red-700">Payment warnings</h3>
            </div>
            <div className="space-y-1.5">
              {overduePayments.map((p) => {
                const days = Math.abs(daysUntil(p.due_date));
                return (
                  <div key={p.id} className="flex items-center justify-between text-xs text-red-700">
                    <span>{p.description} — {formatGBP(p.amount)} ({days}d overdue)</span>
                    <button onClick={() => handleMarkPaid(p)} className="text-xs text-red-600 underline hover:text-red-800 cursor-pointer whitespace-nowrap">Mark paid</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowExportModal(false)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-label text-sm font-semibold text-foreground-900">Export budget CSV</h3>
                <button onClick={() => setShowExportModal(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
              </div>
              <p className="text-xs text-foreground-500 mb-4">Download a CSV with expense details and summary totals.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleExportCSV} className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">
                  <i className="ri-download-line mr-1.5" />Download CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-foreground-900 text-white text-sm shadow-lg animate-fade-in">
            {toastMsg}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function GuestCostCalculator() {
  const [adultDay, setAdultDay] = useState(80);
  const [childDay, setChildDay] = useState(10);
  const [evening, setEvening] = useState(30);
  const [adultCost, setAdultCost] = useState(100);
  const [childCost, setChildCost] = useState(50);
  const [eveningCost, setEveningCost] = useState(35);
  const [drinksCost, setDrinksCost] = useState(25);

  const cateringTotal = (adultDay * adultCost) + (childDay * childCost) + (evening * eveningCost);
  const drinksTotal = (adultDay + childDay + evening) * drinksCost;
  const grandTotal = cateringTotal + drinksTotal;
  const totalGuests = adultDay + childDay + evening;
  const perHead = totalGuests > 0 ? grandTotal / totalGuests : 0;

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

  return (
    <div className="card-default mb-6 border-accent-200 bg-accent-50/20">
      <div className="flex items-center gap-2 mb-4">
        <i className="ri-calculator-line text-accent-600 text-sm" />
        <h3 className="font-label text-sm font-semibold text-foreground-900">Guest cost calculator</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-label text-foreground-600 mb-1">Adult day guests</label>
          <input type="number" value={adultDay} onChange={(e) => setAdultDay(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-label text-foreground-600 mb-1">Child day guests</label>
          <input type="number" value={childDay} onChange={(e) => setChildDay(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-label text-foreground-600 mb-1">Evening only</label>
          <input type="number" value={evening} onChange={(e) => setEvening(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div><label className="block text-xs font-label text-foreground-600 mb-1">Adult cost (£)</label><input type="number" value={adultCost} onChange={(e) => setAdultCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" /></div>
        <div><label className="block text-xs font-label text-foreground-600 mb-1">Child cost (£)</label><input type="number" value={childCost} onChange={(e) => setChildCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" /></div>
        <div><label className="block text-xs font-label text-foreground-600 mb-1">Evening cost (£)</label><input type="number" value={eveningCost} onChange={(e) => setEveningCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" /></div>
        <div><label className="block text-xs font-label text-foreground-600 mb-1">Drink cost pp (£)</label><input type="number" value={drinksCost} onChange={(e) => setDrinksCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-white border border-secondary-100">
        <div className="text-center"><p className="text-xs text-foreground-500">Catering</p><p className="font-heading text-lg font-semibold text-foreground-900">{formatGBP(cateringTotal)}</p></div>
        <div className="text-center"><p className="text-xs text-foreground-500">Drinks</p><p className="font-heading text-lg font-semibold text-foreground-900">{formatGBP(drinksTotal)}</p></div>
        <div className="text-center"><p className="text-xs text-foreground-500">Per head</p><p className="font-heading text-lg font-semibold text-foreground-900">{formatGBP(Math.round(perHead))}</p></div>
        <div className="text-center"><p className="text-xs text-foreground-500">Total</p><p className="font-heading text-lg font-semibold text-accent-600">{formatGBP(grandTotal)}</p></div>
      </div>
      <p className="text-xs text-foreground-400 mt-3">UK benchmark: £272–£278 per guest. Figures shown are your own calculations.</p>
    </div>
  );
}

// ── Page export ──
export default function BudgetDashboardPage() {
  const demo = useDemoDataSafe();
  if (isDemoMode && demo) return <DemoBudgetDashboardPage />;
  return <NormalBudgetDashboardPage />;
}