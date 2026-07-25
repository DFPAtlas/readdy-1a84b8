export const dashboardStats = {
  totalInvited: 146,
  attending: 98,
  awaitingReply: 21,
  unableToAttend: 12,
  planningProgress: 74,
  supplierPaymentsDue: 3,
  daysUntilWedding: 287,
};

export const coreFeatures = [
  {
    title: 'Wedding website',
    description: 'Share your story, schedule, venues, dress code, accommodation and everything guests need to know.',
    icon: 'ri-global-line',
  },
  {
    title: 'Guest management',
    description: 'Keep households, plus-ones, children, meal choices, dietary needs and attendance details organised.',
    icon: 'ri-group-line',
  },
  {
    title: 'Invitations &amp; RSVPs',
    description: 'Send personalised invitations and collect structured replies through secure guest links.',
    icon: 'ri-mail-send-line',
  },
  {
    title: 'Email updates',
    description: 'Send updates to everyone or target particular guest, hotel and travel groups.',
    icon: 'ri-notification-3-line',
  },
  {
    title: 'Planning workspace',
    description: 'Manage tasks, suppliers, documents, budget milestones and important deadlines.',
    icon: 'ri-calendar-check-line',
  },
  {
    title: 'Travel Concierge',
    description: 'Help guests find hotels, restaurants, transport and useful services around your wedding.',
    icon: 'ri-map-pin-line',
  },
];

export const guestJourneySteps = [
  { step: 1, title: 'Receive invitation', description: 'Guests receive a personal invitation link to their wedding page.' },
  { step: 2, title: 'Open personal wedding page', description: 'Each guest sees a personalised welcome with all the essential details.' },
  { step: 3, title: 'Confirm attendance', description: 'A simple RSVP form captures attendance, meal choices and dietary needs.' },
  { step: 4, title: 'Choose meals &amp; submit requirements', description: 'Guests select their preferred menu options and share any special requirements.' },
  { step: 5, title: 'Review travel &amp; accommodation', description: 'Browse approved hotels, restaurants and transport options on an interactive map.' },
  { step: 6, title: 'Receive important updates', description: 'The couple sends timely updates about schedules, venues and last-minute changes.' },
  { step: 7, title: 'Access wedding-day information', description: 'Everything guests need on the day — timings, locations, contacts and more.' },
];

export const travelCategories = [
  'Wedding venues',
  'Hotels &amp; guest houses',
  'Restaurants &amp; cafés',
  'Pubs &amp; bars',
  'Taxi services',
  'Parking',
  'Train &amp; bus stations',
  'Airports',
  'Pharmacies',
  'Supermarkets',
  'Attractions',
  'EV charging',
];

export const mapPreviewListings = [
  { name: 'The Orangery', category: 'Wedding venues', type: 'venue' },
  { name: 'The Grand Hotel', category: 'Hotels &amp; guest houses', type: 'hotel' },
  { name: 'Riverside Inn', category: 'Hotels &amp; guest houses', type: 'hotel' },
  { name: 'The Ivy Brasserie', category: 'Restaurants &amp; cafés', type: 'restaurant' },
  { name: 'The Old Post Office', category: 'Pubs &amp; bars', type: 'pub' },
  { name: 'Market Square Car Park', category: 'Parking', type: 'parking' },
  { name: 'Bath Spa Station', category: 'Train &amp; bus stations', type: 'station' },
];

export const approvalActions = [
  'Approve',
  'Hide',
  'Add personal note',
  'Mark as recommended',
  'Best for families',
  'Budget option',
  'Luxury option',
  'Add discount code',
  'Change display order',
];

export const collaborationRoles = [
  { role: 'Partner', description: 'Full access to planning, guests, budget and communications.' },
  { role: 'Wedding planner', description: 'Manage suppliers, tasks, seating and wedding-day coordination.' },
  { role: 'Family collaborator', description: 'Help with guest management and travel recommendations.' },
  { role: 'Wedding-day coordinator', description: 'Access to schedules, venue details and supplier contacts on the day.' },
];

export const testimonials = [
  {
    text: 'Wedora helped us keep track of everything without feeling overwhelmed. The guest management alone saved us countless hours of back-and-forth messages.',
    author: 'Early-access couple',
    theme: 'Less stress managing replies',
  },
  {
    text: 'Our guests loved having all the travel information in one place. The hotel recommendations and map made it so easy for everyone coming from out of town.',
    author: 'Early-access couple',
    theme: 'Guests found travel details easily',
  },
  {
    text: 'Having our wedding planner, parents and us all on the same platform meant nothing fell through the cracks. The collaboration features are genuinely useful.',
    author: 'Early-access couple',
    theme: 'Planner and couple stayed aligned',
  },
];

export const pricingPlans = [
  {
    name: 'Free',
    description: 'For couples starting their wedding journey.',
    features: [
      'Basic wedding page',
      'Up to 20 guests',
      'Simple RSVP collection',
      'Essential wedding details',
      'Wedora branding',
    ],
    highlighted: false,
  },
  {
    name: 'Essential',
    description: 'For couples who want more guest features.',
    features: [
      'Up to 80 guests',
      'Digital invitations',
      'Email updates',
      'Travel guide',
      'Custom sections',
      'Remove Wedora branding',
    ],
    highlighted: false,
  },
  {
    name: 'Complete',
    description: 'Everything you need to plan in detail.',
    features: [
      'Up to 200 guests',
      'Full guest management',
      'Planning tools',
      'Supplier management',
      'Budget tracker',
      'Seating planner',
      'Enhanced travel features',
      'Up to 3 collaborators',
    ],
    highlighted: true,
  },
  {
    name: 'Luxury',
    description: 'For couples who want the full experience.',
    features: [
      'Unlimited guests',
      'Premium designs',
      'Planner access',
      'Priority support',
      'Advanced communications',
      'Wedding-day tools',
      'Unlimited collaborators',
      'Custom domain',
    ],
    highlighted: false,
  },
];

export const weddingData = {
  partnerOneName: 'Emma',
  partnerTwoName: 'James',
  weddingTitle: 'Emma & James',
  weddingDate: '2027-04-24',
  dateConfirmed: true,
  timezone: 'Europe/London',
  status: 'planning',
  slug: 'emma-and-james',
  welcomeMessage: 'We are so excited to celebrate our special day with you. Please find all the details you need here, and do not hesitate to reach out if you have any questions.',
  dressCode: 'Formal — black tie optional',
  contactInformation: 'For any questions, please contact our wedding coordinator at hello@emmaandjames.wedding',
  parkingNotes: 'Complimentary valet parking is available at the venue. Additional parking is available at Market Square Car Park, a 5-minute walk from the Orangery.',
  accessibilityNotes: 'Both the ceremony and reception venues are fully wheelchair accessible. Please let us know if you require any additional assistance.',
  childrenPolicy: 'We love your little ones, but we have decided to keep our wedding an adults-only celebration. We hope you understand and can still join us.',
  plusOnePolicy: 'Please refer to your invitation for plus-one details.',
  venues: [
    {
      venueType: 'ceremony',
      name: 'St Mary\'s Church',
      addressLine1: 'Church Street',
      city: 'Bath',
      countyOrRegion: 'Somerset',
      postcode: 'BA1 1EE',
      country: 'United Kingdom',
    },
    {
      venueType: 'reception',
      name: 'The Orangery',
      addressLine1: 'Royal Crescent',
      city: 'Bath',
      countyOrRegion: 'Somerset',
      postcode: 'BA1 2LS',
      country: 'United Kingdom',
    },
  ],
};

export const guestPageConfig = {
  published: true,
  publicUrl: '/w/emma-and-james',
  fullUrl: 'https://wedora.app/w/emma-and-james',
};

export const weddingSchedule = [
  { time: '13:30', title: 'Guest arrival', description: 'Guests arrive at St Mary\'s Church and are shown to their seats.', icon: 'ri-door-open-line' },
  { time: '14:00', title: 'Ceremony', description: 'The wedding ceremony begins with the bridal party procession.', icon: 'ri-hearts-line' },
  { time: '14:45', title: 'Confetti & photos', description: 'Confetti moment outside the church followed by group photographs.', icon: 'ri-camera-line' },
  { time: '15:30', title: 'Drinks reception', description: 'Guests arrive at The Orangery for champagne and canapés on the terrace.', icon: 'ri-goblet-line' },
  { time: '17:00', title: 'Wedding breakfast', description: 'A three-course meal in the Grand Ballroom with speeches between courses.', icon: 'ri-restaurant-line' },
  { time: '19:30', title: 'First dance', description: 'Emma & James take to the floor for their first dance as a married couple.', icon: 'ri-music-line' },
  { time: '20:00', title: 'Evening reception', description: 'The evening party begins — dancing, live band, and late-night snacks.', icon: 'ri-moon-line' },
  { time: '00:00', title: 'Carriages', description: 'The celebration draws to a close. Taxis available from the main entrance.', icon: 'ri-car-line' },
];

export const mealOptions = [
  { id: 'beef', label: 'Slow-braised Hereford beef', description: 'Served with truffle mash, roasted root vegetables and a red wine jus.' },
  { id: 'salmon', label: 'Herb-crusted Loch Duart salmon', description: 'With sautéed samphire, lemon butter sauce and new potatoes.' },
  { id: 'vegetarian', label: 'Wild mushroom & spinach wellington', description: 'Puff pastry parcel with roasted butternut squash and a sage cream sauce.' },
];

export const guestList = [
  {
    id: 'g1',
    fullName: 'Sarah & Tom Mitchell',
    email: 'sarah.mitchell@example.com',
    group: 'Family',
    rsvpStatus: 'pending',
    plusOneAllowed: false,
    plusOneName: '',
    mealChoice: '',
    dietaryRequirements: '',
    accessibilityNeeds: '',
  },
  {
    id: 'g2',
    fullName: 'Oliver Bennett',
    email: 'oliver.bennett@example.com',
    group: 'University friends',
    rsvpStatus: 'accepted',
    plusOneAllowed: true,
    plusOneName: 'Charlotte Hayes',
    mealChoice: 'beef',
    dietaryRequirements: '',
    accessibilityNeeds: '',
  },
  {
    id: 'g3',
    fullName: 'Lucy & David Chen',
    email: 'lucy.chen@example.com',
    group: 'Work colleagues',
    rsvpStatus: 'accepted',
    plusOneAllowed: false,
    plusOneName: '',
    mealChoice: 'salmon',
    dietaryRequirements: 'David has a mild nut allergy — please avoid walnuts and pecans.',
    accessibilityNeeds: '',
  },
  {
    id: 'g4',
    fullName: 'Margaret & Robert Hughes',
    email: 'margaret.hughes@example.com',
    group: 'Family',
    rsvpStatus: 'declined',
    plusOneAllowed: false,
    plusOneName: '',
    mealChoice: '',
    dietaryRequirements: '',
    accessibilityNeeds: '',
  },
  {
    id: 'g5',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    group: 'University friends',
    rsvpStatus: 'accepted',
    plusOneAllowed: true,
    plusOneName: '',
    mealChoice: 'vegetarian',
    dietaryRequirements: 'Vegetarian — no meat or fish. Lactose intolerant so please avoid cream-based sauces.',
    accessibilityNeeds: '',
  },
  {
    id: 'g6',
    fullName: 'Uncle George & Aunt Helen',
    email: 'george.helen@example.com',
    group: 'Family',
    rsvpStatus: 'pending',
    plusOneAllowed: false,
    plusOneName: '',
    mealChoice: '',
    dietaryRequirements: '',
    accessibilityNeeds: 'Aunt Helen uses a wheelchair — please ensure ground-floor seating at the reception.',
  },
];

export const weddingElements = {
  flowers: {
    florist: 'Blooms of Bath',
    bouquetStyle: 'Hand-tied garden-style bouquet',
    flowerTypes: 'White peonies, blush garden roses, eucalyptus, and baby\'s breath',
    colorPalette: 'Blush, ivory, sage green',
    decorNotes: 'Ceremony arch with trailing greenery, aisle petals, table centrepieces in gold mercury glass vases',
  },
  rings: {
    brideRing: 'Platinum diamond eternity band',
    groomRing: 'Brushed platinum classic band',
    jeweler: 'Hamilton & Sons Jewellers, London',
    notes: 'Rings engraved with wedding date on the inside',
  },
  food: {
    caterer: 'The Orangery in-house catering',
    menuStyle: 'Three-course plated dinner',
    starter: 'Seared scallops with pea purée and crispy pancetta',
    mainOptions: 'Choice of slow-braised beef, herb-crusted salmon, or wild mushroom wellington',
    dessert: 'Trio of desserts: chocolate fondant, lemon tart, and berry pavlova',
    eveningFood: 'Gourmet pizza station and mini sliders from 9pm',
    cake: 'Three-tier white chocolate and raspberry cake by Sweet Layers Bakery',
    drinksPackage: 'Champagne reception, wine pairing with dinner, open bar from 8pm',
    dietaryAccommodations: 'Vegetarian, vegan, gluten-free, and nut-free options available on request',
  },
  brideAttire: {
    designer: 'Savannah Miller',
    boutique: 'The White Gallery, Bath',
    dressStyle: 'A-line silk crepe with lace bodice and chapel-length train',
    veil: 'Cathedral-length ivory tulle veil with lace edging',
    shoes: 'Jimmy Choo — ivory satin pumps',
    accessories: 'Pearl drop earrings (family heirloom), diamond tennis bracelet',
    hairAndMakeup: 'Elegant low chignon with fresh flowers, natural glam makeup — Bridal Beauty Co.',
  },
  bridesmaidsAttire: {
    count: 4,
    designer: 'Reformation',
    dressStyle: 'Floor-length sage green chiffon with cowl neck',
    shoes: 'Nude strappy sandals — each bridesmaid chooses their own',
    accessories: 'Gold pendant necklaces (gift from the bride)',
    hairAndMakeup: 'Soft waves, natural makeup — Bridal Beauty Co.',
  },
  groomAttire: {
    tailor: 'Savile Row Bespoke, London',
    suitStyle: 'Navy blue three-piece wool suit, single-breasted',
    shirt: 'White cotton formal shirt with French cuffs',
    tie: 'Blush silk tie to match colour palette',
    shoes: 'Crockett & Jones — black Oxford shoes',
    accessories: 'Silver cufflinks (engraved), pocket watch (grandfather\'s)',
  },
  groomsmenAttire: {
    count: 4,
    suitStyle: 'Navy blue two-piece suits matching the groom',
    tie: 'Sage green silk ties',
    shoes: 'Own black Oxford shoes',
    accessories: 'Silver cufflinks (gift from the groom)',
  },
};

export const coupleUpdates = [
  {
    id: 'u1',
    date: '2027-01-10',
    title: 'Save the date!',
    content: 'We are thrilled to announce our wedding will take place on 24 April 2027. Formal invitations will follow in the coming weeks. Please mark your calendars — we cannot wait to celebrate with you!',
  },
  {
    id: 'u2',
    date: '2027-02-18',
    title: 'Invitations have been sent',
    content: 'All invitations have now been sent. Please check your email for your personal link to RSVP. The deadline for responses is 24 March 2027 — we would be grateful if you could reply by then.',
  },
  {
    id: 'u3',
    date: '2027-03-05',
    title: 'Hotel block now available',
    content: 'We have reserved a block of rooms at The Grand Hotel and Riverside Inn at preferential rates. Visit the Travel section of your guest page for booking details. Rooms are held until 24 March, so book early to avoid disappointment.',
  },
];