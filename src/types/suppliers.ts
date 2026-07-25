// ── Supplier Types ──

export type SupplierStatus = 'enquiry' | 'shortlisted' | 'quoted' | 'booked' | 'completed' | 'declined';
export type QuoteStatus = 'received' | 'accepted' | 'declined' | 'expired';
export type DocumentType = 'proposal' | 'contract' | 'invoice' | 'insurance' | 'other';

export const DEFAULT_SUPPLIER_CATEGORIES = [
  'Venue',
  'Catering',
  'Photography',
  'Videography',
  'Florist',
  'Music & Entertainment',
  'Transport',
  'Hair & Makeup',
  'Cake',
  'Stationery',
  'Lighting & Decor',
  'Attire',
  'Officiant',
  'Other',
];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  enquiry: 'Enquiry',
  shortlisted: 'Shortlisted',
  quoted: 'Quoted',
  booked: 'Booked',
  completed: 'Completed',
  declined: 'Declined',
};

export const SUPPLIER_STATUS_COLORS: Record<SupplierStatus, string> = {
  enquiry: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  quoted: 'bg-amber-100 text-amber-700',
  booked: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-secondary-100 text-secondary-700',
  declined: 'bg-red-100 text-red-700',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  received: 'Received',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  invoice: 'Invoice',
  insurance: 'Insurance',
  other: 'Other',
};

export interface WeddingSupplier {
  id: string;
  wedding_id: string;
  business_name: string;
  category: string;
  status: SupplierStatus;
  rating: number | null;
  website: string | null;
  notes: string | null;
  internal_tags: string[] | null;
  next_action: string | null;
  next_action_date: string | null;
  contract_reference: string | null;
  contract_date: string | null;
  agreed_amount: number | null;
  cancellation_terms: string | null;
  milestones: SupplierMilestone[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  contacts?: SupplierContact[];
  quotes?: SupplierQuote[];
  documents?: SupplierDocument[];
  budget_links?: SupplierBudgetLink[];
  recent_activity?: SupplierActivityEntry[];
}

export interface SupplierMilestone {
  label: string;
  date: string;
  amount?: number;
  completed: boolean;
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  wedding_id: string;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierQuote {
  id: string;
  supplier_id: string;
  wedding_id: string;
  quote_ref: string | null;
  amount: number;
  inclusions: string[] | null;
  exclusions: string[] | null;
  tax_amount: number;
  tax_rate: number | null;
  deposit_required: number;
  deposit_paid: number;
  expiry_date: string | null;
  status: QuoteStatus;
  accepted_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  wedding_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: DocumentType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierBudgetLink {
  id: string;
  supplier_id: string;
  wedding_id: string;
  expense_id: string | null;
  payment_id: string | null;
  link_type: 'expense' | 'payment';
  notes: string | null;
  created_at: string;
}

export interface SupplierActivityEntry {
  id: string;
  supplier_id: string;
  wedding_id: string;
  actor_id: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface SupplierFormData {
  business_name: string;
  category: string;
  status: SupplierStatus;
  rating: number | null;
  website: string;
  notes: string;
  internal_tags: string[];
  next_action: string;
  next_action_date: string;
  contract_reference: string;
  contract_date: string;
  agreed_amount: string;
  cancellation_terms: string;
  milestones: SupplierMilestone[];
  contacts: SupplierContactFormData[];
}

export interface SupplierContactFormData {
  tempId: string;
  full_name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes: string;
}

export interface QuoteFormData {
  quote_ref: string;
  amount: string;
  inclusions: string[];
  exclusions: string[];
  tax_amount: string;
  tax_rate: string;
  deposit_required: string;
  deposit_paid: string;
  expiry_date: string;
  status: QuoteStatus;
  notes: string;
}

export const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  business_name: '',
  category: 'Other',
  status: 'enquiry',
  rating: null,
  website: '',
  notes: '',
  internal_tags: [],
  next_action: '',
  next_action_date: '',
  contract_reference: '',
  contract_date: '',
  agreed_amount: '',
  cancellation_terms: '',
  milestones: [],
  contacts: [],
};

export const EMPTY_QUOTE_FORM: QuoteFormData = {
  quote_ref: '',
  amount: '',
  inclusions: [],
  exclusions: [],
  tax_amount: '0',
  tax_rate: '',
  deposit_required: '0',
  deposit_paid: '0',
  expiry_date: '',
  status: 'received',
  notes: '',
};

export interface SupplierStats {
  total: number;
  enquiry: number;
  shortlisted: number;
  quoted: number;
  booked: number;
  completed: number;
  declined: number;
  totalCommitted: number;
  totalPaid: number;
  expiringQuotes: number;
  missingContracts: number;
}

export type SupplierSort = 'business_name' | 'category' | 'status' | 'created_at' | 'updated_at' | 'agreed_amount';
export type SupplierViewMode = 'list' | 'grid';