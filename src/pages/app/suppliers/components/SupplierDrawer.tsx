import { useState, useEffect } from 'react';
import type {
  SupplierFormData,
  SupplierStatus,
  SupplierMilestone,
  SupplierContactFormData,
} from '@/types/suppliers';
import { DEFAULT_SUPPLIER_CATEGORIES, EMPTY_SUPPLIER_FORM } from '@/types/suppliers';

interface SupplierDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: SupplierFormData) => Promise<boolean>;
  initial?: SupplierFormData;
  mode: 'create' | 'edit';
}

export default function SupplierDrawer({ open, onClose, onSave, initial, mode }: SupplierDrawerProps) {
  const [form, setForm] = useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'contacts' | 'milestones'>('details');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial || EMPTY_SUPPLIER_FORM);
      setActiveTab('details');
      setError('');
      setTagInput('');
    }
  }, [open, initial]);

  if (!open) return null;

  const update = <K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) { setError('Business name is required'); return; }
    setSaving(true);
    setError('');
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !form.internal_tags.includes(trimmed)) {
      update('internal_tags', [...form.internal_tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    update('internal_tags', form.internal_tags.filter((t) => t !== tag));
  };

  const addContact = () => {
    const c: SupplierContactFormData = { tempId: `c-${Date.now()}`, full_name: '', role: '', email: '', phone: '', is_primary: form.contacts.length === 0, notes: '' };
    update('contacts', [...form.contacts, c]);
  };

  const updateContact = (tempId: string, key: keyof SupplierContactFormData, value: unknown) => {
    update('contacts', form.contacts.map((c) => c.tempId === tempId ? { ...c, [key]: value } : c));
  };

  const removeContact = (tempId: string) => {
    update('contacts', form.contacts.filter((c) => c.tempId !== tempId));
  };

  const addMilestone = () => {
    const m: SupplierMilestone = { label: '', date: '', amount: undefined, completed: false };
    update('milestones', [...form.milestones, m]);
  };

  const updateMilestone = (index: number, key: keyof SupplierMilestone, value: unknown) => {
    const ms = [...form.milestones];
    ms[index] = { ...ms[index], [key]: value };
    update('milestones', ms);
  };

  const removeMilestone = (index: number) => {
    update('milestones', form.milestones.filter((_, i) => i !== index));
  };

  const statuses: SupplierStatus[] = ['enquiry', 'shortlisted', 'quoted', 'booked', 'completed', 'declined'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 flex-shrink-0">
          <h2 className="font-heading text-lg text-foreground-900">
            {mode === 'create' ? 'New supplier' : 'Edit supplier'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer">
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-secondary-100 flex-shrink-0 bg-background-50">
          {([
            { key: 'details', label: 'Details', icon: 'ri-information-line' },
            { key: 'contacts', label: `Contacts${form.contacts.length > 0 ? ` (${form.contacts.length})` : ''}`, icon: 'ri-contacts-line' },
            { key: 'milestones', label: `Milestones${form.milestones.length > 0 ? ` (${form.milestones.length})` : ''}`, icon: 'ri-flag-line' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white text-foreground-900 border border-secondary-200' : 'text-foreground-500 hover:text-foreground-700'}`}
            >
              <i className={`${tab.icon} text-xs`} />{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
          )}

          {activeTab === 'details' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-label text-foreground-600 mb-1">Business name *</label>
                  <input type="text" value={form.business_name} onChange={(e) => update('business_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. The Orangery" />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => update('category', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
                    {DEFAULT_SUPPLIER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => update('status', e.target.value as SupplierStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
                    {statuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Rating (1-5)</label>
                  <select value={form.rating ?? ''} onChange={(e) => update('rating', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
                    <option value="">Not rated</option>
                    {[5,4,3,2,1].map((r) => <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5-r)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Website</label>
                  <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Internal tags</label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Add tag..." />
                  <button onClick={addTag} className="px-3 py-1.5 rounded-lg bg-secondary-100 text-secondary-700 text-xs font-label cursor-pointer whitespace-nowrap hover:bg-secondary-200">Add</button>
                </div>
                {form.internal_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.internal_tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background-100 text-xs text-foreground-600 font-label">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-[10px]" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 resize-none" placeholder="Private notes about this supplier..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Agreed amount (£)</label>
                  <input type="number" value={form.agreed_amount} onChange={(e) => update('agreed_amount', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="0" min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Contract reference</label>
                  <input type="text" value={form.contract_reference} onChange={(e) => update('contract_reference', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. CON-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Contract date</label>
                  <input type="date" value={form.contract_date} onChange={(e) => update('contract_date', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Next action date</label>
                  <input type="date" value={form.next_action_date} onChange={(e) => update('next_action_date', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Next action</label>
                <input type="text" value={form.next_action} onChange={(e) => update('next_action', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Schedule tasting session" />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Cancellation terms</label>
                <textarea value={form.cancellation_terms} onChange={(e) => update('cancellation_terms', e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 resize-none" placeholder="e.g. 50% refund if cancelled 90 days before..." />
              </div>
            </>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {form.contacts.map((c) => (
                <div key={c.tempId} className="p-4 rounded-xl border border-secondary-200 bg-background-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-label text-foreground-500">Contact</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-foreground-600 cursor-pointer">
                        <input type="checkbox" checked={c.is_primary} onChange={(e) => {
                          if (e.target.checked) {
                            update('contacts', form.contacts.map((ct) => ({ ...ct, is_primary: ct.tempId === c.tempId })));
                          } else {
                            updateContact(c.tempId, 'is_primary', false);
                          }
                        }} className="w-3.5 h-3.5 rounded border-secondary-300" />
                        Primary
                      </label>
                      <button onClick={() => removeContact(c.tempId)} className="text-foreground-400 hover:text-red-500 cursor-pointer"><i className="ri-delete-bin-line text-sm" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" value={c.full_name} onChange={(e) => updateContact(c.tempId, 'full_name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Full name" />
                    <input type="text" value={c.role} onChange={(e) => updateContact(c.tempId, 'role', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Role" />
                    <input type="email" value={c.email} onChange={(e) => updateContact(c.tempId, 'email', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Email" />
                    <input type="tel" value={c.phone} onChange={(e) => updateContact(c.tempId, 'phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Phone" />
                  </div>
                  <input type="text" value={c.notes} onChange={(e) => updateContact(c.tempId, 'notes', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Notes about this contact" />
                </div>
              ))}
              <button onClick={addContact} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-secondary-200 text-sm text-foreground-500 hover:border-primary-300 hover:text-primary-600 cursor-pointer whitespace-nowrap transition-colors">
                <i className="ri-add-line" /> Add contact
              </button>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-3">
              {form.milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-secondary-200 bg-background-50">
                  <button onClick={() => updateMilestone(i, 'completed', !m.completed)}
                    className={`w-5 h-5 flex items-center justify-center rounded border-2 flex-shrink-0 mt-1.5 cursor-pointer transition-colors ${m.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-secondary-300 hover:border-primary-400'}`}>
                    {m.completed && <i className="ri-check-line text-[10px]" />}
                  </button>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" value={m.label} onChange={(e) => updateMilestone(i, 'label', e.target.value)}
                      className="sm:col-span-2 px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Milestone" />
                    <input type="date" value={m.date} onChange={(e) => updateMilestone(i, 'date', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
                    <input type="number" value={m.amount ?? ''} onChange={(e) => updateMilestone(i, 'amount', e.target.value ? Number(e.target.value) : undefined)}
                      className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="Amount (£)" min="0" step="0.01" />
                  </div>
                  <button onClick={() => removeMilestone(i)} className="text-foreground-400 hover:text-red-500 cursor-pointer mt-1.5"><i className="ri-close-line" /></button>
                </div>
              ))}
              <button onClick={addMilestone} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-secondary-200 text-sm text-foreground-500 hover:border-primary-300 hover:text-primary-600 cursor-pointer whitespace-nowrap transition-colors">
                <i className="ri-add-line" /> Add milestone
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-100 flex-shrink-0 bg-background-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-foreground-600 font-label hover:bg-background-100 cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-2">
            {saving ? <><i className="ri-loader-4-line animate-spin text-sm" />Saving...</> : mode === 'create' ? 'Create supplier' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}