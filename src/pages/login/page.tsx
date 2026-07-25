import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { loadDemoState } from '@/demo/demoStorage';
import { useAuth } from '@/context/AuthProvider';
import { mapAuthError } from '@/lib/authErrors';

const RINGS_BG = 'https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/065bb409-a687-4c47-ac84-cf74a32a70b0_compressed_pexels-nick-greaux-15231247.webp';

const DEMO_SESSION_KEY = 'wedora.demo.session';

function isDemoOnboardingComplete(): boolean {
  try {
    const state = loadDemoState();
    return state?.onboardingComplete ?? false;
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { signIn, authError, clearAuthError } = useAuth();

  const redirectAfterLogin = (): string => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && redirect !== '/login') {
      return redirect;
    }
    return '/app/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();
    setLoading(true);

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 800));
      localStorage.setItem(DEMO_SESSION_KEY, 'true');
      setLoading(false);
      navigate(isDemoOnboardingComplete() ? '/app/dashboard' : '/app/onboarding');
      return;
    }

    const form = formRef.current;
    if (!form) { setLoading(false); return; }
    const data = new FormData(form);
    const email = (data.get('email') as string).trim().toLowerCase();
    const password = data.get('password') as string;

    if (!email || !password) {
      setLocalError('Please enter your email and password.');
      setLoading(false);
      return;
    }

    const ok = await signIn(email, password);
    setLoading(false);

    if (ok) {
      navigate(redirectAfterLogin(), { replace: true });
    }
  };

  const handleDemoEnter = async () => {
    setDemoLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    localStorage.setItem(DEMO_SESSION_KEY, 'true');
    setDemoLoading(false);
    navigate(isDemoOnboardingComplete() ? '/app/dashboard' : '/app/onboarding');
  };

  const displayError = localError || authError;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={RINGS_BG}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="font-heading text-3xl font-semibold text-foreground-900 cursor-pointer">
              Wedora
            </Link>
            <p className="text-foreground-600 text-sm mt-2">Welcome back to your wedding planning</p>
          </div>

          {/* Demo entry — only visible in demo mode */}
          {isDemoMode && (
            <div className="mb-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 md:p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
                    <i className="ri-sparkling-line text-lg" />
                  </div>
                  <div>
                    <h2 className="font-label text-sm font-semibold text-amber-800 mb-1">Client Demo — Emma &amp; James</h2>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Explore a prepared wedding planning workspace. Changes are saved on this device and can be reset.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDemoEnter}
                  disabled={demoLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-white px-6 py-3 text-sm font-medium font-label cursor-pointer hover:bg-amber-600 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {demoLoading ? (
                    <><i className="ri-loader-4-line animate-spin text-base" /> Entering demo...</>
                  ) : (
                    <><i className="ri-rocket-line text-base" /> Enter Demo Account</>
                  )}
                </button>
              </div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white/70 backdrop-blur-sm px-3 text-foreground-400 font-label">or log in</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm p-6 md:p-8">
            <h1 className="font-heading text-xl text-foreground-900 mb-6">Log in to Wedora</h1>

            <form ref={formRef} onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-xs font-label font-medium text-foreground-700">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`} />
                    </button>
                  </div>
                </div>

                {isDemoMode && (
                  <p className="text-[11px] text-foreground-400">
                    Any password works in demo mode — this form is for presentation only.
                  </p>
                )}

                {displayError && (
                  <div className="p-3 rounded-md bg-primary-50 border border-primary-200 text-sm text-primary-800">
                    {displayError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-6 py-3 text-sm font-medium font-label cursor-pointer hover:bg-primary-600 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <><i className="ri-loader-4-line animate-spin mr-2" /> Signing in...</>
                  ) : (
                    'Log in'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 pt-5 border-t border-secondary-100 text-center">
              <p className="text-sm text-foreground-600">
                No account yet?{' '}
                <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                  Create your wedding
                </Link>
              </p>
            </div>
          </div>

          {!isDemoMode && (
            <div className="mt-6 p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 text-center">
              <p className="text-xs text-foreground-500">
                Your wedding planning starts here. Sign in to access your dashboard, guest list, and everything you need.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}