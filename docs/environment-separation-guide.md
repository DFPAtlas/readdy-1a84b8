# Vowora Environment Separation Guide

**Version:** 1.0
**Last updated:** 2026-08-05

---

## Overview

Vowora uses three distinct environments to safely develop, test, and release changes. Each environment has strict isolation rules to prevent data leaks, accidental customer contact, and configuration mismatch.

## Environment Summary

| Property | Preview | Staging | Production |
|----------|---------|---------|------------|
| **Purpose** | PR review, feature testing | Pre-release validation | Live customer service |
| **Data** | Isolated, test-only | Test data, no PII | Real customer data |
| **Supabase** | Preview project | Staging project | Production project |
| **Stripe** | Test mode | Test mode | Live mode |
| **Resend** | Disabled | Test recipients only | Verified domain, live |
| **Demo Mode** | May be enabled | `false` | `false` (hard gate) |
| **Auth** | Test accounts only | Test accounts only | Real user accounts |
| **RLS** | Enabled | Enabled | Enabled |
| **Access** | Developers, reviewers | Developers, QA | Authorised deployers |
| **Deployment** | Automatic (PR) | Manual trigger | Manual approval |
| **Monitoring** | Minimal | Standard | Full (24hr post-deploy) |

## Preview Environment

### When Created
- Automatically for every pull request
- Rebuilt on each push to the PR branch

### Rules
- Must NOT access production Supabase project
- Must NOT send real customer emails
- Must NOT process real payments
- Must NOT contain production service-role credentials
- Must NOT run destructive tests against shared databases
- Demo mode can be enabled for client preview
- Expires 7 days after PR close

### Configuration
```
VITE_DEMO_MODE=false (or true for client preview)
VITE_PUBLIC_SITE_URL=https://preview-{hash}.example.com
VITE_PUBLIC_SUPABASE_URL=<preview-supabase-url>
VITE_PUBLIC_SUPABASE_ANON_KEY=<preview-anon-key>
VITE_RELEASE_VERSION=pr-{number}
```

## Staging Environment

### When Deployed
- Manual trigger via Release workflow (`staging` option)
- After all CI gates pass on the release commit
- Before production promotion

### Rules
- Mirrors production architecture as closely as possible
- Uses separate Supabase project (staging, not preview)
- Stripe test mode only — test cards and test webhooks
- Resend: only send to approved test recipients
- No production customer data — use representative test data
- No production secrets — use staging-specific values
- Must NOT copy production personal data into staging
- Demo mode must be `false`

### Staging Verification Checklist
- [ ] All CI gates pass
- [ ] Environment validation passes
- [ ] Public homepage loads
- [ ] Auth works (create test account)
- [ ] Guest invitation validates
- [ ] RSVP submission works
- [ ] Wedding website builder loads
- [ ] Gallery upload works
- [ ] Stripe test checkout completes
- [ ] Webhook processing works
- [ ] Email sends to test recipients
- [ ] System-readiness all PASS
- [ ] No demo data present
- [ ] Cross-wedding access blocked
- [ ] Mobile layouts tested at 375px

### Configuration
```
VITE_DEMO_MODE=false
VITE_PUBLIC_SITE_URL=https://staging.vowora.uk
VITE_PUBLIC_SUPABASE_URL=<staging-supabase-url>
VITE_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
VITE_RELEASE_VERSION=<version>
VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY=<staging-stripe-test-pk>
```

## Production Environment

### When Deployed
- Manual trigger via Release workflow (`production` option)
- Requires explicit manual approval in GitHub Environments
- Only after staging verification (when promoted from staging)
- Only from approved branches (`main` or release tags)

### Hard Gates (Deployment BLOCKED if any fail)
1. `VITE_DEMO_MODE` must be `false` — CI fails if `true`
2. `VITE_PUBLIC_SITE_URL` must use HTTPS — CI fails if not
3. `VITE_PUBLIC_SITE_URL` must NOT be localhost — CI fails
4. `VITE_RELEASE_VERSION` must be set and not `dev`
5. No critical dependency vulnerabilities — security scan fails
6. No secrets found in source — Gitleaks scan fails
7. All unit tests pass
8. TypeScript has zero errors
9. Lint has zero warnings
10. Production build succeeds

### Production Deployment Steps
1. Backup confirmed (Supabase manual backup)
2. Migrations applied (backward-compatible)
3. Edge Functions deployed
4. Frontend deployed
5. Smoke tests pass
6. Release verified
7. Rollback target recorded

### Configuration
```
VITE_DEMO_MODE=false
VITE_PUBLIC_SITE_URL=https://vowora.uk
VITE_PUBLIC_SUPABASE_URL=<production-supabase-url>
VITE_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
VITE_RELEASE_VERSION=<version>
VITE_BUILD_TIMESTAMP=<iso-timestamp>
VITE_PUBLIC_GOOGLE_MAPS_KEY=<production-key>
VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY=<production-stripe-live-pk>
```

## Environment Validation

Run before any deployment:

```bash
# Validate current environment
node scripts/validate-environment.mjs

# Validate specific environment
node scripts/validate-environment.mjs production
node scripts/validate-environment.mjs staging
node scripts/validate-environment.mjs preview
```

### What It Checks
- Required `VITE_` environment variables are present
- Production has `VITE_DEMO_MODE=false`
- Production has valid HTTPS public URL (no localhost)
- Supabase URL uses HTTPS
- Server-only secrets not leaked into `VITE_` prefix
- Release version set for production (not `dev`)
- Stripe test keys not used in production
- Google Maps key set for production (warning only)

## Cross-Environment Safety

### Data Must Never Flow
- Production → Staging (customer PII)
- Production → Preview (customer PII)
- Staging → Production (test data contamination)

### Secrets Must Never Flow
- Production secrets → Preview environments
- Service-role keys → Any client-side build
- Production Supabase URL → Preview projects

### What CAN Flow
- Staging → Production: validated code, migrations, Edge Functions
- Preview → Staging: approved PR code
- Documentation, configuration templates, test fixtures

## Emergency Procedures

### If Production Secrets Are Leaked to Staging
1. Rotate the leaked secret immediately
2. Purge staging database of any production data
3. Review access logs
4. Document the incident

### If Demo Mode Accidentally Reaches Production
1. Initiate immediate rollback
2. Verify `VITE_DEMO_MODE=false` in `.env`
3. Rebuild and redeploy
4. Add CI gate if missing

### If Cross-Wedding Data Exposure Detected
1. Initiate immediate rollback (Critical severity)
2. Investigate RLS policies
3. Review recent migration changes
4. Document the incident
5. Fix and re-verify before re-deployment

---

*Last updated: 2026-08-05. Do not include real secret values in this document.*