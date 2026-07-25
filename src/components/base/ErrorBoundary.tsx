import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred' };
  }

  componentDidCatch(error: Error) {
    // Log in development only — never expose in production
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-6">
              <i className="ri-error-warning-line text-3xl" />
            </div>
            <h1 className="font-heading text-2xl text-foreground-900 mb-3">Something went wrong</h1>
            <p className="text-sm text-foreground-500 mb-2">
              This section could not be displayed. This might be a temporary issue.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-home-4-line" /> Return to home
              </a>
              <button
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-secondary-200 text-foreground-600 text-sm font-label font-medium hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line" /> Reload section
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}