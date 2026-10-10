// ── Wedding Website Builder Types ──

export type WebsiteSectionType =
  | 'hero'
  | 'welcome'
  | 'story'
  | 'schedule'
  | 'venue'
  | 'travel'
  | 'accommodation'
  | 'dress_code'
  | 'wedding_party'
  | 'registry'
  | 'gallery'
  | 'faqs'
  | 'contact'
  | 'rsvp'
  | 'custom_text';

export interface WebsiteSection {
  id: string;
  type: WebsiteSectionType;
  label: string;
  visible: boolean;
  sort_order: number;
  config: Record<string, unknown>;
}

export interface HeroSectionConfig extends Record<string, unknown> {
  title: string;
  subtitle: string;
  image_url: string | null;
  image_focal_point: string;
  overlay_strength: number;
  text_alignment: 'left' | 'center' | 'right';
  primary_button_label: string;
  primary_button_dest: string;
  secondary_button_label: string;
  secondary_button_dest: string;
  show_countdown: boolean;
}

export interface WelcomeSectionConfig extends Record<string, unknown> {
  heading: string;
  body: string;
  image_url: string | null;
  image_position: 'left' | 'right' | 'top' | 'none';
  text_alignment: 'left' | 'center';
}

export interface StorySectionConfig extends Record<string, unknown> {
  heading: string;
  body: string;
  image_url: string | null;
  image_position: 'left' | 'right' | 'top' | 'none';
  text_alignment: 'left' | 'center';
}

export interface ScheduleSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  show_date: boolean;
  show_times: boolean;
  show_venues: boolean;
  show_dress_code: boolean;
  show_arrival_notes: boolean;
  show_transport_notes: boolean;
  layout: 'timeline' | 'cards' | 'compact';
}

export interface VenueSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  show_full_address: boolean;
  show_map: boolean;
  show_directions: boolean;
  show_parking: boolean;
  show_accessibility: boolean;
  show_contact: boolean;
}

export interface TravelSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  show_hotels: boolean;
  show_transport: boolean;
  show_parking: boolean;
  show_taxi: boolean;
  show_attractions: boolean;
  show_map_links: boolean;
}

export interface AccommodationSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  max_items: number;
}

export interface DressCodeSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  show_children_notes: boolean;
}

export interface WeddingPartyProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string | null;
  sort_order: number;
  visible: boolean;
}

export interface WeddingPartySectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  profiles: WeddingPartyProfile[];
}

export interface RegistrySectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  show_gifts: boolean;
  show_funds: boolean;
  show_charities: boolean;
  show_external: boolean;
  show_contribution_guidance: boolean;
}

export interface GallerySectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  layout: 'grid' | 'masonry' | 'carousel';
  max_items: number;
  show_upload_invitation: boolean;
  show_live_wall_link: boolean;
}

export interface FaqsSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  category_filter: string;
  show_search: boolean;
  expand_first: boolean;
  max_questions: number;
}

export interface ContactSectionConfig extends Record<string, unknown> {
  heading: string;
  support_message: string;
  show_question_link: boolean;
  show_organiser_contact: boolean;
  allowed_methods: string[];
}

export interface RsvpSectionConfig extends Record<string, unknown> {
  heading: string;
  introduction: string;
  button_label: string;
  show_deadline: boolean;
  show_update_message: boolean;
  closed_text: string;
}

export interface CustomTextSectionConfig extends Record<string, unknown> {
  internal_name: string;
  public_heading: string;
  body: string;
  image_url: string | null;
  button_label: string;
  button_url: string;
  background_style: 'none' | 'light' | 'dark' | 'accent';
}

export interface ThemeConfig extends Record<string, unknown> {
  preset: string;
  heading_font: string;
  body_font: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  button_style: 'rounded' | 'pill' | 'square';
  card_style: 'flat' | 'outlined' | 'elevated';
  border_radius: number;
  section_spacing: 'compact' | 'normal' | 'spacious';
  content_width: 'narrow' | 'normal' | 'wide';
}

export interface NavigationConfig extends Record<string, unknown> {
  show_top_nav: boolean;
  sticky: boolean;
  show_initials: boolean;
  mobile_menu_style: 'slide' | 'dropdown';
  links: NavLink[];
}

export interface NavLink {
  id: string;
  section_id: string;
  label: string;
  type: 'section' | 'external';
  url: string;
  sort_order: number;
}

export interface SeoConfig extends Record<string, unknown> {
  search_indexing: boolean;
  seo_title: string;
  meta_description: string;
  social_title: string;
  social_description: string;
  social_image_url: string | null;
  social_image_alt: string;
  favicon_url: string | null;
  show_wedding_date_in_meta: boolean;
  show_location_in_meta: boolean;
  canonical_domain: string | null;
}

export interface WebsiteConfig extends Record<string, unknown> {
  id: string;
  wedding_id: string;
  status: 'draft' | 'published' | 'unpublished';
  slug: string | null;
  theme_config: ThemeConfig;
  navigation_config: NavigationConfig;
  sections_config: WebsiteSection[];
  seo_config: SeoConfig;
  published_config: WebsiteConfig | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Builder UI Types ──

export type BuilderTab = 'settings' | 'pages' | 'design' | 'navigation' | 'domain' | 'seo';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

export type PublishStatus = 'draft' | 'published' | 'publishing' | 'error';

// ── Design Presets ──

export interface DesignPreset {
  key: string;
  label: string;
  theme: Partial<ThemeConfig>;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    key: 'classic',
    label: 'Classic',
    theme: {
      heading_font: 'Playfair Display',
      body_font: 'Lora',
      primary_color: '#2d2d2d',
      secondary_color: '#5a5a5a',
      accent_color: '#b8860b',
      background_color: '#fafaf8',
      text_color: '#1a1a1a',
      button_style: 'rounded',
      card_style: 'outlined',
      border_radius: 8,
      section_spacing: 'normal',
      content_width: 'normal',
    },
  },
  {
    key: 'botanical',
    label: 'Botanical',
    theme: {
      heading_font: 'Cormorant Garamond',
      body_font: 'Nunito Sans',
      primary_color: '#2d4a22',
      secondary_color: '#4a6741',
      accent_color: '#8b9a70',
      background_color: '#f5f7f0',
      text_color: '#1a2416',
      button_style: 'pill',
      card_style: 'flat',
      border_radius: 12,
      section_spacing: 'spacious',
      content_width: 'wide',
    },
  },
  {
    key: 'editorial',
    label: 'Editorial',
    theme: {
      heading_font: 'Playfair Display',
      body_font: 'Inter',
      primary_color: '#111111',
      secondary_color: '#333333',
      accent_color: '#c4a265',
      background_color: '#ffffff',
      text_color: '#111111',
      button_style: 'square',
      card_style: 'outlined',
      border_radius: 0,
      section_spacing: 'spacious',
      content_width: 'narrow',
    },
  },
  {
    key: 'modern',
    label: 'Modern',
    theme: {
      heading_font: 'DM Serif Display',
      body_font: 'DM Sans',
      primary_color: '#1e1e1e',
      secondary_color: '#4a4a4a',
      accent_color: '#e07a5f',
      background_color: '#fefefe',
      text_color: '#1e1e1e',
      button_style: 'rounded',
      card_style: 'flat',
      border_radius: 16,
      section_spacing: 'normal',
      content_width: 'normal',
    },
  },
  {
    key: 'romantic',
    label: 'Romantic',
    theme: {
      heading_font: 'Cormorant Garamond',
      body_font: 'Lora',
      primary_color: '#5c2a3e',
      secondary_color: '#8b5e6b',
      accent_color: '#d4a5a5',
      background_color: '#fdfaf6',
      text_color: '#3d1f2a',
      button_style: 'pill',
      card_style: 'outlined',
      border_radius: 12,
      section_spacing: 'spacious',
      content_width: 'normal',
    },
  },
  {
    key: 'minimal',
    label: 'Minimal',
    theme: {
      heading_font: 'Inter',
      body_font: 'Inter',
      primary_color: '#0a0a0a',
      secondary_color: '#666666',
      accent_color: '#999999',
      background_color: '#ffffff',
      text_color: '#0a0a0a',
      button_style: 'square',
      card_style: 'flat',
      border_radius: 4,
      section_spacing: 'compact',
      content_width: 'narrow',
    },
  },
];

// ── Default configs ──

export function defaultThemeConfig(): ThemeConfig {
  return {
    preset: 'classic',
    heading_font: 'Playfair Display',
    body_font: 'Lora',
    primary_color: '#2d2d2d',
    secondary_color: '#5a5a5a',
    accent_color: '#b8860b',
    background_color: '#fafaf8',
    text_color: '#1a1a1a',
    button_style: 'rounded',
    card_style: 'outlined',
    border_radius: 8,
    section_spacing: 'normal',
    content_width: 'normal',
  };
}

export function defaultNavigationConfig(): NavigationConfig {
  return {
    show_top_nav: true,
    sticky: true,
    show_initials: true,
    mobile_menu_style: 'slide',
    links: [],
  };
}

export function defaultSeoConfig(): SeoConfig {
  return {
    search_indexing: false,
    seo_title: '',
    meta_description: '',
    social_title: '',
    social_description: '',
    social_image_url: null,
    social_image_alt: '',
    favicon_url: null,
    show_wedding_date_in_meta: true,
    show_location_in_meta: true,
    canonical_domain: null,
  };
}

export function defaultSectionsConfig(): WebsiteSection[] {
  return [
    { id: 'sec-hero', type: 'hero', label: 'Hero', visible: true, sort_order: 0, config: defaultHeroConfig() },
    { id: 'sec-welcome', type: 'welcome', label: 'Welcome', visible: true, sort_order: 1, config: defaultWelcomeConfig() },
    { id: 'sec-story', type: 'story', label: 'Our Story', visible: true, sort_order: 2, config: defaultStoryConfig() },
    { id: 'sec-schedule', type: 'schedule', label: 'Schedule', visible: true, sort_order: 3, config: defaultScheduleConfig() },
    { id: 'sec-venue', type: 'venue', label: 'Venue', visible: true, sort_order: 4, config: defaultVenueConfig() },
    { id: 'sec-travel', type: 'travel', label: 'Travel', visible: true, sort_order: 5, config: defaultTravelConfig() },
    { id: 'sec-accommodation', type: 'accommodation', label: 'Accommodation', visible: true, sort_order: 6, config: defaultAccommodationConfig() },
    { id: 'sec-dress-code', type: 'dress_code', label: 'Dress Code', visible: true, sort_order: 7, config: defaultDressCodeConfig() },
    { id: 'sec-wedding-party', type: 'wedding_party', label: 'Wedding Party', visible: true, sort_order: 8, config: defaultWeddingPartyConfig() },
    { id: 'sec-registry', type: 'registry', label: 'Registry', visible: true, sort_order: 9, config: defaultRegistryConfig() },
    { id: 'sec-gallery', type: 'gallery', label: 'Gallery', visible: true, sort_order: 10, config: defaultGalleryConfig() },
    { id: 'sec-faqs', type: 'faqs', label: 'FAQs', visible: true, sort_order: 11, config: defaultFaqsConfig() },
    { id: 'sec-contact', type: 'contact', label: 'Contact', visible: true, sort_order: 12, config: defaultContactConfig() },
    { id: 'sec-rsvp', type: 'rsvp', label: 'RSVP', visible: true, sort_order: 13, config: defaultRsvpConfig() },
  ];
}

export function defaultHeroConfig(): HeroSectionConfig {
  return {
    title: '',
    subtitle: '',
    image_url: null,
    image_focal_point: 'center',
    overlay_strength: 40,
    text_alignment: 'center',
    primary_button_label: 'View Details',
    primary_button_dest: '#schedule',
    secondary_button_label: 'RSVP',
    secondary_button_dest: '#rsvp',
    show_countdown: true,
  };
}

export function defaultWelcomeConfig(): WelcomeSectionConfig {
  return {
    heading: 'Welcome',
    body: 'We are so excited to celebrate our special day with you.',
    image_url: null,
    image_position: 'none',
    text_alignment: 'center',
  };
}

export function defaultStoryConfig(): StorySectionConfig {
  return {
    heading: 'Our Story',
    body: '',
    image_url: null,
    image_position: 'right',
    text_alignment: 'left',
  };
}

export function defaultScheduleConfig(): ScheduleSectionConfig {
  return {
    heading: 'Schedule',
    introduction: '',
    show_date: true,
    show_times: true,
    show_venues: true,
    show_dress_code: true,
    show_arrival_notes: false,
    show_transport_notes: false,
    layout: 'timeline',
  };
}

export function defaultVenueConfig(): VenueSectionConfig {
  return {
    heading: 'Venue',
    introduction: '',
    show_full_address: true,
    show_map: true,
    show_directions: true,
    show_parking: true,
    show_accessibility: true,
    show_contact: false,
  };
}

export function defaultTravelConfig(): TravelSectionConfig {
  return {
    heading: 'Travel & Transport',
    introduction: '',
    show_hotels: true,
    show_transport: true,
    show_parking: true,
    show_taxi: true,
    show_attractions: false,
    show_map_links: true,
  };
}

export function defaultAccommodationConfig(): AccommodationSectionConfig {
  return {
    heading: 'Accommodation',
    introduction: '',
    max_items: 6,
  };
}

export function defaultDressCodeConfig(): DressCodeSectionConfig {
  return {
    heading: 'Dress Code',
    introduction: '',
    show_children_notes: false,
  };
}

export function defaultWeddingPartyConfig(): WeddingPartySectionConfig {
  return {
    heading: 'Wedding Party',
    introduction: '',
    profiles: [],
  };
}

export function defaultRegistryConfig(): RegistrySectionConfig {
  return {
    heading: 'Gift Registry',
    introduction: '',
    show_gifts: true,
    show_funds: true,
    show_charities: true,
    show_external: false,
    show_contribution_guidance: false,
  };
}

export function defaultGalleryConfig(): GallerySectionConfig {
  return {
    heading: 'Gallery',
    introduction: '',
    layout: 'grid',
    max_items: 12,
    show_upload_invitation: true,
    show_live_wall_link: false,
  };
}

export function defaultFaqsConfig(): FaqsSectionConfig {
  return {
    heading: 'Frequently Asked Questions',
    introduction: '',
    category_filter: 'all',
    show_search: false,
    expand_first: false,
    max_questions: 10,
  };
}

export function defaultContactConfig(): ContactSectionConfig {
  return {
    heading: 'Get in Touch',
    support_message: 'If you have any questions, feel free to reach out.',
    show_question_link: true,
    show_organiser_contact: false,
    allowed_methods: [],
  };
}

export function defaultRsvpConfig(): RsvpSectionConfig {
  return {
    heading: 'RSVP',
    introduction: 'We would love for you to join us on our special day.',
    button_label: 'Respond Now',
    show_deadline: true,
    show_update_message: true,
    closed_text: 'RSVPs are now closed. Please contact us directly with any questions.',
  };
}

export const FONT_OPTIONS = [
  'Playfair Display',
  'Cormorant Garamond',
  'DM Serif Display',
  'Lora',
  'Inter',
  'DM Sans',
  'Nunito Sans',
  'Source Serif 4',
  'Crimson Text',
  'Merriweather',
];

export const SECTION_LABELS: Record<WebsiteSectionType, string> = {
  hero: 'Hero',
  welcome: 'Welcome',
  story: 'Our Story',
  schedule: 'Schedule',
  venue: 'Venue',
  travel: 'Travel',
  accommodation: 'Accommodation',
  dress_code: 'Dress Code',
  wedding_party: 'Wedding Party',
  registry: 'Registry',
  gallery: 'Gallery',
  faqs: 'FAQs',
  contact: 'Contact',
  rsvp: 'RSVP',
  custom_text: 'Custom Text',
};

export const SECTION_ICONS: Record<WebsiteSectionType, string> = {
  hero: 'ri-image-line',
  welcome: 'ri-hand-heart-line',
  story: 'ri-book-open-line',
  schedule: 'ri-calendar-event-line',
  venue: 'ri-building-line',
  travel: 'ri-road-map-line',
  accommodation: 'ri-hotel-line',
  dress_code: 'ri-t-shirt-line',
  wedding_party: 'ri-group-line',
  registry: 'ri-gift-line',
  gallery: 'ri-gallery-line',
  faqs: 'ri-question-line',
  contact: 'ri-mail-line',
  rsvp: 'ri-check-double-line',
  custom_text: 'ri-text',
};