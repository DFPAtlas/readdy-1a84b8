// ── Help Centre articles — static typed content ──

export type HelpCategory =
  | 'getting-started'
  | 'guests'
  | 'invitations'
  | 'rsvp'
  | 'website'
  | 'schedule'
  | 'suppliers'
  | 'budget'
  | 'seating'
  | 'registry'
  | 'gallery'
  | 'guest-portal'
  | 'account'
  | 'privacy'
  | 'troubleshooting';

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategory;
  keywords: string[];
  content: string;
  relatedSlugs: string[];
  applicableRoles: string[];
  updatedDate: string;
  sortOrder: number;
}

export const HELP_CATEGORIES: { key: HelpCategory; label: string; icon: string; description: string }[] = [
  { key: 'getting-started', label: 'Getting started', icon: 'ri-rocket-line', description: 'First steps with Vowora and setting up your wedding' },
  { key: 'guests', label: 'Guests & households', icon: 'ri-group-line', description: 'Managing your guest list and contact details' },
  { key: 'invitations', label: 'Invitations', icon: 'ri-mail-send-line', description: 'Designing and sending wedding invitations' },
  { key: 'rsvp', label: 'RSVP', icon: 'ri-check-double-line', description: 'Tracking responses and managing meal choices' },
  { key: 'website', label: 'Wedding website', icon: 'ri-global-line', description: 'Building your public wedding website' },
  { key: 'schedule', label: 'Schedule & timeline', icon: 'ri-calendar-event-line', description: 'Planning your wedding day events' },
  { key: 'suppliers', label: 'Suppliers', icon: 'ri-contacts-book-line', description: 'Managing vendors and contacts' },
  { key: 'budget', label: 'Budget & payments', icon: 'ri-money-pound-circle-line', description: 'Tracking wedding spending' },
  { key: 'seating', label: 'Seating', icon: 'ri-layout-grid-line', description: 'Arranging tables and seating plans' },
  { key: 'registry', label: 'Registry & gifts', icon: 'ri-gift-line', description: 'Setting up gift lists and funds' },
  { key: 'gallery', label: 'Gallery', icon: 'ri-gallery-line', description: 'Photo management and live wall' },
  { key: 'guest-portal', label: 'Guest portal', icon: 'ri-user-line', description: 'What guests see and how they interact' },
  { key: 'account', label: 'Account & billing', icon: 'ri-settings-3-line', description: 'Managing your Vowora account and subscription' },
  { key: 'privacy', label: 'Privacy & security', icon: 'ri-shield-check-line', description: 'How we protect your wedding data' },
  { key: 'troubleshooting', label: 'Troubleshooting', icon: 'ri-tools-line', description: 'Common issues and how to resolve them' },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting Started ──
  {
    slug: 'welcome-to-vowora',
    title: 'Welcome to Vowora',
    summary: 'A quick overview of what Vowora can do for your wedding planning.',
    category: 'getting-started',
    keywords: ['introduction', 'overview', 'features', 'what is vowora', 'getting started'],
    content: `<p>Vowora is your all-in-one wedding planning workspace — bringing together your guest list, invitations, RSVP tracking, budget, seating plan, travel information, photo gallery, and wedding-day timeline in one beautiful place.</p>

<h3>What you can do with Vowora</h3>

<p><strong>Guest management:</strong> Build your guest list, organise households, add tags, and import or export guest data.</p>

<p><strong>Invitations:</strong> Design personalised wedding stationery, send digital invitations, and track who has opened them.</p>

<p><strong>RSVP tracking:</strong> Collect responses from guests including meal choices, dietary requirements, accessibility needs, plus-one confirmations, and custom questions.</p>

<p><strong>Wedding website:</strong> Build a public wedding page with your story, event details, travel information, and a gallery — all customisable to match your style.</p>

<p><strong>Budget & payments:</strong> Set your budget, track expenses, log payments, and manage supplier quotes.</p>

<p><strong>Seating planner:</strong> Design your reception layout, arrange tables, drag-and-drop guests, and generate table cards.</p>

<p><strong>Photo gallery:</strong> Create albums, moderate guest uploads, and display photos on a live wall during your wedding.</p>

<p><strong>Day-of timeline:</strong> Build a detailed wedding-day timeline, manage supplier arrivals, and export run sheets.</p>

<h3>Getting started</h3>
<p>From your dashboard, you will see a setup checklist that guides you through the key steps. Start with adding your wedding details, then work through the list at your own pace. Every section is accessible from the sidebar menu.</p>`,
    relatedSlugs: ['dashboard-overview', 'setup-checklist'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator', 'viewer'],
    updatedDate: '2026-08-01',
    sortOrder: 1,
  },
  {
    slug: 'dashboard-overview',
    title: 'Understanding your dashboard',
    summary: 'Navigate the planning hub — stats, tasks, alerts, and quick actions.',
    category: 'getting-started',
    keywords: ['dashboard', 'home', 'overview', 'stats', 'tasks', 'progress'],
    content: `<p>Your dashboard is the central hub of your Vowora workspace. It gives you an at-a-glance view of your wedding planning progress and quick access to the most important actions.</p>

<h3>What you will find on the dashboard</h3>

<p><strong>Wedding countdown:</strong> See how many days remain until your wedding day, along with the date and location.</p>

<p><strong>Stat cards:</strong> Quick overviews of your guest count, invitations, budget, and seating progress. Click any card to jump into that section.</p>

<p><strong>Needs your attention:</strong> Urgent items that need action — pending guest questions, overdue payments, photos awaiting moderation, and RSVP deadlines.</p>

<p><strong>Planning progress:</strong> A visual indicator of how much of your wedding setup is complete.</p>

<p><strong>Quick actions:</strong> One-click shortcuts to common tasks like adding a guest, opening your website, or creating an invitation design.</p>

<p><strong>Upcoming tasks:</strong> Your to-do list with priority labels and due dates. Tick items off directly from the dashboard.</p>

<p><strong>RSVP overview:</strong> See how many guests are attending, awaiting reply, or have declined.</p>

<p><strong>Share & preview:</strong> Copy your wedding website link, preview it, or view the guest portal as one of your guests would see it.</p>`,
    relatedSlugs: ['welcome-to-vowora', 'setup-checklist'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator', 'viewer'],
    updatedDate: '2026-08-01',
    sortOrder: 2,
  },
  {
    slug: 'setup-checklist',
    title: 'Setup checklist',
    summary: 'Complete your wedding setup with the guided checklist.',
    category: 'getting-started',
    keywords: ['setup', 'checklist', 'onboarding', 'getting started', 'steps'],
    content: `<p>The setup checklist helps you work through the essential steps to get your Vowora workspace ready. You will find it on the Getting Started page, accessible from the sidebar or the setup card on your dashboard.</p>

<h3>How the checklist works</h3>

<p>Each item checks against real data in your workspace — for example, the "Add your first guests" step is only marked complete when you have at least one active guest record. Steps are never marked complete just because you visited a page.</p>

<p>Steps are organised into categories:</p>
<ul>
  <li><strong>Essentials:</strong> Wedding details, date, ceremony event, guests, and RSVP configuration.</li>
  <li><strong>Guest experience:</strong> Invitations, travel information, and your wedding website.</li>
  <li><strong>Planning:</strong> Suppliers, budget, seating plan, registry, and gallery.</li>
  <li><strong>Sharing:</strong> Inviting collaborators, reviewing the guest portal, and publishing.</li>
</ul>

<h3>Can I skip steps?</h3>
<p>Yes. Only the essential steps are required. Optional steps like "Add suppliers" or "Start seating plan" can be completed at any time — or not at all. Skipping an optional step does not affect your overall progress.</p>

<p>Each step card shows an estimated effort label — Quick, Medium, or Detailed — so you know what to expect before starting.</p>`,
    relatedSlugs: ['welcome-to-vowora', 'dashboard-overview'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 3,
  },

  // ── Guests ──
  {
    slug: 'adding-guests',
    title: 'Adding and managing guests',
    summary: 'Create guest records, organise households, and manage contact details.',
    category: 'guests',
    keywords: ['add guest', 'guest list', 'households', 'import', 'tags'],
    content: `<p>Your guest list is the foundation of your wedding planning. Vowora lets you add guests individually, group them into households, and organise them with tags.</p>

<h3>Adding a guest</h3>
<p>Go to <strong>Guests &gt; All guests</strong> and click "Add guest." Fill in their name, contact details, dietary requirements, accessibility needs, and RSVP status. You can also link them to a household and assign tags.</p>

<h3>Households</h3>
<p>Households group guests who share an invitation — typically couples, families, or people living at the same address. Go to <strong>Guests &gt; Households</strong> to create and manage households. When you send an invitation to a household, all linked guests are included.</p>

<h3>Tags</h3>
<p>Use tags to categorise guests — for example, "Bride's family," "Groom's colleagues," or "Evening only." Tags help you filter your guest list and create targeted invitation audiences.</p>

<h3>Importing guests</h3>
<p>If you have an existing guest list in a spreadsheet, you can import it via <strong>Guests &gt; Import</strong>. The import tool handles CSV files and lets you map columns to Vowora fields.</p>`,
    relatedSlugs: ['households-explained', 'importing-guests'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 10,
  },
  {
    slug: 'households-explained',
    title: 'How households work',
    summary: 'Understanding guest households and why they matter for invitations.',
    category: 'guests',
    keywords: ['households', 'family', 'couples', 'group', 'invitation groups'],
    content: `<p>Households are how Vowora groups guests who receive a single invitation. A household can be a couple, a family with children, or anyone you want to invite together.</p>

<h3>Why use households?</h3>
<ul>
  <li>One invitation per household — no duplicate emails.</li>
  <li>RSVPs can be submitted for the whole household at once.</li>
  <li>Seating assignments can respect household groupings.</li>
  <li>Makes your guest list cleaner and more organised.</li>
</ul>

<h3>Creating a household</h3>
<p>Go to <strong>Guests &gt; Households</strong> and click "New household." Give it a name — usually the family surname — and add the primary contact details. You can then link individual guests to this household from their guest profile.</p>`,
    relatedSlugs: ['adding-guests', 'importing-guests'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 11,
  },

  // ── Invitations ──
  {
    slug: 'creating-invitations',
    title: 'Creating and designing invitations',
    summary: 'Design personalised digital wedding invitations from scratch or templates.',
    category: 'invitations',
    keywords: ['create invitation', 'design', 'templates', 'digital invites', 'stationery'],
    content: `<p>Vowora's invitation builder lets you create beautiful digital wedding invitations that match your style. You can start from a template or build one from scratch.</p>

<h3>Starting a new design</h3>
<p>Go to <strong>Invitations &gt; Create design</strong>. You will see a canvas where you can add text, images, and decorative elements. Use the toolbar on the left to add elements and the layers panel on the right to arrange them.</p>

<h3>Using templates</h3>
<p>Browse templates at <strong>Invitations &gt; Templates</strong>. Each template is a starting point that you can fully customise — change the colours, fonts, images, and layout to make it your own.</p>

<h3>Sending invitations</h3>
<p>Once your design is ready, go to the invitation detail page and use the Send panel to select recipients. You can send to individual guests or entire households. Invitations are delivered via email with a unique access link for each guest.</p>`,
    relatedSlugs: ['tracking-responses', 'templates'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 20,
  },
  {
    slug: 'tracking-responses',
    title: 'Tracking invitation responses',
    summary: 'Monitor who has opened, accepted, or declined your invitations.',
    category: 'invitations',
    keywords: ['track', 'responses', 'RSVP', 'opened', 'accepted', 'declined'],
    content: `<p>Vowora tracks every stage of your invitation journey — from sent to opened to responded.</p>

<h3>Response overview</h3>
<p>Go to <strong>Invitations &gt; Responses</strong> for a dashboard showing the status of every invitation. You will see who has accepted, who has declined, and who has not yet responded.</p>

<h3>Access links</h3>
<p>Each invitation generates a unique access link for the guest. You can view, copy, or revoke these links from the <strong>Invitation &gt; Access</strong> page. This gives you full control over who can access your guest portal.</p>

<h3>Reminders</h3>
<p>For guests who have not responded, you can send gentle reminders. The guest portal will also prompt guests to complete their RSVP when they log in.</p>`,
    relatedSlugs: ['creating-invitations', 'rsvp-flow'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 21,
  },

  // ── RSVP ──
  {
    slug: 'rsvp-flow',
    title: 'How RSVP works',
    summary: 'Understanding the guest RSVP process from invitation to confirmation.',
    category: 'rsvp',
    keywords: ['RSVP', 'response', 'guest', 'meal choices', 'plus one', 'confirmation'],
    content: `<p>When a guest clicks their invitation link, they enter the guest portal where they can complete their RSVP. The flow is designed to be smooth and encourage complete responses.</p>

<h3>What guests see</h3>
<p>Guests choose their attendance status (attending / unable to attend) for each event they are invited to — typically the ceremony, wedding breakfast, and evening reception. They then select meal choices, note dietary requirements, confirm plus-one details, and can leave a personal message.</p>

<h3>Meal choices</h3>
<p>You can configure meal options in your RSVP settings. Common choices include beef, fish, vegetarian, and children's meals. Guests with dietary requirements can note these separately.</p>

<h3>What you see</h3>
<p>All RSVP responses appear in your dashboard under <strong>Invitations &gt; Responses</strong>. You can see each guest's status, meal choice, dietary notes, accessibility requirements, and personal message. Changes made by guests after their initial submission are also tracked.</p>`,
    relatedSlugs: ['tracking-responses', 'guest-portal-explained'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator'],
    updatedDate: '2026-08-01',
    sortOrder: 30,
  },

  // ── Website ──
  {
    slug: 'wedding-website-builder',
    title: 'Building your wedding website',
    summary: 'Create a beautiful public wedding website with your story and event details.',
    category: 'website',
    keywords: ['website', 'public page', 'wedding site', 'story', 'photos'],
    content: `<p>Your wedding website is the public face of your wedding — a shareable page where guests can find event details, your story, travel information, and links to the guest portal.</p>

<h3>What to include</h3>
<ul>
  <li><strong>Your story:</strong> How you met, the proposal, and what you are looking forward to.</li>
  <li><strong>Event details:</strong> Dates, times, venues, and dress code for each event.</li>
  <li><strong>Travel information:</strong> Accommodation recommendations, transport options, and local guide.</li>
  <li><strong>Photo gallery:</strong> A curated selection of your favourite photos.</li>
  <li><strong>Registry links:</strong> Where guests can find your gift registry.</li>
</ul>

<h3>Publishing</h3>
<p>Your website can be a draft (only visible to you and collaborators) or live (visible to anyone with the link). You control this from the website builder page. You can also control whether search engines can index your page from <strong>Settings &gt; Privacy</strong>.</p>`,
    relatedSlugs: ['guest-portal-explained', 'privacy-settings'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 40,
  },

  // ── Schedule ──
  {
    slug: 'managing-wedding-events',
    title: 'Managing wedding events',
    summary: 'Create and manage your wedding ceremony, reception, and other events.',
    category: 'schedule',
    keywords: ['events', 'schedule', 'ceremony', 'reception', 'timeline', 'itinerary'],
    content: `<p>Your wedding schedule is where you define every event — from welcome drinks to farewell brunch. Events appear on your guest portal itinerary and in the wedding-day timeline.</p>

<h3>Creating events</h3>
<p>Go to <strong>Schedule &amp; Events</strong> and click "Add event." Fill in the event name, type (ceremony, reception, welcome, evening, day-after, or custom), date, start and end times, venue, and description. You can also specify dress code, guest descriptions, and arrival instructions.</p>

<h3>Event visibility</h3>
<p>Events can be public (visible to all guests), restricted (visible only to invited guests), or hidden. You can also set a reveal date — the event will only appear to guests after that date.</p>

<h3>Guest audience</h3>
<p>You can control which guests see which events. For example, the ceremony and reception are typically visible to everyone, while the evening celebration might only appear for evening guests.</p>

<h3>Wedding-day timeline</h3>
<p>For a more detailed operational timeline — including supplier arrivals, setup, photography slots, and speeches — use the <strong>Day Timeline</strong> tool. This is separate from the schedule and designed for behind-the-scenes coordination.</p>`,
    relatedSlugs: ['day-timeline-guide', 'calendar-view'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 50,
  },
  {
    slug: 'day-timeline-guide',
    title: 'Using the wedding-day timeline',
    summary: 'Build a detailed operational run sheet for the wedding day.',
    category: 'schedule',
    keywords: ['timeline', 'run sheet', 'day-of', 'supplier arrivals', 'schedule'],
    content: `<p>The <strong>Day Timeline</strong> is your operational run sheet — a detailed minute-by-minute plan for the wedding day. Unlike the guest-facing schedule, the timeline includes behind-the-scenes activities like supplier arrivals, setup, hair and makeup, and photography slots.</p>

<h3>Adding timeline items</h3>
<p>Each item can have a title, category, start time, end time (or duration), location, linked supplier, assigned collaborator, internal notes, and shared notes. Categories include ceremony actions, supplier arrivals, setup, photography, speeches, catering, and more.</p>

<h3>Visibility levels</h3>
<p>Items can be set to four visibility levels: Organiser only, Collaborators, Supplier, or Guest-safe. This lets you share appropriate versions with different people — for example, a supplier timeline that shows only their relevant items, or a guest itinerary that hides internal notes.</p>

<h3>Validation</h3>
<p>The timeline checks for common issues: overlapping items, gaps longer than 30 minutes, missing times, and private notes accidentally included in shareable items. Warnings appear in a panel so you can address them.</p>

<h3>Exporting</h3>
<p>You can export the timeline as an ICS calendar file, a PDF run sheet, or a CSV spreadsheet. Each export respects the selected visibility level.</p>`,
    relatedSlugs: ['managing-wedding-events', 'calendar-view'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 51,
  },

  // ── Budget ──
  {
    slug: 'setting-up-budget',
    title: 'Setting up your wedding budget',
    summary: 'Create budget categories, track expenses, and log payments.',
    category: 'budget',
    keywords: ['budget', 'spending', 'expenses', 'payments', 'categories', 'tracking'],
    content: `<p>Your wedding budget helps you plan spending across all categories — from venue and catering to flowers and photography. Vowora tracks your planned budget, committed expenses, and actual payments.</p>

<h3>Budget categories</h3>
<p>Start by setting up categories at <strong>Budget &gt; Categories</strong>. Common categories include Venue, Catering, Photography, Attire, Flowers, Music, Transport, and Stationery. Assign a planned amount to each category.</p>

<h3>Adding expenses</h3>
<p>Each expense is linked to a category and optionally a supplier. Enter the quoted or agreed amount, payment schedule, and status. Expenses can be active, booked, deposit paid, partially paid, or fully paid.</p>

<h3>Logging payments</h3>
<p>Record payments against expenses — including the amount, date, payment method, and any reference numbers. Vowora tracks what has been paid and what remains outstanding.</p>

<h3>Reports</h3>
<p>The <strong>Budget &gt; Reports</strong> page shows graphs of your spending by category, committed vs. planned comparisons, and payment timelines.</p>`,
    relatedSlugs: ['supplier-management', 'gift-funding'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 60,
  },

  // ── Suppliers ──
  {
    slug: 'supplier-management',
    title: 'Managing your suppliers',
    summary: 'Track vendor details, contacts, quotes, and appointments.',
    category: 'suppliers',
    keywords: ['suppliers', 'vendors', 'contacts', 'quotes', 'photographer', 'florist'],
    content: `<p>The suppliers section keeps all your vendor information in one place — contact details, quotes, documents, and appointment dates.</p>

<h3>Adding a supplier</h3>
<p>Go to <strong>Vendors</strong> (or Suppliers in demo mode) and click "Add supplier." Enter the supplier name, category, contact person, email, phone, website, and any notes. You can also upload contracts or other documents.</p>

<h3>Supplier categories</h3>
<p>Vowora supports common wedding supplier categories: Venue, Caterer, Photographer, Videographer, Florist, Baker, Musician/DJ, Hair &amp; Makeup, Transport, Stationer, and more. Categories help you filter and organise your suppliers.</p>

<h3>Linking to budget</h3>
<p>Suppliers can be linked to budget expenses — when you add an expense, select the supplier from your list. This creates a connection between your vendor management and spending tracking.</p>

<h3>Supplier appointments</h3>
<p>Record appointment dates with suppliers directly in their profile. These appointments appear on your wedding calendar alongside events and tasks.</p>`,
    relatedSlugs: ['setting-up-budget', 'calendar-view'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 70,
  },

  // ── Seating ──
  {
    slug: 'seating-plans',
    title: 'Creating seating plans',
    summary: 'Design your reception layout, arrange tables, and assign guests.',
    category: 'seating',
    keywords: ['seating', 'tables', 'floor plan', 'arrange', 'assign', 'place cards'],
    content: `<p>The seating planner lets you design your reception space, place tables, and assign guests to seats.</p>

<h3>Getting started</h3>
<p>Go to <strong>Seating</strong> and create a new plan. Name it, set the venue, and choose your layout. You will see a canvas where you can add tables, chairs, and other objects like the dance floor or bar.</p>

<h3>Arranging tables</h3>
<p>Add round or rectangular tables, name them, and set their capacity. You can drag tables to position them on the canvas. The left panel shows your unassigned guests.</p>

<h3>Assigning guests</h3>
<p>Drag guests from the unassigned list onto tables, or use the quick-assign panel. The seating plan respects household groupings — you can assign an entire household to a table at once.</p>

<h3>Assistant AI</h3>
<p>For larger weddings, the <strong>Seating Assistant</strong> can propose seating arrangements based on your rules — for example, keeping families together, separating certain groups, or placing specific guests near the top table.</p>

<h3>Exports</h3>
<p>Generate table cards, place cards, seating charts, and guest lists from your plan. These can be printed or shared with your venue.</p>`,
    relatedSlugs: ['adding-guests', 'exports-overview'],
    applicableRoles: ['owner', 'partner', 'planner'],
    updatedDate: '2026-08-01',
    sortOrder: 80,
  },

  // ── Gallery ──
  {
    slug: 'gallery-moderation',
    title: 'Managing the photo gallery',
    summary: 'Approve guest uploads, create albums, and run the live photo wall.',
    category: 'gallery',
    keywords: ['gallery', 'photos', 'upload', 'moderation', 'live wall', 'albums'],
    content: `<p>Vowora's gallery lets you collect photos from guests, curate albums, and display a live photo wall during your wedding.</p>

<h3>Guest uploads</h3>
<p>Guests can upload photos through the guest portal. You control whether uploads require approval before appearing in the gallery. Go to <strong>Gallery &gt; Settings</strong> to configure upload permissions and moderation rules.</p>

<h3>Moderation</h3>
<p>The <strong>Moderation</strong> tab shows all pending uploads. You can approve, reject, or flag photos. Approved photos appear in the gallery and, if enabled, on the live wall. You can also edit captions and assign photos to specific albums.</p>

<h3>Live wall</h3>
<p>The live wall displays approved photos in a real-time slideshow. It is designed to be shown on a screen at your reception — guests see their photos appearing throughout the evening. You can enable or disable the live wall from gallery settings.</p>

<h3>Albums</h3>
<p>Create albums to organise photos — for example, "Getting Ready," "Ceremony," "Speeches," and "Dancing." Albums can be shared with specific guest audiences.</p>`,
    relatedSlugs: ['guest-portal-explained', 'guest-uploads'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator'],
    updatedDate: '2026-08-01',
    sortOrder: 90,
  },

  // ── Guest Portal ──
  {
    slug: 'guest-portal-explained',
    title: 'What guests see in the portal',
    summary: 'A tour of the guest experience — itinerary, RSVP, gallery, and more.',
    category: 'guest-portal',
    keywords: ['guest portal', 'guest view', 'what guests see', 'guest experience'],
    content: `<p>The guest portal is what your invited guests see when they click their invitation link. It is a personalised experience showing only the information relevant to each guest.</p>

<h3>Portal sections</h3>
<ul>
  <li><strong>Home:</strong> Welcome message, wedding countdown, and quick links.</li>
  <li><strong>Itinerary:</strong> Events the guest is invited to, with times, venues, and descriptions.</li>
  <li><strong>RSVP:</strong> The RSVP form for the guest to complete or update.</li>
  <li><strong>Travel:</strong> Accommodation, transport, and local recommendations.</li>
  <li><strong>Updates:</strong> Messages and announcements from the couple.</li>
  <li><strong>Gallery:</strong> Shared photo albums and the ability to upload photos.</li>
  <li><strong>Registry:</strong> Gift list and contribution options.</li>
  <li><strong>Seating:</strong> Table lookup for the reception.</li>
  <li><strong>Questions:</strong> A way for guests to ask the couple questions.</li>
  <li><strong>Contacts:</strong> Key contact information for the wedding.</li>
</ul>

<h3>Previewing the portal</h3>
<p>You can preview the guest portal at any time using the "View as guest" button on your dashboard. This lets you experience exactly what your guests will see.</p>`,
    relatedSlugs: ['rsvp-flow', 'gallery-moderation'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator'],
    updatedDate: '2026-08-01',
    sortOrder: 100,
  },

  // ── Account ──
  {
    slug: 'collaborator-roles',
    title: 'Collaborators and permissions',
    summary: 'Understanding roles and what each collaborator can access.',
    category: 'account',
    keywords: ['collaborators', 'permissions', 'roles', 'partner', 'planner', 'viewer'],
    content: `<p>You can invite other people to help plan your wedding with different permission levels.</p>

<h3>Available roles</h3>
<ul>
  <li><strong>Owner:</strong> Full access to everything — all settings, billing, data management, and the ability to invite or remove others. This is the person who created the wedding workspace.</li>
  <li><strong>Partner / Co-owner:</strong> Same as owner, but cannot remove the owner or access billing. Ideal for your other half.</li>
  <li><strong>Planner:</strong> Can manage guests, invitations, RSVPs, schedule, suppliers, budget, seating, and gallery. Cannot access billing, settings, or delete the wedding.</li>
  <li><strong>Collaborator:</strong> Can view and edit most planning sections but cannot change settings, manage collaborators, or access billing.</li>
  <li><strong>Viewer:</strong> Read-only access — can see everything but cannot make changes. Useful for family members who want to follow along.</li>
</ul>

<h3>Inviting someone</h3>
<p>Go to <strong>Settings &gt; Collaborators</strong> and click "Invite collaborator." They will receive an email with a link to join your wedding workspace. You can change their role or remove them at any time.</p>`,
    relatedSlugs: ['privacy-settings', 'setup-checklist'],
    applicableRoles: ['owner', 'partner'],
    updatedDate: '2026-08-01',
    sortOrder: 110,
  },

  // ── Privacy ──
  {
    slug: 'privacy-settings',
    title: 'Privacy and data protection',
    summary: 'How Vowora protects your data and your privacy options.',
    category: 'privacy',
    keywords: ['privacy', 'data', 'security', 'GDPR', 'search engine', 'indexing'],
    content: `<p>Vowora takes your privacy seriously. All wedding data is stored securely and is only accessible to you and the collaborators you invite.</p>

<h3>Search engine visibility</h3>
<p>By default, your wedding website is not indexed by search engines. You can enable indexing from <strong>Settings &gt; Privacy</strong> if you want your page to appear in Google results. Even with indexing enabled, only public information (names, date, location) is visible — guest data, RSVPs, and private details are never exposed.</p>

<h3>Guest data</h3>
<p>Guest information — including contact details, dietary requirements, accessibility needs, and RSVP responses — is stored in your wedding workspace and is never shared with third parties. Guests can request access to or deletion of their data through the contact form.</p>

<h3>Data export and deletion</h3>
<p>You can export all your wedding data at any time from <strong>Settings &gt; Data</strong>. You can also request permanent deletion of your wedding workspace. Deletion requests include a 7-day cooling-off period before the data is permanently removed.</p>`,
    relatedSlugs: ['collaborator-roles', 'account-security'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator', 'viewer'],
    updatedDate: '2026-08-01',
    sortOrder: 120,
  },
  {
    slug: 'account-security',
    title: 'Account security',
    summary: 'Keeping your Vowora account secure.',
    category: 'privacy',
    keywords: ['security', 'password', 'two-factor', 'account', 'login'],
    content: `<p>Protecting your Vowora account is important. Here are some best practices and security features.</p>

<h3>Password security</h3>
<p>Use a strong, unique password for your Vowora account. You can change your password from the login page using the "Forgot password" link.</p>

<h3>Session management</h3>
<p>Your Vowora session is secured with Supabase authentication. Log out when using shared devices. Your session will time out automatically after a period of inactivity.</p>

<h3>Collaborator access</h3>
<p>Only invite people you trust as collaborators. You can remove any collaborator at any time from <strong>Settings &gt; Collaborators</strong>, which immediately revokes their access.</p>

<h3>Reporting issues</h3>
<p>If you notice anything suspicious or have a security concern, contact us immediately through the <strong>Contact</strong> page. Select "Privacy request" as the subject for data-related queries.</p>`,
    relatedSlugs: ['privacy-settings', 'collaborator-roles'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator', 'viewer'],
    updatedDate: '2026-08-01',
    sortOrder: 121,
  },

  // ── Troubleshooting ──
  {
    slug: 'common-issues',
    title: 'Common issues and solutions',
    summary: 'Troubleshooting tips for the most frequent questions.',
    category: 'troubleshooting',
    keywords: ['troubleshooting', 'help', 'issue', 'problem', 'fix', 'bug'],
    content: `<p>Here are solutions to the most common issues Vowora users encounter.</p>

<h3>Guest cannot see their RSVP form</h3>
<p>Check that the guest's invitation has been sent and their access link is active. Go to <strong>Invitations &gt; [Invitation] &gt; Access</strong> to verify the link status. If the link is revoked, you can generate a new one.</p>

<h3>Changes are not saving</h3>
<p>In demo mode, changes are saved to your browser's local storage. If you clear your browser data, demo changes will be lost. In production mode, ensure you have a stable internet connection — changes sync to Supabase.</p>

<h3>Photos are not appearing in the gallery</h3>
<p>Check the moderation queue at <strong>Gallery &gt; Moderation</strong>. Uploaded photos require approval before they appear in public albums. Also verify that the album's audience includes the guest who is viewing it.</p>

<h3>Seating plan is not showing guest counts correctly</h3>
<p>Only guests with "Attending" or "Pending" RSVP status are eligible for seating. Declined guests and archived guests are excluded. Check your guest list to ensure RSVP statuses are up to date.</p>

<h3>Need more help?</h3>
<p>If you cannot find the answer here, use the <strong>Contact</strong> form or reach out through the support link in the help panel on any page. We respond to all queries within one business day.</p>`,
    relatedSlugs: ['welcome-to-vowora', 'guest-portal-explained'],
    applicableRoles: ['owner', 'partner', 'planner', 'collaborator', 'viewer'],
    updatedDate: '2026-08-01',
    sortOrder: 130,
  },
];

export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function searchArticles(query: string): HelpArticle[] {
  const lowerQuery = query.toLowerCase().trim();
  if (lowerQuery.length < 2) return [];
  const terms = lowerQuery.split(/\s+/);
  return HELP_ARTICLES.filter((article) => {
    const searchText = `${article.title} ${article.summary} ${article.keywords.join(' ')} ${article.content}`.toLowerCase();
    return terms.every((term) => searchText.includes(term));
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryArticleCount(category: HelpCategory): number {
  return HELP_ARTICLES.filter((a) => a.category === category).length;
}