import { useScrollReveal } from '@/hooks/useScrollReveal';
import { testimonials } from '@/mocks/wedora';

export default function Testimonials() {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section className="bg-background-100 py-20 md:py-28">
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-foreground-500 font-label mb-3">
            <i className="ri-heart-line text-accent-600 text-xs" />
            Early Feedback
          </span>
          <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
            What couples are saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-secondary-100 rounded-xl p-6 md:p-7"
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'none' : 'translateY(24px)',
                transition: `opacity 600ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 120}ms, transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 120}ms, border-color 200ms`,
                willChange: 'transform, opacity',
              }}
            >
              <div className="w-8 h-8 flex items-center justify-center text-foreground-300 mb-4">
                <i className="ri-double-quotes-l text-2xl" />
              </div>
              <p className="text-sm text-foreground-700 leading-relaxed mb-5 italic">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-label text-xs font-semibold">
                  {item.author.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-label font-medium text-foreground-900">{item.author}</p>
                  <p className="text-xs text-foreground-500">Early-access programme</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}