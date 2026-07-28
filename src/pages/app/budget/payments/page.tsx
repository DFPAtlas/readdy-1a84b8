import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import { formatMajor, toMinor, sumMinor, type CurrencyCode } from '@/lib/budgetMoney';
import type { BudgetPayment, BudgetExpense } from '@/types/budget';
import type { DemoPayment } from '@/demo/demoTypes';

// ── Normal (Supabase) Payments page ──
function NormalBudgetPaymentsPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState<BudgetPayment[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [payForm, setPayForm] = useState({
    expense_id: '', notes: '', amount: '', due_at: '', payment_type: 'payment' as BudgetPayment['payment_type'],
    payment_reference: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const currency: CurrencyCode = 'GBP';

  const fetchData = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        supabase.from('budget_payments').select('*').eq('wedding_id', weddingId).order('due_at', { ascending: true }),
        supabase.from('budget_expenses').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('created_at', { ascending: false }),
      ]);
      setPayments((pRes.data || []) as BudgetPayment[]);
      setExpenses((eRes.data || []) as BudgetExpense[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!weddingId) { setLoading(false); return; }
    const init = async () => {
      await fetchData();
      if (!cancelled) setLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, [weddingId]);

  const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  const paid = payments.filter((p) => p.status === 'paid');
  const scheduled = payments.filter((p) => p.status === 'scheduled');
  const overdue = payments.filter((p) => p.status === 'overdue');

  const totalPaid = sumMinor(paid.map((p) => p.amount));
  const totalUpcoming = sumMinor(scheduled.map((p) => p.amount));
  const totalOverdue = sumMinor(overdue.map((p) => p.amount));

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return payments;
    if (statusFilter === 'unpaid') return payments.filter((p) => p.status === 'scheduled' || p.status === 'overdue');
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const expById = (id: string) => expenses.find((e) => e.id === id);

  const handleSchedulePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payForm.amount);
    if (!payForm.notes.trim()) { setFormError('Please enter a description'); return; }
    if (!amt || amt <= 0) { setFormError('Please enter a valid amount'); return; }
    if (!payForm.due_at) { setFormError('Please enter a due date'); return; }

    setSaving(true);
    try {
      const { data, error: insErr } = await supabase.from('budget_payments').insert({
        wedding_id: weddingId,
        expense_id: payForm.expense_id || null,
        payment_type: payForm.payment_type,
        amount: amt,
        due_at: payForm.due_at,
        payment_reference: payForm.payment_reference || null,
        notes: payForm.notes.trim(),
        status: 'scheduled',
        created_at: new Date().toISOString(),
      }).select('*').single();
      if (insErr) throw insErr;
      if (data) setPayments((prev) => [...prev, data as BudgetPayment]);
      setShowForm(false);
      setPayForm({ expense_id: '', notes: '', amount: '', due_at: '', payment_type: 'payment', payment_reference: '' });
      setToastMsg('Payment scheduled.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to schedule payment');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    try {
      const { error: updErr } = await supabase.from('budget_payments').update({
        status: 'paid', paid_at: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString(),
      }).eq('id', paymentId);
      if (updErr) throw updErr;
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status: 'paid' as const, paid_at: new Date().toISOString().split('T')[0] } : p));
      setMarkingId(null);
      setToastMsg('Payment marked as paid.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark paid');
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const { error: updErr } = await supabase.from('budget_payments').update({
        status: 'cancelled', updated_at: new Date().toISOString(),
      }).eq('id', paymentId);
      if (updErr) throw updErr;
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status: 'cancelled' as const } : p));
      setCancellingId(null);
      setToastMsg('Payment cancelled.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel payment');
    }
  };

  if (loading) return <AppShell><div className="max-w-6xl mx-auto py-20 text-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /><p className="text-sm text-foreground-500 mt-3">Loading payments...</p></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
              <i className="ri-arrow-left-line" />Back to budget
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Payment schedule</h1>
          </div>
          <button onClick={() => { setFormError(''); setShowForm(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Schedule payment</button>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total paid</p><p className="text-xl font-heading font-semibold text-emerald-600">{formatMajor(totalPaid, currency)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Upcoming</p><p className="text-xl font-heading font-semibold text-amber-600">{formatMajor(totalUpcoming, currency)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Overdue</p><p className={`text-xl font-heading font-semibold ${totalOverdue > 0 ? 'text-red-600' : 'text-foreground-500'}`}>{formatMajor(totalOverdue, currency)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total payments</p><p className="text-xl font-heading font-semibold text-foreground-900">{payments.length}</p></div>
        </div>

        {overdue.length > 0 && (
          <div className="card-default mb-6 border-red-200 bg-red-50/30">
            <h2 className="font-label text-sm font-semibold text-red-700 mb-3 flex items-center gap-2"><i className="ri-error-warning-line" /> Overdue ({overdue.length})</h2>
            <div className="space-y-2">
              {overdue.map((p) => {
                const days = p.due_at ? Math.abs(daysUntil(p.due_at)) : 0;
                const exp = p.expense_id ? expById(p.expense_id) : null;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white border border-red-100">
                    <div>
                      <p className="text-xs font-label text-foreground-800">{p.notes || exp?.description || 'Payment'}</p>
                      <p className="text-xs text-foreground-400">{exp?.description || ''} · {days}d overdue</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-label text-red-600 font-semibold">{formatMajor(p.amount, currency)}</span>
                      <button onClick={() => setMarkingId(p.id)} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-label cursor-pointer whitespace-nowrap">Mark paid</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(['all', 'unpaid', 'scheduled', 'overdue', 'paid', 'cancelled'] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-label border transition-colors cursor-pointer capitalize whitespace-nowrap ${statusFilter === f ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-secondary-200 text-foreground-600 hover:bg-background-100'}`}>
              {f === 'unpaid' ? 'Unpaid' : f} ({f === 'all' ? payments.length : f === 'unpaid' ? scheduled.length + overdue.length : payments.filter((p) => p.status === f).length})
            </button>
          ))}
        </div>

        <div className="card-default mb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-bank-card-line text-xl" /></div>
              <p className="text-sm text-foreground-500 mb-4">No payments to show.</p>
              <button onClick={() => { setFormError(''); setShowForm(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Schedule your first payment</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => {
                const exp = p.expense_id ? expById(p.expense_id) : null;
                const days = p.due_at ? daysUntil(p.due_at) : null;
                return (
                  <div key={p.id} className={`flex items-center justify-between py-3 px-4 rounded-lg border ${p.status === 'overdue' ? 'border-red-100 bg-red-50/30' : p.status === 'paid' ? 'border-emerald-100 bg-emerald-50/20' : p.status === 'cancelled' ? 'border-secondary-100 bg-background-50 opacity-50' : 'border-secondary-100 bg-background-50'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-label text-foreground-800">{p.notes || exp?.description || 'Payment'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-label capitalize ${p.payment_type === 'deposit' ? 'bg-accent-100 text-accent-700' : p.payment_type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-secondary-100 text-secondary-600'}`}>{p.payment_type}</span>
                      </div>
                      <p className="text-xs text-foreground-400 mt-0.5">{exp?.description || ''}{p.payment_reference ? ` · ${p.payment_reference}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-label text-foreground-700">{formatMajor(p.amount, currency)}</p>
                        {p.status === 'paid' && p.paid_at ? (
                          <p className="text-xs text-emerald-600">Paid {new Date(p.paid_at).toLocaleDateString('en-GB')}</p>
                        ) : p.status === 'cancelled' ? (
                          <p className="text-xs text-foreground-400">Cancelled</p>
                        ) : (
                          <p className={`text-xs ${p.status === 'overdue' ? 'text-red-600 font-semibold' : days !== null && days <= 30 ? 'text-amber-600' : 'text-foreground-500'}`}>
                            Due {p.due_at ? new Date(p.due_at).toLocaleDateString('en-GB') : ''} {p.status === 'overdue' && days !== null ? `(${Math.abs(days)}d overdue)` : days !== null && days <= 0 ? '(today)' : days !== null ? `(${days}d)` : ''}
                          </p>
                        )}
                      </div>
                      {p.status !== 'paid' && p.status !== 'cancelled' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setMarkingId(p.id)} className="w-7 h-7 flex items-center justify-center rounded text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Mark paid"><i className="ri-check-line text-sm" /></button>
                          <button onClick={() => setCancellingId(p.id)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Cancel"><i className="ri-close-line text-sm" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-label text-sm font-semibold text-foreground-900">Schedule payment</h3>
                  <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
                </div>
                {formError && <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 mb-4">{formError}</div>}
                <form onSubmit={handleSchedulePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-label text-foreground-600 mb-1">Description *</label>
                    <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Venue final balance" />
                  </div>
                  <div>
                    <label className="block text-xs font-label text-foreground-600 mb-1">Expense (optional)</label>
                    <select value={payForm.expense_id} onChange={(e) => setPayForm({ ...payForm, expense_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                      <option value="">— No expense —</option>
                      {expenses.map((ex) => <option key={ex.id} value={ex.id}>{ex.description || ex.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Amount (£) *</label>
                      <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Type</label>
                      <select value={payForm.payment_type} onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value as BudgetPayment['payment_type'] })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer">
                        <option value="payment">Payment</option><option value="deposit">Deposit</option><option value="refund">Refund</option><option value="adjustment">Adjustment</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Due date *</label>
                      <input type="date" value={payForm.due_at} onChange={(e) => setPayForm({ ...payForm, due_at: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs font-label text-foreground-600 mb-1">Reference</label>
                      <input type="text" value={payForm.payment_reference} onChange={(e) => setPayForm({ ...payForm, payment_reference: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Invoice #" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                      {saving ? 'Scheduling...' : 'Schedule payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Confirm mark paid */}
        {markingId && (() => {
          const p = payments.find((pp) => pp.id === markingId);
          if (!p) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={() => setMarkingId(null)} />
              <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Mark as paid</h3>
                <p className="text-xs text-foreground-500 mb-4">Record &ldquo;{p.notes}&rdquo; ({formatMajor(p.amount, currency)}) as paid?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setMarkingId(null)} className="px-4 py-2 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                  <button onClick={() => handleMarkPaid(p.id)} className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">Mark paid</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Confirm cancel */}
        {cancellingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setCancellingId(null)} />
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Cancel payment</h3>
              <p className="text-xs text-foreground-500 mb-4">Cancel this scheduled payment?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setCancellingId(null)} className="px-4 py-2 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Keep</button>
                <button onClick={() => handleCancelPayment(cancellingId)} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-red-600 cursor-pointer whitespace-nowrap">Cancel payment</button>
              </div>
            </div>
          </div>
        )}

        {toastMsg && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-foreground-900 text-white text-sm shadow-lg">{toastMsg}</div>}
      </div>
    </AppShell>
  );
}

// ── Demo payments page ──
function DemoBudgetPaymentsPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [payForm, setPayForm] = useState({ expense_id: '', description: '', amount: '', due_date: '', payment_method: 'Bank transfer', payment_reference: '', payment_type: 'payment' as DemoPayment['payment_type'] });
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);
  const [cancelPayId, setCancelPayId] = useState<string | null>(null);

  const state = demo?.state;
  const payments = state?.payments || [];
  const expenses = state?.expenses || [];
  const categories = state?.budgetCategories || [];
  const suppliers = state?.suppliers || [];

  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const catById = (id: string) => categories.find((c) => c.id === id);
  const supplierName = (expId: string) => { const exp = expenses.find((e) => e.id === expId); if (!exp?.supplier_id) return null; return suppliers.find((s) => s.id === exp.supplier_id)?.name || null; };

  const paid = payments.filter((p) => p.status === 'paid');
  const upcoming = payments.filter((p) => p.status === 'pending');
  const overdue = payments.filter((p) => p.status === 'overdue');
  const cancelled = payments.filter((p) => p.status === 'cancelled');
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalUpcoming = upcoming.reduce((s, p) => s + p.amount, 0);
  const totalOverdue = overdue.reduce((s, p) => s + p.amount, 0);
  const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (statusFilter === 'paid') list = list.filter((p) => p.status === 'paid');
    if (statusFilter === 'pending') list = list.filter((p) => p.status === 'pending');
    if (statusFilter === 'overdue') list = list.filter((p) => p.status === 'overdue');
    if (statusFilter === 'cancelled') list = list.filter((p) => p.status === 'cancelled');
    if (statusFilter === 'unpaid') list = list.filter((p) => p.status === 'pending' || p.status === 'overdue');
    return [...list].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [payments, statusFilter]);

  const handleMarkPaid = (payment: DemoPayment) => {
    demo?.markPaymentPaid(payment.id);
    demo?.addDemoActivity({ id: `demo-activity-${Date.now()}`, timestamp: new Date().toISOString(), message: `Payment of ${formatGBP(payment.amount)} for "${payment.description}" was recorded as paid. Demo payment recorded. No real money was transferred.`, category: 'budget', related_guest: '', wedding_id: state?.wedding?.id || '' });
    setConfirmPayId(null);
    setToastMsg('Demo payment recorded. No real money was transferred.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleCancelPayment = () => {
    if (!cancelPayId) return;
    demo?.cancelPayment(cancelPayId);
    setCancelPayId(null);
    setToastMsg('Payment cancelled.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payForm.amount);
    if (!payForm.description.trim()) { setFormError('Please enter a description'); return; }
    if (!amt || amt <= 0) { setFormError('Please enter a valid amount'); return; }
    if (!payForm.due_date) { setFormError('Please enter a due date'); return; }
    demo?.addPayment({ id: demo?.generateDemoId?.('demo-pay') || `demo-pay-${Date.now()}`, wedding_id: state?.wedding?.id || '', expense_id: payForm.expense_id || '', description: payForm.description.trim(), amount: amt, due_date: payForm.due_date, status: 'pending', payment_method: payForm.payment_method, payment_reference: payForm.payment_reference || undefined, payment_type: payForm.payment_type });
    setShowForm(false);
    setToastMsg('Payment scheduled.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div><button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1"><i className="ri-arrow-left-line" />Back to budget</button><h1 className="font-heading text-2xl text-foreground-900">Payment schedule</h1></div>
          <button onClick={() => { setPayForm({ expense_id: '', description: '', amount: '', due_date: '', payment_method: 'Bank transfer', payment_reference: '', payment_type: 'payment' }); setFormError(''); setShowForm(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Schedule payment</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Total paid</p><p className="text-xl font-heading font-semibold text-emerald-600">{formatGBP(totalPaid)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Upcoming</p><p className="text-xl font-heading font-semibold text-amber-600">{formatGBP(totalUpcoming)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Overdue</p><p className={`text-xl font-heading font-semibold ${totalOverdue > 0 ? 'text-red-600' : 'text-foreground-500'}`}>{formatGBP(totalOverdue)}</p></div>
          <div className="card-default"><p className="text-xs text-foreground-500 font-label">Payments</p><p className="text-xl font-heading font-semibold text-foreground-900">{payments.length}</p></div>
        </div>

        {overdue.length > 0 && (
          <div className="card-default mb-6 border-red-200 bg-red-50/30">
            <h2 className="font-label text-sm font-semibold text-red-700 mb-3 flex items-center gap-2"><i className="ri-error-warning-line" /> Overdue ({overdue.length})</h2>
            {overdue.map((p) => { const days = Math.abs(daysUntil(p.due_date)); return (<div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white border border-red-100"><div><p className="text-xs font-label text-foreground-800">{p.description}</p><p className="text-xs text-foreground-400">{catById(expenses.find((e) => e.id === p.expense_id)?.category_id || '')?.name || '—'} · {days}d overdue</p></div><div className="flex items-center gap-2"><span className="text-xs font-label text-red-600 font-semibold">{formatGBP(p.amount)}</span><button onClick={() => setConfirmPayId(p.id)} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-label cursor-pointer whitespace-nowrap">Mark paid</button></div></div>); })}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(['all', 'unpaid', 'pending', 'overdue', 'paid', 'cancelled'] as const).map((f) => (<button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-label border transition-colors cursor-pointer capitalize whitespace-nowrap ${statusFilter === f ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-secondary-200 text-foreground-600 hover:bg-background-100'}`}>{f === 'unpaid' ? 'Unpaid' : f} ({f === 'all' ? payments.length : f === 'unpaid' ? upcoming.length + overdue.length : f === 'pending' ? upcoming.length : f === 'overdue' ? overdue.length : f === 'paid' ? paid.length : cancelled.length})</button>))}
        </div>

        <div className="card-default">{filteredPayments.length === 0 ? (<div className="text-center py-10"><div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-bank-card-line text-xl" /></div><p className="text-sm text-foreground-500 mb-4">No payments to show.</p><button onClick={() => { setFormError(''); setShowForm(true); }} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Schedule your first payment</button></div>) : (<div className="space-y-2">{filteredPayments.map((p) => { const exp = expenses.find((e) => e.id === p.expense_id); const sup = p.expense_id ? supplierName(p.expense_id) : null; const days = daysUntil(p.due_date); return (<div key={p.id} className={`flex items-center justify-between py-3 px-4 rounded-lg border ${p.status === 'overdue' ? 'border-red-100 bg-red-50/30' : p.status === 'paid' ? 'border-emerald-100 bg-emerald-50/20' : p.status === 'cancelled' ? 'border-secondary-100 bg-background-50 opacity-50' : 'border-secondary-100 bg-background-50'}`}><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-label text-foreground-800">{p.description}</span>{p.payment_type && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-600 font-label capitalize">{p.payment_type}</span>}</div><p className="text-xs text-foreground-400 mt-0.5">{sup || catById(exp?.category_id || '')?.name || '—'} {p.payment_reference ? `· ${p.payment_reference}` : ''} {p.payment_method ? `· ${p.payment_method}` : ''}</p></div><div className="flex items-center gap-4 flex-shrink-0"><div className="text-right"><p className="text-sm font-label text-foreground-700">{formatGBP(p.amount)}</p>{p.status === 'paid' && p.paid_at ? (<p className="text-xs text-emerald-600">Paid {new Date(p.paid_at).toLocaleDateString('en-GB')}</p>) : p.status === 'cancelled' ? (<p className="text-xs text-foreground-400">Cancelled</p>) : (<p className={`text-xs ${p.status === 'overdue' ? 'text-red-600 font-semibold' : days <= 30 ? 'text-amber-600' : 'text-foreground-500'}`}>Due {new Date(p.due_date).toLocaleDateString('en-GB')} {p.status === 'overdue' ? `(${Math.abs(days)}d overdue)` : days <= 0 ? '(today)' : `(${days}d)`}</p>)}</div>{p.status !== 'paid' && p.status !== 'cancelled' && (<div className="flex items-center gap-1"><button onClick={() => setConfirmPayId(p.id)} className="w-7 h-7 flex items-center justify-center rounded text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Mark paid"><i className="ri-check-line text-sm" /></button><button onClick={() => setCancelPayId(p.id)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Cancel"><i className="ri-close-line text-sm" /></button></div>)}</div></div>); })}</div>)}</div>

        {confirmPayId && (() => { const p = payments.find((pp) => pp.id === confirmPayId); if (!p) return null; return (<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/30" onClick={() => setConfirmPayId(null)} /><div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6"><h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Record payment</h3><p className="text-xs text-foreground-500 mb-4">Mark &ldquo;{p.description}&rdquo; ({formatGBP(p.amount)}) as paid?<br /><span className="text-red-500 mt-1 block">This is a demonstration. No real money will be transferred.</span></p><div className="flex justify-end gap-2"><button onClick={() => setConfirmPayId(null)} className="px-4 py-2 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button><button onClick={() => handleMarkPaid(p)} className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">Record payment</button></div></div></div>); })()}

        {cancelPayId && (<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/30" onClick={() => setCancelPayId(null)} /><div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6"><h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Cancel payment</h3><p className="text-xs text-foreground-500 mb-4">Cancel this scheduled payment?</p><div className="flex justify-end gap-2"><button onClick={() => setCancelPayId(null)} className="px-4 py-2 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Keep</button><button onClick={handleCancelPayment} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-red-600 cursor-pointer whitespace-nowrap">Cancel payment</button></div></div></div>)}

        {showForm && (<div className="fixed inset-0 z-50 flex items-start justify-center pt-20"><div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} /><div className="relative bg-white rounded-xl shadow-lg w-full max-w-md mx-4"><div className="p-6"><div className="flex items-center justify-between mb-5"><h3 className="font-label text-sm font-semibold text-foreground-900">Schedule payment</h3><button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button></div>{formError && <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 mb-4">{formError}</div>}<form onSubmit={handleSavePayment} className="space-y-4"><div><label className="block text-xs font-label text-foreground-600 mb-1">Description *</label><input type="text" value={payForm.description} onChange={(e) => setPayForm({ ...payForm, description: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Venue final balance" /></div><div><label className="block text-xs font-label text-foreground-600 mb-1">Expense</label><select value={payForm.expense_id} onChange={(e) => setPayForm({ ...payForm, expense_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="">— No expense —</option>{expenses.filter((e) => e.status === 'active').map((e) => (<option key={e.id} value={e.id}>{e.description}</option>))}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-label text-foreground-600 mb-1">Amount (£) *</label><input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" /></div><div><label className="block text-xs font-label text-foreground-600 mb-1">Type</label><select value={payForm.payment_type} onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value as DemoPayment['payment_type'] })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option value="payment">Payment</option><option value="deposit">Deposit</option><option value="balance">Balance</option></select></div></div><div><label className="block text-xs font-label text-foreground-600 mb-1">Due date *</label><input type="date" value={payForm.due_date} onChange={(e) => setPayForm({ ...payForm, due_date: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-label text-foreground-600 mb-1">Method</label><select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none cursor-pointer"><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Other</option></select></div><div><label className="block text-xs font-label text-foreground-600 mb-1">Reference</label><input type="text" value={payForm.payment_reference} onChange={(e) => setPayForm({ ...payForm, payment_reference: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Invoice #" /></div></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button><button type="submit" className="px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">Schedule payment</button></div></form></div></div></div>)}

        {toastMsg && (<div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-foreground-900 text-white text-sm shadow-lg">{toastMsg}</div>)}
      </div>
    </AppShell>
  );
}

export default function BudgetPaymentsPage() {
  const demo = useDemoDataSafe();
  if (isDemoMode && demo) return <DemoBudgetPaymentsPage />;
  return <NormalBudgetPaymentsPage />;
}