# Contributing to OpenHub

Thank you — community infrastructure is only as good as the people maintaining it.

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first. Security problems go to [SECURITY.md](SECURITY.md), not to a public issue.

## Getting started

```bash
git clone <your-fork> && cd helpful-to-all
cp .env.example .env           # set AUTH_SECRET
npm install
npm run setup:sqlite           # SQLite database + demo data
npm run dev                    # http://localhost:3000
```

Demo accounts (password `OpenHub!2345`): `admin@openhub.test`, `priya@openhub.test`, `rahul@openhub.test`.

Before you push:

```bash
npm run check        # typecheck + lint + unit tests
npm run test:e2e     # optional: needs `npx playwright install chromium`
npm run format
```

`npm run lint` runs with `--max-warnings=0`, so a new warning fails CI.

## How the code is organised

```
src/app/          routes: (site) public pages, (app) shell pages, (auth), api/
src/features/     one folder per domain: schemas.ts + service.ts + actions.ts + components.tsx
src/server/       core (session, guards, permissions, runAction, audit) and services
src/components/   UI primitives and layout
src/lib/          pure helpers
```

**Rules the codebase follows** (see [docs/architecture.md](docs/architecture.md) for the reasoning):

1. Pages never call Prisma. They call a feature service.
2. Authorisation lives in the service, not in the UI.
3. Every mutation goes through `runAction`, which validates with Zod and returns an `ActionResult`.
4. Destructive actions use `ConfirmActionButton`, never a bare button.
5. Errors are thrown as `AppError` subclasses and translated by `runAction`.
6. Moderation-relevant writes call `audit()`.
7. Nothing dialect-specific outside `src/lib/db-config.ts` — use `contains()` rather than `mode: 'insensitive'`.
8. No secrets in source. New configuration goes in `.env.example`, `src/lib/env.ts` and `docs/environment.md`.

## Adding a feature

1. **Schema first.** `features/<name>/schemas.ts` with Zod schemas and any pure helpers (pure helpers are what the unit tests cover).
2. **Service next.** Queries plus permission checks. Throw `ForbiddenError` / `NotFoundError` / `ConflictError`.
3. **Actions.** Thin wrappers: read FormData, `runAction`, revalidate.
4. **Components.** Use the existing primitives (`Field`, `ServerForm`, `ConfirmActionButton`, `Card`, `Tabs`, `EmptyState`). Every list needs an empty state; every form needs error and pending states.
5. **Page.** Fetch, render, pass data down.
6. **Seed.** Add demo rows so reviewers can see the feature working.
7. **Tests.** Unit tests for the pure logic; extend an e2e journey if the feature changes a user flow.
8. **Docs.** Mention it in the README feature list and in `docs/api.md` if it adds actions.

## Conventions

- **TypeScript strict.** No `any` without an eslint-disable comment explaining why.
- **Accessibility.** Labels on every input (`Field` generates ids), `aria-pressed` on toggles, focus rings preserved, dialogs for confirmations. Test with a keyboard before you open the PR.
- **Mobile.** Everything must work at 360px. Use the existing responsive grid classes.
- **Copy.** Plain language. Say what happens, not what the button is called ("Hide this post" not "Submit").
- **Disclaimers stay.** Do not remove the medical/legal/financial, emergency-services or donation warnings.

## Pull requests

- Small, focused PRs. One feature or one fix.
- Describe what you changed and how you tested it (`npm run check`, which journeys you ran).
- Screenshot anything user-visible, desktop and mobile.
- Update docs in the same PR.

## Reporting issues

Include: what you expected, what happened, the page or action involved, your Node version and database dialect, and the relevant server log lines. If it involves personal data, redact it.

## Licensing

Contributions are made under the project licence (AGPL-3.0). By submitting a pull request you agree to licence your contribution under the same terms.
