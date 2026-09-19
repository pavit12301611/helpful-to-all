# Deployment

## Before you go live

1. **Secrets** — set a strong `AUTH_SECRET`, a unique database password and (if you seed) a unique `SEED_PASSWORD`. Never commit `.env`.
2. **Domain** — set `APP_URL` to the public URL; invite links, notifications and public business QR codes are built from it.
3. **Database** — PostgreSQL 14+. Apply migrations with `npm run db:migrate:deploy`. Do not use SQLite in production.
4. **TLS** — terminate HTTPS at a reverse proxy. Enable `ENABLE_HSTS` only once certificates are working.
5. **Framing** — leave `ALLOW_EMBED` unset so `X-Frame-Options: DENY` is sent.
6. **Storage** — use object storage (`STORAGE_PROVIDER=s3`) if you run more than one replica; otherwise mount a persistent volume for `UPLOAD_DIR`.
7. **Email** — configure SMTP or Resend so verification and moderation notices actually arrive. `console` is for development.
8. **Demo data** — remove it. `prisma/seed.ts` is for local development only.
9. **Moderation** — appoint moderators and read [moderation.md](moderation.md). A community platform without active moderation becomes unusable quickly.
10. **Backups** — nightly database dump plus uploads, with a documented restore test.

## Running the server

```bash
npm run build
AUTH_SECRET=... DATABASE_URL=... APP_URL=https://hub.example.com npm start
```

`npm start` runs `next start -H 0.0.0.0 -p 3000` against the standalone build output. In Docker the image runs `node server.js` directly.

## Scaling

- The app is stateless apart from sessions in the database, so run as many replicas as you like behind a load balancer.
- Rate limiting is per process unless you set `REDIS_URL`. With several replicas, use Redis so limits are shared.
- File uploads must be in shared object storage when you scale out.
- Long-running work (email digests) is currently request-driven; a queue is on the roadmap.

## Reverse proxy example (Caddy)

```
hub.example.com {
  reverse_proxy 127.0.0.1:3000
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
```

Next.js already sends its own CSP and, unless `ALLOW_EMBED` is set, `X-Frame-Options: DENY`.

## Monitoring

- **Health**: any signed-out page works as a liveness probe (the Docker health check uses `/login`).
- **Errors**: `runAction` logs unhandled errors with the prefix `[openhub] unhandled action error`; ship stdout/stderr to your log aggregator.
- **Audit**: `/admin?tab=audit` shows every privileged action. Export it periodically if your jurisdiction requires retention.
- **Database**: watch connection count and slow queries; Prisma logs warnings and errors when `PRISMA_LOG=1`.

## Upgrades

1. Take a database dump.
2. Pull the new code, `npm ci`, `npm run build`.
3. `npm run db:migrate:deploy`.
4. Restart the app; sessions survive because they live in the database.
5. Read the release notes for any new environment variable.

## Rollback

Restore the previous image or commit, then restore the dump taken in step 1 if a migration ran. Migrations in this project are additive where possible; a destructive migration always ships with a note in the release.
