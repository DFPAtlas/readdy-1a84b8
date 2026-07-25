import type { DemoUpdate } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

const W = DEMO_CONFIG.weddingId;

export const demoUpdates: DemoUpdate[] = [
  {
    id: 'demo-update-save-date', wedding_id: W, title: 'Save the Date — We\'re Getting Married!',
    summary: 'Emma and James are delighted to announce their wedding on 24 April 2027 in Bath, Somerset.',
    category: 'general', priority: 'standard', status: 'published',
    content_data: [
      { type: 'paragraph', text: 'We are over the moon to share that we will be tying the knot on Saturday, 24 April 2027 in the beautiful city of Bath. Please save the date — formal invitations will follow in early 2027 with all the details you need.' },
      { type: 'heading', text: 'The Venue', level: 2 },
      { type: 'paragraph', text: 'The ceremony will take place at St Mary\'s Church in Bathwick, followed by a reception at The Orangery on Great Pulteney Street. Both venues are within easy walking distance of Bath city centre.' },
      { type: 'info_panel', text: 'Please do not book travel or accommodation just yet — we will share hotel recommendations and room blocks with your formal invitation.' },
    ],
    publish_at: '2026-09-01T09:00:00+01:00', related_route: '', linked_event_id: '', dismissible: true,
  },
  {
    id: 'demo-update-hotel-block', wedding_id: W, title: 'Hotel Room Blocks Now Available',
    summary: 'We have secured discounted room blocks at The Royal Crescent Hotel and The Bird, Bath. Book by 28 February to guarantee availability.',
    category: 'accommodation', priority: 'important', status: 'published',
    content_data: [
      { type: 'paragraph', text: 'Great news — we have arranged special rates at two beautiful hotels for our wedding guests. Both are within easy reach of the ceremony and reception venues.' },
      { type: 'heading', text: 'The Royal Crescent Hotel & Spa', level: 2 },
      { type: 'paragraph', text: 'Five-star luxury in Bath\'s iconic Royal Crescent. Rooms from £220 per night. Quote booking reference "BENNETT-CARTER-0427" when reserving. Book by 28 February 2027.' },
      { type: 'heading', text: 'The Bird, Bath', level: 2 },
      { type: 'paragraph', text: 'Boutique hotel just 5 minutes\' walk from The Orangery. Rooms from £145 per night. Quote "Emma&JamesWedding" when booking. Book by 28 February 2027.' },
      { type: 'info_panel', text: 'Both hotels are filling up quickly for the April bank holiday weekend, so we recommend booking as soon as possible.' },
    ],
    publish_at: '2026-11-15T10:00:00+00:00', related_route: '/travel/accommodation', linked_event_id: '', dismissible: true,
  },
  {
    id: 'demo-update-ceremony-time', wedding_id: W, title: 'Ceremony Time Confirmed — Please Arrive by 12:30',
    summary: 'The ceremony at St Mary\'s Church will begin at 1:00pm. Please arrive by 12:30pm to be seated.',
    category: 'schedule', priority: 'important', status: 'published',
    content_data: [
      { type: 'paragraph', text: 'We have confirmed the timings with both venues, and we are pleased to share the final schedule for the day.' },
      { type: 'event_summary', text: '12:30 — Guests arrive at St Mary\'s Church\n13:00 — Wedding ceremony begins\n14:00 — Ceremony concludes, photographs at the church\n15:00 — Champagne reception at The Orangery\n16:00 — Wedding breakfast\n19:00 — Evening guests arrive, cake cutting\n20:00 — First dance and evening reception with The Night Owls Band\n00:00 — Carriages' },
      { type: 'paragraph', text: 'Dress code is formal — black tie optional. April in Bath can be unpredictable, so bring a light jacket or wrap for the outdoor photographs.' },
      { type: 'button', label: 'View full itinerary', url: '/itinerary', variant: 'primary' },
    ],
    publish_at: '2027-01-10T14:00:00+00:00', related_route: '/itinerary', linked_event_id: 'demo-event-ceremony', dismissible: true,
  },
];