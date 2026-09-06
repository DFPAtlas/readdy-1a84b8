import { useScrollReveal } from '@/hooks/useScrollReveal';
import { coreFeatures } from '@/mocks/wedora';

export default function FeatureCards() {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section className="bg-background-100 py-20 md:py-28">
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="section-label">What Vowora does</span>
          <h2 className="font-heading text-3xl md:text-4xl text-foreground-900 mt-2">
            Everything you need to plan beautifully
          </h2>
          <p className="text-foreground-600 text-base mt-4 max-w-xl mx-auto">
            Six powerful tools that work together to make wedding planning calm and organised.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {coreFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className="card-default group hover:border-primary-200 transition-colors cursor-default"
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'none' : 'translateY(24px)',
                transition: `opacity 600ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 100}ms, transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 100}ms, border-color 200ms, background-color 200ms`,
                willChange: 'transform, opacity',
              }}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-4">
                <i className={`${feature.icon} text-lg`} />
              </div>
              <h3 className="font-heading text-lg text-foreground-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-foreground-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}