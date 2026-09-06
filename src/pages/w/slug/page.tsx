import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { supabase } from '@/lib/supabase';
import type { DemoTravelPlace, DemoGalleryItem } from '@/demo/demoTypes';
import { createDemoSeoConfig } from '@/demo/demoWebsite';
import { usePublicSeoMetadata } from '@/hooks/usePublicSeoMetadata';

export default function PublicWeddingPage() {
  const { slug } = useParams();
  const demo = useDemoDataSafe();
  const isDemo = isDemoMode && slug === DEMO_CONFIG.publicSlug;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [previewBarVisible, setPreviewBarVisible] = useState(true);

  // All derived values using optional chaining for safety
  const wedding = demo?.state.wedding;
  const venues = demo?.state.venues || [];
  const updates = (demo?.state.updates || []).filter((u) => u.status === 'published');
  const registryItems = demo?.state.registryItems || [];
  const galleryItems = (demo?.state.galleryItems || []).filter((gi: DemoGalleryItem) => gi.moderation_status === 'approved');
  const travelPlaces = (demo?.state.travelPlaces || []).filter((tp: DemoTravelPlace) => tp.approval_status === 'approved');

  const dateDisplay = wedding?.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const ceremonyVenue = (venues || []).find((v) => v.venue_type === 'ceremony');
  const receptionVenue = (venues || []).find((v) => v.venue_type === 'reception');

  // All hooks (useMemo) must be before any early return
  const faqs = useMemo(() => {
    if (!wedding) return [];
    return [
      { q: 'What time should I arrive?', a: 'Please arrive at St Mary\'s Church by 12:30 PM so you can be comfortably seated before the ceremony begins at 1:00 PM.' },
      { q: 'Is there parking?', a: wedding.parking_notes || '' },
      { q: 'What is the dress code?', a: wedding.dress_code || '' },
      { q: 'Are children invited?', a: wedding.children_policy || '' },
      { q: 'Can I bring a plus-one?', a: wedding.plus_one_policy || '' },
      { q: 'How do I share dietary or accessibility needs?', a: 'Please include any dietary requirements, food allergies or accessibility needs when you complete your RSVP using the personalised link from your invitation.' },
      { q: 'Where should I stay?', a: 'We have recommended hotels and accommodation options in our travel section below. Room blocks are available at The Royal Crescent Hotel and The Bird, Bath — book by 28 February 2027.' },
      { q: 'Can I change my RSVP?', a: 'Yes — you can update your response through the personalised link in your invitation. If your plans change after the RSVP deadline, please contact the couple directly.' },
    ];
  }, [wedding]);

  const scheduleItems = useMemo(() => [
    { time: '12:30 PM', title: 'Guest arrival', desc: 'Arrive and be seated before the bride arrives at 1:00 PM.' },
    { time: '1:00 PM', title: 'Ceremony', desc: 'The ceremony led at St Mary\'s Church.' },
    { time: '2:00 PM', title: 'Confetti & photographs', desc: 'Group photographs on the church steps, followed by confetti.' },
    { time: '3:00 PM', title: 'Drinks reception', desc: 'Champagne, canapés, and garden games at The Orangery.' },
    { time: '4:30 PM', title: 'Wedding breakfast', desc: 'A three-course meal with speeches from the Best Man, Maid of Honour, and the couple.' },
    { time: '6:30 PM', title: 'Speeches', desc: 'Heartfelt words from those closest to the couple.' },
    { time: '7:30 PM', title: 'First dance', desc: 'Emma and James take to the floor.' },
    { time: '8:00 PM', title: 'Evening celebration', desc: 'Live music from The Night Owls Band. Dancing until midnight.' },
  ], []);

  const groupTravel = (places: DemoTravelPlace[]) => {
    const groups: Record<string, DemoTravelPlace[]> = {};
    for (const p of places) {
      const key = p.category || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  };

  const travelGroups = useMemo(() => groupTravel(travelPlaces), [travelPlaces]);

  const navLinks = useMemo(() => [
    { label: 'Welcome', href: '#welcome' },
    { label: 'Wedding day', href: '#wedding-day' },
    { label: 'Schedule', href: '#schedule' },
    { label: 'Travel & stay', href: '#travel' },
    { label: 'FAQs', href: '#faqs' },
    { label: 'Updates', href: '#updates' },
    { label: 'Registry', href: '#registry' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'RSVP', href: '#rsvp' },
  ], []);

  // ── Non-demo path: query by slug ──
  const [liveWedding, setLiveWedding] = useState<Record<string, unknown> | null>(null);
  const [liveLoading, setLiveLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    const fetchWedding = async () => {
      try {
        const { data, error: queryErr } = await supabase
          .from('weddings')
          .select('partner_one_name, partner_two_name, title, wedding_date, slug, location, welcome_message, dress_code, parking_notes, accessibility_notes, children_policy, plus_one_policy, contact_information, status')
          .eq('slug', slug)
          .maybeSingle();
        if (cancelled) return;
        if (queryErr || !data) {
          setLiveWedding(null);
          setLiveLoading(false);
          return;
        }
        setLiveWedding(data as Record<string, unknown>);
      } catch {
        if (!cancelled) setLiveWedding(null);
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    };
    fetchWedding();
    return () => { cancelled = true; };
  }, [slug, isDemo]);

  // ── Early returns after all hooks ──
  if (!isDemo) {
    if (liveLoading) {
      return (
        <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      );
    }
    if (!liveWedding) {
      return (
        <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-5">
              <i className="ri-heart-line text-2xl" />
            </div>
            <h1 className="font-heading text-2xl text-foreground-900 mb-3">Wedding page not found</h1>
            <p className="text-sm text-foreground-600 mb-6">The wedding page you are looking for is not available. Please check the link and try again.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
              Back to Vowora
            </Link>
          </div>
        </div>
      );
    }
    // Render live wedding page
    const lw = liveWedding;
    const lwDate = lw.wedding_date
      ? new Date(lw.wedding_date as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    const lwTitle = (lw.title as string) || `${lw.partner_one_name} & ${lw.partner_two_name}`;
    return (
      <div className="min-h-screen bg-background-50">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-secondary-100">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <span className="font-heading text-lg text-foreground-900">{lwTitle}</span>
          </div>
        </header>
        <section className="relative min-h-[500px] flex items-center justify-center bg-gradient-to-br from-primary-50 via-background-50 to-accent-50">
          <div className="text-center px-4 max-w-2xl mx-auto">
            <p className="text-sm text-foreground-400 font-label uppercase tracking-[0.25em] mb-6">We&apos;re getting married</p>
            <h1 className="font-heading text-5xl md:text-7xl text-foreground-900 leading-tight mb-4">
              {lw.partner_one_name as string}<br />
              <span className="font-light text-4xl md:text-6xl">&amp;</span><br />
              {lw.partner_two_name as string}
            </h1>
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-secondary-200 mt-4">
              <i className="ri-calendar-line text-foreground-400 text-sm" />
              <span className="text-sm font-label text-foreground-600">{lwDate}</span>
              {lw.location && <><span className="text-foreground-300">·</span><span className="text-sm font-label text-foreground-600">{lw.location as string}</span></>}
            </div>
          </div>
        </section>
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16 space-y-12">
          {lw.welcome_message && (
            <section className="text-center">
              <p className="text-base text-foreground-600 leading-relaxed italic">&ldquo;{lw.welcome_message as string}&rdquo;</p>
            </section>
          )}
          {lw.dress_code && (
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Dress code</h3>
              <p className="text-sm text-foreground-600">{lw.dress_code as string}</p>
            </div>
          )}
          {lw.children_policy && (
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Children</h3>
              <p className="text-sm text-foreground-600">{lw.children_policy as string}</p>
            </div>
          )}
          {lw.accessibility_notes && (
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Accessibility</h3>
              <p className="text-sm text-foreground-600">{lw.accessibility_notes as string}</p>
            </div>
          )}
        </main>
        <footer className="border-t border-secondary-100 py-10 text-center bg-white">
          <p className="font-heading text-xl text-foreground-900 mb-1">{lwTitle}</p>
          <p className="text-xs text-foreground-400">{lwDate}{lw.location ? ` · ${lw.location}` : ''}</p>
          <p className="text-[11px] text-foreground-300 mt-4">
            Powered by <Link to="/" className="text-foreground-400 hover:text-foreground-600 cursor-pointer">Vowora</Link>
          </p>
        </footer>
      </div>
    );
  }

  if (!demo || !wedding) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-foreground-500">
          <i className="ri-loader-4-line animate-spin text-xl" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // SEO metadata for demo mode
  const demoSeo = createDemoSeoConfig();

  return (
    <PublicWeddingPageContent
      wedding={wedding}
      dateDisplay={dateDisplay}
      navLinks={navLinks}
      scheduleItems={scheduleItems}
      faqs={faqs}
      updates={updates}
      registryItems={registryItems}
      galleryItems={galleryItems}
      travelGroups={travelGroups}
      ceremonyVenue={ceremonyVenue}
      receptionVenue={receptionVenue}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      faqOpen={faqOpen}
      setFaqOpen={setFaqOpen}
      previewBarVisible={previewBarVisible}
      setPreviewBarVisible={setPreviewBarVisible}
      seo={demoSeo}
      coupleNames={`${wedding.partner_one_name} & ${wedding.partner_two_name}`}
      siteUrl={`vowora.uk/w/${DEMO_CONFIG.publicSlug}`}
    />
  );
}

// ── Extracted content component ──
function PublicWeddingPageContent({
  wedding, dateDisplay, navLinks, scheduleItems, faqs, updates, registryItems,
  galleryItems, travelGroups, ceremonyVenue, receptionVenue, mobileMenuOpen,
  setMobileMenuOpen, faqOpen, setFaqOpen, previewBarVisible, setPreviewBarVisible,
  seo, coupleNames, siteUrl,
}: {
  wedding: any; dateDisplay: string; navLinks: any; scheduleItems: any; faqs: any;
  updates: any; registryItems: any; galleryItems: any; travelGroups: any;
  ceremonyVenue: any; receptionVenue: any; mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void; faqOpen: number | null;
  setFaqOpen: (v: number | null) => void; previewBarVisible: boolean;
  setPreviewBarVisible: (v: boolean) => void; seo: any; coupleNames: string; siteUrl: string;
}) {
  usePublicSeoMetadata({
    seo,
    siteTitle: coupleNames,
    siteUrl,
    coupleNames,
    weddingDate: wedding?.wedding_date,
    location: wedding?.location,
    searchIndexing: seo.search_indexing,
  });

  return (
    <div className="min-h-screen bg-background-50">
      {/* ── Preview bar (couple dashboard context) ── */}
      {previewBarVisible && (
        <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto flex items-center justify-between h-10 px-4">
            <p className="text-xs text-amber-700 flex items-center gap-2">
              <i className="ri-eye-line" />
              You are viewing the Emma &amp; James demo website.
            </p>
            <div className="flex items-center gap-3">
              <Link to="/app/dashboard" className="text-xs font-label text-amber-700 hover:text-amber-800 cursor-pointer whitespace-nowrap">
                Return to dashboard
              </Link>
              <Link to="/guest/demo-session" className="text-xs font-label text-amber-700 hover:text-amber-800 cursor-pointer whitespace-nowrap">
                View as guest
              </Link>
              <button
                onClick={() => setPreviewBarVisible(false)}
                className="text-xs text-amber-500 hover:text-amber-700 cursor-pointer whitespace-nowrap"
                aria-label="Close preview bar"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-secondary-100" style={{ top: previewBarVisible ? '40px' : '0' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <span className="font-heading text-lg text-foreground-900">
            {wedding.partner_one_name} &amp; {wedding.partner_two_name}
          </span>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-xs font-label text-foreground-500 hover:text-foreground-900 hover:bg-background-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="Menu"
          >
            <i className={`ri-${mobileMenuOpen ? 'close' : 'menu'}-line text-lg`} />
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 w-56 bg-white z-50 h-full md:hidden shadow-lg">
            <div className="p-4 border-b border-secondary-100 flex items-center justify-between">
              <span className="font-heading text-sm text-foreground-900">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>
            <nav className="py-2 px-2 space-y-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm text-foreground-600 hover:bg-background-100 rounded-md cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* ── HERO ── */}
      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://readdy.ai/api/search-image?query=Elegant%20romantic%20English%20garden%20wedding%20scene%20with%20soft%20spring%20flowers%20in%20bloom%2C%20historic%20stone%20architecture%2C%20warm%20golden%20hour%20natural%20light%2C%20fine%20art%20editorial%20wedding%20photography%2C%20dreamy%20bokeh%20background%2C%20pastel%20color%20palette%20with%20ivory%20and%20blush%20tones%2C%20no%20people%20visible%2C%20atmospheric%20and%20serene&width=1600&height=900&seq=wedora-public-hero&orientation=landscape"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
        </div>
        <div className="relative z-10 text-center px-4 w-full max-w-3xl mx-auto">
          <p className="text-sm text-white/80 font-label uppercase tracking-[0.25em] mb-6">We&apos;re getting married</p>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl text-white leading-tight mb-4">
            {wedding.partner_one_name}<br />
            <span className="font-light text-4xl md:text-6xl lg:text-7xl">&amp;</span><br />
            {wedding.partner_two_name}
          </h1>
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mt-4">
            <i className="ri-calendar-line text-white/70 text-sm" />
            <span className="text-sm font-label text-white/90">{dateDisplay}</span>
            <span className="text-white/40">·</span>
            <span className="text-sm font-label text-white/90">{wedding.location}</span>
          </div>
          <div className="mt-8">
            <a
              href="#rsvp"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white text-foreground-900 text-sm font-label font-medium hover:bg-white/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-mail-open-line" /> RSVP
            </a>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16 space-y-16 md:space-y-20">
        {/* ── WELCOME ── */}
        <section id="welcome" className="text-center max-w-2xl mx-auto scroll-mt-24">
          <div className="w-12 h-0.5 bg-secondary-200 mx-auto mb-6" />
          <p className="text-base text-foreground-600 leading-relaxed italic">
            &ldquo;{wedding.welcome_message}&rdquo;
          </p>
          <p className="text-xs text-foreground-400 mt-4 font-label">
            — {wedding.partner_one_name} &amp; {wedding.partner_two_name}
          </p>
        </section>

        {/* ── WEDDING DAY ── */}
        <section id="wedding-day" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">The day</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Wedding day</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ceremony */}
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-bl-full -mr-8 -mt-8 opacity-50" />
              <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-3">Ceremony</p>
              <h3 className="font-heading text-xl text-foreground-900 mb-2">{ceremonyVenue?.name || 'St Mary\'s Church'}</h3>
              <div className="space-y-2">
                <p className="text-sm text-foreground-600 flex items-center gap-2">
                  <i className="ri-time-line text-foreground-400 flex-shrink-0" />
                  <span><strong className="font-label text-foreground-900">1:00 PM</strong> — Guests arrive by 12:30 PM</span>
                </p>
                {ceremonyVenue && (
                  <p className="text-xs text-foreground-500 flex items-start gap-2">
                    <i className="ri-map-pin-line text-foreground-400 mt-0.5 flex-shrink-0" />
                    <span>{ceremonyVenue.address_line_1}, {ceremonyVenue.city}, {ceremonyVenue.postcode}</span>
                  </p>
                )}
                <p className="text-xs text-foreground-500 mt-2">A beautiful Grade II listed church in Bathwick, just a short walk from the city centre.</p>
              </div>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(ceremonyVenue?.name || 'St Mary\'s Church Bath')}`}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-compass-line" /> Get directions
              </a>
            </div>
            {/* Reception */}
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-50 rounded-bl-full -mr-8 -mt-8 opacity-50" />
              <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-3">Reception</p>
              <h3 className="font-heading text-xl text-foreground-900 mb-2">{receptionVenue?.name || 'The Orangery'}</h3>
              <div className="space-y-2">
                <p className="text-sm text-foreground-600 flex items-center gap-2">
                  <i className="ri-time-line text-foreground-400 flex-shrink-0" />
                  <span><strong className="font-label text-foreground-900">From 3:00 PM</strong> — until midnight</span>
                </p>
                {receptionVenue && (
                  <p className="text-xs text-foreground-500 flex items-start gap-2">
                    <i className="ri-map-pin-line text-foreground-400 mt-0.5 flex-shrink-0" />
                    <span>{receptionVenue.address_line_1}, {receptionVenue.city}, {receptionVenue.postcode}</span>
                  </p>
                )}
                <p className="text-xs text-foreground-500 mt-2">Drinks, wedding breakfast, speeches, and an evening of celebration in a stunning glass orangery.</p>
              </div>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(receptionVenue?.name || 'The Orangery Bath')}`}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-compass-line" /> Get directions
              </a>
            </div>
          </div>
        </section>

        {/* ── SCHEDULE ── */}
        <section id="schedule" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">The day</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Wedding day schedule</h2>
          </div>
          <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8">
            <div className="space-y-0">
              {scheduleItems.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${idx === 0 ? 'bg-primary-500 ring-4 ring-primary-100' : 'bg-primary-300'}`} />
                    {idx < scheduleItems.length - 1 && <div className="w-px flex-1 bg-secondary-200 my-0.5" />}
                  </div>
                  <div className="pb-6">
                    <span className="text-xs font-label font-medium text-foreground-400">{item.time}</span>
                    <h4 className="text-sm font-label font-semibold text-foreground-900 mt-0.5">{item.title}</h4>
                    <p className="text-xs text-foreground-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRACTICAL INFO ── */}
        <section id="practical-info" className="scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-3">
                <i className="ri-shirt-line text-sm" />
              </div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">Dress code</h3>
              <p className="text-xs text-foreground-600 leading-relaxed">{wedding.dress_code}</p>
            </div>
            <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-3">
                <i className="ri-car-line text-sm" />
              </div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">Parking</h3>
              <p className="text-xs text-foreground-600 leading-relaxed">{wedding.parking_notes}</p>
            </div>
            <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-3">
                <i className="ri-user-smile-line text-sm" />
              </div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">Children</h3>
              <p className="text-xs text-foreground-600 leading-relaxed">{wedding.children_policy}</p>
            </div>
            <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-3">
                <i className="ri-wheelchair-line text-sm" />
              </div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">Accessibility</h3>
              <p className="text-xs text-foreground-600 leading-relaxed">{wedding.accessibility_notes}</p>
            </div>
          </div>
        </section>

        {/* ── TRAVEL & STAY ── */}
        <section id="travel" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Getting there</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Travel &amp; stay</h2>
          </div>

          {Object.keys(travelGroups).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(travelGroups).map(([category, places]) => (
                <div key={category}>
                  <h3 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
                    <i className="ri-arrow-right-s-line text-foreground-400" /> {category}s
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {places.map((place) => (
                      <div key={place.id} className="bg-white border border-secondary-100 rounded-xl p-5 hover:border-secondary-200 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          {place.featured && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label">Featured</span>
                          )}
                          {place.price_tag && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-label ${
                              place.price_tag === 'luxury' ? 'bg-amber-50 text-amber-700' :
                              place.price_tag === 'budget' ? 'bg-emerald-50 text-emerald-700' :
                              'bg-secondary-100 text-secondary-600'
                            }`}>
                              {place.price_tag}
                            </span>
                          )}
                        </div>
                        <h4 className="font-label text-sm font-semibold text-foreground-900 mb-1">{place.name}</h4>
                        <p className="text-xs text-foreground-500 leading-relaxed mb-2">{place.short_description}</p>
                        {(place.distance_miles && place.distance_miles > 0) && (
                          <p className="text-[10px] text-foreground-400 mb-2">
                            <i className="ri-map-pin-line text-[10px] mr-1" />
                            {place.distance_miles} miles · ~{place.journey_time_minutes} min
                          </p>
                        )}
                        {place.couple_note && (
                          <p className="text-[11px] text-primary-600 italic mt-2 border-t border-secondary-100 pt-2">
                            &ldquo;{place.couple_note}&rdquo;
                          </p>
                        )}
                        {place.website_url && (
                          <a
                            href={place.website_url}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-700 mt-2 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-external-link-line text-[10px]" /> Visit website
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8 text-center">
              <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3">
                <i className="ri-map-pin-line text-lg" />
              </div>
              <p className="text-sm text-foreground-500">Travel recommendations will appear here closer to the wedding date.</p>
            </div>
          )}

          <div className="text-center mt-6">
            <Link
              to="/guest/demo-session/travel"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-map-pin-line" /> Open the full guest travel guide
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faqs" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Help</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Frequently asked questions</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-background-50 transition-colors"
                  aria-expanded={faqOpen === idx}
                >
                  <span className="font-label text-sm font-medium text-foreground-900 pr-4">{faq.q}</span>
                  <i className={`ri-${faqOpen === idx ? 'subtract' : 'add'}-line text-foreground-400 flex-shrink-0 text-lg transition-transform`} />
                </button>
                {faqOpen === idx && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-foreground-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── UPDATES ── */}
        <section id="updates" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Stay informed</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Updates from the couple</h2>
          </div>
          {updates.length > 0 ? (
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update.id} className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
                  <span className="text-[11px] font-label text-foreground-400 bg-secondary-50 px-2.5 py-1 rounded-full">
                    {new Date(update.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <h4 className="font-label text-sm font-semibold text-foreground-900 mt-2 mb-1.5">{update.title}</h4>
                  <p className="text-sm text-foreground-600 leading-relaxed">{update.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8 text-center">
              <p className="text-sm text-foreground-500">Updates from the couple will appear here.</p>
            </div>
          )}
        </section>

        {/* ── REGISTRY ── */}
        <section id="registry" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Gifts</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Gift registry</h2>
          </div>
          {registryItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {registryItems.map((item) => (
                <div key={item.id} className="bg-white border border-secondary-100 rounded-xl p-5 flex flex-col">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 mb-3">
                    <i className={`${item.item_type === 'fund' ? 'ri-plane-line' : 'ri-gift-line'} text-lg`} />
                  </div>
                  <h4 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">{item.name}</h4>
                  <p className="text-xs text-foreground-500 leading-relaxed mb-3 flex-1">{item.description}</p>
                  <div className="mt-auto">
                    <p className="text-sm font-semibold text-foreground-900">
                      {item.item_type === 'fund'
                        ? `£${item.total_contributed.toLocaleString()} of £${item.price.toLocaleString()} raised`
                        : `£${item.price.toLocaleString()}`
                      }
                    </p>
                    {item.item_type === 'fund' && (
                      <div className="w-full h-1.5 rounded-full bg-secondary-100 mt-2 overflow-hidden">
                        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.min((item.total_contributed / item.price) * 100, 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8 text-center">
              <p className="text-sm text-foreground-500">The couple's gift registry will appear here.</p>
            </div>
          )}
          <p className="text-center text-[11px] text-foreground-400 mt-4">
            Demo only — online contributions are not processed.
          </p>
        </section>

        {/* ── GALLERY ── */}
        <section id="gallery" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Photos</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">Gallery</h2>
          </div>
          {galleryItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {galleryItems.slice(0, 8).map((item) => (
                <div key={item.id} className="relative group rounded-xl overflow-hidden bg-background-50 aspect-[4/3]">
                  <img
                    src={item.image_src}
                    alt={item.caption || 'Wedding gallery photo'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-[11px] text-white truncate">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8 text-center">
              <p className="text-sm text-foreground-500">Photos from the wedding will appear here.</p>
            </div>
          )}
          {galleryItems.length > 8 && (
            <p className="text-center text-xs text-foreground-400 mt-4">
              +{galleryItems.length - 8} more photos available
            </p>
          )}
        </section>

        {/* ── RSVP ── */}
        <section id="rsvp" className="scroll-mt-24">
          <div className="text-center mb-10">
            <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Respond</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">RSVP</h2>
          </div>
          <div className="max-w-lg mx-auto">
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8 text-center">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
                <i className="ri-mail-open-line text-xl" />
              </div>
              <h3 className="font-heading text-lg text-foreground-900 mb-2">You are invited</h3>
              <p className="text-sm text-foreground-500 mb-6 leading-relaxed">
                Use the personalised link from your invitation to RSVP. If you have received a digital invitation, click the link it contains.
              </p>
              <Link
                to="/guest/demo-session/rsvp"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Open Oliver Bennett&apos;s demo invitation <i className="ri-arrow-right-line" />
              </Link>
              <p className="text-xs text-foreground-400 mt-4">
                This is a demonstration. Use the personalised link from your invitation to RSVP.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-secondary-100 py-10 text-center bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <p className="font-heading text-xl text-foreground-900 mb-1">
            {wedding.partner_one_name} &amp; {wedding.partner_two_name}
          </p>
          <p className="text-xs text-foreground-400">{dateDisplay} · {wedding.location}</p>
          <div className="w-8 h-px bg-secondary-200 mx-auto my-4" />
          <div className="flex items-center justify-center gap-2">
            <a href="#top" className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-up-line" /> Back to top
            </a>
            <span className="text-foreground-300">·</span>
            <span className="text-[11px] text-foreground-300">
              Powered by <Link to="/" className="text-foreground-400 hover:text-foreground-600 cursor-pointer">Vowora</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}