import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isDemoMode } from '@/demo/demoConfig';
import { useAuth } from '@/context/AuthProvider';

const RINGS_BG = 'https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/065bb409-a687-4c47-ac84-cf74a32a70b0_compressed_pexels-nick-greaux-15231247.webp';

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  const { signUp, authError, clearAuthError } = useAuth();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const form = formRef.current;
    if (!form) return false;
    const data = new FormData(form);

    if (!data.get('first_name')) newErrors.firstName = 'First name is required';
    if (!data.get('last_name')) newErrors.lastName = 'Last name is required';
    const email = (data.get('email') as string).trim();
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!data.get('terms')) newErrors.terms = 'You must agree to the Terms and Privacy Policy';

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAuthError();
    if (!validate()) return;
    setLoading(true);

    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 800));
      setLoading(false);
      navigate('/app/onboarding');
      return;
    }

    const form = formRef.current!;
    const data = new FormData(form);
    const email = (data.get('email') as string).trim().toLowerCase();
    const first_name = (data.get('first_name') as string).trim();
    const last_name = (data.get('last_name') as string).trim();

    const result = await signUp(email, password, { first_name, last_name });
    setLoading(false);

    if (result.success) {
      if (result.needsVerification) {
        setSubmittedEmail(email);
        setVerificationSent(true);
      } else {
        navigate('/app/onboarding');
      }
    }
  };

  const inputClass = (fieldName: string) =>
    `w-full px-3.5 py-2.5 rounded-lg border bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${fieldErrors[fieldName] ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200'}`;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={RINGS_BG} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="font-heading text-3xl font-semibold text-foreground-900 cursor-pointer">
              Wedora
            </Link>
            <p className="text-foreground-600 text-sm mt-2">Start planning your beautiful wedding</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm p-6 md:p-8">
            {verificationSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
                  <i className="ri-mail-check-line text-2xl" />
                </div>
                <h1 className="font-heading text-xl text-foreground-900 mb-2">Check your email</h1>
                <p className="text-sm text-foreground-600 mb-2">
                  We sent a verification link to <strong className="text-foreground-900">{submittedEmail}</strong>.
                </p>
                <p className="text-xs text-foreground-500 mb-6">
                  Please check your inbox and click the link to verify your account before logging in.
                </p>
                <Link to="/login" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-secondary-200 text-foreground-700 px-5 py-2.5 text-sm font-medium font-label cursor-pointer hover:bg-secondary-50 transition-all">
                  Back to log in
                </Link>
              </div>
            ) : (
              <>
                <h1 className="font-heading text-xl text-foreground-900 mb-6">Create your Wedora account</h1>

                <form ref={formRef} onSubmit={handleSubmit} noValidate>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="signup-first-name" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                          First name
                        </label>
                        <input
                          id="signup-first-name"
                          name="first_name"
                          type="text"
                          required
                          autoComplete="given-name"
                          className={inputClass('firstName')}
                          placeholder="Emma"
                        />
                        {fieldErrors.firstName && <p className="text-xs text-primary-600 mt-1">{fieldErrors.firstName}</p>}
                      </div>
                      <div>
                        <label htmlFor="signup-last-name" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                          Last name
                        </label>
                        <input
                          id="signup-last-name"
                          name="last_name"
                          type="text"
                          required
                          autoComplete="family-name"
                          className={inputClass('lastName')}
                          placeholder="Williams"
                        />
                        {fieldErrors.lastName && <p className="text-xs text-primary-600 mt-1">{fieldErrors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                        Email address
                      </label>
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className={inputClass('email')}
                        placeholder="emma@email.com"
                      />
                      {fieldErrors.email && <p className="text-xs text-primary-600 mt-1">{fieldErrors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          className={`${inputClass('password')} pr-10`}
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                      {fieldErrors.password && <p className="text-xs text-primary-600 mt-1">{fieldErrors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="signup-confirm-password" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                        Confirm password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-confirm-password"
                          name="confirm_password"
                          type={showConfirm ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          className={`${inputClass('confirmPassword')} pr-10`}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                          <i className={`${showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`} />
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && <p className="text-xs text-primary-600 mt-1">{fieldErrors.confirmPassword}</p>}
                    </div>

                    <div className="flex items-start gap-2">
                      <input
                        id="signup-terms"
                        name="terms"
                        type="checkbox"
                        required
                        className="mt-1 w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
                      />
                      <label htmlFor="signup-terms" className="text-xs text-foreground-600 leading-relaxed cursor-pointer">
                        I agree to the <Link to="/terms" className="text-primary-600 underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary-600 underline">Privacy Policy</Link>.
                      </label>
                    </div>
                    {fieldErrors.terms && <p className="text-xs text-primary-600">{fieldErrors.terms}</p>}

                    <div className="flex items-start gap-2">
                      <input
                        id="signup-marketing"
                        name="marketing_consent"
                        type="checkbox"
                        className="mt-1 w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
                      />
                      <label htmlFor="signup-marketing" className="text-xs text-foreground-600 leading-relaxed cursor-pointer">
                        I would like to receive occasional wedding planning tips and Wedora updates. (Optional)
                      </label>
                    </div>

                    {authError && (
                      <div className="p-3 rounded-md bg-primary-50 border border-primary-200 text-sm text-primary-800">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-6 py-3 text-sm font-medium font-label cursor-pointer hover:bg-primary-600 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <><i className="ri-loader-4-line animate-spin mr-2" /> Creating account...</>
                      ) : (
                        'Create your wedding'
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-5 pt-5 border-t border-secondary-100 text-center">
                  <p className="text-sm text-foreground-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                      Log in
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

          {!isDemoMode && (
            <div className="mt-6 p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 text-center">
              <p className="text-xs text-foreground-500">
                Your account is protected with industry-standard security. We will never share your details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}