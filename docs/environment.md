# Environment variables

Copy `.env.example` to `.env` and adjust. Only `AUTH_SECRET` and `DATABASE_URL` are required; everything else has a working default for local development.

Nothing in the source tree reads a secret directly — everything goes through `src/lib/env.ts`, which validates with Zod and fails fast at boot when a required value is missing.

---

## Database

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite path or a `postgresql://user:pass@host:5432/db?schema=public` URL. |
| `OPENHUB_DB` | inferred | `sqlite` or `postgresql`. Inferred from `DATABASE_URL` when unset; set it explicitly in production. |

SQLite is a development convenience (zero infrastructure). Use PostgreSQL for anything public: it is the dialect the migration and the Docker setup target.

## Security

| Variable | Default | Description |
| --- | --- | --- |
| `AUTH_SECRET` | — | **Required in production.** Used to derive the session cookie signature. Generate with `openssl rand -base64 32`. Rotating it signs everyone out. |
| `APP_URL` | `http://localhost:3000` | Absolute base URL for invite links, notifications and public business pages. |
| `SESSION_TTL_DAYS` | `30` | Session lifetime (1–365). |

## Email (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `EMAIL_PROVIDER` | `console` | `console` logs the message to the server console. `smtp` uses `SMTP_URL`. `resend` uses `RESEND_API_KEY`. |
| `SMTP_URL` | — | e.g. `smtp://user:password@localhost:1025`. |
| `RESEND_API_KEY` | — | Resend API key. |
| `EMAIL_FROM` | `OpenHub <no-reply@openhub.local>` | From header. |

Email is used for verification, digests you enable and moderation notices. With `console` the app works fully — you simply read the mail in the server log.

## File storage (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `STORAGE_PROVIDER` | `local` | `local` writes to `UPLOAD_DIR`; `s3` uses any S3-compatible endpoint. |
| `UPLOAD_DIR` | `storage/uploads` | Local upload directory. Mount a volume in Docker. |
| `S3_*` | — | Endpoint, bucket, region and credentials for object storage. |

## Maps (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `MAP_PROVIDER` | `openstreetmap` | `openstreetmap` builds plain links/embeds with **no API key**. `none` hides map embeds. |

## Currency (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `CURRENCY_API_KEY` | — | Enables the live-rate endpoint for the currency utility. Without it the tool works offline with a small reference table and an editable rate. |

## Rate limiting (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `REDIS_URL` | — | When set, the sliding-window limiter is shared across processes. Without it an in-memory limiter is used, which is fine for a single process. |
| `RATE_LIMIT_MAX` | `60` | Requests per window for generic buckets. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Window length. |

Named buckets (login, register, message, comment, create, report, upload, search) are defined in `src/lib/rate-limit.ts` and are intentionally stricter than the generic default.

## Hardening

| Variable | Default | Description |
| --- | --- | --- |
| `ALLOW_EMBED` | unset | Set to `true` to omit `X-Frame-Options: DENY` (needed for iframe previews). Leave unset in production. |
| `ENABLE_HSTS` | unset | Send `Strict-Transport-Security` outside production. Only do this behind HTTPS. |

## Seed

| Variable | Default | Description |
| --- | --- | --- |
| `SEED_PASSWORD` | `OpenHub!2345` | Password for the demo accounts. **Change it before seeding a public instance.** |

---

## Production checklist

1. Set a strong `AUTH_SECRET` and keep it out of the repository.
2. Point `DATABASE_URL` at PostgreSQL and set `OPENHUB_DB=postgresql`.
3. Set `APP_URL` to your real domain (invite and notification links depend on it).
4. Leave `ALLOW_EMBED` unset so framing is denied.
5. Enable `ENABLE_HSTS` only behind HTTPS with a working certificate.
6. Configure email so members can receive verification and digest mail.
7. Mount a persistent volume for `UPLOAD_DIR` if you use local storage.
8. Set a unique `SEED_PASSWORD`, or skip seeding entirely.
9. Put a reverse proxy in front that terminates TLS and forwards `X-Forwarded-For` (the audit log stores a hash of it, never the raw IP).
