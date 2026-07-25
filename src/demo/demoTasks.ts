import type { DemoTask } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

const W = DEMO_CONFIG.weddingId;

export const demoTasks: DemoTask[] = [
  { id: 'demo-task-menu', wedding_id: W, title: 'Confirm final menu with Crescent Catering', description: 'Finalise the three-course menu, canapés, and evening food selections. Confirm dietary accommodations.', category: 'catering', priority: 'high', status: 'pending', due_date: '2027-03-01', assigned_to: 'Emma' },
  { id: 'demo-task-photographer-bal', wedding_id: W, title: 'Pay photographer balance', description: 'Final balance of £1,800 due to Bath Wedding Photography.', category: 'payments', priority: 'high', status: 'pending', due_date: '2027-03-15', assigned_to: 'James' },
  { id: 'demo-task-rsvp-chase', wedding_id: W, title: 'Review pending RSVPs and follow up', description: 'Five households still need to respond. Send polite reminders and update guest counts.', category: 'guests', priority: 'medium', status: 'in_progress', due_date: '2027-03-10', assigned_to: 'Emma' },
  { id: 'demo-task-travel-approve', wedding_id: W, title: 'Approve travel recommendations', description: 'Review and approve the remaining pending travel recommendations for the guest portal.', category: 'travel', priority: 'low', status: 'pending', due_date: '2027-03-20', assigned_to: 'Emma' },
  { id: 'demo-task-seating-final', wedding_id: W, title: 'Finalise seating plan', description: 'Complete the Orangery reception layout, assign remaining unseated guests, and print table cards.', category: 'seating', priority: 'high', status: 'pending', due_date: '2027-04-01', assigned_to: 'James' },
  { id: 'demo-task-photo-rules', wedding_id: W, title: 'Review photo-wall rules', description: 'Set guidelines for guest photo sharing and review moderation settings for the wedding gallery.', category: 'gallery', priority: 'low', status: 'pending', due_date: '2027-04-10', assigned_to: 'Emma' },
];