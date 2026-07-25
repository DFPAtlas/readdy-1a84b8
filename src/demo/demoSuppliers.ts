import type { DemoSupplier } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

const W = DEMO_CONFIG.weddingId;

export const demoSuppliers: DemoSupplier[] = [
  {
    id: 'demo-sup-orangery', wedding_id: W, name: 'The Orangery', category: 'Venue',
    contact_name: 'Sarah Mitchell', email: 'events@theorangerybath.example.com', phone: '01225 456789',
    website: 'https://www.theorangerybath.example.com', status: 'active',
    total_cost: 6500, amount_paid: 2500, next_action: 'Balance payment due 15 March', notes: 'Venue hire includes ceremony space, reception room, gardens, and day-of coordination.',
  },
  {
    id: 'demo-sup-photo', wedding_id: W, name: 'Bath Wedding Photography', category: 'Photography',
    contact_name: 'Mark Henderson', email: 'mark@bathweddingphoto.example.com', phone: '07700 900100',
    website: 'https://www.bathweddingphoto.example.com', status: 'active',
    total_cost: 2600, amount_paid: 800, next_action: 'Balance due 15 March', notes: 'Full-day coverage, second shooter, 500+ edited images, online gallery, USB delivery.',
  },
  {
    id: 'demo-sup-floral', wedding_id: W, name: 'Somerset Floral Studio', category: 'Florist',
    contact_name: 'Lucy Preston', email: 'lucy@somersetfloral.example.com', phone: '01761 555123',
    website: 'https://www.somersetfloral.example.com', status: 'active',
    total_cost: 2900, amount_paid: 600, next_action: 'Balance due 1 March', notes: 'Ceremony arch flowers, aisle arrangements, bridal bouquet, bridesmaids bouquets, buttonholes, centrepieces for 6 tables.',
  },
  {
    id: 'demo-sup-crescent', wedding_id: W, name: 'Crescent Catering', category: 'Catering',
    contact_name: 'James Harrington', email: 'james@crescentcatering.example.com', phone: '01225 789012',
    website: 'https://www.crescentcatering.example.com', status: 'active',
    total_cost: 7200, amount_paid: 2000, next_action: 'Final menu tasting — 15 February', notes: 'Canapés, three-course wedding breakfast, evening buffet, drinks package, and service staff.',
  },
  {
    id: 'demo-sup-cars', wedding_id: W, name: 'City of Bath Cars', category: 'Transport',
    contact_name: 'Richard Moore', email: 'bookings@cityofbathcars.example.com', phone: '01225 333444',
    website: 'https://www.cityofbathcars.example.com', status: 'active',
    total_cost: 1100, amount_paid: 0, next_action: 'Confirm shuttle schedule', notes: 'Vintage Rolls-Royce for bride, guest shuttle between St Mary\'s and The Orangery (3 trips).',
  },
  {
    id: 'demo-sup-band', wedding_id: W, name: 'The Night Owls Band', category: 'Entertainment',
    contact_name: 'Dave Pearson', email: 'dave@nightowlsband.example.com', phone: '07700 900200',
    website: 'https://www.nightowlsband.example.com', status: 'active',
    total_cost: 2100, amount_paid: 700, next_action: 'Balance due 15 February', notes: 'Five-piece band, two 45-minute sets, DJ playlist between sets, all equipment provided.',
  },
];