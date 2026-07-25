// ── Auth error mapping utility ──
// Maps raw Supabase auth errors to user-friendly messages.

export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const msg =
    typeof error === 'string'
      ? error.toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

  // Invalid credentials
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return 'The email or password you entered is incorrect. Please check and try again.';
  }
  if (msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  // Email not confirmed
  if (msg.includes('email not confirmed') || msg.includes('email not verified')) {
    return 'Please verify your email address before logging in. Check your inbox for the confirmation link.';
  }

  // Already registered
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already registered')) {
    return 'An account with this email address already exists. Please log in instead.';
  }

  // Weak password
  if (msg.includes('weak password') || msg.includes('password should be')) {
    return 'Your password is too weak. Please use at least 8 characters with a mix of letters and numbers.';
  }

  // Rate limited
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('try again later')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Expired / invalid recovery link
  if (msg.includes('expired') || msg.includes('token has expired') || msg.includes('recovery token')) {
    return 'This link has expired or is no longer valid. Please request a new password reset.';
  }

  // Session expired
  if (msg.includes('session expired') || msg.includes('session not found') || msg.includes('jwt expired')) {
    return 'Your session has expired. Please log in again.';
  }

  // Network
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('abort')) {
    return 'A network error occurred. Please check your connection and try again.';
  }

  // Missing configuration
  if (msg.includes('supabase') && (msg.includes('url') || msg.includes('key') || msg.includes('not configured'))) {
    return 'The application is not fully configured. Please contact support.';
  }

  // Password update specific
  if (msg.includes('new password should be different')) {
    return 'Your new password must be different from your current password.';
  }

  // Generic fallback — never expose raw errors
  return 'Something went wrong. Please try again or contact support if the issue persists.';
}

// ── Safe log for development (never logs tokens or passwords) ──
export function safeAuthLog(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    const safeMsg =
      error instanceof Error ? error.message.replace(/token[=:]\s*\S+/gi, 'token=[redacted]') : String(error);
    console.warn(`[Auth] ${context}:`, safeMsg);
  }
}