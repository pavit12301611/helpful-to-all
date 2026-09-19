# Docker

Two files drive the container setup: `Dockerfile` (multi-stage, standalone Next.js output, non-root user) and `docker-compose.yml` (Postgres + app, optional Redis).

## Start everything

```bash
cp .env.example .env
# set AUTH_SECRET (openssl rand -base64 32) and POSTGRES_PASSWORD
docker compose up -d --build

docker compose exec app npm run db:migrate:deploy   # create the schema
docker compose exec app npm run db:seed             # optional demo data
```

The app listens on port 3000 inside the container and is published on `${PORT:-3000}` on the host.

## Image layout

| Stage | Purpose |
| --- | --- |
| `deps` | `npm ci` with the lockfile only — cached between builds. |
| `build` | Generates the Prisma client and runs `next build`, then prunes dev dependencies. |
| `runtime` | Node slim + `openssl`, the standalone server, `prisma/`, `scripts/` and `node_modules`, running as uid/gid 1001. |

A build-time `AUTH_SECRET` argument exists only because Next reads the environment during the build. The runtime container uses the value from your environment — the build argument is a placeholder and is never baked into secrets handling.

## Volumes

| Volume | Mount | Contents |
| --- | --- | --- |
| `openhub-pgdata` | `/var/lib/postgresql/data` | PostgreSQL data |
| `openhub-uploads` | `/app/storage/uploads` | Uploaded files when `STORAGE_PROVIDER=local` |

Use object storage instead of the uploads volume if you run more than one app replica.

## Health checks

- Postgres: `pg_isready -U openhub -d openhub` every 10s.
- App: a Node `fetch` against `/login` every 30s, with a 20s start period.

The app service has `depends_on: db: condition: service_healthy`, so it does not start before the database accepts connections.

## Optional Redis

Uncomment the `redis` service and set `REDIS_URL=redis://redis:6379` to share rate limiting across replicas. Without it each process uses an in-memory limiter, which is correct for a single replica.

## Common operations

```bash
docker compose logs -f app                    # application logs
docker compose exec app node scripts/verify-seed.ts
docker compose exec db pg_dump -U openhub openhub -Fc > backup.dump
docker compose up -d --build app              # rebuild after pulling changes
docker compose down                           # stop (volumes are kept)
```

## Hardening notes

- The container runs as a non-root user and exposes only port 3000.
- `X-Frame-Options: DENY` is sent unless you set `ALLOW_EMBED=true`.
- Put a TLS-terminating reverse proxy (Caddy, nginx, Traefik) in front, and only then enable `ENABLE_HSTS`.
- Do not publish the Postgres port unless you need host access; the app reaches it over the compose network.
