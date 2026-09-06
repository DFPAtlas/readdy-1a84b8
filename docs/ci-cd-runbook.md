# Vowora CI/CD Runbook

**Version:** 1.0
**Last updated:** 2026-08-05

---

## Overview

This runbook covers the complete continuous integration and deployment pipeline for Vowora. Every code change flows through automated validation gates before reaching production.

## Pipeline Architecture

```
Pull Request → CI Gates → Preview Deploy → Review → Merge
                                                       ↓
                                              Staging Deploy → Smoke Tests
                                                       ↓
                                              Production Approval
                                                       ↓
                                              Production Deploy → Verify
```

## 1. Pull Request Checks

Every pull request triggers automated validation:

| Gate | Tool | Pass Condition |
|------|------|---------------|
| Repository check | Shell | Lockfile present, no merge conflicts, no committed .env |
| TypeScript | `tsc --noEmit` | Zero type errors |
| Lint | `eslint src` | Zero warnings |
| Unit tests | `vitest run` | All tests pass |
| Production build | `vite build` | Build succeeds with no errors |
| Environment validation | `scripts/validate-environment.mjs` | No errors |
| Security scan | Gitleaks + npm audit | No critical vulns or secret leaks |
| Accessibility | Vitest axe assertions | No critical a11y violations |

### How to Run Locally

```bash
npm ci
npm run type-check
npm run lint
npx vitest run
npm run build
node scripts/validate-environment.mjs preview
node scripts/validate-migrations.mjs
```

## 2. Preview Deployment

Triggered automatically for pull requests.

- Builds with `VITE_DEMO_MODE=false` for realistic preview
- Uses test Supabase project (never production data)
- Stripe test mode only
- No real email delivery
- Preview URL generated per PR
- Expires after PR merge or 7 days

## 3. Staging Promotion

Manual promotion via Release workflow:

1. Navigate to Actions → `Vowora Release` → Run workflow
2. Select `staging` environment
3. Enter release version (e.g., `2026.08.05.1`)
4. Enter release notes summary
5. Click Run workflow

### Staging Verification

After staging deploy, verify:
- [ ] Public homepage loads
- [ ] Auth works (login/signup/reset)
- [ ] Guest invitation validates
- [ ] RSVP submission works
- [ ] Wedding website builder loads
- [ ] Gallery upload works
- [ ] Billing checkout works (test mode)
- [ ] No demo data present
- [ ] System-readiness all PASS
- [ ] No console errors on critical routes

## 4. Production Approval

Required before any production deployment:

- [ ] All CI gates pass on the release commit
- [ ] Staging verified (if promoted from staging)
- [ ] Release version set (not `dev`)
- [ ] `VITE_DEMO_MODE=false` confirmed
- [ ] `VITE_PUBLIC_SITE_URL` is production domain
- [ ] `VITE_RELEASE_VERSION` is set
- [ ] Backup confirmed
- [ ] Migration plan documented
- [ ] Rollback release identified
- [ ] Release notes written
- [ ] Manual approval by authorised deployer

## 5. Backup Confirmation

Before any production deployment:

1. Go to Supabase Dashboard → your project → Database → Backups
2. Create a manual backup
3. Record: backup ID, timestamp, migration version
4. Verify backup completed successfully
5. Confirm restore procedure is documented

## 6. Migration Deployment

Database migrations are applied before frontend deployment:

1. Review pending migrations in `supabase/migrations/`
2. Apply in timestamp order via Supabase CLI or Dashboard
3. Verify each migration applied successfully
4. Run `scripts/validate-migrations.mjs`
5. Verify RLS remains enabled on all wedding-scoped tables
6. Run verification queries (see Launch Day Runbook)

## 7. Edge Function Deployment

Deploy all required Edge Functions:

```bash
# Deploy critical functions first
supabase functions deploy validate-invitation
supabase functions deploy submit-rsvp
supabase functions deploy provision-wedding-workspace

# Deploy payment functions
supabase functions deploy create-subscription-checkout
supabase functions deploy stripe-webhook-handler

# Deploy email functions
supabase functions deploy invitation-send
supabase functions deploy email-campaign-send

# Deploy remaining functions
supabase functions deploy guest-portal-loader
supabase functions deploy create-billing-portal-session
supabase functions deploy gift-fund-create-checkout
supabase functions deploy gallery-moderate
supabase functions deploy guest-gallery-upload
```

After deployment:
- [ ] Verify each function responds
- [ ] Check function logs for errors
- [ ] Verify required secrets are present

## 8. Frontend Deployment

1. Build production bundle: `npm run build` (with correct .env)
2. Verify bundle: no demo data, no localhost, no secrets
3. Deploy via hosting provider
4. Verify deployment: homepage loads, auth redirects work
5. Record deployment ID and rollback version

## 9. Smoke Testing

Run after every deployment:

```bash
npx playwright test tests/e2e/release-gates.spec.ts
```

Minimum checks:
- [ ] Public homepage (HTTP 200)
- [ ] Login/signup pages
- [ ] Pricing page
- [ ] Guest invitation validation
- [ ] RSVP submission flow
- [ ] Wedding website builder
- [ ] Gallery upload
- [ ] Billing checkout (test mode)
- [ ] No console errors on critical pages
- [ ] Mobile: no horizontal overflow at 375px

## 10. Release Verification

Before marking the release as complete:

- [ ] All smoke tests pass
- [ ] System-readiness all PASS
- [ ] Release version visible in operations tools
- [ ] Rollback target recorded
- [ ] Release evidence artifact uploaded
- [ ] Monitoring active (24-hour period minimum)

## 11. Rollback

If any critical issue is detected:

1. **Frontend**: Revert to previous deployment via hosting dashboard
2. **Edge Functions**: Re-deploy previous function versions
3. **Database**: Do NOT auto-reverse migrations. Classify each:
   - Safe reversible: apply reverse migration
   - Forward-fix required: create fix migration
   - Backup restoration: requires explicit approval
4. **Validate**: Re-run smoke tests after rollback
5. **Communicate**: Notify stakeholders

See `docs/rollback-runbook.md` for detailed procedure.

---

## CI Configuration Reference

### Required Secrets

| Secret | Purpose | Environment |
|--------|---------|------------|
| `VITE_PUBLIC_SUPABASE_URL` | Supabase project URL | All |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | All |
| `VITE_PUBLIC_SITE_URL` | Canonical site URL | Production, Staging |
| `VITE_RELEASE_VERSION` | Release identifier | Production |
| `VITE_DEMO_MODE` | Must be `false` | Production |

### Workflow Permissions

- `contents: read` (default for all jobs)
- `pull-requests: write` (CI workflow, for status checks)
- `deployments: write` (Release workflow)
- Production environment secrets are scoped and require manual approval

### Artifact Retention

| Artifact | Retention |
|----------|-----------|
| Coverage reports | 7 days |
| Build artifacts | 30 days |
| Release evidence | 90 days |

---

## Troubleshooting

### Build fails in CI but works locally

1. Check Node version matches CI (Node 20)
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm ci`
4. Check for OS-specific issues (CI runs Ubuntu)

### Migration validation fails

1. Check migration file naming: must be `YYYYMMDDHHMMSS_name.sql`
2. Check for duplicate migration names
3. Review destructive operations — add review comment if intentional
4. Verify new tables have RLS policies

### Security scan finds secrets

1. Check if the finding is a false positive (test data, docs, .env.example)
2. If real: rotate the exposed secret immediately
3. Remove the secret from source code
4. Add to `.gitleaks.toml` allowlist only if it's a known safe placeholder

### Release workflow permissions errors

1. Verify GitHub Environments are configured: Settings → Environments
2. Production environment requires manual approval reviewers
3. Check that required secrets are set per environment
4. Verify workflow file has correct `permissions` block

---

*Last updated: 2026-08-05. Do not include real secret values in this document.*