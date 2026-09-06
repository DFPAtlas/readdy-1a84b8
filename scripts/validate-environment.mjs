/**
 * Vowora Environment Validation Script (CI)
 *
 * Usage: node scripts/validate-environment.mjs [environment]
 *   environment: preview | staging | production (default: auto-detect)
 *
 * Exits 0 on success, 1 on validation failure.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  const env = { ...process.env };

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  }
  return env;
}

function detectEnvironment(env) {
  const vercelEnv = env.VERCEL_ENV || '';
  const netlifyContext = env.CONTEXT || '';
  const siteUrl = (env.VITE_PUBLIC_SITE_URL || '').toLowerCase();
  const nodeEnv = (env.NODE_ENV || env.MODE || '').toLowerCase();
  const headRef = env.GITHUB_HEAD_REF || '';
  const vercelRef = env.VERCEL_GIT_COMMIT_REF || '';

  if (vercelEnv === 'production' || netlifyContext === 'production') return 'production';
  if (vercelEnv === 'preview' || netlifyContext === 'deploy-preview') return 'preview';
  if (headRef || vercelRef.includes('pull')) return 'preview';
  if (nodeEnv === 'production') {
    if (siteUrl && !siteUrl.includes('localhost')) return 'production';
    return 'staging';
  }
  if (siteUrl && siteUrl.includes('staging')) return 'staging';
  return 'preview';
}

const FORBIDDEN_CLIENT_KEYS = [
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'TOSS_SECRET_KEY', 'SHOPIFY_API_SECRET',
  'SENDGRID_API_KEY', 'MAILCHIMP_API_KEY', 'OPENAI_API_KEY',
];

function validate(env, environment) {
  const isProd = environment === 'production';
  const isStaging = environment === 'staging';
  const errors = [];
  const warnings = [];

  const DEMO_MODE = env.VITE_DEMO_MODE;
  const SITE_URL = env.VITE_PUBLIC_SITE_URL || '';
  const SUPABASE_URL = env.VITE_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
  const RELEASE_VERSION = env.VITE_RELEASE_VERSION || '';
  const STRIPE_PK = env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const GOOGLE_MAPS_KEY = env.VITE_PUBLIC_GOOGLE_MAPS_KEY || '';

  // Demo mode
  if (isProd && DEMO_MODE === 'true') {
    errors.push('VITE_DEMO_MODE=true in production build');
  }
  if (isStaging && DEMO_MODE === 'true') {
    warnings.push('VITE_DEMO_MODE=true in staging build');
  }

  // Site URL
  if ((isProd || isStaging) && !SITE_URL) {
    errors.push('VITE_PUBLIC_SITE_URL is not set');
  }
  if (isProd && SITE_URL && !SITE_URL.startsWith('https://')) {
    errors.push(`VITE_PUBLIC_SITE_URL does not use HTTPS: ${SITE_URL}`);
  }
  if (isProd && SITE_URL && SITE_URL.includes('localhost')) {
    errors.push(`VITE_PUBLIC_SITE_URL is localhost in production: ${SITE_URL}`);
  }

  // Supabase
  if (!SUPABASE_URL) {
    errors.push('VITE_PUBLIC_SUPABASE_URL is not set');
  } else if (!SUPABASE_URL.startsWith('https://')) {
    errors.push(`VITE_PUBLIC_SUPABASE_URL does not use HTTPS: ${SUPABASE_URL}`);
  }
  if (!SUPABASE_ANON_KEY) {
    errors.push('VITE_PUBLIC_SUPABASE_ANON_KEY is not set');
  } else if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    warnings.push('VITE_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT');
  }

  // Release version
  if (isProd && (!RELEASE_VERSION || RELEASE_VERSION === 'dev')) {
    errors.push('VITE_RELEASE_VERSION is unset or still "dev" in production');
  }

  // Stripe test key in production
  if (isProd && STRIPE_PK && STRIPE_PK.startsWith('pk_test_')) {
    errors.push('VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key in production build');
  }

  // Google Maps
  if (isProd && !GOOGLE_MAPS_KEY) {
    warnings.push('VITE_PUBLIC_GOOGLE_MAPS_KEY is not set - maps will not render');
  }

  // Leaked server secrets to VITE_ prefix
  for (const key of Object.keys(env)) {
    if (!key.startsWith('VITE_')) continue;
    const normalized = key.replace(/^VITE_PUBLIC_/, '').replace(/^VITE_/, '').toUpperCase();
    for (const forbidden of FORBIDDEN_CLIENT_KEYS) {
      if (normalized === forbidden || normalized.includes(forbidden)) {
        errors.push(`Server secret leaked to client env: ${key} (matches ${forbidden})`);
        break;
      }
    }
  }

  return { errors, warnings };
}

function checkSourceForSecrets() {
  const srcDir = resolve(PROJECT_ROOT, 'src');
  if (!existsSync(srcDir)) return [];

  const secretPatterns = [
    { name: 'Stripe secret key', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
    { name: 'Stripe test secret key', pattern: /sk_test_[0-9a-zA-Z]{24,}/ },
    { name: 'Supabase service role', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}.*service_role/ },
    { name: 'Resend API key', pattern: /re_[A-Za-z0-9]{20,}/ },
    { name: 'Generic JWT with secret', pattern: /['"]eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"]/ },
  ];

  const findings = [];

  function scanDir(dir) {
    const entries = readFileSync; // placeholder — need fs.readdirSync
    // We'll skip recursive source scanning in the script since gitleaks handles it in CI.
    // This script focuses on env validation.
  }

  return findings;
}

// ── Main ──

const env = loadEnv();
const environment = process.argv[2] || detectEnvironment(env);

console.log(`\n🔍 Vowora Environment Validation`);
console.log(`   Environment: ${environment}`);
console.log('');

const result = validate(env, environment);

if (result.errors.length > 0) {
  console.log('❌ ERRORS:');
  for (const err of result.errors) {
    console.log(`   ${err}`);
  }
}

if (result.warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  for (const warn of result.warnings) {
    console.log(`   ${warn}`);
  }
}

console.log('');

if (result.errors.length > 0) {
  console.log(`Validation FAILED — ${result.errors.length} error(s), ${result.warnings.length} warning(s)\n`);
  process.exit(1);
} else {
  console.log(`Validation PASSED — 0 errors, ${result.warnings.length} warning(s)\n`);
  process.exit(0);
}