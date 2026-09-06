// ── Demo Website Builder Data ──

import type {
  WebsiteConfig,
  ThemeConfig,
  NavigationConfig,
  SeoConfig,
  WebsiteSection,
} from '@/types/website';
import { defaultSectionsConfig, defaultNavigationConfig, DESIGN_PRESETS } from '@/types/website';
import { DEMO_CONFIG } from '@/demo/demoConfig';

const WEDDING_ID = DEMO_CONFIG.weddingId;

export function createDemoWebsiteSections(): WebsiteSection[] {
  const sections = defaultSectionsConfig();
  // Customize some sections for the demo
  const heroSection = sections.find((s) => s.type === 'hero');
  if (heroSection) {
    heroSection.config = {
      title: 'Emma & James',
      subtitle: 'Celebrating our love with family and friends',
      image_url: 'https://readdy.ai/api/search-image?query=Elegant%20wedding%20venue%20with%20soft%20floral%20arrangements%20in%20cream%20and%20blush%20tones%2C%20romantic%20candlelight%2C%20garden%20setting%20with%20twinkling%20fairy%20lights%2C%20artistic%20photography%20style%20with%20warm%20golden%20hour%20light%2C%20dreamy%20atmospheric%20composition&width=1600&height=900&seq=wedding-website-hero-demo&orientation=landscape',
      image_focal_point: 'center',
      overlay_strength: 40,
      text_alignment: 'center',
      primary_button_label: 'View Schedule',
      primary_button_dest: '#schedule',
      secondary_button_label: 'RSVP',
      secondary_button_dest: '#rsvp',
      show_countdown: true,
    };
  }

  const welcomeSection = sections.find((s) => s.type === 'welcome');
  if (welcomeSection) {
    welcomeSection.config = {
      heading: 'Welcome to Our Wedding',
      body: 'We are so excited to share this special day with you. This website has everything you need to know about our wedding celebration. Take a look around and let us know if you have any questions!',
      image_url: null,
      image_position: 'none',
      text_alignment: 'center',
    };
  }

  const storySection = sections.find((s) => s.type === 'story');
  if (storySection) {
    storySection.config = {
      heading: 'How We Met',
      body: 'It all started on a rainy Tuesday in March 2022. Emma had just spilled coffee on her favourite blouse, and James happened to have a spare napkin and a terrible joke about the weather. That terrible joke led to a conversation, which led to dinner, which led to three years of adventure, laughter, and love.\n\nWe have travelled together, cooked together, and built a life together. Now we are ready for our biggest adventure yet — marriage.',
      image_url: 'https://readdy.ai/api/search-image?query=Romantic%20couple%20walking%20through%20sunlit%20garden%20path%2C%20soft%20dreamy%20photography%20style%2C%20cream%20blush%20and%20sage%20green%20color%20palette%2C%20elegant%20editorial%20wedding%20photography%2C%20natural%20light%20with%20lens%20flare%2C%20harmonious%20romantic%20atmosphere&width=800&height=600&seq=wedding-story-demo&orientation=landscape',
      image_position: 'right',
      text_alignment: 'left',
    };
  }

  return sections;
}

export function createDemoThemeConfig(): ThemeConfig {
  return {
    ...DESIGN_PRESETS[0].theme,
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

export function createDemoNavigationConfig(): NavigationConfig {
  return {
    ...defaultNavigationConfig(),
    show_top_nav: true,
    sticky: true,
    show_initials: true,
    links: [
      { id: 'nav-home', section_id: 'sec-hero', label: 'Home', type: 'section', url: '#hero', sort_order: 0 },
      { id: 'nav-story', section_id: 'sec-story', label: 'Our Story', type: 'section', url: '#story', sort_order: 1 },
      { id: 'nav-schedule', section_id: 'sec-schedule', label: 'Schedule', type: 'section', url: '#schedule', sort_order: 2 },
      { id: 'nav-travel', section_id: 'sec-travel', label: 'Travel', type: 'section', url: '#travel', sort_order: 3 },
      { id: 'nav-gallery', section_id: 'sec-gallery', label: 'Gallery', type: 'section', url: '#gallery', sort_order: 4 },
      { id: 'nav-rsvp', section_id: 'sec-rsvp', label: 'RSVP', type: 'section', url: '#rsvp', sort_order: 5 },
    ],
  };
}

export function createDemoSeoConfig(): SeoConfig {
  return {
    search_indexing: false,
    seo_title: 'Emma & James Wedding — Bath, Somerset',
    meta_description: 'Emma and James are getting married on 24 April 2027 in Bath, Somerset. Find event details, travel information, accommodation recommendations, and RSVP here.',
    social_title: 'Emma & James — We\'re Getting Married!',
    social_description: 'Join us in celebrating our wedding day on 24 April 2027 in beautiful Bath, Somerset. Find event details, travel information, and RSVP here.',
    social_image_url: 'https://readdy.ai/api/search-image?query=Elegant%20romantic%20wedding%20invitation%20flat%20lay%20with%20cream%20roses%20peonies%20and%20greenery%20on%20silk%20fabric%2C%20gold%20accents%2C%20soft%20natural%20window%20light%2C%20fine%20art%20editorial%20photography%2C%20warm%20neutral%20tones%2C%20luxurious%20texture%2C%20joyful%20celebration%20aesthetic&width=1200&height=630&seq=wedding-seo-og-demo&orientation=landscape',
    social_image_alt: 'Emma and James wedding invitation with cream roses and gold accents',
    favicon_url: null,
    show_wedding_date_in_meta: true,
    show_location_in_meta: true,
    canonical_domain: null,
  };
}

export function createDemoWebsiteConfig(): WebsiteConfig {
  const sections = createDemoWebsiteSections();
  return {
    id: 'demo-website-config-001',
    wedding_id: WEDDING_ID,
    status: 'published',
    slug: 'emma-and-james',
    theme_config: createDemoThemeConfig(),
    navigation_config: createDemoNavigationConfig(),
    sections_config: sections,
    seo_config: createDemoSeoConfig(),
    published_config: null,
    published_at: null,
    created_at: '2027-01-15T10:00:00+00:00',
    updated_at: '2027-02-20T15:30:00+00:00',
  };
}