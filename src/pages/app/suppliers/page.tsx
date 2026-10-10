import type * as React from "react";
import { useState, useEffect, useMemo, useCallback } from 'react';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useSuppliers } from '@/hooks/useSuppliers';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import SupplierDrawer from '@/pages/app/suppliers/components/SupplierDrawer';
import type {
  WeddingSupplier,
  SupplierFormData,
  SupplierContact,
  SupplierQuote,
  SupplierDocument,
  SupplierStats,
  SupplierStatus,
  SupplierSort,
  SupplierViewMode,
  QuoteFormData,
  SupplierMilestone,
} from '@/types/suppliers';
import {
  DEFAULT_SUPPLIER_CATEGORIES,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_STATUS_COLORS,
  EMPTY_SUPPLIER_FORM,
  EMPTY_QUOTE_FORM,
  DOCUMENT_TYPE_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/types/suppliers';

// ── Helpers ──

function formatGBP(n: number): string {
  return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function daysFromNow(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════
// Demo Suppliers Page
// ═══════════════════════════════════════════

const DEMO_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

function DemoSuppliersPage() {
  const demo = useDemoDataSafe();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<SupplierViewMode>('grid');
  const [selectedSupplier, setSelectedSupplier] = useState<import('@/demo/demoTypes').DemoSupplier | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'quotes' | 'documents'>('overview');
  const [toast, setToast] = useState('');

  const suppliers = demo?.state.suppliers ?? [];
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((s) => s.status === 'active').length,
    pending: suppliers.filter((s) => s.status === 'pending').length,
    cancelled: suppliers.filter((s) => s.status === 'cancelled').length,
    totalCommitted: suppliers.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.total_cost, 0),
    totalPaid: suppliers.reduce((sum, s) => sum + s.amount_paid, 0),
  }), [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.category.toLowerCase().includes(search.toLowerCase()) && !s.contact_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [suppliers, search, statusFilter, categoryFilter]);

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Suppliers</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold">Demo</span>
            </div>
            <p className="text-sm text-foreground-500 mt-1">Research, compare, book and manage all your wedding suppliers</p>
          </div>
        </div>

        {/* Alerts */}
        {filtered.some((s) => s.status === 'active' && s.amount_paid === 0) && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5"><i className="ri-alert-line text-sm" /></div>
            <p className="text-xs text-amber-800">Some booked suppliers have no payments recorded. Check your payment schedule to avoid surprises.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: 'ri-contacts-book-line', color: 'text-foreground-700', bg: 'bg-background-100' },
            { label: 'Active', value: stats.active, icon: 'ri-check-double-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', value: stats.pending, icon: 'ri-time-line', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Cancelled', value: stats.cancelled, icon: 'ri-close-circle-line', color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Committed', value: formatGBP(stats.totalCommitted), icon: 'ri-money-pound-circle-line', color: 'text-accent-600', bg: 'bg-accent-50', isText: true },
            { label: 'Paid', value: formatGBP(stats.totalPaid), icon: 'ri-bank-card-line', color: 'text-emerald-600', bg: 'bg-emerald-50', isText: true },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-secondary-100 rounded-xl p-4">
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${card.bg} ${card.color} mb-2`}>
                <i className={`${card.icon} text-xs`} />
              </div>
              {(card as unknown as Record<string, unknown>).isText ? (
                <p className="text-base font-heading font-semibold text-foreground-900">{card.value}</p>
              ) : (
                <p className="text-xl font-heading font-semibold text-foreground-900">{card.value}</p>
              )}
              <p className="text-[10px] text-foreground-500 font-label mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="all">All categories</option>
            {DEFAULT_SUPPLIER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-secondary-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 rounded-md text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${viewMode === 'grid' ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500'}`}>
              <i className="ri-grid-line mr-1" />Grid
            </button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 rounded-md text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${viewMode === 'list' ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500'}`}>
              <i className="ri-list-check mr-1" />List
            </button>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-secondary-100 rounded-xl text-center py-16">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-contacts-book-line text-xl" />
            </div>
            <p className="text-sm text-foreground-500 mb-3">No suppliers match your filters.</p>
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap">
              Clear all filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((supplier) => {
              const outstanding = supplier.total_cost - supplier.amount_paid;
              return (
                <div key={supplier.id} onClick={() => setSelectedSupplier(supplier === selectedSupplier ? null : supplier)}
                  className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${selectedSupplier?.id === supplier.id ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-label font-semibold text-foreground-900 truncate">{supplier.name}</h3>
                      <p className="text-[11px] text-foreground-500 mt-0.5">{supplier.category}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-label flex-shrink-0 ml-2 ${DEMO_STATUS_COLORS[supplier.status]}`}>{supplier.status}</span>
                  </div>
                  {supplier.contact_name && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground-600 mb-1"><i className="ri-user-line text-foreground-400 text-[10px]" />{supplier.contact_name}</div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground-600 truncate mb-1"><i className="ri-mail-line text-foreground-400 text-[10px]" />{supplier.email}</div>
                  )}
                  {supplier.total_cost > 0 && (
                    <div className="pt-3 mt-3 border-t border-secondary-100">
                      <div className="flex justify-between text-xs mb-1"><span className="text-foreground-500">Cost</span><span className="font-label font-semibold text-foreground-900">{formatGBP(supplier.total_cost)}</span></div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-foreground-500">Paid</span><span className="font-label text-emerald-600">{formatGBP(supplier.amount_paid)}</span></div>
                      {outstanding > 0 && <div className="flex justify-between text-xs"><span className="text-foreground-500">Due</span><span className="font-label text-amber-600">{formatGBP(outstanding)}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-background-50 border-b border-secondary-100 text-[10px] font-label text-foreground-500 uppercase tracking-wider">
              <span className="col-span-4">Supplier</span>
              <span className="col-span-2">Category</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-2 text-right">Paid</span>
              <span className="col-span-1 text-right">Due</span>
            </div>
            {filtered.map((supplier) => {
              const outstanding = supplier.total_cost - supplier.amount_paid;
              return (
                <div key={supplier.id} onClick={() => setSelectedSupplier(supplier === selectedSupplier ? null : supplier)}
                  className={`grid grid-cols-12 gap-4 px-5 py-3 border-b border-secondary-50 cursor-pointer transition-colors hover:bg-background-50 ${selectedSupplier?.id === supplier.id ? 'bg-primary-50/50' : ''}`}>
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm text-foreground-800 font-label truncate">{supplier.name}</p>
                    {supplier.contact_name && <p className="text-[10px] text-foreground-400 truncate">{supplier.contact_name}</p>}
                  </div>
                  <div className="col-span-2 flex items-center"><span className="text-xs text-foreground-600">{supplier.category}</span></div>
                  <div className="col-span-1 flex items-center"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label ${DEMO_STATUS_COLORS[supplier.status]}`}>{supplier.status}</span></div>
                  <div className="col-span-2 flex items-center justify-end"><span className="text-xs font-label text-foreground-900">{supplier.total_cost > 0 ? formatGBP(supplier.total_cost) : '—'}</span></div>
                  <div className="col-span-2 flex items-center justify-end"><span className="text-xs font-label text-emerald-600">{supplier.amount_paid > 0 ? formatGBP(supplier.amount_paid) : '—'}</span></div>
                  <div className="col-span-1 flex items-center justify-end"><span className={`text-xs font-label ${outstanding > 0 ? 'text-amber-600' : 'text-foreground-400'}`}>{outstanding > 0 ? formatGBP(outstanding) : '—'}</span></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail modal */}
        {selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8" onClick={() => setSelectedSupplier(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100">
                <div>
                  <h3 className="font-heading text-lg text-foreground-900">{selectedSupplier.name}</h3>
                  <p className="text-xs text-foreground-500">{selectedSupplier.category} &middot; <span className="capitalize">{selectedSupplier.status}</span></p>
                </div>
                <button onClick={() => setSelectedSupplier(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
              </div>
              <div className="flex items-center gap-1 px-6 py-2 border-b border-secondary-100 bg-background-50">
                {['overview', 'quotes', 'documents'].map((tab) => (
                  <button key={tab} onClick={() => setDetailTab(tab as 'overview' | 'quotes' | 'documents')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap capitalize transition-colors ${detailTab === tab ? 'bg-white text-foreground-900 border border-secondary-200' : 'text-foreground-500 hover:text-foreground-700'}`}>{tab}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {detailTab === 'overview' && (
                  <div className="space-y-4 text-sm">
                    {selectedSupplier.contact_name && <div className="flex gap-3"><span className="text-foreground-500 w-24 flex-shrink-0">Contact</span><span className="text-foreground-800">{selectedSupplier.contact_name}</span></div>}
                    {selectedSupplier.email && <div className="flex gap-3"><span className="text-foreground-500 w-24 flex-shrink-0">Email</span><a href={`mailto:${selectedSupplier.email}`} className="text-primary-600 hover:underline truncate">{selectedSupplier.email}</a></div>}
                    {selectedSupplier.phone && <div className="flex gap-3"><span className="text-foreground-500 w-24 flex-shrink-0">Phone</span><span className="text-foreground-800">{selectedSupplier.phone}</span></div>}
                    {selectedSupplier.website && <div className="flex gap-3"><span className="text-foreground-500 w-24 flex-shrink-0">Website</span><a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">{selectedSupplier.website}</a></div>}
                    {selectedSupplier.total_cost > 0 && (
                      <div className="p-4 rounded-xl bg-background-50 border border-background-200 space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-foreground-500">Total cost</span><span className="font-label font-semibold text-foreground-900">{formatGBP(selectedSupplier.total_cost)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-foreground-500">Paid</span><span className="font-label text-emerald-600">{formatGBP(selectedSupplier.amount_paid)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-foreground-500">Outstanding</span><span className="font-label text-amber-600">{formatGBP(selectedSupplier.total_cost - selectedSupplier.amount_paid)}</span></div>
                      </div>
                    )}
                    {selectedSupplier.notes && (
                      <div><p className="text-xs font-label text-foreground-500 mb-1">Notes</p><p className="text-xs text-foreground-700 leading-relaxed">{selectedSupplier.notes}</p></div>
                    )}
                    {selectedSupplier.next_action && (
                      <div className="p-3 rounded-lg bg-primary-50 border border-primary-100"><p className="text-xs font-label text-primary-700"><i className="ri-arrow-right-s-line mr-1" />{selectedSupplier.next_action}</p></div>
                    )}
                  </div>
                )}
                {detailTab === 'quotes' && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-file-list-3-line text-xl" /></div>
                    <p className="text-sm text-foreground-500">Quote management is available in the full version</p>
                    <p className="text-xs text-foreground-400 mt-1">Supports multiple quotes, comparison, and acceptance tracking</p>
                  </div>
                )}
                {detailTab === 'documents' && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-file-upload-line text-xl" /></div>
                    <p className="text-sm text-foreground-500">Document upload is available in the full version</p>
                    <p className="text-xs text-foreground-400 mt-1">Upload proposals, contracts, invoices and insurance documents</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Normal (Supabase) Suppliers Page
// ═══════════════════════════════════════════

function NormalSuppliersPage() {
  const { weddingId, weddingState } = useActiveWedding();
  const hook = useSuppliers();
  const { suppliers, loading, error, getStats, createSupplier, updateSupplier, deleteSupplier, fetchQuotes, createQuote, updateQuote, deleteQuote, fetchDocuments, uploadDocument, getDocumentUrl, deleteDocument, fetchContacts, fetchActivity, fetchBudgetLinks } = hook;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SupplierSort>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<SupplierViewMode>('grid');

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerInitial, setDrawerInitial] = useState<SupplierFormData | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Detail panel
  const [selectedSupplier, setSelectedSupplier] = useState<WeddingSupplier | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'contacts' | 'quotes' | 'documents' | 'budget'>('overview');
  const [detailQuotes, setDetailQuotes] = useState<SupplierQuote[]>([]);
  const [detailDocs, setDetailDocs] = useState<SupplierDocument[]>([]);
  const [detailContacts, setDetailContacts] = useState<SupplierContact[]>([]);
  const [detailActivity, setDetailActivity] = useState<{ id: string; action: string; created_at: string; changes: Record<string, unknown> | null }[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Quote form
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>(EMPTY_QUOTE_FORM);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Upload
  const [uploadDocType, setUploadDocType] = useState('other');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Toast
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => { setSelectedSupplier(null); setDetailTab('overview'); }, [weddingId]);

  // Detail loading when supplier selected
  useEffect(() => {
    if (!selectedSupplier) return;
    setDetailLoading(true);
    Promise.all([
      fetchContacts(selectedSupplier.id),
      fetchQuotes(selectedSupplier.id),
      fetchDocuments(selectedSupplier.id),
      fetchActivity(selectedSupplier.id),
    ]).then(([contacts, quotes, docs, activity]) => {
      setDetailContacts(contacts);
      setDetailQuotes(quotes);
      setDetailDocs(docs);
      setDetailActivity(activity);
      setDetailLoading(false);
    }).catch(() => setDetailLoading(false));
  }, [selectedSupplier?.id]);

  const stats: SupplierStats = getStats();

  // Sorting
  const sorted = useMemo(() => {
    const list = [...suppliers];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'business_name': cmp = (a.business_name || '').localeCompare(b.business_name || ''); break;
        case 'category': cmp = (a.category || '').localeCompare(b.category || ''); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        case 'agreed_amount': cmp = (a.agreed_amount || 0) - (b.agreed_amount || 0); break;
        default: cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [suppliers, sortBy, sortAsc]);

  // Filtering
  const filtered = useMemo(() => {
    return sorted.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.business_name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q) && !(s.notes || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sorted, statusFilter, categoryFilter, search]);

  const openCreate = () => {
    setDrawerInitial(undefined);
    setEditingId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEdit = (supplier: WeddingSupplier) => {
    setDrawerInitial({
      business_name: supplier.business_name,
      category: supplier.category,
      status: supplier.status,
      rating: supplier.rating,
      website: supplier.website || '',
      notes: supplier.notes || '',
      internal_tags: supplier.internal_tags || [],
      next_action: supplier.next_action || '',
      next_action_date: supplier.next_action_date || '',
      contract_reference: supplier.contract_reference || '',
      contract_date: supplier.contract_date || '',
      agreed_amount: supplier.agreed_amount != null ? String(supplier.agreed_amount) : '',
      cancellation_terms: supplier.cancellation_terms || '',
      milestones: supplier.milestones || [],
      contacts: (supplier.contacts || []).map((c) => ({ tempId: c.id, full_name: c.full_name, role: c.role || '', email: c.email || '', phone: c.phone || '', is_primary: c.is_primary, notes: c.notes || '' })),
    });
    setEditingId(supplier.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleSave = async (form: SupplierFormData): Promise<boolean> => {
    if (drawerMode === 'create') {
      const id = await createSupplier(form);
      if (id) { showToast('Supplier created'); return true; }
    } else if (editingId) {
      const ok = await updateSupplier(editingId, form);
      if (ok) {
        showToast('Supplier updated');
        if (selectedSupplier?.id === editingId) {
          setSelectedSupplier((prev) => prev ? { ...prev, ...form, contacts: prev.contacts, agreed_amount: form.agreed_amount === '' ? null : Number(form.agreed_amount), business_name: form.business_name, category: form.category, status: form.status } : null);
        }
        return true;
      }
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier? All contacts, quotes, and documents will also be removed.')) return;
    const ok = await deleteSupplier(id);
    if (ok) { setSelectedSupplier(null); showToast('Supplier deleted'); }
  };

  const handleQuoteSave = async () => {
    if (!selectedSupplier) return;
    if (!quoteForm.amount || parseFloat(quoteForm.amount) <= 0) { showToast('Amount is required'); return; }
    let ok: boolean;
    if (editingQuoteId) ok = await updateQuote(editingQuoteId, quoteForm);
    else ok = await createQuote(selectedSupplier.id, quoteForm);
    if (ok) {
      setQuoteFormOpen(false);
      setEditingQuoteId(null);
      const quotes = await fetchQuotes(selectedSupplier.id);
      setDetailQuotes(quotes);
      showToast(editingQuoteId ? 'Quote updated' : 'Quote added');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSupplier) return;
    setUploading(true);
    const ok = await uploadDocument(selectedSupplier.id, file, uploadDocType, uploadNotes);
    setUploading(false);
    if (ok) {
      const docs = await fetchDocuments(selectedSupplier.id);
      setDetailDocs(docs);
      showToast('Document uploaded');
      setUploadNotes('');
    }
    e.target.value = '';
  };

  const handleOpenDoc = async (doc: SupplierDocument) => {
    const url = await getDocumentUrl(doc.file_path);
    if (url) window.open(url, '_blank');
    else showToast('Could not generate download link');
  };

  // Edge states
  if (weddingState === 'no_wedding') {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-6"><i className="ri-heart-add-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">No wedding workspace found</h1>
          <p className="text-sm text-foreground-500 mb-6">Create a wedding first, then come back to manage your suppliers.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Suppliers</h1>
            <p className="text-sm text-foreground-500 mt-1">Research, compare, book and manage all your wedding suppliers</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors">
            <i className="ri-add-line" /> Add supplier
          </button>
        </div>

        {/* Alerts */}
        {stats.expiringQuotes > 0 && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5"><i className="ri-alert-line text-sm" /></div>
            <p className="text-xs text-amber-800">{stats.expiringQuotes} quote{stats.expiringQuotes > 1 ? 's' : ''} expiring soon. Review before they expire.</p>
          </div>
        )}
        {stats.missingContracts > 0 && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5"><i className="ri-file-warning-line text-sm" /></div>
            <p className="text-xs text-red-700">{stats.missingContracts} booked supplier{stats.missingContracts > 1 ? 's' : ''} without contract reference{stats.missingContracts > 1 ? 's' : ''}. Add contract details for your records.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: 'ri-contacts-book-line', color: 'text-foreground-700', bg: 'bg-background-100' },
            { label: 'Enquiry', value: stats.enquiry, icon: 'ri-question-line', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Shortlisted', value: stats.shortlisted, icon: 'ri-star-line', color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Booked', value: stats.booked, icon: 'ri-check-double-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Committed', value: formatGBP(stats.totalCommitted), icon: 'ri-money-pound-circle-line', color: 'text-accent-600', bg: 'bg-accent-50', isText: true },
            { label: 'Paid', value: formatGBP(stats.totalPaid), icon: 'ri-bank-card-line', color: 'text-emerald-600', bg: 'bg-emerald-50', isText: true },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-secondary-100 rounded-xl p-4">
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${card.bg} ${card.color} mb-2`}>
                <i className={`${card.icon} text-xs`} />
              </div>
              {(card as unknown as Record<string, unknown>).isText ? (
                <p className="text-base font-heading font-semibold text-foreground-900">{card.value}</p>
              ) : (
                <p className="text-xl font-heading font-semibold text-foreground-900">{card.value}</p>
              )}
              <p className="text-[10px] text-foreground-500 font-label mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="all">All statuses</option>
            {(['enquiry','shortlisted','quoted','booked','completed','declined'] as SupplierStatus[]).map((s) => <option key={s} value={s}>{SUPPLIER_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="all">All categories</option>
            {DEFAULT_SUPPLIER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SupplierSort)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="created_at">Created</option>
            <option value="business_name">Name</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
            <option value="agreed_amount">Amount</option>
          </select>
          <button onClick={() => setSortAsc(!sortAsc)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-secondary-200 bg-white text-foreground-500 hover:bg-background-50 cursor-pointer" title={sortAsc ? 'Descending' : 'Ascending'}>
            <i className={`${sortAsc ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} text-sm`} />
          </button>
          <div className="flex items-center gap-1 bg-secondary-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 rounded-md text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${viewMode === 'grid' ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500'}`}>
              <i className="ri-grid-line mr-1" />Grid
            </button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 rounded-md text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${viewMode === 'list' ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500'}`}>
              <i className="ri-list-check mr-1" />List
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-secondary-100 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-background-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-background-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-background-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-secondary-100 rounded-xl text-center py-16">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-400 mb-4"><i className="ri-error-warning-line text-xl" /></div>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button onClick={hook.fetchSuppliers} className="px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-secondary-100 rounded-xl text-center py-16">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-contacts-book-line text-xl" />
            </div>
            {suppliers.length === 0 ? (
              <>
                <p className="text-sm text-foreground-600 mb-2">No suppliers yet</p>
                <p className="text-xs text-foreground-400 mb-6 max-w-xs mx-auto">Start building your supplier list — add venues, caterers, photographers, and more</p>
                <button onClick={openCreate} className="px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap">
                  <i className="ri-add-line mr-1.5" />Add your first supplier
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground-500 mb-3">No suppliers match your filters.</p>
                <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap">
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((supplier) => (
              <div key={supplier.id} onClick={() => setSelectedSupplier(supplier === selectedSupplier ? null : supplier)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all group ${selectedSupplier?.id === supplier.id ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-label font-semibold text-foreground-900 truncate">{supplier.business_name}</h3>
                    <p className="text-[11px] text-foreground-500 mt-0.5">{supplier.category}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-label flex-shrink-0 ml-2 ${SUPPLIER_STATUS_COLORS[supplier.status]}`}>
                    {SUPPLIER_STATUS_LABELS[supplier.status]}
                  </span>
                </div>
                {supplier.rating && (
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className={`${supplier.rating! > i ? 'ri-star-fill' : 'ri-star-line'} text-[10px] ${supplier.rating! > i ? 'text-amber-400' : 'text-foreground-300'}`} />
                    ))}
                  </div>
                )}
                {supplier.next_action && (
                  <p className="text-[10px] text-primary-600 italic mt-2"><i className="ri-arrow-right-s-line mr-0.5" />{supplier.next_action}</p>
                )}
                {supplier.agreed_amount != null && supplier.agreed_amount > 0 && (
                  <div className="pt-3 mt-3 border-t border-secondary-100">
                    <div className="flex justify-between text-xs"><span className="text-foreground-500">Agreed</span><span className="font-label font-semibold text-foreground-900">{formatGBP(supplier.agreed_amount)}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-background-50 border-b border-secondary-100 text-[10px] font-label text-foreground-500 uppercase tracking-wider">
              <span className="col-span-4">Supplier</span>
              <span className="col-span-2">Category</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-2 text-right">Agreed</span>
              <span className="col-span-2">Next action</span>
              <span className="col-span-1" />
            </div>
            {filtered.map((supplier) => (
              <div key={supplier.id} onClick={() => setSelectedSupplier(supplier === selectedSupplier ? null : supplier)}
                className={`grid grid-cols-12 gap-4 px-5 py-3 border-b border-secondary-50 cursor-pointer transition-colors hover:bg-background-50 ${selectedSupplier?.id === supplier.id ? 'bg-primary-50/50' : ''}`}>
                <div className="col-span-4 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-foreground-800 font-label truncate">{supplier.business_name}</span>
                  {supplier.rating && <span className="text-amber-400 text-[10px] flex-shrink-0">{'★'.repeat(supplier.rating)}</span>}
                </div>
                <div className="col-span-2 flex items-center"><span className="text-xs text-foreground-600">{supplier.category}</span></div>
                <div className="col-span-1 flex items-center"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label ${SUPPLIER_STATUS_COLORS[supplier.status]}`}>{SUPPLIER_STATUS_LABELS[supplier.status]}</span></div>
                <div className="col-span-2 flex items-center justify-end"><span className="text-xs font-label text-foreground-900">{supplier.agreed_amount ? formatGBP(supplier.agreed_amount) : '—'}</span></div>
                <div className="col-span-2 flex items-center"><span className="text-[10px] text-foreground-500 truncate">{supplier.next_action || '—'}</span></div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(supplier); }} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Edit"><i className="ri-pencil-line text-xs" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <SupplierDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        initial={drawerInitial}
        mode={drawerMode}
      />

      {/* Detail panel */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8" onClick={() => setSelectedSupplier(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
            {/* Detail header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 flex-shrink-0">
              <div>
                <h3 className="font-heading text-lg text-foreground-900">{selectedSupplier.business_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-foreground-500">{selectedSupplier.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label ${SUPPLIER_STATUS_COLORS[selectedSupplier.status]}`}>{SUPPLIER_STATUS_LABELS[selectedSupplier.status]}</span>
                  {selectedSupplier.rating && <span className="text-amber-400 text-xs">{'★'.repeat(selectedSupplier.rating)}{'☆'.repeat(5 - selectedSupplier.rating)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(selectedSupplier); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Edit"><i className="ri-pencil-line" /></button>
                <button onClick={() => handleDelete(selectedSupplier.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Delete"><i className="ri-delete-bin-line" /></button>
                <button onClick={() => setSelectedSupplier(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="flex items-center gap-1 px-6 py-2 border-b border-secondary-100 bg-background-50 flex-shrink-0 overflow-x-auto">
              {['overview', 'contacts', 'quotes', 'documents', 'budget'].map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab as typeof detailTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap capitalize transition-colors ${detailTab === tab ? 'bg-white text-foreground-900 border border-secondary-200' : 'text-foreground-500 hover:text-foreground-700'}`}>{tab}</button>
              ))}
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12"><i className="ri-loader-4-line animate-spin text-foreground-400 text-xl" /></div>
              ) : (
                <>
                  {/* Overview tab */}
                  {detailTab === 'overview' && (
                    <div className="space-y-5">
                      {selectedSupplier.website && (
                        <div className="flex gap-3 text-sm"><span className="text-foreground-500 w-28 flex-shrink-0">Website</span><a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">{selectedSupplier.website}</a></div>
                      )}
                      {selectedSupplier.notes && (
                        <div><p className="text-xs font-label text-foreground-500 mb-1">Notes</p><p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{selectedSupplier.notes}</p></div>
                      )}
                      {selectedSupplier.internal_tags && selectedSupplier.internal_tags.length > 0 && (
                        <div>
                          <p className="text-xs font-label text-foreground-500 mb-2">Tags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSupplier.internal_tags.map((tag) => <span key={tag} className="px-2 py-1 rounded-full bg-background-100 text-xs text-foreground-600 font-label">{tag}</span>)}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedSupplier.agreed_amount != null && selectedSupplier.agreed_amount > 0 && (
                          <div className="p-4 rounded-xl bg-background-50 border border-background-200">
                            <p className="text-[10px] font-label text-foreground-500 uppercase mb-1">Agreed amount</p>
                            <p className="text-lg font-heading font-semibold text-foreground-900">{formatGBP(selectedSupplier.agreed_amount)}</p>
                          </div>
                        )}
                        {selectedSupplier.contract_reference && (
                          <div className="p-4 rounded-xl bg-background-50 border border-background-200">
                            <p className="text-[10px] font-label text-foreground-500 uppercase mb-1">Contract</p>
                            <p className="text-sm font-label font-medium text-foreground-900">{selectedSupplier.contract_reference}</p>
                            {selectedSupplier.contract_date && <p className="text-[10px] text-foreground-400 mt-0.5">{formatDate(selectedSupplier.contract_date)}</p>}
                          </div>
                        )}
                      </div>
                      {selectedSupplier.next_action && (
                        <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                          <p className="text-[10px] font-label text-primary-500 uppercase mb-1">Next action</p>
                          <p className="text-sm text-primary-800">{selectedSupplier.next_action}</p>
                          {selectedSupplier.next_action_date && <p className="text-[10px] text-primary-500 mt-1">{formatDate(selectedSupplier.next_action_date)}</p>}
                        </div>
                      )}
                      {selectedSupplier.cancellation_terms && (
                        <div><p className="text-xs font-label text-foreground-500 mb-1">Cancellation terms</p><p className="text-xs text-foreground-700 leading-relaxed">{selectedSupplier.cancellation_terms}</p></div>
                      )}
                      {selectedSupplier.milestones && selectedSupplier.milestones.length > 0 && (
                        <div>
                          <p className="text-xs font-label text-foreground-500 mb-2">Milestones</p>
                          <div className="space-y-2">
                            {selectedSupplier.milestones.map((m: SupplierMilestone, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200">
                                <div className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${m.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-secondary-100 text-secondary-400'}`}>
                                  {m.completed ? <i className="ri-check-line text-[10px]" /> : <span className="text-[10px]">{i + 1}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground-800">{m.label}</p>
                                  <p className="text-[10px] text-foreground-400">{m.date}</p>
                                </div>
                                {m.amount != null && <span className="text-xs font-label text-foreground-600">{formatGBP(m.amount)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {detailActivity.length > 0 && (
                        <div>
                          <p className="text-xs font-label text-foreground-500 mb-2">Recent activity</p>
                          <div className="space-y-2">
                            {detailActivity.slice(0, 5).map((a) => (
                              <div key={a.id} className="flex items-center gap-3 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-secondary-300 flex-shrink-0" />
                                <span className="text-foreground-700">{a.action}</span>
                                <span className="text-foreground-400">{formatDate(a.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contacts tab */}
                  {detailTab === 'contacts' && (
                    <div className="space-y-3">
                      {detailContacts.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-contacts-line text-xl" /></div>
                          <p className="text-sm text-foreground-500">No contacts yet</p>
                          <p className="text-xs text-foreground-400 mt-1">Edit the supplier to add contact people</p>
                        </div>
                      ) : (
                        detailContacts.map((c) => (
                          <div key={c.id} className="p-4 rounded-xl border border-secondary-200 bg-background-50">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-label font-semibold text-foreground-900">{c.full_name}</span>
                              {c.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 font-label">Primary</span>}
                              {c.role && <span className="text-xs text-foreground-500">{c.role}</span>}
                            </div>
                            <div className="space-y-1">
                              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-primary-600 hover:underline"><i className="ri-mail-line text-foreground-400" />{c.email}</a>}
                              {c.phone && <div className="flex items-center gap-2 text-xs text-foreground-700"><i className="ri-phone-line text-foreground-400" />{c.phone}</div>}
                            </div>
                            {c.notes && <p className="text-xs text-foreground-500 mt-2 leading-relaxed">{c.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Quotes tab */}
                  {detailTab === 'quotes' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-label text-foreground-500">{detailQuotes.length} quote{detailQuotes.length !== 1 ? 's' : ''}</p>
                        <button onClick={() => { setQuoteForm(EMPTY_QUOTE_FORM); setEditingQuoteId(null); setQuoteFormOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-background-50 text-xs font-label cursor-pointer whitespace-nowrap hover:bg-primary-600">
                          <i className="ri-add-line text-xs" />Add quote
                        </button>
                      </div>
                      {quoteFormOpen && (
                        <div className="p-5 rounded-xl border border-primary-200 bg-primary-50/30 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Amount (£) *</label>
                              <input type="number" value={quoteForm.amount} onChange={(e) => setQuoteForm((f) => ({ ...f, amount: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Reference</label>
                              <input type="text" value={quoteForm.quote_ref} onChange={(e) => setQuoteForm((f) => ({ ...f, quote_ref: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="QUOTE-001" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Status</label>
                              <select value={quoteForm.status} onChange={(e) => setQuoteForm((f) => ({ ...f, status: e.target.value as QuoteFormData['status'] }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
                                {(['received','accepted','declined','expired'] as const).map((s) => <option key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Expiry date</label>
                              <input type="date" value={quoteForm.expiry_date} onChange={(e) => setQuoteForm((f) => ({ ...f, expiry_date: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Deposit required (£)</label>
                              <input type="number" value={quoteForm.deposit_required} onChange={(e) => setQuoteForm((f) => ({ ...f, deposit_required: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Deposit paid (£)</label>
                              <input type="number" value={quoteForm.deposit_paid} onChange={(e) => setQuoteForm((f) => ({ ...f, deposit_paid: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Tax amount (£)</label>
                              <input type="number" value={quoteForm.tax_amount} onChange={(e) => setQuoteForm((f) => ({ ...f, tax_amount: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-label text-foreground-500 mb-1">Tax rate (%)</label>
                              <input type="number" value={quoteForm.tax_rate} onChange={(e) => setQuoteForm((f) => ({ ...f, tax_rate: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" min="0" max="100" step="0.1" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-label text-foreground-500 mb-1">Notes</label>
                            <textarea value={quoteForm.notes} onChange={(e) => setQuoteForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 resize-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={handleQuoteSave} className="px-4 py-2 rounded-lg bg-primary-500 text-background-50 text-xs font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap">
                              {editingQuoteId ? 'Update' : 'Save'} quote
                            </button>
                            <button onClick={() => { setQuoteFormOpen(false); setEditingQuoteId(null); }} className="px-4 py-2 rounded-lg text-xs text-foreground-500 font-label hover:bg-background-100 cursor-pointer whitespace-nowrap">Cancel</button>
                          </div>
                        </div>
                      )}
                      {detailQuotes.length === 0 && !quoteFormOpen ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-file-list-3-line text-xl" /></div>
                          <p className="text-sm text-foreground-500">No quotes yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {detailQuotes.map((q) => {
                            const expiring = q.expiry_date && q.status === 'received' && daysFromNow(q.expiry_date) !== null && daysFromNow(q.expiry_date)! <= 14;
                            return (
                              <div key={q.id} className={`p-4 rounded-xl border ${expiring ? 'border-amber-200 bg-amber-50/30' : 'border-secondary-200 bg-background-50'}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-label font-semibold text-foreground-900">{formatGBP(q.amount)}</p>
                                    {q.quote_ref && <p className="text-[10px] text-foreground-400">{q.quote_ref}</p>}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'declined' ? 'bg-red-100 text-red-700' : q.status === 'expired' ? 'bg-foreground-100 text-foreground-500' : 'bg-amber-100 text-amber-700'}`}>
                                      {QUOTE_STATUS_LABELS[q.status]}
                                    </span>
                                    <button onClick={() => { setQuoteForm({ quote_ref: q.quote_ref || '', amount: String(q.amount), inclusions: q.inclusions || [], exclusions: q.exclusions || [], tax_amount: String(q.tax_amount), tax_rate: q.tax_rate ? String(q.tax_rate) : '', deposit_required: String(q.deposit_required), deposit_paid: String(q.deposit_paid), expiry_date: q.expiry_date || '', status: q.status, notes: q.notes || '' }); setEditingQuoteId(q.id); setQuoteFormOpen(true); }}
                                      className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 cursor-pointer" title="Edit"><i className="ri-pencil-line text-[10px]" /></button>
                                    <button onClick={async () => { if (confirm('Delete this quote?')) { await deleteQuote(q.id); setDetailQuotes((prev) => prev.filter((x) => x.id !== q.id)); } }}
                                      className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 cursor-pointer" title="Delete"><i className="ri-delete-bin-line text-[10px]" /></button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                                  {q.deposit_required > 0 && <div><span className="text-foreground-400">Deposit</span> <span className="font-label text-foreground-700">{formatGBP(q.deposit_required)}</span></div>}
                                  {q.deposit_paid > 0 && <div><span className="text-foreground-400">Paid</span> <span className="font-label text-emerald-600">{formatGBP(q.deposit_paid)}</span></div>}
                                  {q.tax_amount > 0 && <div><span className="text-foreground-400">Tax</span> <span className="font-label text-foreground-700">{formatGBP(q.tax_amount)}</span></div>}
                                  {q.expiry_date && <div><span className="text-foreground-400">Expires</span> <span className={`font-label ${expiring ? 'text-amber-700' : 'text-foreground-700'}`}>{formatDate(q.expiry_date)}</span></div>}
                                </div>
                                {q.notes && <p className="text-xs text-foreground-500 mt-2 leading-relaxed">{q.notes}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documents tab */}
                  {detailTab === 'documents' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-label text-foreground-500">{detailDocs.length} document{detailDocs.length !== 1 ? 's' : ''}</p>
                        <div className="flex items-center gap-2">
                          <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} className="px-2 py-1.5 rounded-lg border border-secondary-200 bg-white text-xs text-foreground-700 focus:outline-none cursor-pointer">
                            {(['proposal','contract','invoice','insurance','other'] as const).map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
                          </select>
                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-background-50 text-xs font-label cursor-pointer whitespace-nowrap hover:bg-primary-600">
                            <i className={`${uploading ? 'ri-loader-4-line animate-spin' : 'ri-upload-line'} text-xs`} />
                            {uploading ? 'Uploading...' : 'Upload'}
                            <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
                          </label>
                        </div>
                      </div>
                      <input type="text" value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-xs text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Document notes (optional)" />
                      {detailDocs.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-file-upload-line text-xl" /></div>
                          <p className="text-sm text-foreground-500">No documents yet</p>
                          <p className="text-xs text-foreground-400 mt-1">Upload proposals, contracts, invoices and insurance documents</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detailDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-background-50 border border-background-200">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 flex-shrink-0">
                                  <i className={`${doc.document_type === 'invoice' ? 'ri-bill-line' : doc.document_type === 'contract' ? 'ri-file-text-line' : 'ri-file-line'} text-sm`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-foreground-800 truncate">{doc.file_name}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-foreground-400">
                                    <span>{DOCUMENT_TYPE_LABELS[doc.document_type]}</span>
                                    {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} KB</span>}
                                    <span>{formatDate(doc.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => handleOpenDoc(doc)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer" title="Download"><i className="ri-download-line text-sm" /></button>
                                <button onClick={async () => { if (confirm('Delete this document?')) { await deleteDocument(doc.id, doc.file_path); setDetailDocs((prev) => prev.filter((d) => d.id !== doc.id)); showToast('Document deleted'); } }}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Budget tab */}
                  {detailTab === 'budget' && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4"><i className="ri-money-pound-circle-line text-xl" /></div>
                      <p className="text-sm text-foreground-500 mb-2">Budget integration</p>
                      <p className="text-xs text-foreground-400 max-w-xs mx-auto">Link this supplier to budget expenses and payments in the Budget workspace. Expenses linked here will appear under this supplier.</p>
                      <button onClick={() => { setSelectedSupplier(null); window.scrollTo(0, 0); }}
                        className="mt-4 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap">
                        <i className="ri-external-link-line mr-1" />Open budget
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Main export — branches on demo mode
// ═══════════════════════════════════════════

export default function SuppliersPage() {
  if (isDemoMode) return <DemoSuppliersPage />;
  return <NormalSuppliersPage />;
}