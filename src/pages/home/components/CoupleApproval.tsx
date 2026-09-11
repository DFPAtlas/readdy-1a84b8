import { approvalActions } from '@/mocks/vowora';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import ScrollReveal from '@/components/base/ScrollReveal';

function ApprovalBadge() {
  const { ref, isRevealed } = useScrollReveal({ threshold: 0.3 });

  return (
    <span
      ref={ref}
      className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-label font-medium"
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? 'scale(1)' : 'scale(0)',
        transition: 'opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 300ms, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 300ms',
      }}
    >
      12 suggestions
    </span>
  );
}

export default function CoupleApproval() {
  return (
    <section className="bg-background-50 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="w-full lg:w-1/2">
            <span className="section-label">Couple approval</span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight">
              Your recommendations,<br />
              <em className="font-light italic">your wedding</em>
            </h2>
            <p className="text-foreground-600 text-base leading-relaxed mt-4 max-w-md">
              Our travel agent searches for useful nearby places. Suggestions enter a private approval area. Only places approved by the couple appear on the guest website.
            </p>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="bg-white border border-secondary-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h4 className="font-label text-sm font-semibold text-foreground-900">Approval queue</h4>
                <ApprovalBadge />
              </div>

              {/* Approval action chips */}
              <div className="flex flex-wrap gap-2">
                {approvalActions.map((action) => (
                  <button
                    key={action}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-background-100 border border-secondary-200 text-xs font-label text-foreground-700 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Mock approval card */}
              <ScrollReveal direction="up" delay={400} duration={600}>
                <div className="mt-5 bg-background-50 border border-secondary-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-md bg-background-200 flex-shrink-0 overflow-hidden">
                      <img
                        src="https://readdy.ai/api/search-image?query=Elegant%20boutique%20hotel%20exterior%20with%20warm%20lighting%2C%20Georgian%20architecture%2C%20ivy%20covered%20entrance%2C%20soft%20evening%20light%2C%20professional%20photography%2C%20clean%20composition&width=128&height=128&seq=approval-hotel-sample&orientation=landscape"
                        alt="Suggested hotel"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-label text-sm font-medium text-foreground-900 truncate">The Grosvenor Hotel</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-accent-100 text-accent-700 text-xs font-label">
                          New
                        </span>
                      </div>
                      <p className="text-xs text-foreground-500 mt-1">Hotels &amp; Guest Houses &middot; 0.4 miles</p>
                      <div className="flex gap-2 mt-3">
                        <button className="whitespace-nowrap px-3 py-1 rounded-md bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer">Approve</button>
                        <button className="whitespace-nowrap px-3 py-1 rounded-md border border-secondary-200 text-foreground-600 text-xs font-label font-medium hover:bg-background-100 transition-colors cursor-pointer">Hide</button>
                        <button className="whitespace-nowrap px-3 py-1 rounded-md border border-secondary-200 text-foreground-600 text-xs font-label font-medium hover:bg-background-100 transition-colors cursor-pointer">Note</button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}