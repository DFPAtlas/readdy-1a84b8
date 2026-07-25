import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="section-label">About Wedora</span>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground-900 mt-3 leading-tight">
                Built for the couples<br />
                <em className="font-light italic">behind every celebration</em>
              </h1>
            </div>
          </div>
        </section>

        {/* Why Wedora */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
                  Why Wedora exists
                </h2>
                <p className="text-foreground-600 text-base leading-relaxed mt-4">
                  Planning a wedding is one of life&rsquo;s most joyful experiences, but it can also be one of the most overwhelming. Couples juggle spreadsheets, group chats, separate websites, email threads and a dozen different tools. Guests get confused about where to stay, what to wear and when to arrive.
                </p>
                <p className="text-foreground-600 text-base leading-relaxed mt-4">
                  Wedora was created to bring everything into one calm, beautiful space. We believe that technology should make weddings easier, not more complicated. Our platform gives couples the tools to plan thoughtfully and gives guests everything they need to be present and enjoy the celebration.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden w-full max-w-lg">
                  <div className="aspect-[4/3] bg-background-100 relative">
                    <video
                      src="https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/b381bfa0-1731-4baf-b576-e92f1c9d1bd8_Firefly-want-a-image-of-a-county-side-hotel-in-the-uk-404914.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              <div>
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-4">
                  <i className="ri-heart-line text-lg" />
                </div>
                <h3 className="font-heading text-xl text-foreground-900 mb-3">Built around the couple</h3>
                <p className="text-sm text-foreground-600 leading-relaxed">
                  Every feature in Wedora starts with a simple question: does this make planning easier for the couple? We prioritise clarity, calm and control over complexity.
                </p>
              </div>

              <div>
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 mb-4">
                  <i className="ri-group-line text-lg" />
                </div>
                <h3 className="font-heading text-xl text-foreground-900 mb-3">Designed for guests</h3>
                <p className="text-sm text-foreground-600 leading-relaxed">
                  Your guests are part of your story. We design every guest interaction to be warm, clear and respectful of their time and privacy.
                </p>
              </div>

              <div>
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-4">
                  <i className="ri-leaf-line text-lg" />
                </div>
                <h3 className="font-heading text-xl text-foreground-900 mb-3">Calm technology</h3>
                <p className="text-sm text-foreground-600 leading-relaxed">
                  Weddings are emotional, meaningful celebrations. The technology supporting them should be quiet, reliable and unobtrusive. No clutter, no noise, just what you need.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
                Privacy and trust
              </h2>
              <p className="text-foreground-600 text-base leading-relaxed mt-4">
                Your wedding data and your guests&rsquo; personal information belong to you. We do not sell data, we do not show adverts and we use industry-standard security to protect everything you share with Wedora. See our <Link to="/privacy" className="text-primary-600 underline cursor-pointer">Privacy Policy</Link> for details.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
              Start your Wedora journey
            </h2>
            <p className="text-foreground-600 mt-4 mb-8">
              Create your account and bring all your wedding planning into one beautiful place.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5">Start planning</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}