import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import FocusTrap from '@/components/base/FocusTrap';

export interface PageHelpContent {
  pageTitle: string;
  whatItDoes: string;
  firstAction: string;
  keyTerms: { term: string; definition: string }[];
  commonMistakes: string[];
  relatedArticleSlugs: string[];
  relatedArticleTitles: string[];
}

interface PageHelpPanelProps {
  content: PageHelpContent;
  isOpen: boolean;
  onClose: () => void;
  onStartWalkthrough?: () => void;
  walkthroughLabel?: string;
}

export default function PageHelpPanel({ content, isOpen, onClose, onStartWalkthrough, walkthroughLabel }: PageHelpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <FocusTrap
        active={isOpen}
        onEscape={onClose}
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-secondary-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500">
              <i className="ri-question-line text-sm" />
            </div>
            <h2 className="font-label text-sm font-semibold text-foreground-900">Page help</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="Close help panel"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* What this page does */}
          <div>
            <h3 className="font-label text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">What this page does</h3>
            <p className="text-sm text-foreground-700 leading-relaxed">{content.whatItDoes}</p>
          </div>

          {/* First action */}
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-200 text-primary-600">
                <i className="ri-play-circle-line text-xs" />
              </div>
              <p className="text-xs font-label font-semibold text-primary-800">First step</p>
            </div>
            <p className="text-sm text-primary-700">{content.firstAction}</p>
          </div>

          {/* Walkthrough */}
          {onStartWalkthrough && (
            <button
              onClick={onStartWalkthrough}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-guide-line" /> {walkthroughLabel || 'Start guided tour'}
            </button>
          )}

          {/* Key terms */}
          {content.keyTerms.length > 0 && (
            <div>
              <h3 className="font-label text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Key terms</h3>
              <div className="space-y-2.5">
                {content.keyTerms.map((kt) => (
                  <div key={kt.term}>
                    <p className="text-sm font-label font-medium text-foreground-800">{kt.term}</p>
                    <p className="text-xs text-foreground-500 mt-0.5">{kt.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common mistakes */}
          {content.commonMistakes.length > 0 && (
            <div>
              <h3 className="font-label text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Watch out for</h3>
              <ul className="space-y-2">
                {content.commonMistakes.map((cm) => (
                  <li key={cm} className="flex items-start gap-2 text-sm text-foreground-600">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0 mt-0.5">
                      <i className="ri-error-warning-line text-[10px]" />
                    </span>
                    {cm}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related articles */}
          {content.relatedArticleSlugs.length > 0 && (
            <div>
              <h3 className="font-label text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Related articles</h3>
              <div className="space-y-1.5">
                {content.relatedArticleSlugs.map((slug, i) => (
                  <Link
                    key={slug}
                    to={`/app/help/${slug}`}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 cursor-pointer transition-colors"
                    onClick={onClose}
                  >
                    <i className="ri-article-line text-xs" />
                    {content.relatedArticleTitles[i] || slug}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Support link */}
          <div className="pt-4 border-t border-secondary-100">
            <Link
              to="/contact"
              className="flex items-center gap-2 text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer transition-colors"
            >
              <i className="ri-mail-line" /> Contact support
            </Link>
          </div>
        </div>
      </FocusTrap>
    </>
  );
}

// ── Pre-built page help content ──

export const PAGE_HELP_CONTENT: Record<string, PageHelpContent> = {
  dashboard: {
    pageTitle: 'Dashboard',
    whatItDoes: 'Your dashboard is the central hub of your wedding planning. It shows your wedding countdown, key stats about guests and invitations, planning progress, upcoming tasks, and items that need your attention.',
    firstAction: 'Click any stat card (Guests, Invitations, Budget, Seating) to jump into that section and start working.',
    keyTerms: [
      { term: 'Planning progress', definition: 'Shows how many setup steps you have completed. Based on real data, not page visits.' },
      { term: 'RSVP breakdown', definition: 'How many guests have accepted, declined, or not yet responded to your invitation.' },
      { term: 'Quick actions', definition: 'One-click shortcuts to common tasks — adding a guest, opening your website, or previewing the guest portal.' },
    ],
    commonMistakes: [
      'The countdown only works if your wedding date is set in Wedding Details.',
      'Planning progress reflects actual data — visit the Getting Started page for the full checklist.',
    ],
    relatedArticleSlugs: ['dashboard-overview', 'setup-checklist', 'adding-guests'],
    relatedArticleTitles: ['Understanding your dashboard', 'Setup checklist', 'Adding and managing guests'],
  },
  guests: {
    pageTitle: 'Guests',
    whatItDoes: 'Your guest list is where you manage everyone invited to your wedding. You can add guests, organise them into households, assign tags, import from a spreadsheet, and export your list.',
    firstAction: 'Click "Add guest" to create your first guest record. Fill in their name and contact details. You can add more details like dietary requirements and RSVP status later.',
    keyTerms: [
      { term: 'Household', definition: 'A group of guests who share an invitation — typically a couple or family.' },
      { term: 'Tags', definition: 'Labels you create to categorise guests, like "Bride\'s family" or "Evening only."' },
      { term: 'RSVP status', definition: 'Whether the guest is attending, declined, or still awaiting a response.' },
    ],
    commonMistakes: [
      'A guest must be linked to a household to receive an invitation.',
      'RSVP status is separate from invitation status — a guest can be "invited" before they RSVP.',
    ],
    relatedArticleSlugs: ['adding-guests', 'households-explained'],
    relatedArticleTitles: ['Adding and managing guests', 'How households work'],
  },
  invitations: {
    pageTitle: 'Invitations',
    whatItDoes: 'Design, personalise, and send digital wedding invitations. Browse templates, create custom designs, and track who has opened or responded to your invitations.',
    firstAction: 'Go to "Create design" to start a new invitation. Use the toolbar to add text, images, and decorative elements. Or browse templates for a quicker start.',
    keyTerms: [
      { term: 'Design', definition: 'The visual layout of your invitation — colours, fonts, images, and arrangement of elements.' },
      { term: 'Access link', definition: 'A unique URL generated for each guest or household that gives them access to the guest portal.' },
      { term: 'Template', definition: 'A pre-made design that you can customise to match your wedding style.' },
    ],
    commonMistakes: [
      'Invitations are sent per household, not per guest — group guests into households first.',
      'Preview your design on mobile before sending — layouts can look different on phones.',
    ],
    relatedArticleSlugs: ['creating-invitations', 'tracking-responses'],
    relatedArticleTitles: ['Creating and designing invitations', 'Tracking invitation responses'],
  },
  schedule: {
    pageTitle: 'Schedule & Events',
    whatItDoes: 'Create and manage all your wedding events — ceremony, reception, welcome drinks, farewell brunch, and any other gatherings. Events appear on your guest portal itinerary.',
    firstAction: 'Click "Add event" and start with your ceremony. Set the date, time, venue, and a description for guests.',
    keyTerms: [
      { term: 'Event type', definition: 'Categories like ceremony, reception, welcome, evening, or day-after — helps organise your schedule.' },
      { term: 'Visibility', definition: 'Controls who sees the event — public (all guests), restricted (invited only), or hidden.' },
      { term: 'Reveal date', definition: 'An optional date before which the event is hidden from guests — useful for surprises.' },
    ],
    commonMistakes: [
      'Events need to be published before guests can see them on their itinerary.',
      'Set arrival offset times so guests know when to arrive before the event starts.',
    ],
    relatedArticleSlugs: ['managing-wedding-events', 'day-timeline-guide'],
    relatedArticleTitles: ['Managing wedding events', 'Using the wedding-day timeline'],
  },
  budget: {
    pageTitle: 'Budget',
    whatItDoes: 'Track your wedding spending across categories — venue, catering, photography, attire, and more. Set a planned budget, log expenses, and record payments.',
    firstAction: 'Start at "Set Budget" or "Categories" to define your spending categories with planned amounts. Then add expenses linked to each category.',
    keyTerms: [
      { term: 'Planned amount', definition: 'Your budget target for a category — what you intend to spend.' },
      { term: 'Committed', definition: 'Expenses you have agreed to or booked, whether paid or not.' },
      { term: 'Paid', definition: 'Money you have actually paid against your expenses.' },
    ],
    commonMistakes: [
      'Expenses must be linked to a budget category to appear in reports.',
      'Payments are separate from expenses — record both to get accurate tracking.',
    ],
    relatedArticleSlugs: ['setting-up-budget', 'supplier-management'],
    relatedArticleTitles: ['Setting up your wedding budget', 'Managing your suppliers'],
  },
  seating: {
    pageTitle: 'Seating',
    whatItDoes: 'Design your reception layout, place tables, and assign guests to seats. Generate table cards, place cards, and seating charts for your venue.',
    firstAction: 'Create a new seating plan, name it, and start adding tables. Then drag guests from the unassigned list onto tables.',
    keyTerms: [
      { term: 'Working plan', definition: 'Your active, editable seating layout.' },
      { term: 'Table capacity', definition: 'Maximum number of guests per table — set this when you add a table.' },
      { term: 'Seating assistant', definition: 'AI-powered tool that proposes seating arrangements based on your rules.' },
    ],
    commonMistakes: [
      'Only guests with "Attending" or "Pending" RSVP status are available for seating.',
      'Table cards and place cards are generated from your current plan — update them after changes.',
    ],
    relatedArticleSlugs: ['seating-plans'],
    relatedArticleTitles: ['Creating seating plans'],
  },
  gallery: {
    pageTitle: 'Gallery',
    whatItDoes: 'Manage your wedding photo gallery — approve guest uploads, organise photos into albums, configure the live wall for your reception, and moderate content.',
    firstAction: 'Go to the Moderation tab to review any pending uploads. Approve photos you want visible, then create albums to organise them.',
    keyTerms: [
      { term: 'Moderation', definition: 'Reviewing and approving or rejecting photos uploaded by guests before they appear publicly.' },
      { term: 'Live wall', definition: 'A real-time slideshow of approved photos, designed to be displayed at your reception.' },
      { term: 'Album audience', definition: 'Controls which guests can see a particular album.' },
    ],
    commonMistakes: [
      'Uploaded photos do not appear until you approve them in Moderation.',
      'The live wall only shows photos marked as wall-visible in addition to being approved.',
    ],
    relatedArticleSlugs: ['gallery-moderation', 'guest-portal-explained'],
    relatedArticleTitles: ['Managing the photo gallery', 'What guests see in the portal'],
  },
  tasks: {
    pageTitle: 'Tasks',
    whatItDoes: 'Your wedding to-do list — create, prioritise, and track tasks with due dates and assignees. Tasks also appear on your calendar and dashboard.',
    firstAction: 'Click "Add task" and give it a title, priority, and due date. High-priority tasks appear in the "Needs your attention" section on your dashboard.',
    keyTerms: [
      { term: 'Priority', definition: 'High, medium, or low — controls where the task appears and its visual prominence.' },
      { term: 'Assignee', definition: 'The collaborator responsible for completing the task.' },
    ],
    commonMistakes: [
      'Tasks without due dates will not appear in calendar or timeline views.',
      'Completed tasks remain visible but are filtered out of default views.',
    ],
    relatedArticleSlugs: ['dashboard-overview'],
    relatedArticleTitles: ['Understanding your dashboard'],
  },
  suppliers: {
    pageTitle: 'Suppliers / Vendors',
    whatItDoes: 'Keep all your vendor information organised — contact details, categories, quotes, documents, and appointment dates. Link suppliers to budget expenses for integrated tracking.',
    firstAction: 'Click "Add supplier" and enter the vendor name, category, and contact information. Add appointment dates and upload any contracts or quotes.',
    keyTerms: [
      { term: 'Supplier category', definition: 'The type of vendor — Photographer, Florist, Caterer, Venue, etc.' },
      { term: 'Appointment', definition: 'A meeting or check-in date with the supplier, which appears on your wedding calendar.' },
    ],
    commonMistakes: [
      'Linking a supplier to a budget expense creates an automatic connection between your vendor list and spending tracker.',
      'Supplier appointment dates only appear in the calendar if they have a valid date set.',
    ],
    relatedArticleSlugs: ['supplier-management', 'setting-up-budget'],
    relatedArticleTitles: ['Managing your suppliers', 'Setting up your wedding budget'],
  },
  calendar: {
    pageTitle: 'Calendar',
    whatItDoes: 'A unified view of all dated items — wedding events, tasks, supplier appointments, payment deadlines, and RSVP deadlines. Switch between month, week, and agenda views.',
    firstAction: 'Browse the month view to see what is coming up. Click any item to go to its source editor. Use the source filters to show or hide different types of entries.',
    keyTerms: [
      { term: 'Source filter', definition: 'Toggle which types of records appear — Events, Tasks, Supplier appointments, Payments, etc.' },
      { term: 'Agenda view', definition: 'A chronological list grouped by day, showing times and locations for each item.' },
      { term: 'Conflict', definition: 'An overlap or scheduling issue detected between two items.' },
    ],
    commonMistakes: [
      'The calendar aggregates existing records — items are created in their source sections, not directly in the calendar.',
      'Conflicts are advisory warnings, not blockers — they help you spot potential scheduling issues.',
    ],
    relatedArticleSlugs: ['managing-wedding-events', 'calendar-view'],
    relatedArticleTitles: ['Managing wedding events', 'Calendar view guide'],
  },
  timeline_page: {
    pageTitle: 'Day Timeline',
    whatItDoes: 'A detailed wedding-day operational run sheet — behind-the-scenes items like supplier arrivals, setup, hair & makeup, photography slots, and speeches. Separate from the guest-facing schedule.',
    firstAction: 'Click "Add timeline item" and start with the first activity of the day — typically hair and makeup or supplier arrival. Set the start time, category, and any linked supplier or event.',
    keyTerms: [
      { term: 'Visibility', definition: 'Controls who can see the item — Organiser only, Collaborators, Supplier, or Guest-safe.' },
      { term: 'Linked event', definition: 'Connect a timeline item to a wedding event from your schedule.' },
      { term: 'Run sheet', definition: 'The exported timeline document — a printable schedule for the wedding day.' },
    ],
    commonMistakes: [
      'Supplier-specific items should be marked with "Supplier" visibility so they are not included in guest exports.',
      'Timeline items are operational (behind-the-scenes), while schedule events are guest-facing — they serve different purposes.',
    ],
    relatedArticleSlugs: ['day-timeline-guide', 'managing-wedding-events'],
    relatedArticleTitles: ['Using the wedding-day timeline', 'Managing wedding events'],
  },
};