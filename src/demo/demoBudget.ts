import type { DemoBudgetCategory, DemoExpense, DemoPayment } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

const W = DEMO_CONFIG.weddingId;

export const demoBudgetCategories: DemoBudgetCategory[] = [
  { id: 'demo-cat-venue', wedding_id: W, name: 'Venue', planned_amount: 8000, notes: 'The Orangery hire, ceremony fees, and event spaces', sort_order: 1 },
  { id: 'demo-cat-catering', wedding_id: W, name: 'Catering', planned_amount: 7500, notes: 'Wedding breakfast, canapés, evening food, and drinks package', sort_order: 2 },
  { id: 'demo-cat-photography', wedding_id: W, name: 'Photography', planned_amount: 2800, notes: 'Full-day coverage, second shooter, engagement shoot included', sort_order: 3 },
  { id: 'demo-cat-entertainment', wedding_id: W, name: 'Entertainment', planned_amount: 3500, notes: 'Live band, DJ, ceremony string quartet', sort_order: 4 },
  { id: 'demo-cat-flowers', wedding_id: W, name: 'Flowers & Décor', planned_amount: 3200, notes: 'Ceremony flowers, reception centrepieces, bouquet, buttonholes', sort_order: 5 },
  { id: 'demo-cat-attire', wedding_id: W, name: 'Attire', planned_amount: 2800, notes: 'Bridal gown, groom suit, bridesmaids dresses, accessories', sort_order: 6 },
  { id: 'demo-cat-transport', wedding_id: W, name: 'Transport', planned_amount: 1200, notes: 'Wedding car, guest shuttle between venues', sort_order: 7 },
  { id: 'demo-cat-contingency', wedding_id: W, name: 'Contingency', planned_amount: 3000, notes: 'Unexpected costs and last-minute adjustments', sort_order: 8 },
];

export const demoExpenses: DemoExpense[] = [
  { id: 'demo-exp-venue', wedding_id: W, category_id: 'demo-cat-venue', supplier_id: 'demo-sup-orangery', description: 'The Orangery — venue hire and ceremony space', agreed_amount: 6500, quoted_amount: 6500, payment_status: 'deposit_paid', status: 'active', due_date: '2027-02-01' },
  { id: 'demo-exp-ceremony', wedding_id: W, category_id: 'demo-cat-venue', supplier_id: '', description: 'St Mary\'s Church — ceremony fee', agreed_amount: 500, quoted_amount: 500, payment_status: 'paid', status: 'active', due_date: '2027-01-15' },
  { id: 'demo-exp-catering', wedding_id: W, category_id: 'demo-cat-catering', supplier_id: 'demo-sup-crescent', description: 'Crescent Catering — wedding breakfast and evening food', agreed_amount: 7200, quoted_amount: 7500, payment_status: 'deposit_paid', status: 'active', due_date: '2027-03-01' },
  { id: 'demo-exp-photography', wedding_id: W, category_id: 'demo-cat-photography', supplier_id: 'demo-sup-photo', description: 'Bath Wedding Photography — full-day package', agreed_amount: 2600, quoted_amount: 2600, payment_status: 'deposit_paid', status: 'active', due_date: '2027-03-15' },
  { id: 'demo-exp-band', wedding_id: W, category_id: 'demo-cat-entertainment', supplier_id: 'demo-sup-band', description: 'The Night Owls Band — evening reception', agreed_amount: 2100, quoted_amount: 2100, payment_status: 'deposit_paid', status: 'active', due_date: '2027-02-15' },
  { id: 'demo-exp-dj', wedding_id: W, category_id: 'demo-cat-entertainment', supplier_id: '', description: 'DJ for late-evening set', agreed_amount: 400, quoted_amount: 450, payment_status: 'booked', status: 'active', due_date: '2027-04-01' },
  { id: 'demo-exp-flowers', wedding_id: W, category_id: 'demo-cat-flowers', supplier_id: 'demo-sup-floral', description: 'Somerset Floral Studio — ceremony and reception flowers', agreed_amount: 2900, quoted_amount: 2900, payment_status: 'deposit_paid', status: 'active', due_date: '2027-03-01' },
  { id: 'demo-exp-attire-bride', wedding_id: W, category_id: 'demo-cat-attire', supplier_id: '', description: 'Bridal gown, veil, and shoes', agreed_amount: 1800, quoted_amount: 2000, payment_status: 'part_paid', status: 'active', due_date: '2027-02-01' },
  { id: 'demo-exp-attire-groom', wedding_id: W, category_id: 'demo-cat-attire', supplier_id: '', description: 'Groom\'s suit and accessories', agreed_amount: 750, quoted_amount: 800, payment_status: 'paid', status: 'active', due_date: '2027-01-15' },
  { id: 'demo-exp-transport', wedding_id: W, category_id: 'demo-cat-transport', supplier_id: 'demo-sup-cars', description: 'City of Bath Cars — wedding car and guest shuttle', agreed_amount: 1100, quoted_amount: 1200, payment_status: 'booked', status: 'active', due_date: '2027-03-15' },
];

export const demoPayments: DemoPayment[] = [
  // ── Paid ──
  { id: 'demo-pay-venue-dep', wedding_id: W, expense_id: 'demo-exp-venue', description: 'The Orangery — venue deposit', amount: 2500, due_date: '2026-11-15', status: 'paid', paid_at: '2026-11-15', payment_method: 'Bank transfer', payment_reference: 'INV-OR-001', payment_type: 'deposit' },
  { id: 'demo-pay-venue-inst', wedding_id: W, expense_id: 'demo-exp-venue', description: 'The Orangery — second instalment', amount: 1500, due_date: '2027-02-01', status: 'paid', paid_at: '2027-02-01', payment_method: 'Bank transfer', payment_reference: 'INV-OR-002', payment_type: 'payment' },
  { id: 'demo-pay-ceremony', wedding_id: W, expense_id: 'demo-exp-ceremony', description: 'St Mary\'s Church — ceremony fee', amount: 500, due_date: '2026-12-01', status: 'paid', paid_at: '2026-12-01', payment_method: 'Bank transfer', payment_reference: 'CH-2026-12', payment_type: 'payment' },
  { id: 'demo-pay-catering-dep', wedding_id: W, expense_id: 'demo-exp-catering', description: 'Crescent Catering — deposit', amount: 2000, due_date: '2026-12-15', status: 'paid', paid_at: '2026-12-15', payment_method: 'Bank transfer', payment_reference: 'CC-DEP-001', payment_type: 'deposit' },
  { id: 'demo-pay-catering-inst', wedding_id: W, expense_id: 'demo-exp-catering', description: 'Crescent Catering — second instalment', amount: 1800, due_date: '2027-02-15', status: 'paid', paid_at: '2027-02-15', payment_method: 'Bank transfer', payment_reference: 'CC-INST-002', payment_type: 'payment' },
  { id: 'demo-pay-photo-dep', wedding_id: W, expense_id: 'demo-exp-photography', description: 'Bath Wedding Photography — deposit', amount: 800, due_date: '2026-12-20', status: 'paid', paid_at: '2026-12-20', payment_method: 'Card', payment_reference: 'BWP-DEP-001', payment_type: 'deposit' },
  { id: 'demo-pay-band-dep', wedding_id: W, expense_id: 'demo-exp-band', description: 'The Night Owls Band — deposit', amount: 700, due_date: '2026-11-30', status: 'paid', paid_at: '2026-11-30', payment_method: 'Bank transfer', payment_reference: 'NO-DEP-001', payment_type: 'deposit' },
  { id: 'demo-pay-flowers-dep', wedding_id: W, expense_id: 'demo-exp-flowers', description: 'Somerset Floral Studio — deposit', amount: 600, due_date: '2026-12-10', status: 'paid', paid_at: '2026-12-10', payment_method: 'Bank transfer', payment_reference: 'SFS-DEP-001', payment_type: 'deposit' },
  { id: 'demo-pay-bride-pt', wedding_id: W, expense_id: 'demo-exp-attire-bride', description: 'Bridal gown — part payment', amount: 1000, due_date: '2027-01-15', status: 'paid', paid_at: '2027-01-15', payment_method: 'Card', payment_reference: 'BG-001', payment_type: 'payment' },
  { id: 'demo-pay-groom', wedding_id: W, expense_id: 'demo-exp-attire-groom', description: 'Groom\'s suit — full payment', amount: 750, due_date: '2026-12-05', status: 'paid', paid_at: '2026-12-05', payment_method: 'Card', payment_reference: 'GS-001', payment_type: 'payment' },
  { id: 'demo-pay-transport-dep', wedding_id: W, expense_id: 'demo-exp-transport', description: 'City of Bath Cars — booking deposit', amount: 300, due_date: '2027-01-10', status: 'paid', paid_at: '2027-01-10', payment_method: 'Bank transfer', payment_reference: 'CBC-DEP-001', payment_type: 'deposit' },
  { id: 'demo-pay-dj-dep', wedding_id: W, expense_id: 'demo-exp-dj', description: 'DJ — booking fee', amount: 150, due_date: '2027-01-05', status: 'paid', paid_at: '2027-01-05', payment_method: 'Bank transfer', payment_reference: 'DJ-001', payment_type: 'deposit' },
  // ── Pending ──
  { id: 'demo-pay-venue-bal', wedding_id: W, expense_id: 'demo-exp-venue', description: 'The Orangery — final balance', amount: 2500, due_date: '2027-03-15', status: 'pending', payment_type: 'balance' },
  { id: 'demo-pay-catering-bal', wedding_id: W, expense_id: 'demo-exp-catering', description: 'Crescent Catering — final balance', amount: 3400, due_date: '2027-03-15', status: 'pending', payment_type: 'balance' },
  { id: 'demo-pay-photo-bal', wedding_id: W, expense_id: 'demo-exp-photography', description: 'Bath Wedding Photography — balance', amount: 1800, due_date: '2027-03-15', status: 'pending', payment_type: 'balance' },
  { id: 'demo-pay-band-bal', wedding_id: W, expense_id: 'demo-exp-band', description: 'The Night Owls Band — balance', amount: 1400, due_date: '2027-02-15', status: 'pending', payment_type: 'balance' },
  { id: 'demo-pay-flowers-bal', wedding_id: W, expense_id: 'demo-exp-flowers', description: 'Somerset Floral Studio — balance', amount: 2300, due_date: '2027-03-01', status: 'pending', payment_type: 'balance' },
  { id: 'demo-pay-transport-bal', wedding_id: W, expense_id: 'demo-exp-transport', description: 'City of Bath Cars — final balance', amount: 800, due_date: '2027-03-15', status: 'pending', payment_type: 'balance' },
  { id: 'demo-pay-dj-bal', wedding_id: W, expense_id: 'demo-exp-dj', description: 'DJ — final balance', amount: 250, due_date: '2027-04-01', status: 'pending', payment_type: 'balance' },
  // ── Overdue ──
  { id: 'demo-pay-bride-bal', wedding_id: W, expense_id: 'demo-exp-attire-bride', description: 'Bridal gown — balance payment', amount: 800, due_date: '2027-02-01', status: 'overdue', payment_type: 'balance' },
];