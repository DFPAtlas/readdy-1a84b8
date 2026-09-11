import { guestJourneySteps } from '@/mocks/vowora';
import ScrollReveal from '@/components/base/ScrollReveal';
import { Link } from 'react-router-dom';

export default function GuestJourney() {
  return (
    <section className="bg-background-50 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left: Journey steps */}
          <div className="w-full lg:w-3/5">
            <span className="section-label">Guest Experience</span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight">
              A journey designed<br />
              <em className="font-light italic">for every guest</em>
            </h2>

            <div className="mt-10 space-y-1">
              {guestJourneySteps.map((step, i) => (
                <div key={step.step} className="flex gap-4 py-4 group">
                  <ScrollReveal direction="none" delay={i * 180} duration={600}>
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-primary-200 text-primary-600 font-label text-sm font-medium group-hover:bg-primary-50 transition-colors">
                      {step.step}
                    </div>
                  </ScrollReveal>
                  <div>
                    <h4 className="font-label text-sm font-semibold text-foreground-900">{step.title}</h4>
                    <p className="text-sm text-foreground-600 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <Link to="/guest-experience" className="btn-primary">View guest portal</Link>
              <Link to="/features" className="btn-outline">Explore the journey</Link>
            </div>
          </div>

          {/* Right: Venue map preview */}
          <div className="w-full lg:w-2/5 flex items-start lg:pt-10">
            <ScrollReveal direction="right" delay={300} duration={700}>
              <div className="w-full rounded-xl overflow-hidden border border-secondary-100 shadow-sm">
                <div className="relative w-full aspect-[4/3] bg-secondary-50">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5000!2d0.1218!3d52.2053!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTLCsDEyJzE5LjEiTiAwwrAwNycxOC41IkU!5e0!3m2!1sen!2suk!4v1700000000000"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Wedding venue location"
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                <div className="bg-white px-5 py-4 border-t border-secondary-100">
                  <div className="flex items-center gap-2 text-sm text-primary-600 font-label font-medium">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-map-pin-line" />
                    </div>
                    <span>Guests can view directions to your venue</span>
                  </div>
                  <p className="text-xs text-foreground-500 mt-1.5 ml-7">
                    Your wedding website includes an interactive map so every guest knows exactly where to go.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}