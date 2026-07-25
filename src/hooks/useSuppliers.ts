import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type {
  WeddingSupplier,
  SupplierContact,
  SupplierQuote,
  SupplierDocument,
  SupplierBudgetLink,
  SupplierActivityEntry,
  SupplierFormData,
  SupplierStats,
  SupplierStatus,
  SupplierSort,
  QuoteFormData,
} from '@/types/suppliers';

export function useSuppliers() {
  const { weddingId } = useActiveWedding();
  const mountedRef = useRef(true);

  const [suppliers, setSuppliers] = useState<WeddingSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('wedding_suppliers')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });

      if (!mountedRef.current) return;
      if (qErr) throw qErr;
      setSuppliers((data || []) as WeddingSupplier[]);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSuppliers();
    return () => { mountedRef.current = false; };
  }, [fetchSuppliers]);

  const getStats = useCallback((): SupplierStats => {
    const stats: SupplierStats = {
      total: suppliers.length,
      enquiry: 0, shortlisted: 0, quoted: 0, booked: 0, completed: 0, declined: 0,
      totalCommitted: 0, totalPaid: 0, expiringQuotes: 0, missingContracts: 0,
    };
    for (const s of suppliers) {
      stats[s.status]++;
      if (['booked', 'completed'].includes(s.status) && s.agreed_amount) {
        stats.totalCommitted += s.agreed_amount;
      }
      if (s.status === 'booked' && !s.contract_reference) stats.missingContracts++;
    }
    return stats;
  }, [suppliers]);

  const createSupplier = useCallback(async (form: SupplierFormData): Promise<string | null> => {
    if (!weddingId) return null;
    const { data, error: qErr } = await supabase
      .from('wedding_suppliers')
      .insert({
        wedding_id: weddingId,
        business_name: form.business_name,
        category: form.category,
        status: form.status,
        rating: form.rating,
        website: form.website || null,
        notes: form.notes || null,
        internal_tags: form.internal_tags.length > 0 ? form.internal_tags : null,
        next_action: form.next_action || null,
        next_action_date: form.next_action_date || null,
        contract_reference: form.contract_reference || null,
        contract_date: form.contract_date || null,
        agreed_amount: form.agreed_amount ? parseFloat(form.agreed_amount) : null,
        cancellation_terms: form.cancellation_terms || null,
        milestones: form.milestones.length > 0 ? form.milestones : null,
        created_by: (await supabase.auth.getSession()).data.session?.user?.id || null,
      })
      .select('id')
      .single();

    if (qErr || !data) {
      setError(qErr?.message || 'Failed to create supplier');
      return null;
    }

    // Create contacts
    if (form.contacts.length > 0) {
      await supabase.from('supplier_contacts').insert(
        form.contacts.map((c) => ({
          supplier_id: data.id,
          wedding_id: weddingId,
          full_name: c.full_name,
          role: c.role || null,
          email: c.email || null,
          phone: c.phone || null,
          is_primary: c.is_primary,
          notes: c.notes || null,
        }))
      );
    }

    // Log activity
    await supabase.from('supplier_activity_log').insert({
      supplier_id: data.id,
      wedding_id: weddingId,
      actor_id: (await supabase.auth.getSession()).data.session?.user?.id || null,
      action: 'created',
      changes: { business_name: form.business_name, category: form.category, status: form.status },
    });

    await fetchSuppliers();
    return data.id;
  }, [weddingId, fetchSuppliers]);

  const updateSupplier = useCallback(async (id: string, form: SupplierFormData): Promise<boolean> => {
    if (!weddingId) return false;
    const { error: qErr } = await supabase
      .from('wedding_suppliers')
      .update({
        business_name: form.business_name,
        category: form.category,
        status: form.status,
        rating: form.rating,
        website: form.website || null,
        notes: form.notes || null,
        internal_tags: form.internal_tags.length > 0 ? form.internal_tags : null,
        next_action: form.next_action || null,
        next_action_date: form.next_action_date || null,
        contract_reference: form.contract_reference || null,
        contract_date: form.contract_date || null,
        agreed_amount: form.agreed_amount ? parseFloat(form.agreed_amount) : null,
        cancellation_terms: form.cancellation_terms || null,
        milestones: form.milestones.length > 0 ? form.milestones : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('wedding_id', weddingId);

    if (qErr) { setError(qErr.message); return false; }
    await fetchSuppliers();
    return true;
  }, [weddingId, fetchSuppliers]);

  const deleteSupplier = useCallback(async (id: string): Promise<boolean> => {
    if (!weddingId) return false;
    const { error: qErr } = await supabase
      .from('wedding_suppliers')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId);

    if (qErr) { setError(qErr.message); return false; }
    await fetchSuppliers();
    return true;
  }, [weddingId, fetchSuppliers]);

  // ── Contacts ──

  const fetchContacts = useCallback(async (supplierId: string): Promise<SupplierContact[]> => {
    const { data } = await supabase.from('supplier_contacts').select('*').eq('supplier_id', supplierId).order('is_primary', { ascending: false });
    return (data || []) as SupplierContact[];
  }, []);

  // ── Quotes ──

  const fetchQuotes = useCallback(async (supplierId: string): Promise<SupplierQuote[]> => {
    const { data } = await supabase.from('supplier_quotes').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
    return (data || []) as SupplierQuote[];
  }, []);

  const createQuote = useCallback(async (supplierId: string, form: QuoteFormData): Promise<boolean> => {
    if (!weddingId) return false;
    const { error: qErr } = await supabase.from('supplier_quotes').insert({
      supplier_id: supplierId,
      wedding_id: weddingId,
      quote_ref: form.quote_ref || null,
      amount: parseFloat(form.amount) || 0,
      inclusions: form.inclusions.length > 0 ? form.inclusions : null,
      exclusions: form.exclusions.length > 0 ? form.exclusions : null,
      tax_amount: parseFloat(form.tax_amount) || 0,
      tax_rate: form.tax_rate ? parseFloat(form.tax_rate) : null,
      deposit_required: parseFloat(form.deposit_required) || 0,
      deposit_paid: parseFloat(form.deposit_paid) || 0,
      expiry_date: form.expiry_date || null,
      status: form.status,
      notes: form.notes || null,
      created_by: (await supabase.auth.getSession()).data.session?.user?.id || null,
    });
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  const updateQuote = useCallback(async (quoteId: string, form: QuoteFormData): Promise<boolean> => {
    if (!weddingId) return false;
    const updateData: Record<string, unknown> = {
      quote_ref: form.quote_ref || null,
      amount: parseFloat(form.amount) || 0,
      inclusions: form.inclusions.length > 0 ? form.inclusions : null,
      exclusions: form.exclusions.length > 0 ? form.exclusions : null,
      tax_amount: parseFloat(form.tax_amount) || 0,
      tax_rate: form.tax_rate ? parseFloat(form.tax_rate) : null,
      deposit_required: parseFloat(form.deposit_required) || 0,
      deposit_paid: parseFloat(form.deposit_paid) || 0,
      expiry_date: form.expiry_date || null,
      status: form.status,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };
    if (form.status === 'accepted') updateData.accepted_at = new Date().toISOString();
    const { error: qErr } = await supabase.from('supplier_quotes').update(updateData).eq('id', quoteId).eq('wedding_id', weddingId);
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  const deleteQuote = useCallback(async (quoteId: string): Promise<boolean> => {
    if (!weddingId) return false;
    const { error: qErr } = await supabase.from('supplier_quotes').delete().eq('id', quoteId).eq('wedding_id', weddingId);
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  // ── Documents ──

  const fetchDocuments = useCallback(async (supplierId: string): Promise<SupplierDocument[]> => {
    const { data } = await supabase.from('supplier_documents').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
    return (data || []) as SupplierDocument[];
  }, []);

  const uploadDocument = useCallback(async (supplierId: string, file: File, docType: string, notes: string): Promise<boolean> => {
    if (!weddingId) return false;
    const filePath = `suppliers/${weddingId}/${supplierId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('private').upload(filePath, file);
    if (upErr) { setError(upErr.message); return false; }

    const { error: qErr } = await supabase.from('supplier_documents').insert({
      supplier_id: supplierId,
      wedding_id: weddingId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      document_type: docType,
      notes: notes || null,
      created_by: (await supabase.auth.getSession()).data.session?.user?.id || null,
    });
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  const getDocumentUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage.from('private').createSignedUrl(filePath, 3600);
    return data?.signedUrl || null;
  }, []);

  const deleteDocument = useCallback(async (docId: string, filePath: string): Promise<boolean> => {
    if (!weddingId) return false;
    await supabase.storage.from('private').remove([filePath]);
    const { error: qErr } = await supabase.from('supplier_documents').delete().eq('id', docId).eq('wedding_id', weddingId);
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  // ── Activity ──

  const fetchActivity = useCallback(async (supplierId: string): Promise<SupplierActivityEntry[]> => {
    const { data } = await supabase.from('supplier_activity_log').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(20);
    return (data || []) as SupplierActivityEntry[];
  }, []);

  // ── Budget links ──

  const fetchBudgetLinks = useCallback(async (supplierId: string): Promise<SupplierBudgetLink[]> => {
    const { data } = await supabase.from('supplier_budget_links').select('*').eq('supplier_id', supplierId);
    return (data || []) as SupplierBudgetLink[];
  }, []);

  const linkExpense = useCallback(async (supplierId: string, expenseId: string, notes?: string): Promise<boolean> => {
    if (!weddingId) return false;
    const { error: qErr } = await supabase.from('supplier_budget_links').upsert({
      supplier_id: supplierId,
      wedding_id: weddingId,
      expense_id: expenseId,
      link_type: 'expense',
      notes: notes || null,
    }, { onConflict: 'supplier_id,expense_id,link_type' });
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  const unlinkExpense = useCallback(async (linkId: string): Promise<boolean> => {
    if (!weddingId) return false;
    const { error: qErr } = await supabase.from('supplier_budget_links').delete().eq('id', linkId).eq('wedding_id', weddingId);
    if (qErr) { setError(qErr.message); return false; }
    return true;
  }, [weddingId]);

  return {
    suppliers,
    loading,
    error,
    setError,
    getStats,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    fetchContacts,
    fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    fetchDocuments,
    uploadDocument,
    getDocumentUrl,
    deleteDocument,
    fetchActivity,
    fetchBudgetLinks,
    linkExpense,
    unlinkExpense,
  };
}