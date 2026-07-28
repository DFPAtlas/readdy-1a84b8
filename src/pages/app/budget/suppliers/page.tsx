import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { formatMajor, toMinor, sumMinor, pctMinor, type CurrencyCode } from '@/lib/budgetMoney';
import type { BudgetExpense, BudgetPayment } from '@/types/budget';
import type { DemoSupplier } from '@/demo/demoTypes';

interface SupplierRow {
  id: string;
  wedding_id: string;
  business_name: string;
  category: string;
  status: string;
  rating: number | null;
  website: string | null;
  notes: string | null;
  agreed_amount: number | null;
  next_action: string | null;
  next_action_date: string | null;
  contract_reference: string | null;
  created_at: string;
}

// ── Normal (Supabase) Suppliers page ──
function NormalBudgetSuppliersPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [payments, setPayments] = useState<BudgetPayment[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSup, setSelectedSup] = useState<SupplierRow | null>(null);

  const currency: CurrencyCode = 'GBP';

  useEffect(() => {
    let cancelled = false;
    if (!weddingId) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [supRes, expRes, payRes] = await Promise.all([
          supabase.from('wedding_suppliers').select('*').eq('wedding_id', weddingId).is('archived_at', null).order('business_name'),
          supabase.from('budget_expenses').select('*').eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('budget_payments').select('*').eq('wedding_id', weddingId),
        ]);
        if (cancelled) return;
        if (supRes.error) throw supRes.error;
        setSuppliers((supRes.data || []) as SupplierRow[]);
        setExpenses((expRes.data || []) as BudgetExpense[]);
        setPayments((payRes.data || []) as BudgetPayment[]);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load suppliers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [weddingId]);

  const supExpenses = (supId: string) => expenses.filter((e) => e.supplier_id === supId);
  const supCommitted = (supId: string) => {
    const exps = supExpenses(supId).filter((e) => ['booked', 'deposit_paid', 'part_paid', 'paid'].includes(e.payment_status));
    return sumMinor(exps.map((e) => e.agreed_amount || e.quoted_amount || 0));
  };
  const supPaid = (supId: string) => {
    const expIds = supExpenses(supId).map((e) => e.id);
    return sumMinor(payments.filter((p) => expIds.includes(p.expense_id || '') && p.status === 'paid').map((p) => p.amount));
  };
  const supOutstanding = (supId: string) => supCommitted(supId) - supPaid(supId);

  const totalCommitted = sumMinor(suppliers.map((s) => supCommitted(s.id)).filter((v) => v > 0));
  const totalPaid = sumMinor(suppliers.map((s) => supPaid(s.id)).filter((v) => v > 0));

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((s) => s.business_name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [suppliers, search]);

  const catBadge = (cat: string) => {
    const map: Record<string, string> = { 'bg-primary-50 text-primary-700': 'bg-primary-50 text-primary-700' };
    const lower = cat.toLowerCase();
    if (lower.includes('venue')) return 'bg-primary-50 text-primary-700';
    if (lower.includes('photo')) return 'bg-accent-50 text-accent-700';
    if (lower.includes('flor')) return 'bg-pink-50 text-pink-700';
    if (lower.includes('cater')) return 'bg-amber-50 text-amber-700';
    if (lower.includes('transport') || lower.includes('car')) return 'bg-sky-50 text-sky-700';
    if (lower.includes('entertain') || lower.includes('band') || lower.includes('dj')) return 'bg-secondary-50 text-secondary-700';
    return 'bg-foreground-100 text-foreground-600';
  };

  if (loading) {
    return <AppShell><div className="max-w-6xl mx-auto py-20 text-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /><p className="text-sm text-foreground-500 mt-3">Loading suppliers...</p></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Supplier quotes</h1>
          </div>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-8 pr-8 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 w-48" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-xs" /></button>}
          </div>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Suppliers</p><p className="text-xl font-heading font-semibold text-foreground-900">{suppliers.length}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total committed</p><p className="text-xl font-heading font-semibold text-accent-600">{formatMajor(totalCommitted, currency)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total paid</p><p className="text-xl font-heading font-semibold text-emerald-600">{formatMajor(totalPaid, currency)}</p></div>
        </div>

        {filtered.length === 0 ? (
          <div className="card-default text-center py-12">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-file-list-3-line text-2xl" />
            </div>
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">No suppliers yet</h2>
            <p className="text-sm text-foreground-500 mb-6 max-w-sm mx-auto">
              Add suppliers from the Suppliers page in the sidebar to track quotes, contacts and documents.
            </p>
            <button onClick={() => navigate('/app/suppliers')} className="btn-primary text-sm cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1.5" />Go to Suppliers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {filtered.map((sup) => {
              const committed = supCommitted(sup.id);
              const paid = supPaid(sup.id);
              const outstanding = committed - paid;
              const exps = supExpenses(sup.id);
              return (
                <div key={sup.id} className="card-default cursor-pointer hover:border-primary-200 transition-colors" onClick={() => setSelectedSup(sup)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-label text-sm font-semibold text-foreground-900">{sup.business_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-label ${catBadge(sup.category)}`}>{sup.category}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-label ${sup.status === 'active' ? 'bg-emerald-100 text-emerald-700' : sup.status === 'draft' ? 'bg-secondary-100 text-secondary-700' : 'bg-foreground-100 text-foreground-600'}`}>
                      {sup.status}
                    </span>
                  </div>
                  {exps.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center"><p className="text-xs text-foreground-400">Committed</p><p className="text-sm font-label font-semibold text-foreground-800">{formatMajor(committed, currency)}</p></div>
                      <div className="text-center"><p className="text-xs text-foreground-400">Paid</p><p className="text-sm font-label font-semibold text-emerald-600">{formatMajor(paid, currency)}</p></div>
                      <div className="text-center"><p className="text-xs text-foreground-400">Balance</p><p className={`text-sm font-label font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatMajor(outstanding, currency)}</p></div>
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-400 mb-3">No expenses linked yet</p>
                  )}
                  {sup.next_action && (
                    <p className="text-xs text-foreground-500 flex items-center gap-1"><i className="ri-time-line text-xs" />{sup.next_action}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Supplier detail drawer */}
        {selectedSup && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedSup(null)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[75vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-label text-sm font-semibold text-foreground-900">{selectedSup.business_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-label ${catBadge(selectedSup.category)}`}>{selectedSup.category}</span>
                  </div>
                  <button onClick={() => setSelectedSup(null)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
                </div>

                <div className="space-y-4">
                  {selectedSup.website && (
                    <div className="p-3 rounded-lg bg-background-50">
                      <p className="text-xs text-foreground-400 mb-1">Website</p>
                      <a href={selectedSup.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline break-all">{selectedSup.website}</a>
                    </div>
                  )}

                  {selectedSup.contract_reference && (
                    <div className="p-3 rounded-lg bg-background-50">
                      <p className="text-xs text-foreground-400 mb-1">Contract reference</p>
                      <p className="text-sm text-foreground-800">{selectedSup.contract_reference}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background-50 text-center">
                      <p className="text-xs text-foreground-400">Committed</p>
                      <p className="text-sm font-label font-semibold text-foreground-800">{formatMajor(supCommitted(selectedSup.id), currency)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background-50 text-center">
                      <p className="text-xs text-foreground-400">Paid</p>
                      <p className="text-sm font-label font-semibold text-emerald-600">{formatMajor(supPaid(selectedSup.id), currency)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background-50 text-center">
                      <p className="text-xs text-foreground-400">Balance</p>
                      <p className="text-sm font-label font-semibold text-amber-600">{formatMajor(supOutstanding(selectedSup.id), currency)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-label font-semibold text-foreground-700 mb-2">Linked expenses</h4>
                    {supExpenses(selectedSup.id).length === 0 ? (
                      <p className="text-xs text-foreground-400">No expenses linked.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {supExpenses(selectedSup.id).map((e) => {
                          const ep = payments.filter((p) => p.expense_id === e.id && p.status === 'paid');
                          const ePaid = sumMinor(ep.map((p) => p.amount));
                          return (
                            <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded bg-white border border-secondary-100">
                              <span className="text-xs text-foreground-700 truncate flex-1 mr-2">{e.description || e.title}</span>
                              <span className="text-xs font-label text-foreground-700 whitespace-nowrap">{formatMajor(e.agreed_amount || e.quoted_amount || 0, currency)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedSup.next_action && (
                    <div className="p-3 rounded-lg bg-accent-50/30 border border-accent-100">
                      <h4 className="text-xs font-label font-semibold text-accent-700 mb-1">Next action</h4>
                      <p className="text-xs text-accent-600">{selectedSup.next_action}</p>
                      {selectedSup.next_action_date && <p className="text-xs text-accent-500 mt-1">Due: {new Date(selectedSup.next_action_date).toLocaleDateString('en-GB')}</p>}
                    </div>
                  )}

                  {selectedSup.notes && (
                    <div>
                      <h4 className="text-xs font-label font-semibold text-foreground-700 mb-1">Notes</h4>
                      <p className="text-xs text-foreground-500">{selectedSup.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => navigate('/app/suppliers')} className="btn-outline text-xs py-2 flex-1 cursor-pointer whitespace-nowrap">
                      <i className="ri-contacts-book-line mr-1.5" />Manage supplier
                    </button>
                    <button onClick={() => navigate('/app/budget/categories')} className="btn-outline text-xs py-2 flex-1 cursor-pointer whitespace-nowrap">
                      <i className="ri-bill-line mr-1.5" />Add expense
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Demo suppliers page ──
function DemoBudgetSuppliersPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const [selectedSup, setSelectedSup] = useState<DemoSupplier | null>(null);
  const [search, setSearch] = useState('');

  const state = demo?.state;
  const suppliers = state?.suppliers || [];
  const expenses = state?.expenses || [];
  const payments = state?.payments || [];

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

  const filtered = search.trim()
    ? suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))
    : suppliers;

  const supExpenses = (sup: DemoSupplier) => expenses.filter((e) => e.supplier_id === sup.id);
  const supCommitted = (sup: DemoSupplier) => supExpenses(sup).filter((e) => e.status === 'active').reduce((s, e) => s + (e.agreed_amount || e.quoted_amount), 0);
  const supPaid = (sup: DemoSupplier) => {
    const expIds = supExpenses(sup).map((e) => e.id);
    return payments.filter((p) => expIds.includes(p.expense_id) && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  };

  const totalCommitted = suppliers.reduce((s, sup) => s + supCommitted(sup), 0);
  const totalPaid = suppliers.reduce((s, sup) => s + supPaid(sup), 0);

  const catBadge = (cat: string) => {
    const map: Record<string, string> = {
      Venue: 'bg-primary-50 text-primary-700', Photography: 'bg-accent-50 text-accent-700',
      Florist: 'bg-pink-50 text-pink-700', Catering: 'bg-amber-50 text-amber-700',
      Transport: 'bg-sky-50 text-sky-700', Entertainment: 'bg-secondary-50 text-secondary-700',
    };
    return map[cat] || 'bg-foreground-100 text-foreground-600';
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Supplier quotes</h1>
          </div>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-8 pr-8 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 w-48" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-xs" /></button>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Suppliers</p><p className="text-xl font-heading font-semibold text-foreground-900">{suppliers.length}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total committed</p><p className="text-xl font-heading font-semibold text-accent-600">{formatGBP(totalCommitted)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total paid</p><p className="text-xl font-heading font-semibold text-emerald-600">{formatGBP(totalPaid)}</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {filtered.map((sup) => {
            const committed = supCommitted(sup);
            const paid = supPaid(sup);
            const outstanding = committed - paid;
            return (
              <div key={sup.id} className="card-default cursor-pointer" onClick={() => setSelectedSup(sup)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-label text-sm font-semibold text-foreground-900">{sup.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-label ${catBadge(sup.category)}`}>{sup.category}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-label ${sup.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-foreground-100 text-foreground-600'}`}>
                    {sup.status === 'active' ? 'Active' : sup.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center"><p className="text-xs text-foreground-400">Committed</p><p className="text-sm font-label font-semibold text-foreground-800">{formatGBP(committed)}</p></div>
                  <div className="text-center"><p className="text-xs text-foreground-400">Paid</p><p className="text-sm font-label font-semibold text-emerald-600">{formatGBP(paid)}</p></div>
                  <div className="text-center"><p className="text-xs text-foreground-400">Outstanding</p><p className={`text-sm font-label font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatGBP(outstanding)}</p></div>
                </div>
                {sup.next_action && (
                  <p className="text-xs text-foreground-500 flex items-center gap-1"><i className="ri-time-line text-xs" />{sup.next_action}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="card-default">
          <p className="text-xs text-foreground-500">
            <strong className="text-foreground-700">Note:</strong> Only booked or deposit-paid suppliers contribute to committed totals. 
            Full supplier management including contact details, invoice tracking, and messaging is available in production mode.
          </p>
        </div>

        {selectedSup && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedSup(null)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[75vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-label text-sm font-semibold text-foreground-900">{selectedSup.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-label ${catBadge(selectedSup.category)}`}>{selectedSup.category}</span>
                  </div>
                  <button onClick={() => setSelectedSup(null)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
                </div>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-background-50">
                    <h4 className="text-xs font-label font-semibold text-foreground-700 mb-2">Contact</h4>
                    <div className="space-y-1 text-xs text-foreground-500">
                      {selectedSup.contact_name && <p className="flex items-center gap-2"><i className="ri-user-line text-foreground-400" />{selectedSup.contact_name}</p>}
                      {selectedSup.email && <p className="flex items-center gap-2"><i className="ri-mail-line text-foreground-400" />{selectedSup.email}</p>}
                      {selectedSup.phone && <p className="flex items-center gap-2"><i className="ri-phone-line text-foreground-400" />{selectedSup.phone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background-50 text-center"><p className="text-xs text-foreground-400">Committed</p><p className="text-sm font-label font-semibold text-foreground-800">{formatGBP(supCommitted(selectedSup))}</p></div>
                    <div className="p-3 rounded-lg bg-background-50 text-center"><p className="text-xs text-foreground-400">Paid</p><p className="text-sm font-label font-semibold text-emerald-600">{formatGBP(supPaid(selectedSup))}</p></div>
                    <div className="p-3 rounded-lg bg-background-50 text-center"><p className="text-xs text-foreground-400">Outstanding</p><p className="text-sm font-label font-semibold text-amber-600">{formatGBP(supCommitted(selectedSup) - supPaid(selectedSup))}</p></div>
                  </div>
                  <div>
                    <h4 className="text-xs font-label font-semibold text-foreground-700 mb-2">Related expenses</h4>
                    {supExpenses(selectedSup).length === 0 ? (
                      <p className="text-xs text-foreground-400">No expenses linked to this supplier.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {supExpenses(selectedSup).map((e) => {
                          const ePaid = payments.filter((p) => p.expense_id === e.id && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
                          return (
                            <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded bg-white border border-secondary-100">
                              <span className="text-xs text-foreground-700">{e.description}</span>
                              <span className="text-xs font-label text-foreground-700">{formatGBP(e.agreed_amount || e.quoted_amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {selectedSup.next_action && (
                    <div className="p-3 rounded-lg bg-accent-50/30 border border-accent-100">
                      <h4 className="text-xs font-label font-semibold text-accent-700 mb-1">Next action</h4>
                      <p className="text-xs text-accent-600">{selectedSup.next_action}</p>
                    </div>
                  )}
                  {selectedSup.notes && (
                    <div><h4 className="text-xs font-label font-semibold text-foreground-700 mb-1">Notes</h4><p className="text-xs text-foreground-500">{selectedSup.notes}</p></div>
                  )}
                  <div className="p-3 rounded-lg bg-background-50 border border-secondary-100 text-xs text-foreground-400 flex items-center gap-2">
                    <i className="ri-information-line" />
                    <span>Full supplier management — including invoice upload, messaging, and payment tracking — is available in the production application.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Page export ──
export default function BudgetSuppliersPage() {
  const demo = useDemoDataSafe();
  if (isDemoMode && demo) return <DemoBudgetSuppliersPage />;
  return <NormalBudgetSuppliersPage />;
}