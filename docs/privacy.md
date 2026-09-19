# Privacy

This document describes the privacy behaviour of the software. If you operate an instance for other people, you are the data controller: publish your own contact details, retention period and legal basis.

The same text is rendered in the app at `/privacy`, so members see it without leaving the product.

## What OpenHub stores

| Category | Examples |
| --- | --- |
| Account | email, username, scrypt password hash, role, last login, locale, theme |
| Profile (opt-in fields) | display name, bio, city, country, website, availability, member types, skills, interests, languages |
| Content you create | tasks, notes, habits, bookmarks, calendar events, expenses, help posts, comments, messages, uploads, invoices, trips |
| Community records | group membership, votes, saved items, reports, moderation actions, audit log entries |
| Sessions | hashed token, device info, expiry |

## What OpenHub never stores

- **Plain-text passwords.** Passwords are hashed with scrypt (`N=16384, r=8, p=1`) with a per-password salt; the stored format is `scrypt$N$r$p$salt$hash`.
- **Utility tool input.** Passwords, hashes, QR text, unit conversions and CSV data stay in the browser. The QR endpoint encodes and returns an image without persisting the text.
- **Payment card data.** There is no payment processing; only an optional provider interface.
- **Advertising or analytics identifiers.** No tracking pixels, no third-party analytics, no ad scripts.

## Member controls

- **Settings → Privacy**: profile visibility (`public` / `community` / `private`), show city, show online status, show recent activity, appear in search, who can message you (`everyone` / `contacts` / `none`), show public group memberships.
- **Settings → Notifications**: in-app and email on/off, digest frequency, and per-type muting.
- **Settings → Security & data**: change password (signs out other devices), download your data as JSON, delete your account.
- **Per post**: choose public or private visibility, edit or delete later.
- **Per member**: block them — you stop appearing in each other's search results, directories and threads immediately.

## Who can see what

- Private profiles never appear in `/members` or search results.
- Local resources show a street-level address, never a member's home.
- Skill exchange and help posts use a city, not coordinates; coordinates are rounded before they are ever shown.
- Messages are readable only by participants; moderators see them only through a report, and that view is audited.
- Unified search respects every visibility flag, and excludes users who blocked you (in either direction).
- Moderators and administrators can view reported content. Each view and action is written to the audit log.

## Retention and deletion

- Deleting your account removes your profile, content and sessions immediately.
- Moderation and audit records are kept because they document decisions about abuse; they reference your user id, which is unlinked.
- Instance operators decide backups and retention. Nothing leaves your server unless you configure an optional service.

## Optional services and what they see

| Service | Enabled by | What it receives |
| --- | --- | --- |
| SMTP / Resend | `EMAIL_PROVIDER` | Recipient address and message body |
| Object storage | `STORAGE_PROVIDER=s3` | Uploaded files |
| Currency API | `CURRENCY_API_KEY` | Two currency codes |
| Redis | `REDIS_URL` | Rate-limit keys only (no content) |
| Maps | `MAP_PROVIDER` | Nothing — links are generated in the browser |

Every one of these is optional. With none configured, OpenHub still runs its full feature set using the local disk, the console mailer, offline currency rates and an in-memory rate limiter.

## Security measures

- Passwords hashed with scrypt; session tokens stored hashed and delivered in httpOnly cookies.
- CSRF protection through Next.js server actions and same-site cookies.
- A Content-Security-Policy header and `X-Frame-Options: DENY` unless you explicitly allow embedding.
- Rate limiting on login, registration, messaging, commenting, creation, reporting, uploads and search.
- IP addresses hashed before being written to the audit log.
- Strict TypeScript, ESLint with zero warnings, and a test suite covering the permission-sensitive paths.

## Reporting a privacy problem

See [SECURITY.md](../SECURITY.md) for responsible disclosure. If you are a member of a hosted instance and want your data removed, contact that instance's administrator.
