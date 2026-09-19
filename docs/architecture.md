# Architecture

## Layers

```
src/app/**/page.tsx        Server components: fetch + render. No Prisma, no business rules.
src/app/api/**/route.ts    HTTP endpoints for things a browser cannot do (QR PNG, invoice PDF, rates).
src/features/*/actions.ts  Server actions: read FormData, validate with Zod, call a service, revalidate.
src/features/*/service.ts  Domain logic + authorisation. The only layer that touches Prisma.
src/server/services/*      Cross-cutting services: email, notifications, maps, payments, storage,
                           moderation, search, pdf.
src/server/core/*          Session, guards, permissions, runAction, audit, page guards.
src/lib/*                  Pure helpers: enums, env, errors, rate-limit, security, i18n, utils.
```

A request flows **page → action → service → db**. Nothing skips a layer: a page never calls Prisma, and a service never renders JSX. That is what makes the permission checks auditable — there is exactly one place per feature where access is decided.

## Server actions and `runAction`

Every mutation goes through `runAction` (`src/server/core/action.ts`):

```ts
export async function createTaskAction(formData: FormData) {
  return runAction({
    schema: taskSchema,             // Zod: field-level errors for the form
    input: readTask(formData),
    successMessage: 'Task added.',
    handler: (data, { user }) => createTask(user!.id, data),
  });
}
```

`runAction` guarantees:

- the user is signed in unless `requireAuth: false`,
- input is validated, and Zod issues become `{ field: message }` pairs the form renders next to the right input,
- `AppError` subclasses become a friendly message (`NotFoundError`, `ForbiddenError`, `ConflictError`, `RateLimitError`),
- unexpected errors are logged server-side and return a generic message — never a stack trace,
- the result is always a serialisable `ActionResult<T>`.

`ServerForm` (`src/components/forms/server-form.tsx`) owns the client half: pending state, toasts, per-field errors and `router.refresh()` after success. `ConfirmActionButton` wraps destructive actions in a dialog, so nothing destructive is one click away.

## Permissions

`src/server/core/permissions.ts` maps roles to permission keys (`moderate:content`, `users:manage`, `resources:verify`, `campaigns:verify`, `categories:manage`, `settings:manage`, `audit:view`, `content:feature`, `data:export`) with a short-lived cache.

- `requireUserPage` / `requireStaffPage` / `requireAdminPage` redirect at the page level.
- `requireUser` / `requireStaff` / `requirePermission` throw inside services and actions.
- Group-level permissions use a rank (`owner` 4 → `member` 1): announcements and invites need moderator, role changes need admin and only downward, removals cannot target an equal or higher rank, and owners cannot leave.

## Data flow for a typical feature

Taking expenses as an example:

1. `expenses/page.tsx` calls `listExpenses()` and renders `ExpenseForm` + `ExpenseRow`.
2. `ExpenseForm` posts to `createExpenseAction`.
3. `runAction` validates with `expenseSchema`.
4. `createExpense()` checks split membership (`assertSplitAllowed`), creates the expense plus `ExpenseSplit` rows with `splitEvenly()`, writes an activity log entry and returns the row.
5. The action revalidates `/expenses`; `ServerForm` shows a toast and the list re-renders.

## Privacy model

- **Visibility flags** live on the content (`HelpRequest.visibility`, `Note.visibility`, `Trip.visibility`, `Profile.profileVisibility`) and are applied in the query, not in the view.
- **Search** (`src/server/services/search.ts`) filters by visibility, excludes blocked users both ways, and never returns private notes or unpublished listings.
- **Location** is rounded by `approximate(point, precision)` from the maps service before anything is shown publicly.
- **IP addresses** are hashed (`hashIp`) before they are written to the audit log; the raw address is never stored.
- **Utility tools** never round-trip their input: passwords, hashes and conversions stay in the browser, and the QR endpoint stores nothing.

## Errors

`src/lib/errors.ts` defines `AppError` and its subclasses with optional `fieldErrors`. `isAppError()` is the single type guard. Services throw; actions translate; pages render `notFound()` or a redirect.

## Rate limiting

`src/lib/rate-limit.ts` exposes named buckets (`login`, `register`, `message`, `comment`, `create`, `report`, `upload`, `search`) backed by an in-memory store by default and a Redis sliding-window script when `REDIS_URL` is set. Login and register are additionally keyed by IP.

## Internationalisation

`messages/en.json` and `messages/hi.json` hold UI strings; `src/lib/i18n/messages.ts` reads them. Content entered by members is never translated automatically.

## Why not a separate API

OpenHub is a single deployable. Server actions cover everything the UI needs; the four API routes exist for things a form cannot produce (a PNG, a PDF, a proxied rate lookup). If you need a public REST API, add routes under `src/app/api` and reuse the same services — the authorisation logic is already there.
