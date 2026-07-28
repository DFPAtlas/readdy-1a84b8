import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import { formatMajor, toMinor, sumMinor, type CurrencyCode } from '@/lib/budgetMoney';
import type { BudgetCategory, BudgetExpense, ExpenseStatus } from '@/types/budget';
import type { DemoExpense, DemoBudgetCategory } from '@/demo/demoTypes';

const EXPENSE_STATUSES: ExpenseStatus[] = ['idea', 'researching', 'quote_received', 'shortlisted', 'booked', 'deposit_paid', 'part_paid', 'paid'];
const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea', researching: 'Researching', quote_received: 'Quote received', shortlisted: 'Shortlisted',
  booked: 'Booked', deposit_paid: 'Deposit paid', part_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled', refunded: 'Refunded',
};

// ── Normal (Supabase) Categories page ──
function NormalBudgetCategoriesPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '', description: '', category_id: '', agreed_amount: '', quoted_amount: '',
    payment_status: 'booked' as ExpenseStatus, supplier_id: '', due_date: '', notes: '', vat_status: 'included' as 'included' | 'excluded' | 'exempt',
  });
  const [formError, setFormError] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [suppliers, setSuppliers] = useState<{ id: string; business_name: string }[]>([]);

  const currency: CurrencyCode = 'GBP';

  useEffect(() => {
    let cancelled = false;
    if (!weddingId) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [cRes, eRes, sRes] = await Promise.all([
          supabase.from('budget_categories').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('sort_order'),
          supabase.from('budget_expenses').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
          supabase.from('wedding_suppliers').select('id, business_name').eq('wedding_id', weddingId).is('archived_at', null).order('business_name'),
        ]);
        if (cancelled) return;
        if (cRes.error) throw cRes.error;
        setCategories((cRes.data || []) as BudgetCategory[]);
        setExpenses((eRes.data || []) as BudgetExpense[]);
        setSuppliers((sRes.data || []) as { id: string; business_name: string }[]);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [weddingId]);

  const handleOpenExpenseForm = (exp?: BudgetExpense, catId?: string) => {
    if (exp) {
      setEditingExpenseId(exp.id);
      setExpenseForm({
        title: exp.title || '', description: exp.description || '', category_id: exp.category_id || '',
        agreed_amount: exp.agreed_amount ? String(exp.agreed_amount) : '', quoted_amount: exp.quoted_amount ? String(exp.quoted_amount) : '',
        payment_status: exp.payment_status, supplier_id: exp.supplier_id || '', due_date: exp.due_date || '',
        notes: exp.notes || '', vat_status: exp.vat_status || 'included',
      });
    } else {
      setEditingExpenseId(null);
      setExpenseForm({
        title: '', description: '', category_id: catId || categories[0]?.id || '',
        agreed_amount: '', quoted_amount: '', payment_status: 'booked', supplier_id: '', due_date: '', notes: '', vat_status: 'included',
      });
    }
    setFormError('');
    setShowExpenseForm(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim() && !expenseForm.title.trim()) { setFormError('Please enter a description or title'); return; }
    if (!expenseForm.category_id) { setFormError('Please select a category'); return; }
    const amt = parseFloat(expenseForm.agreed_amount);
    if (!amt || amt <= 0) { setFormError('Please enter a valid agreed amount'); return; }

    setSavingExpense(true);
    try {
      const payload = {
        wedding_id: weddingId,
        category_id: expenseForm.category_id,
        supplier_id: expenseForm.supplier_id || null,
        title: expenseForm.title.trim() || expenseForm.description.trim(),
        description: expenseForm.description.trim() || null,
        agreed_amount: amt,
        quoted_amount: parseFloat(expenseForm.quoted_amount) || 0,
        deposit_amount: 0,
        amount_paid: 0,
        payment_status: expenseForm.payment_status,
        due_date: expenseForm.due_date || null,
        notes: expenseForm.notes || null,
        vat_status: expenseForm.vat_status,
        status: 'active' as const,
        refundable: false,
        updated_at: new Date().toISOString(),
      };

      if (editingExpenseId) {
        const { error: updErr } = await supabase.from('budget_expenses').update(payload).eq('id', editingExpenseId).eq('wedding_id', weddingId);
        if (updErr) throw updErr;
        setExpenses((prev) => prev.map((ex) => ex.id === editingExpenseId ? { ...ex, ...payload } : ex));
        setToastMsg('Expense updated.');
      } else {
        const { data, error: insErr } = await supabase.from('budget_expenses').insert({ ...payload, created_at: new Date().toISOString() }).select('*').single();
        if (insErr) throw insErr;
        if (data) setExpenses((prev) => [data as BudgetExpense, ...prev]);
        setToastMsg('Expense added.');
      }
      setShowExpenseForm(false);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleCancelExpense = async (expId: string) => {
    if (!confirm('Cancel this expense? It will no longer count toward committed totals.')) return;
    try {
      const { error: updErr } = await supabase.from('budget_expenses').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', expId).eq('wedding_id', weddingId);
      if (updErr) throw updErr;
      setExpenses((prev) => prev.map((ex) => ex.id === expId ? { ...ex, status: 'archived' as const, archived_at: new Date().toISOString() } : ex));
      setToastMsg('Expense cancelled.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel expense');
    }
  };

  const handleRestoreExpense = async (expId: string) => {
    try {
      const { error: updErr } = await supabase.from('budget_expenses').update({ status: 'active', archived_at: null }).eq('id', expId).eq('wedding_id', weddingId);
      if (updErr) throw updErr;
      setExpenses((prev) => prev.map((ex) => ex.id === expId ? { ...ex, status: 'active' as const, archived_at: null } : ex));
      setToastMsg('Expense restored.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore expense');
    }
  };

  const catById = (id: string) => categories.find((c) => c.id === id);
  const supById = (id: string) => suppliers.find((s) => s.id === id);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (statusFilter === 'active') list = list.filter((e) => e.status === 'active');
    if (statusFilter === 'cancelled') list = list.filter((e) => e.status !== 'active');
    if (catFilter !== 'all') list = list.filter((e) => e.category_id === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.title || '').toLowerCase().includes(q) ||
        (catById(e.category_id || '')?.name || '').toLowerCase().includes(q) ||
        (supById(e.supplier_id || '')?.business_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, statusFilter, catFilter, search, categories, suppliers]);

  if (loading) {
    return <AppShell><div className="max-w-6xl mx-auto py-20 text-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /><p className="text-sm text-foreground-500 mt-3">Loading categories...</p></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Categories & Expenses</h1>
          </div>
          <button onClick={() => handleOpenExpenseForm()} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add expense</button>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6">{error}</div>}

        {categories.length === 0 ? (
          <div className="card-default text-center py-12">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4"><i className="ri-list-check text-2xl" /></div>
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">No categories yet</h2>
            <p className="text-sm text-foreground-500 mb-6">Set up your budget to create category allocations.</p>
            <button onClick={() => navigate('/app/budget/setup')} className="btn-primary text-sm cursor-pointer whitespace-nowrap">Set up budget</button>
          </div>
        ) : (
          <>
            <div className="card-default mb-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Categories</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-background-200">
                      <th className="text-left py-2.5 px-3 text-xs font-label text-foreground-500">Category</th>
                      <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Allocated</th>
                      <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Committed</th>
                      <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Variance</th>
                      <th className="text-center py-2.5 px-3 text-xs font-label text-foreground-500 w-24">Progress</th>
                      <th className="text-center py-2.5 px-3 text-xs font-label text-foreground-500 w-12">+</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const catExps = expenses.filter((e) => e.category_id === cat.id && e.status === 'active');
                      const catCommittedMinor = sumMinor(catExps.map((e) => e.agreed_amount || e.quoted_amount || 0));
                      const catVarMinor = toMinor(catCommittedMinor) - toMinor(cat.planned_amount);
                      const catPct = cat.planned_amount > 0 ? Math.min(100, Math.round((catCommittedMinor / cat.planned_amount) * 100)) : 0;
                      return (
                        <tr key={cat.id} className="border-b border-background-100 hover:bg-background-50">
                          <td className="py-2.5 px-3">
                            <span className="text-xs font-label text-foreground-800">{cat.name}</span>
                            <span className="text-xs text-foreground-400 ml-1">({catExps.length})</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-label text-foreground-700">{formatMajor(cat.planned_amount, currency)}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-label text-foreground-700">{formatMajor(catCommittedMinor, currency)}</td>
                          <td className={`py-2.5 px-3 text-right text-xs font-label ${catVarMinor > 0 ? 'text-red-600' : catVarMinor < 0 ? 'text-emerald-600' : 'text-foreground-500'}`}>
                            {catVarMinor === 0 ? '—' : `${catVarMinor > 0 ? '+' : ''}${formatMajor(Math.abs(catVarMinor), currency)}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${catVarMinor > 0 ? 'bg-red-500' : catPct > 90 ? 'bg-amber-500' : 'bg-accent-500'}`} style={{ width: `${catPct}%` }} />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button onClick={() => handleOpenExpenseForm(undefined, cat.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Add expense to this category">
                              <i className="ri-add-line text-sm" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-default">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 className="font-label text-sm font-semibold text-foreground-900">All expenses ({filteredExpenses.length})</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-8 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 w-40" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-xs" /></button>}
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                    <option value="all">All</option><option value="active">Active</option><option value="cancelled">Cancelled</option>
                  </select>
                  <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-2 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                    <option value="all">All categories</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {(search || statusFilter !== 'all' || catFilter !== 'all') && (
                    <button onClick={() => { setSearch(''); setStatusFilter('all'); setCatFilter('all'); }} className="text-xs text-accent-600 hover:text-accent-700 font-label cursor-pointer whitespace-nowrap">Clear</button>
                  )}
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-bill-line text-xl" /></div>
                  <p className="text-sm text-foreground-500 mb-4">No expenses found.</p>
                  <button onClick={() => handleOpenExpenseForm()} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Add your first expense</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map((e) => {
                    const isArchived = e.status !== 'active';
                    const cat = catById(e.category_id || '');
                    const sup = supById(e.supplier_id || '');
                    return (
                      <div key={e.id} className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors ${isArchived ? 'border-red-100 bg-red-50/30 opacity-60' : 'border-secondary-100 bg-background-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-label text-foreground-800 truncate">{e.description || e.title}</span>
                            {isArchived && <span className="text-xs text-red-500 font-label whitespace-nowrap">Cancelled</span>}
                          </div>
                          <p className="text-xs text-foreground-400">
                            {cat?.name || '—'} {sup ? `· ${sup.business_name}` : ''} {e.due_date ? `· Due ${new Date(e.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                            {e.vat_status && e.vat_status !== 'included' ? ` · VAT ${e.vat_status}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-label text-foreground-700">{formatMajor(e.agreed_amount || e.quoted_amount || 0, currency)}</p>
                            <p className="text-xs text-foreground-400">
                              {e.payment_status === 'paid' ? 'Paid' : e.payment_status === 'deposit_paid' ? 'Deposit paid' : e.payment_status === 'part_paid' ? 'Part paid' : STATUS_LABELS[e.payment_status] || e.payment_status}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleOpenExpenseForm(e)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Edit"><i className="ri-pencil-line text-xs" /></button>
                            {!isArchived ? (
                              <button onClick={() => handleCancelExpense(e.id)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Cancel"><i className="ri-close-circle-line text-xs" /></button>
                            ) : (
                              <button onClick={() => handleRestoreExpense(e.id)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Restore"><i className="ri-arrow-go-back-line text-xs" /></button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Expense form modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowExpenseForm(false)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-label text-sm font-semibold text-foreground-900">{editingExpenseId ? 'Edit expense' : 'Add expense'}</h3>
                  <button onClick={() => setShowExpenseForm(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
                </div>
                {formError && <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 mb-4">{formError}</div>}
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-label text-foreground-600 mb-1">Description *</label>
                    <input type="text" value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value, description: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Venue hire deposit" />
                  </div>
                  <div>
                    <label className="block text-xs font-label text-foreground-600 mb-1">Category *</label>
                    <select value={expenseForm.category_id} onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Agreed amount (£) *</label>
                      <input type="number" value={expenseForm.agreed_amount} onChange={(e) => setExpenseForm({ ...expenseForm, agreed_amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Quoted (£)</label>
                      <input type="number" value={expenseForm.quoted_amount} onChange={(e) => setExpenseForm({ ...expenseForm, quoted_amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" step="0.01" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-label text-foreground-600 mb-1">Supplier</label>
                    <select value={expenseForm.supplier_id} onChange={(e) => setExpenseForm({ ...expenseForm, supplier_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                      <option value="">— No supplier —</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.business_name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Status</label>
                      <select value={expenseForm.payment_status} onChange={(e) => setExpenseForm({ ...expenseForm, payment_status: e.target.value as ExpenseStatus })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                        {EXPENSE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Due date</label>
                      <input type="date" value={expenseForm.due_date} onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2.5 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                    <button type="submit" disabled={savingExpense} className="px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                      {savingExpense ? 'Saving...' : editingExpenseId ? 'Save changes' : 'Add expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-foreground-900 text-white text-sm shadow-lg">{toastMsg}</div>
        )}
      </div>
    </AppShell>
  );
}

// ── Demo categories page (keeps all existing demo functionality) ──
function DemoBudgetCategoriesPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatAmount, setEditCatAmount] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '', category_id: '', agreed_amount: '', quoted_amount: '',
    payment_status: 'booked' as DemoExpense['payment_status'],
    supplier_id: '', due_date: '',
  });
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [sortExpenses, setSortExpenses] = useState('newest');

  const state = demo?.state;
  const categories = state?.budgetCategories || [];
  const expenses = state?.expenses || [];
  const payments = state?.payments || [];
  const suppliers = state?.suppliers || [];

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

  const supplierName = (e: DemoExpense) => {
    if (!e.supplier_id) return null;
    return suppliers.find((s) => s.id === e.supplier_id)?.name || null;
  };
  const catById = (id: string) => categories.find((c) => c.id === id);
  const expensePaidAmount = (expId: string) => payments.filter((p) => p.expense_id === expId && p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const planned = categories.reduce((s, c) => s + c.planned_amount, 0);

  const statusBg = (ps: string) => {
    const map: Record<string, string> = {
      booked: 'bg-secondary-100 text-secondary-700', deposit_paid: 'bg-accent-100 text-accent-700',
      part_paid: 'bg-amber-100 text-amber-700', paid: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-600', quoted: 'bg-foreground-100 text-foreground-600',
    };
    return map[ps] || 'bg-foreground-100 text-foreground-600';
  };
  const statusLabel = (ps: string) => {
    const map: Record<string, string> = {
      booked: 'Booked', deposit_paid: 'Deposit paid', part_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled', quoted: 'Quoted',
    };
    return map[ps] || ps;
  };

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (statusFilter === 'active') list = list.filter((e) => e.status === 'active');
    if (statusFilter === 'cancelled') list = list.filter((e) => e.status === 'cancelled');
    if (catFilter !== 'all') list = list.filter((e) => e.category_id === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.description.toLowerCase().includes(q) || (catById(e.category_id)?.name || '').toLowerCase().includes(q) || (supplierName(e) || '').toLowerCase().includes(q));
    }
    if (sortExpenses === 'newest') list = [...list].reverse();
    if (sortExpenses === 'highest') list = [...list].sort((a, b) => (b.agreed_amount || b.quoted_amount) - (a.agreed_amount || a.quoted_amount));
    if (sortExpenses === 'lowest') list = [...list].sort((a, b) => (a.agreed_amount || a.quoted_amount) - (b.agreed_amount || b.quoted_amount));
    return list;
  }, [expenses, statusFilter, catFilter, search, sortExpenses]);

  const handleOpenExpenseForm = (exp?: DemoExpense, catId?: string) => {
    if (exp) {
      setEditingExpenseId(exp.id);
      setExpenseForm({ description: exp.description, category_id: exp.category_id, agreed_amount: String(exp.agreed_amount || ''), quoted_amount: String(exp.quoted_amount || ''), payment_status: exp.payment_status, supplier_id: exp.supplier_id, due_date: exp.due_date || '' });
    } else {
      setEditingExpenseId(null);
      setExpenseForm({ description: '', category_id: catId || categories[0]?.id || '', agreed_amount: '', quoted_amount: '', payment_status: 'booked', supplier_id: '', due_date: '' });
    }
    setFormError('');
    setShowExpenseForm(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim()) { setFormError('Please enter a description'); return; }
    if (!expenseForm.category_id) { setFormError('Please select a category'); return; }
    const amt = parseFloat(expenseForm.agreed_amount);
    if (!amt || amt <= 0) { setFormError('Please enter a valid amount'); return; }
    if (editingExpenseId) {
      demo?.updateExpense(editingExpenseId, { description: expenseForm.description.trim(), category_id: expenseForm.category_id, agreed_amount: amt, quoted_amount: parseFloat(expenseForm.quoted_amount) || 0, payment_status: expenseForm.payment_status, supplier_id: expenseForm.supplier_id, due_date: expenseForm.due_date || '' });
      setToastMsg('Expense updated.');
    } else {
      const newExp: DemoExpense = { id: demo?.generateDemoId?.('demo-exp') || `demo-exp-${Date.now()}`, wedding_id: state?.wedding?.id || '', category_id: expenseForm.category_id, supplier_id: expenseForm.supplier_id, description: expenseForm.description.trim(), agreed_amount: amt, quoted_amount: parseFloat(expenseForm.quoted_amount) || 0, payment_status: expenseForm.payment_status, status: 'active', due_date: expenseForm.due_date || '' };
      demo?.addExpense(newExp);
      setToastMsg('Expense added.');
    }
    setShowExpenseForm(false);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleCancelExpense = (expId: string) => {
    demo?.cancelExpense(expId);
    setToastMsg('Expense cancelled.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRestoreExpense = (expId: string) => {
    demo?.restoreExpense(expId);
    setToastMsg('Expense restored.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleEditCategory = (cat: DemoBudgetCategory) => { setEditCatId(cat.id); setEditCatAmount(String(cat.planned_amount)); };
  const handleSaveCategory = () => {
    if (!editCatId) return;
    const amt = parseFloat(editCatAmount);
    if (!amt || amt <= 0) return;
    demo?.updateBudgetCategory(editCatId, { planned_amount: amt });
    setEditCatId(null);
    setToastMsg('Category updated.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Categories & Expenses</h1>
          </div>
          <button onClick={() => handleOpenExpenseForm()} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add expense</button>
        </div>

        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Categories</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="text-left py-2.5 px-3 text-xs font-label text-foreground-500">Category</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Allocated</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Committed</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Paid</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label text-foreground-500">Variance</th>
                  <th className="text-center py-2.5 px-3 text-xs font-label text-foreground-500 w-24">Progress</th>
                  <th className="text-center py-2.5 px-3 text-xs font-label text-foreground-500 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const catExps = expenses.filter((ex) => ex.category_id === cat.id && ex.status === 'active');
                  const catCommitted = catExps.reduce((s, ex) => s + (ex.agreed_amount || ex.quoted_amount), 0);
                  const catPaid = catExps.reduce((s, ex) => s + expensePaidAmount(ex.id), 0);
                  const catVar = catCommitted - cat.planned_amount;
                  const catPct = cat.planned_amount > 0 ? Math.min(100, Math.round((catCommitted / cat.planned_amount) * 100)) : 0;
                  return (
                    <tr key={cat.id} className="border-b border-background-100 hover:bg-background-50">
                      <td className="py-2.5 px-3"><span className="text-xs font-label text-foreground-800">{cat.name}</span><span className="text-xs text-foreground-400 ml-1">({catExps.length})</span></td>
                      <td className="py-2.5 px-3 text-right">{editCatId === cat.id ? (<div className="flex items-center justify-end gap-1"><input type="number" value={editCatAmount} onChange={(e) => setEditCatAmount(e.target.value)} className="w-20 px-2 py-1 rounded border border-secondary-200 bg-white text-xs text-foreground-900 text-right focus:outline-none" /><button onClick={handleSaveCategory} className="text-emerald-600"><i className="ri-check-line text-xs" /></button><button onClick={() => setEditCatId(null)} className="text-foreground-400"><i className="ri-close-line text-xs" /></button></div>) : (<button onClick={() => handleEditCategory(cat)} className="text-xs font-label text-foreground-700 hover:text-primary-600 cursor-pointer">{formatGBP(cat.planned_amount)}</button>)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-label text-foreground-700">{formatGBP(catCommitted)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-label text-foreground-700">{catPaid > 0 ? formatGBP(catPaid) : '—'}</td>
                      <td className={`py-2.5 px-3 text-right text-xs font-label ${catVar > 0 ? 'text-red-600' : catVar < 0 ? 'text-emerald-600' : 'text-foreground-500'}`}>{catVar === 0 ? '—' : `${catVar > 0 ? '+' : ''}${formatGBP(catVar)}`}</td>
                      <td className="py-2.5 px-3"><div className="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${catVar > 0 ? 'bg-red-500' : catPct > 90 ? 'bg-amber-500' : 'bg-accent-500'}`} style={{ width: `${catPct}%` }} /></div></td>
                      <td className="py-2.5 px-3 text-center"><button onClick={() => handleOpenExpenseForm(undefined, cat.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Add expense"><i className="ri-add-line text-sm" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-default">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">All expenses ({filteredExpenses.length})</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative"><i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-8 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 w-40" />{search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-xs" /></button>}</div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="all">All</option><option value="active">Active</option><option value="cancelled">Cancelled</option></select>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-2 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select value={sortExpenses} onChange={(e) => setSortExpenses(e.target.value)} className="px-2 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest</option><option value="lowest">Lowest</option></select>
              {(search || statusFilter !== 'all' || catFilter !== 'all') && (<button onClick={() => { setSearch(''); setStatusFilter('all'); setCatFilter('all'); }} className="text-xs text-accent-600 hover:text-accent-700 font-label cursor-pointer whitespace-nowrap">Clear</button>)}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-10"><div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-bill-line text-xl" /></div><p className="text-sm text-foreground-500 mb-4">No expenses found.</p><button onClick={() => handleOpenExpenseForm()} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Add your first expense</button></div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((e) => {
                const ePaid = expensePaidAmount(e.id);
                const bal = (e.agreed_amount || e.quoted_amount) - ePaid;
                const sup = supplierName(e);
                return (
                  <div key={e.id} className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors ${e.status === 'cancelled' ? 'border-red-100 bg-red-50/30 opacity-60' : 'border-secondary-100 bg-background-50'}`}>
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-label text-foreground-800 truncate">{e.description}</span>{e.status === 'cancelled' && <span className="text-xs text-red-500 font-label whitespace-nowrap">Cancelled</span>}</div><p className="text-xs text-foreground-400">{catById(e.category_id)?.name || '—'} {sup ? `· ${sup}` : ''} {e.due_date ? `· Due ${new Date(e.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</p></div>
                    <div className="flex items-center gap-4 flex-shrink-0"><div className="text-right"><p className="text-sm font-label text-foreground-700">{formatGBP(e.agreed_amount || e.quoted_amount)}</p><p className="text-xs text-foreground-400">Paid: {formatGBP(ePaid)} {bal > 0 ? `· Bal: ${formatGBP(bal)}` : ''}</p></div><span className={`text-xs px-2 py-0.5 rounded-full font-label ${statusBg(e.payment_status)}`}>{statusLabel(e.payment_status)}</span><div className="flex items-center gap-1"><button onClick={() => handleOpenExpenseForm(e)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Edit"><i className="ri-pencil-line text-xs" /></button>{e.status === 'active' ? (<button onClick={() => { if (confirm('Cancel this expense?')) handleCancelExpense(e.id); }} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Cancel"><i className="ri-close-circle-line text-xs" /></button>) : (<button onClick={() => handleRestoreExpense(e.id)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Restore"><i className="ri-arrow-go-back-line text-xs" /></button>)}</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showExpenseForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowExpenseForm(false)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5"><h3 className="font-label text-sm font-semibold text-foreground-900">{editingExpenseId ? 'Edit expense' : 'Add expense'}</h3><button onClick={() => setShowExpenseForm(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button></div>
                {formError && <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 mb-4">{formError}</div>}
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <div><label className="block text-xs font-label text-foreground-600 mb-1">Description *</label><input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Venue hire deposit" /></div>
                  <div><label className="block text-xs font-label text-foreground-600 mb-1">Category *</label><select value={expenseForm.category_id} onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-label text-foreground-600 mb-1">Agreed amount (£) *</label><input type="number" value={expenseForm.agreed_amount} onChange={(e) => setExpenseForm({ ...expenseForm, agreed_amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" /></div><div><label className="block text-xs font-label text-foreground-600 mb-1">Quoted (£)</label><input type="number" value={expenseForm.quoted_amount} onChange={(e) => setExpenseForm({ ...expenseForm, quoted_amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" /></div></div>
                  <div><label className="block text-xs font-label text-foreground-600 mb-1">Supplier</label><select value={expenseForm.supplier_id} onChange={(e) => setExpenseForm({ ...expenseForm, supplier_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="">— No supplier —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-label text-foreground-600 mb-1">Status</label><select value={expenseForm.payment_status} onChange={(e) => setExpenseForm({ ...expenseForm, payment_status: e.target.value as DemoExpense['payment_status'] })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="quoted">Quoted</option><option value="booked">Booked</option><option value="deposit_paid">Deposit paid</option><option value="part_paid">Part paid</option><option value="paid">Paid</option></select></div><div><label className="block text-xs font-label text-foreground-600 mb-1">Due date</label><input type="date" value={expenseForm.due_date} onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer" /></div></div>
                  <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2.5 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button><button type="submit" className="px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">{editingExpenseId ? 'Save changes' : 'Add expense'}</button></div>
                </form>
              </div>
            </div>
          </div>
        )}

        {toastMsg && (<div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-foreground-900 text-white text-sm shadow-lg">{toastMsg}</div>)}
      </div>
    </AppShell>
  );
}

// ── Page export ──
export default function BudgetCategoriesPage() {
  const demo = useDemoDataSafe();
  if (isDemoMode && demo) return <DemoBudgetCategoriesPage />;
  return <NormalBudgetCategoriesPage />;
}