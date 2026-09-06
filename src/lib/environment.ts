/**
 * Vowora Environment Validation
 *
 * Validates required environment variables per environment type.
 * Used by CI/CD pipelines and the Vite build process.
 *
 * Environments: preview | staging | production
 */

// ── Types ──

export type EnvironmentType = 'preview' | 'staging' | 'production';

export interface ValidationResult {
  valid: boolean;
  environment: EnvironmentType;
  errors: string[];
  warnings: string[];
}

export interface ResolvedEnvironment {
  type: EnvironmentType;
  demoMode: boolean;
  siteUrl: string;
  supabaseUrl: string;
  releaseVersion: string;
  buildTimestamp: string;
  stripeMode: 'test' | 'live' | 'unknown';
  isCI: boolean;
  isPullRequest: boolean;
}

// ── Detection ──

export function detectEnvironment(): EnvironmentType {
  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || '';
  const vercelEnv = import.meta.env.VERCEL_ENV || '';
  const netlifyContext = import.meta.env.CONTEXT || '';
  const nodeEnv = import.meta.env.NODE_ENV || import.meta.env.MODE || '';
  const isPR = !!(
    import.meta.env.VERCEL_GIT_COMMIT_REF?.includes('pull') ||
    import.meta.env.GITHUB_HEAD_REF
  );

  if (vercelEnv === 'production' || netlifyContext === 'production') return 'production';
  if (vercelEnv === 'preview' || netlifyContext === 'deploy-preview' || isPR) return 'preview';
  if (nodeEnv === 'production') {
    if (siteUrl && !siteUrl.includes('localhost')) return 'production';
    return 'staging';
  }
  if (siteUrl && siteUrl.includes('staging')) return 'staging';
  if (siteUrl && siteUrl.includes('localhost')) return 'preview';
  return 'preview';
}

// ── Variable Access ──

export function getClientEnvVars(): Record<string, string | undefined> {
  return {
    VITE_DEMO_MODE: import.meta.env.VITE_DEMO_MODE,
    VITE_PUBLIC_SITE_URL: import.meta.env.VITE_PUBLIC_SITE_URL,
    VITE_PUBLIC_SUPABASE_URL: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
    VITE_PUBLIC_SUPABASE_ANON_KEY: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
    VITE_RELEASE_VERSION: import.meta.env.VITE_RELEASE_VERSION,
    VITE_BUILD_TIMESTAMP: import.meta.env.VITE_BUILD_TIMESTAMP,
    VITE_PUBLIC_GOOGLE_MAPS_KEY: import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_KEY,
  };
}

// ── Validation Rules ──

interface ValidationRule {
  name: string;
  check: () => { pass: boolean; message: string };
  environments: EnvironmentType[];
  severity: 'error' | 'warning';
}

function buildValidationRules(env: EnvironmentType): ValidationRule[] {
  const isProd = env === 'production';
  const isStaging = env === 'staging';

  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || '';
  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
  const demoMode = import.meta.env.VITE_DEMO_MODE;
  const releaseVersion = import.meta.env.VITE_RELEASE_VERSION || '';
  const googleMapsKey = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_KEY || '';

  return [
    // ── Demo Mode ──
    {
      name: 'VITE_DEMO_MODE must be false in production',
      check: () => ({
        pass: !isProd || demoMode !== 'true',
        message: isProd && demoMode === 'true'
          ? 'VITE_DEMO_MODE=true in production build — ABORT'
          : 'OK',
      }),
      environments: ['production'],
      severity: 'error',
    },
    {
      name: 'VITE_DEMO_MODE must be false in staging',
      check: () => ({
        pass: !isStaging || demoMode !== 'true',
        message: isStaging && demoMode === 'true'
          ? 'VITE_DEMO_MODE=true in staging build'
          : 'OK',
      }),
      environments: ['staging'],
      severity: 'warning',
    },

    // ── Site URL ──
    {
      name: 'VITE_PUBLIC_SITE_URL must be set',
      check: () => ({
        pass: !!siteUrl,
        message: !siteUrl ? 'VITE_PUBLIC_SITE_URL is not set' : 'OK',
      }),
      environments: ['production', 'staging'],
      severity: 'error',
    },
    {
      name: 'VITE_PUBLIC_SITE_URL must use HTTPS in production',
      check: () => ({
        pass: !isProd || siteUrl.startsWith('https://'),
        message: isProd && !siteUrl.startsWith('https://')
          ? `VITE_PUBLIC_SITE_URL does not use HTTPS: ${siteUrl}`
          : 'OK',
      }),
      environments: ['production'],
      severity: 'error',
    },
    {
      name: 'VITE_PUBLIC_SITE_URL must not use localhost in production',
      check: () => ({
        pass: !isProd || !siteUrl.includes('localhost'),
        message: isProd && siteUrl.includes('localhost')
          ? `VITE_PUBLIC_SITE_URL is localhost: ${siteUrl}`
          : 'OK',
      }),
      environments: ['production'],
      severity: 'error',
    },

    // ── Supabase ──
    {
      name: 'VITE_PUBLIC_SUPABASE_URL must be set',
      check: () => ({
        pass: !!supabaseUrl,
        message: !supabaseUrl ? 'VITE_PUBLIC_SUPABASE_URL is not set' : 'OK',
      }),
      environments: ['production', 'staging', 'preview'],
      severity: 'error',
    },
    {
      name: 'VITE_PUBLIC_SUPABASE_URL must use HTTPS',
      check: () => ({
        pass: supabaseUrl.startsWith('https://'),
        message: `VITE_PUBLIC_SUPABASE_URL does not use HTTPS: ${supabaseUrl}`,
      }),
      environments: ['production', 'staging'],
      severity: 'error',
    },
    {
      name: 'VITE_PUBLIC_SUPABASE_ANON_KEY must be set',
      check: () => ({
        pass: !!supabaseAnonKey,
        message: !supabaseAnonKey ? 'VITE_PUBLIC_SUPABASE_ANON_KEY is not set' : 'OK',
      }),
      environments: ['production', 'staging', 'preview'],
      severity: 'error',
    },
    {
      name: 'VITE_PUBLIC_SUPABASE_ANON_KEY must start with eyJ',
      check: () => ({
        pass: supabaseAnonKey.startsWith('eyJ'),
        message: 'VITE_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT',
      }),
      environments: ['production', 'staging'],
      severity: 'warning',
    },

    // ── Release Version ──
    {
      name: 'VITE_RELEASE_VERSION must be set in production',
      check: () => ({
        pass: !isProd || (!!releaseVersion && releaseVersion !== 'dev'),
        message: isProd
          ? 'VITE_RELEASE_VERSION is unset or still "dev" in production'
          : 'OK',
      }),
      environments: ['production'],
      severity: 'error',
    },

    // ── Stripe Compatibility ──
    {
      name: 'Stripe keys must not mix live/test in production',
      check: () => {
        // Client-side: we only check that no live Stripe publishable key pattern
        // appears in a preview build (which must use test mode)
        const stripePublishableKey = import.meta.env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
        if (isProd && stripePublishableKey && stripePublishableKey.startsWith('pk_test_')) {
          return {
            pass: false,
            message: 'VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key in production build',
          };
        }
        return { pass: true, message: 'OK' };
      },
      environments: ['production'],
      severity: 'error',
    },

    // ── Google Maps ──
    {
      name: 'VITE_PUBLIC_GOOGLE_MAPS_KEY should be set in production',
      check: () => ({
        pass: !isProd || !!googleMapsKey,
        message: isProd && !googleMapsKey
          ? 'VITE_PUBLIC_GOOGLE_MAPS_KEY is not set — maps will not render'
          : 'OK',
      }),
      environments: ['production'],
      severity: 'warning',
    },
  ];
}

// ── Validation Function ──

export function validateEnvironment(envOverride?: EnvironmentType): ValidationResult {
  const environment = envOverride || detectEnvironment();
  const rules = buildValidationRules(environment);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    if (!rule.environments.includes(environment)) continue;
    const { pass, message } = rule.check();
    if (!pass) {
      if (rule.severity === 'error') {
        errors.push(`[${rule.name}] ${message}`);
      } else {
        warnings.push(`[${rule.name}] ${message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    environment,
    errors,
    warnings,
  };
}

// ── Build-Time Check (for Vite plugins or scripts) ──

export function assertProductionBuild(): void {
  const result = validateEnvironment('production');
  if (!result.valid) {
    const msg = `Environment validation FAILED for production:\n${result.errors.join('\n')}`;
    throw new Error(msg);
  }
  if (result.warnings.length > 0) {
    console.warn(`Environment warnings for production:\n${result.warnings.join('\n')}`);
  }
}

// ── Forbidden Pattern Detection ──

const FORBIDDEN_CLIENT_PREFIXES = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TOSS_SECRET_KEY',
  'SHOPIFY_API_SECRET',
  'SENDGRID_API_KEY',
  'MAILCHIMP_API_KEY',
  'OPENAI_API_KEY',
];

/**
 * Detects server-only secrets that have leaked into client-side VITE_ variables.
 * Returns an array of offending variable names (without values).
 */
export function detectLeakedServerSecrets(envVars: Record<string, string | undefined>): string[] {
  const leaked: string[] = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (!key.startsWith('VITE_')) continue;
    const normalized = key.replace(/^VITE_PUBLIC_/, '').replace(/^VITE_/, '');
    const upper = normalized.toUpperCase();
    for (const forbidden of FORBIDDEN_CLIENT_PREFIXES) {
      if (upper === forbidden || upper.includes(forbidden)) {
        leaked.push(key);
        break;
      }
    }
  }
  return leaked;
}