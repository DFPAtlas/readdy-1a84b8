import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import type { OnboardingStep } from '@/lib/onboardingSteps';

function EffortBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    Quick: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Detailed: 'bg-primary-50 text-primary-700 border-primary-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-medium border ${colors[label] || colors.Medium} whitespace-nowrap`}>
      {label}
    </span>
  );
}

function StepCard({ step, onDismiss }: { step: OnboardingStep & { completed: boolean }; onDismiss?: () => void }) {
  return (
    <div className={`rounded-xl border p-5 transition-all ${step.completed ? 'bg-background-50 border-secondary-200/70' : 'bg-white border-secondary-200 hover:border-primary-200'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${step.completed ? 'bg-accent-100 text-accent-600' : 'bg-background-100 text-foreground-400'}`}>
          <i className={`${step.completed ? 'ri-check-line' : step.icon} text-lg`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-label font-semibold ${step.completed ? 'text-foreground-500' : 'text-foreground-900'}`}>
              {step.title}
            </h3>
            {step.required && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-label font-medium bg-amber-100 text-amber-700 whitespace-nowrap">Required</span>
            )}
            {step.completed && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-label font-medium bg-accent-100 text-accent-700 whitespace-nowrap">Complete</span>
            )}
          </div>
          <p className="text-xs text-foreground-500 leading-relaxed">{step.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              to={step.route}
              className={`text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${step.completed ? 'text-foreground-400 hover:text-foreground-600' : 'text-primary-600 hover:text-primary-700'}`}
            >
              {step.completed ? 'Review' : 'Start'} <i className="ri-arrow-right-line ml-1" />
            </Link>
            <EffortBadge label={step.effortLabel} />
            {!step.required && !step.completed && onDismiss && (
              <button onClick={onDismiss} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap">
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Demo Getting Started ──

function DemoGettingStarted() {
  const navigate = useNavigate();
  const { loading, completed, total, percentage, steps, nextStep, isComplete } = useOnboardingProgress();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [setupDismissed, setSetupDismissed] = useState(false);

  const handleDismiss = (key: string) => {
    setDismissed((prev) => new Set([...prev, key]));
  };

  const visibleSteps = steps.filter((s) => !dismissed.has(s.key));

  const categories = [
    { key: 'essentials', label: 'Essentials', icon: 'ri-star-line' },
    { key: 'guest-experience', label: 'Guest experience', icon: 'ri-user-line' },
    { key: 'planning', label: 'Planning', icon: 'ri-calendar-check-line' },
    { key: 'sharing', label: 'Sharing', icon: 'ri-share-line' },
  ];

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-secondary-200" />
            <div className="h-4 w-96 rounded bg-secondary-100" />
            <div className="h-4 w-full rounded bg-secondary-200" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-secondary-100" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-2">Welcome to Vowora</p>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-2">
            {isComplete ? 'All set!' : "Let's set up your wedding"}
          </h1>
          <p className="text-sm text-foreground-500 max-w-lg">
            {isComplete
              ? 'Your wedding workspace is fully set up. Here is everything you have completed.'
              : 'Complete the steps below in any order. Your progress is based on real data — steps complete automatically when you finish the actual work.'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-secondary-200/70 rounded-2xl p-6 mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-foreground-500 font-label">Overall progress</p>
              <p className="text-3xl font-heading font-semibold text-primary-600">{percentage}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-foreground-500 font-label">
                {completed} of {total} steps complete
              </p>
              {nextStep && (
                <Link to={nextStep.route} className="text-xs text-primary-600 font-label font-medium hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  Next: {nextStep.title} <i className="ri-arrow-right-line ml-1" />
                </Link>
              )}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-background-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-accent-500 transition-all duration-700 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Demo badge */}
        {isDemoMode && !setupDismissed && (
          <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
              <i className="ri-lightbulb-line text-sm" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-label font-medium text-accent-900">Demo setup guide</p>
              <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">
                This checklist tracks the demo wedding for Emma &amp; James. Many steps are already complete — explore the sections marked "Complete" or work through the remaining items at your own pace.
              </p>
            </div>
            <button onClick={() => setSetupDismissed(true)} className="text-accent-400 hover:text-accent-600 cursor-pointer flex-shrink-0">
              <i className="ri-close-line" />
            </button>
          </div>
        )}

        {/* Category sections */}
        <div className="space-y-8">
          {categories.map((cat) => {
            const catSteps = visibleSteps.filter((s) => s.category === cat.key);
            if (catSteps.length === 0) return null;
            const catCompleted = catSteps.filter((s) => s.completed).length;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500">
                    <i className={`${cat.icon} text-sm`} />
                  </div>
                  <div>
                    <h2 className="font-label text-sm font-semibold text-foreground-900">{cat.label}</h2>
                    <p className="text-[11px] text-foreground-400">{catCompleted}/{catSteps.length} complete</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catSteps.map((step) => (
                    <StepCard
                      key={step.key}
                      step={step}
                      onDismiss={!step.required && !step.completed ? () => handleDismiss(step.key) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* All complete state */}
        {isComplete && (
          <div className="mt-10 text-center p-8 rounded-2xl bg-accent-50 border border-accent-100">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
              <i className="ri-check-double-line text-2xl" />
            </div>
            <h2 className="font-heading text-xl text-foreground-900 mb-2">Your wedding workspace is ready</h2>
            <p className="text-sm text-foreground-500 max-w-sm mx-auto mb-6">
              All essential steps are complete. Head to your dashboard to start planning, or explore the sections below.
            </p>
            <button onClick={() => navigate('/app/dashboard')} className="btn-primary cursor-pointer whitespace-nowrap">
              <i className="ri-dashboard-line mr-1.5" /> Go to dashboard
            </button>
          </div>
        )}

        {/* Dismissed items recovery */}
        {dismissed.size > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setDismissed(new Set())}
              className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-1" /> Show {dismissed.size} skipped step{dismissed.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Production Getting Started ──

function NormalGettingStarted() {
  const navigate = useNavigate();
  const { loading, completed, total, percentage, steps, nextStep } = useOnboardingProgress();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleSteps = steps.filter((s) => !dismissed.has(s.key));

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-secondary-200" />
            <div className="h-4 w-96 rounded bg-secondary-100" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-2">Welcome to Vowora</p>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-2">Let's set up your wedding</h1>
          <p className="text-sm text-foreground-500 max-w-lg">
            Complete the steps below in any order. Each step checks against real data from your workspace.
          </p>
        </div>

        <div className="bg-white border border-secondary-200/70 rounded-2xl p-6 mb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-foreground-500 font-label">Overall progress</p>
              <p className="text-3xl font-heading font-semibold text-primary-600">{percentage}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-foreground-500 font-label">{completed} of {total} steps complete</p>
              {nextStep && (
                <Link to={nextStep.route} className="text-xs text-primary-600 font-label font-medium hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  Next: {nextStep.title} <i className="ri-arrow-right-line ml-1" />
                </Link>
              )}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-background-200 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-accent-500 transition-all duration-700" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleSteps.map((step) => (
            <StepCard key={step.key} step={step} onDismiss={!step.required && !step.completed ? () => setDismissed((prev) => new Set([...prev, step.key])) : undefined} />
          ))}
        </div>

        {dismissed.size > 0 && (
          <div className="mt-6 text-center">
            <button onClick={() => setDismissed(new Set())} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap">
              <i className="ri-refresh-line mr-1" /> Show {dismissed.size} skipped step{dismissed.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function GettingStartedPage() {
  if (isDemoMode) return <DemoGettingStarted />;
  return <NormalGettingStarted />;
}