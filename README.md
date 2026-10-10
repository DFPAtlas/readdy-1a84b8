# Vowora

Wedding planning application built in GitHub and imported into Readdy in substantial releases.

Use Node 22.12+ or Node 24 (CI uses Node 24), then `npm ci`. Copy `.env.example` to `.env` and set public configuration. Server secrets belong only in Supabase.

```sh
npm run dev
npm run type-check
npm run lint
npm test
npm run test:database
npm run check:edge
npx playwright install chromium
npm run test:e2e
npm run build
```

Database tests reproduce the existing Vowora schema before applying migrations; they do not modify a remote project. Browser smoke tests use synthetic backend/asset responses.

- [Three-phase implementation and customer journey](docs/THREE-PHASE-BUILD.md)
- [Build validation and limits](docs/BUILD-VALIDATION.md)
- [One Readdy handoff and launch checks](docs/RELEASE-HANDOFF.md)

Do not pull intermediate GitHub commits into Readdy. Import the verified integrated main branch once, after backend preparation.
