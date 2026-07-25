import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';
import ScrollReveal from '@/components/base/ScrollReveal';
import VideoHero from './components/VideoHero';
import ProductIntro from './components/ProductIntro';
import FeatureCards from './components/FeatureCards';
import GuestJourney from './components/GuestJourney';
import TravelConcierge from './components/TravelConcierge';
import CoupleApproval from './components/CoupleApproval';
import DashboardPreview from './components/DashboardPreview';
import Collaboration from './components/Collaboration';
import Testimonials from './components/Testimonials';
import FinalCTA from './components/FinalCTA';


const HERO_VIDEO_SRC = 'https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/fcb360ae-2bce-458b-965b-13ec843d00e1_Firefly--want-you-to-generate-an-MP4-video-that-can-be-used-on-a-hero-page-a-video-is-to-have-a-whit.mp4';
const HERO_POSTER_SRC = 'https://readdy.ai/api/search-image?query=Clean%20modern%20minimalist%20wedding%20workspace%20with%20white%20laptop%20on%20light%20oak%20desk%2C%20warm%20natural%20window%20light%2C%20soft%20neutral%20beige%20and%20white%20tones%2C%20elegant%20stationery%20and%20handwritten%20notes%20scattered%2C%20calm%20organized%20aesthetic%2C%20editorial%20product%20photography%20with%20gentle%20shadows%20and%20serene%20atmosphere%2C%20no%20florals&width=1800&height=1000&seq=wedora-hero-poster&orientation=landscape&nocache=true';

export default function Home() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent />
      <main>
        <VideoHero videoSrc={HERO_VIDEO_SRC} posterSrc={HERO_POSTER_SRC} />
        <ScrollReveal direction="up">
          <ProductIntro />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
          <FeatureCards />
        </ScrollReveal>
        <ScrollReveal direction="up">
          <GuestJourney />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
          <TravelConcierge />
        </ScrollReveal>
        <ScrollReveal direction="up">
          <CoupleApproval />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
          <DashboardPreview />
        </ScrollReveal>
        <ScrollReveal direction="up">
          <Collaboration />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
          <Testimonials />
        </ScrollReveal>
        <ScrollReveal direction="up">
          <FinalCTA />
        </ScrollReveal>
      </main>
      <Footer />
    </div>
  );
}