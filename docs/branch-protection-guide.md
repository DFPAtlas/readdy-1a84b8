# Vowora Branch Protection Guide

**Version:** 1.0
**Last updated:** 2026-08-05

---

## Overview

This guide documents the recommended branch protection rules for the Vowora repository. These settings are configured in GitHub Repository Settings → Branches → Branch Protection Rules.

---

## Branch Strategy

```
main        — Production-ready code, deployed to production
  └─ develop   — Integration branch, deployed to staging
       └─ feature/*  — Feature branches
       └─ fix/*      — Bug fix branches
       └─ chore/*    — Maintenance branches
       └─ docs/*     — Documentation branches
```

## Protected Branches

### `main` (Production)

**Status checks required before merging:**
- [x] Type Check (`type-check` CI job)
- [x] Lint (`lint` CI job)
- [x] Unit Tests (`test` CI job)
- [x] Build (`build` CI job)
- [x] Environment Validation (`env-validate` CI job)
- [x] Security Scan (`security-scan` CI job)

**Additional rules:**
- [x] Require pull request review before merging — minimum 1 approval
- [x] Require conversation resolution before merging
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] No force push
- [x] No branch deletion
- [x] Require branches to be up to date before merging
- [x] Require signed commits (if organisation policy requires)
- [x] Restrict push access to designated maintainers
- [x] Restrict who can dismiss pull request reviews

**Deployment:**
- Production deployment requires explicit manual approval
- Only deployable from `main` branch or version tags (`v*`)

### `develop` (Integration)

**Status checks required before merging:**
- [x] Type Check
- [x] Lint
- [x] Unit Tests
- [x] Build
- [x] Environment Validation (preview mode)
- [x] Security Scan

**Additional rules:**
- [x] Require pull request review — minimum 1 approval
- [x] No force push
- [x] No branch deletion

---

## Pull Request Requirements

### Template

Every pull request should answer:

```markdown
## What
{Brief description of the change}

## Why
{Reason for the change — link to issue or feature request}

## Testing
- [ ] TypeScript passes
- [ ] Lint passes
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Demo mode tested (if UI change)
- [ ] Production mode tested (if config change)

## Risk Assessment
- Risk level: Low / Medium / High
- Affected routes: {list}
- Database changes: Yes / No
- Edge Function changes: Yes / No
- Rollback plan: {brief plan}

## Screenshots
{Before/after if UI change}
```

### Review Checklist

Reviewers should verify:
- [ ] Code follows existing patterns and conventions
- [ ] No security regressions (RLS, auth, data scoping)
- [ ] No hardcoded secrets
- [ ] No accidental demo mode in production paths
- [ ] Imports use `@/` alias (no `../../`)
- [ ] New routes added to router config
- [ ] New DB tables have RLS policies
- [ ] Migrations follow naming convention
- [ ] Edge Functions have proper JWT verification
- [ ] Tests cover new functionality
- [ ] Demo mode and production mode both work
- [ ] Mobile responsiveness maintained

---

## Required CI Checks (Summary)

Every commit to `main` or `develop` must pass all of:

| # | Check | Command | Failure Action |
|---|-------|---------|---------------|
| 1 | Repository validation | Shell checks | Fix and recommit |
| 2 | TypeScript | `npm run type-check` | Fix type errors |
| 3 | Lint | `npm run lint` | Fix lint warnings |
| 4 | Unit tests | `npx vitest run` | Fix failing tests |
| 5 | Production build | `npm run build` | Fix build errors |
| 6 | Environment validation | `scripts/validate-environment.mjs` | Fix env config |
| 7 | Security scan | Gitleaks + npm audit | Fix vulns/leaks |

---

## Commit Guidelines

### Commit Messages

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`

Examples:
```
feat(guests): add bulk import from CSV
fix(rsvp): prevent duplicate submission on double-click
chore(deps): update @supabase/supabase-js to 2.57.4
ci(workflow): add migration validation job
```

### Things Never to Commit
- `.env` files (except `.env.example` with placeholders)
- `node_modules/`
- Build output (`out/`, `dist/`, `build/`)
- IDE configuration (`.vscode/`, `.idea/`)
- macOS metadata (`.DS_Store`)
- Database dumps
- Test credentials or API keys
- Large binary files without Git LFS

---

## Release Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Submit PR to `develop`
4. After review and CI, merge to `develop`
5. Verify on staging (deploy via Release workflow)
6. Create PR from `develop` to `main`
7. After review and CI, merge to `main`
8. Deploy to production via Release workflow
9. Tag release: `git tag v{version} && git push --tags`

---

## Emergency Hotfix Process

1. Create hotfix branch from `main`
2. Implement fix with tests
3. Submit PR directly to `main`
4. Expedite review (minimum 1 approval still required)
5. After CI passes, merge to `main`
6. Deploy to production immediately
7. Back-merge `main` into `develop`
8. Document the incident

---

## GitHub Settings (To Configure)

These settings must be manually configured in GitHub:

### Settings → Branches → Add Rule

**Rule name:** `main` protection

- [ ] Require a pull request before merging: ✅
  - [ ] Require approvals: ✅ (1)
  - [ ] Dismiss stale approvals: ✅
  - [ ] Require review from Code Owners: Optional
- [ ] Require status checks to pass before merging: ✅
  - [ ] Type Check
  - [ ] Lint
  - [ ] Unit & Integration Tests
  - [ ] Production Build
  - [ ] Environment Validation
  - [ ] Security Scan
- [ ] Require conversation resolution before merging: ✅
- [ ] Require signed commits: Based on org policy
- [ ] Require linear history: Optional
- [ ] Do not allow bypassing the above settings: ✅
- [ ] Restrict who can push to matching branches: ✅
- [ ] Allow force pushes: ❌
- [ ] Allow deletions: ❌

**Rule name:** `develop` protection

Same as `main` except:
- Fewer required status checks (Preview-level env validation is sufficient)

### Settings → Environments

**Environment:** `production`

- [ ] Required reviewers: ✅ (at least 1)
- [ ] Wait timer: Optional (0 minutes)
- [ ] Deployment branches: `main`
- [ ] Environment secrets: Configure `VITE_PUBLIC_*` vars

**Environment:** `staging`

- [ ] Required reviewers: Optional
- [ ] Deployment branches: `develop`, `main`
- [ ] Environment secrets: Configure staging-specific vars

---

*Last updated: 2026-08-05. Configure these settings in GitHub manually — they cannot be set via code.*