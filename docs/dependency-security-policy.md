# Vowora Dependency Security Policy

**Version:** 1.0
**Last updated:** 2026-08-05

---

## Overview

This policy defines how Vowora manages third-party dependencies, vulnerability scanning, and update workflows to minimise supply-chain risk.

## Scope

All dependencies in `package.json` (production and development) and any transitive dependencies.

## Vulnerability Classification

| Severity | Production Dep | Dev Dep | Release Gate |
|----------|---------------|---------|-------------|
| Critical | BLOCK release | Review within 24h | FAIL |
| High (reachable) | BLOCK release | Fix within 7 days | FAIL |
| High (unreachable/ disputed) | Document exception | Fix within 14 days | PASS (documented) |
| Medium | Fix within 30 days | Fix within 60 days | PASS |
| Low | Fix within 90 days | Fix when convenient | PASS |

## Scanning Schedule

| Trigger | Scan Type | Tool |
|---------|-----------|------|
| Every push / PR | `npm audit --audit-level=high` | npm audit |
| Release workflow | `npm audit --audit-level=critical` | npm audit |
| Daily (scheduled) | Full dependency scan | Dependabot / Renovate |
| On-demand | `npm audit --json` | Manual review |

## CI Integration

The CI `security-scan` job runs on every PR and push:

```yaml
- name: npm audit (production deps only)
  run: npm audit --production --audit-level=high

- name: npm audit (all deps)
  run: npm audit --audit-level=critical || true
```

### Release Gate Rules

In the release workflow, critical vulnerabilities block deployment:

```yaml
- name: Critical vulnerability check
  run: |
    AUDIT=$(npm audit --json 2>/dev/null || true)
    if echo "$AUDIT" | grep -q '"critical"'; then
      echo "::error::Critical vulnerabilities — resolve before release"
      exit 1
    fi
```

## Automated Updates (Dependabot / Renovate)

### Update Groups

| Group | Packages | Frequency | Auto-Merge |
|-------|----------|-----------|------------|
| Patch frontend | React, react-dom, react-router-dom | Weekly | ❌ (CI must pass) |
| Build tooling | Vite, typescript, eslint, tailwindcss | Weekly | ❌ |
| Testing | vitest, @testing-library/*, jsdom | Weekly | ❌ |
| Supabase | @supabase/supabase-js | Monthly | ❌ |
| Stripe | @stripe/* | Monthly | ❌ |
| Major versions | All | Manual review | ❌ |

### Update PR Requirements
- Must pass all CI gates (type-check, lint, test, build)
- Patch/minor: auto-created, merge after CI passes
- Major versions: require explicit review and manual testing
- Dependency removal: any dependency that becomes unused must be removed

## Allowed Licenses

Production dependencies should use one of:
- MIT
- ISC
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- CC0-1.0

Dependencies with unusual licenses (GPL, AGPL, etc.) require legal review before inclusion.

## Secret Scanning

### Gitleaks (Pre-commit + CI)

Configured in `.gitleaks.toml`. Scans for:
- Stripe secret keys (`sk_live_*`, `sk_test_*`)
- Supabase service role keys (JWTs with `service_role` claim)
- Resend API keys (`re_*`)
- Generic API keys
- Private keys (RSA, EC, etc.)
- Webhook secrets

### What to Do If a Secret Is Found
1. **Do not push** if found pre-commit
2. If already committed: rotate the secret immediately
3. Purge the secret from Git history
4. Document the incident
5. Review `.gitleaks.toml` to prevent recurrence

### Allowlist
Approved placeholders that match secret patterns:
- `.env.example` — `your_key_here`, `your_supabase_url`
- Test fixtures — fake test keys with test prefixes
- Documentation — example keys clearly marked as such

## Dependency Audit Checklist (Monthly)

Run this monthly and document results:

- [ ] `npm outdated` — review all outdated packages
- [ ] `npm audit` — review and triage all vulnerabilities
- [ ] Remove unused dependencies (`npx depcheck`)
- [ ] Check for deprecated packages
- [ ] Check for duplicate major versions
- [ ] Review license changes in updated packages
- [ ] Update lockfile: `npm install --package-lock-only`
- [ ] Document any accepted risks

## Emergency Vulnerability Response

If a critical vulnerability is disclosed in a Vowora dependency:

1. **Assess** — is Vowora affected? Is the vulnerable path reachable?
2. **Mitigate** — apply the patched version if available
3. **Workaround** — if no patch exists, implement mitigation
4. **Deploy** — hotfix release if production is affected
5. **Document** — record the incident and resolution

## Supply-Chain Hardening

### Current Measures
- Lockfile committed and verified in CI
- npm audit on every push
- Gitleaks secret scanning pre-commit and in CI
- Production build environment validation
- GitHub branch protection on `main`

### Future Improvements
- [ ] npm package signing verification
- [ ] Software Bill of Materials (SBOM) generation
- [ ] Dependency provenance attestation
- [ ] Regular penetration testing of third-party integrations
- [ ] Automated license compliance checking in CI

---

*Last updated: 2026-08-05. Vulnerability classifications may require org-specific approval.*