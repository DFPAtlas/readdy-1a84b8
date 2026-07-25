export interface BudgetInfo {
  id: string;
  wedding_id: string;
  currency_code: string;
  planned_total: number;
  maximum_total: number | null;
  saved_amount: number;
  external_contributions: number;
  contingency_mode: 'inside' | 'outside' | 'disabled';
  contingency_percentage: number;
  honeymoon_included: boolean;
  engagement_ring_included: boolean;
  setup_profile: BudgetSetupProfile | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetSetupProfile {
  guest_count: number;
  wedding_day: string;
  wedding_month: string;
  wedding_region: string;
  ceremony_type: string;
  reception_type: string;
  venue_booked: boolean;
  catering_included_in_venue: boolean;
  planning_level: string;
}

export interface BudgetCategory {
  id: string;
  wedding_id: string;
  name: string;
  category_key: string;
  suggested_percentage: number;
  planned_amount: number;
  quoted_amount: number;
  committed_amount: number;
  paid_amount: number;
  is_locked: boolean;
  is_default: boolean;
  sort_order: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface BudgetExpense {
  id: string;
  wedding_id: string;
  category_id: string | null;
  supplier_id: string | null;
  title: string;
  description: string | null;
  planned_amount: number;
  quoted_amount: number;
  agreed_amount: number;
  amount_paid: number;
  deposit_amount: number;
  payment_status: ExpenseStatus;
  due_date: string | null;
  booking_date: string | null;
  refundable: boolean;
  vat_status: 'included' | 'excluded' | 'exempt';
  notes: string | null;
  status: 'active' | 'archived' | 'deleted';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  budget_categories?: BudgetCategory | null;
}

export type ExpenseStatus =
  | 'idea'
  | 'researching'
  | 'quote_received'
  | 'shortlisted'
  | 'booked'
  | 'deposit_paid'
  | 'part_paid'
  | 'paid'
  | 'cancelled'
  | 'refunded';

export interface BudgetPayment {
  id: string;
  wedding_id: string;
  expense_id: string | null;
  supplier_id: string | null;
  payment_type: 'payment' | 'deposit' | 'refund' | 'adjustment';
  amount: number;
  paid_at: string | null;
  due_at: string | null;
  payment_reference: string | null;
  status: 'scheduled' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  budget_expenses?: BudgetExpense | null;
}

export interface BudgetScenario {
  id: string;
  wedding_id: string;
  name: string;
  total_budget: number;
  guest_count: number;
  assumptions: Record<string, unknown> | null;
  category_allocations: Record<string, number> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetActivity {
  id: string;
  wedding_id: string;
  actor_user_id: string | null;
  action: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const DEFAULT_CATEGORIES: { key: string; name: string; percentage: number }[] = [
  { key: 'venue', name: 'Venue', percentage: 25 },
  { key: 'catering', name: 'Catering', percentage: 25 },
  { key: 'photography', name: 'Photography', percentage: 7 },
  { key: 'videography', name: 'Videography', percentage: 5 },
  { key: 'wedding_dress', name: 'Wedding dress', percentage: 5 },
  { key: 'suits_attire', name: 'Suits and other attire', percentage: 5 },
  { key: 'hair_makeup', name: 'Hair and makeup', percentage: 2 },
  { key: 'flowers', name: 'Flowers', percentage: 4 },
  { key: 'decor', name: 'Decor', percentage: 4 },
  { key: 'entertainment', name: 'Entertainment', percentage: 7 },
  { key: 'rings', name: 'Rings', percentage: 3 },
  { key: 'invitations_stationery', name: 'Invitations and stationery', percentage: 2 },
  { key: 'cake', name: 'Cake', percentage: 1.5 },
  { key: 'transport', name: 'Transport', percentage: 1.5 },
  { key: 'accommodation', name: 'Accommodation', percentage: 0 },
  { key: 'wedding_planner', name: 'Wedding planner', percentage: 0 },
  { key: 'ceremony_fees', name: 'Ceremony fees', percentage: 0.5 },
  { key: 'insurance', name: 'Insurance', percentage: 0.5 },
  { key: 'gifts_favours', name: 'Gifts and favours', percentage: 0.5 },
  { key: 'supplier_meals', name: 'Supplier meals', percentage: 0.5 },
  { key: 'alterations', name: 'Alterations', percentage: 0 },
  { key: 'furniture_marquee', name: 'Furniture or marquee hire', percentage: 0 },
  { key: 'corkage', name: 'Corkage', percentage: 0 },
  { key: 'miscellaneous', name: 'Miscellaneous', percentage: 0.5 },
  { key: 'contingency', name: 'Contingency', percentage: 5 },
  { key: 'honeymoon', name: 'Honeymoon', percentage: 0 },
  { key: 'engagement_ring', name: 'Engagement ring', percentage: 0 },
];

export const BENCHMARKS = {
  typical_low: 20000,
  typical_high: 24000,
  example_average: 20604,
  venue_alone: 6040,
  venue_with_catering: 9811,
  wedding_dress: 1500,
  wedding_planner: 1543,
  per_head_low: 272,
  per_head_high: 278,
  fifty_or_fewer: 12006,
  one_fifty_plus: 37431,
  saturday: 22290,
  tuesday: 16273,
  january: 15712,
  june: 23989,
  london: 24622,
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  idea: 'Idea',
  researching: 'Researching',
  quote_received: 'Quote received',
  shortlisted: 'Shortlisted',
  booked: 'Booked',
  deposit_paid: 'Deposit paid',
  part_paid: 'Part paid',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const EXPENSE_STATUS_ORDER: ExpenseStatus[] = [
  'idea',
  'researching',
  'quote_received',
  'shortlisted',
  'booked',
  'deposit_paid',
  'part_paid',
  'paid',
  'cancelled',
  'refunded',
];