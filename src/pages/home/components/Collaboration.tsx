import { useScrollReveal } from '@/hooks/useScrollReveal';
import { collaborationRoles } from '@/mocks/vowora';

export default function Collaboration() {
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section className="bg-background-100 py-20 md:py-28">
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-12">
          <span className="section-label">Collaboration</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight mt-2">
            Plan together without<br />
            <em className="font-light italic">sharing everything</em>
          </h2>
          <p className="text-foreground-600 text-base mt-4 max-w-lg">
            Invite your partner, wedding planner, family members or coordinator with role-based permissions.
            Everyone sees what they need and nothing they do not.
          </p>
          <div className="flex gap-3 mt-6">
            <button className="btn-primary">Manage team</button>
            <button className="btn-outline">View permissions</button>
          </div>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {collaborationRoles.map((role, index) => (
            <div
              key={role.role}
              className="card-default"
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'none' : 'translateY(20px)',
                transition: `opacity 550ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 100}ms, transform 550ms cubic-bezier(0.22, 0.61, 0.36, 1) ${index * 100}ms, border-color 200ms, background-color 200ms`,
                willChange: 'transform, opacity',
              }}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 mb-3">
                <i className="ri-user-star-line text-lg" />
              </div>
              <h4 className="font-label text-sm font-semibold text-foreground-900">{role.role}</h4>
              <p className="text-xs text-foreground-600 mt-1.5 leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>

        {/* Permission example */}
        <div className="mt-10 bg-white border border-secondary-100 rounded-xl p-6">
          <h4 className="font-label text-sm font-semibold text-foreground-900 mb-4">Example permissions</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['Guest management', 'Website editing', 'Supplier management', 'Budget access', 'Email updates'].map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-sm text-foreground-700">
                <span className="w-4 h-4 flex items-center justify-center text-accent-600">
                  <i className="ri-check-line text-xs" />
                </span>
                <span className="text-xs font-label">{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}