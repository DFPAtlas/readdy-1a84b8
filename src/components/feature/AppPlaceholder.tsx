import AppShell from '@/components/feature/AppShell';

interface AppPlaceholderProps {
  title: string;
  icon: string;
  description: string;
  phase?: string;
}

export default function AppPlaceholder({ title, icon, description, phase = 'later' }: AppPlaceholderProps) {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="card-default text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-5">
            <i className={`${icon} text-2xl`} />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">{title}</h1>
          <p className="text-sm text-foreground-600 max-w-sm mx-auto">{description}</p>
          <span className="inline-flex items-center mt-6 px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-700 text-xs font-label">
            Coming in a {phase} Wedora release
          </span>
        </div>
      </div>
    </AppShell>
  );
}