import type { DemoGiftFund, DemoGiftFundContribution } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

const W = DEMO_CONFIG.weddingId;

export const demoGiftFunds: DemoGiftFund[] = [
  {
    id: 'demo-gf-honeymoon',
    wedding_id: W,
    title: 'Honeymoon Safari Adventure',
    description:
      'We are planning an unforgettable honeymoon — a three-day safari in the Maasai Mara, Kenya, followed by a week on the white-sand beaches of Diani. Every contribution, no matter the size, helps us create memories that will last a lifetime. Thank you for being part of our journey.',
    category: 'honeymoon',
    target_amount_minor: 500000, // £5,000 in pence
    currency: 'gbp',
    cover_image_path: null,
    is_active: true,
    is_public: true,
    show_total_raised: true,
    show_contributor_names: true,
    closes_at: null,
    created_at: '2027-01-10T09:00:00+00:00',
  },
  {
    id: 'demo-gf-newhome',
    wedding_id: W,
    title: 'Our First Home Together',
    description:
      'After the wedding, we will begin searching for our first home. This fund will go towards our deposit, some furniture, and turning a house into our home. We are so grateful for any help you can give us as we start this new chapter.',
    category: 'new_home',
    target_amount_minor: 300000, // £3,000 in pence
    currency: 'gbp',
    cover_image_path: null,
    is_active: true,
    is_public: true,
    show_total_raised: true,
    show_contributor_names: true,
    closes_at: null,
    created_at: '2027-01-12T14:30:00+00:00',
  },
  {
    id: 'demo-gf-experiences',
    wedding_id: W,
    title: 'Date Night Experiences',
    description:
      'The first year of marriage should be filled with adventures. Cooking classes, theatre tickets, weekend getaways — this fund will fuel our date nights for the first twelve months of married life.',
    category: 'experiences',
    target_amount_minor: null, // No target — open-ended
    currency: 'gbp',
    cover_image_path: null,
    is_active: true,
    is_public: true,
    show_total_raised: true,
    show_contributor_names: true,
    closes_at: null,
    created_at: '2027-02-01T10:00:00+00:00',
  },
];

export const demoGiftFundContributions: DemoGiftFundContribution[] = [
  // ── Honeymoon contributions ──
  {
    id: 'demo-gfc-1',
    fund_id: 'demo-gf-honeymoon',
    guest_id: 'demo-guest-oliver',
    contributor_name: 'Oliver Bennett',
    message:
      'You two deserve the most incredible adventure. Can\'t wait to see the photos from the safari! Lots of love from your favourite cousin.',
    amount_minor: 75000, // £750
    visibility: 'public',
    payment_status: 'paid',
    paid_at: '2027-02-14T10:30:00+00:00',
  },
  {
    id: 'demo-gfc-2',
    fund_id: 'demo-gf-honeymoon',
    guest_id: 'demo-guest-sophie',
    contributor_name: 'Sophie Carter',
    message: 'So excited for you both! The Maasai Mara is going to be absolutely magical. Happy to chip in for the adventure. xx',
    amount_minor: 50000, // £500
    visibility: 'public',
    payment_status: 'paid',
    paid_at: '2027-02-20T14:15:00+00:00',
  },
  {
    id: 'demo-gfc-3',
    fund_id: 'demo-gf-honeymoon',
    guest_id: 'demo-guest-amelia',
    contributor_name: 'Amelia Wood',
    message: null,
    amount_minor: 25000, // £250
    visibility: 'name_only',
    payment_status: 'paid',
    paid_at: '2027-03-05T09:00:00+00:00',
  },
  {
    id: 'demo-gfc-4',
    fund_id: 'demo-gf-honeymoon',
    guest_id: 'demo-guest-ruth',
    contributor_name: 'Ruth Okonkwo',
    message: 'Wishing you endless golden sunsets and unforgettable moments together.',
    amount_minor: 100000, // £1,000
    visibility: 'public',
    payment_status: 'paid',
    paid_at: '2027-03-12T16:45:00+00:00',
  },
  // ── New Home contributions ──
  {
    id: 'demo-gfc-5',
    fund_id: 'demo-gf-newhome',
    guest_id: 'demo-guest-oliver',
    contributor_name: 'Oliver Bennett',
    message: 'Every home needs a great sound system. Hope this helps get you started!',
    amount_minor: 50000, // £500
    visibility: 'public',
    payment_status: 'paid',
    paid_at: '2027-02-14T10:35:00+00:00',
  },
  {
    id: 'demo-gfc-6',
    fund_id: 'demo-gf-newhome',
    guest_id: 'demo-guest-sophie',
    contributor_name: 'Sophie Carter',
    message: null,
    amount_minor: 30000, // £300
    visibility: 'name_only',
    payment_status: 'paid',
    paid_at: '2027-03-01T11:00:00+00:00',
  },
  {
    id: 'demo-gfc-7',
    fund_id: 'demo-gf-newhome',
    guest_id: 'demo-guest-george',
    contributor_name: 'George Davies',
    message: 'A little something to help with the sofa fund. Can\'t wait for the housewarming!',
    amount_minor: 20000, // £200
    visibility: 'public',
    payment_status: 'paid',
    paid_at: '2027-03-18T08:30:00+00:00',
  },
  // ── Date Night contributions ──
  {
    id: 'demo-gfc-8',
    fund_id: 'demo-gf-experiences',
    guest_id: 'demo-guest-amelia',
    contributor_name: 'Amelia Wood',
    message: 'Buy yourselves a really nice bottle of wine and toast to each other. Love you both!',
    amount_minor: 4000, // £40
    visibility: 'public',
    payment_status: 'paid',
    paid_at: '2027-03-22T19:00:00+00:00',
  },
  {
    id: 'demo-gfc-9',
    fund_id: 'demo-gf-experiences',
    guest_id: 'demo-guest-ruth',
    contributor_name: 'Ruth Okonkwo',
    message: null,
    amount_minor: 6000, // £60
    visibility: 'anonymous',
    payment_status: 'paid',
    paid_at: '2027-04-01T12:00:00+00:00',
  },
];