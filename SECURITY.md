# Security policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately using one of:

- the private vulnerability reporting feature on the repository (GitHub → Security → Report a vulnerability), or
- email to the maintainer address listed in the repository description.

Please include:

1. What you found and where (page, action, API route).
2. Steps to reproduce, ideally with a proof of concept that does not damage data.
3. Which versions or commits are affected.
4. Whether the issue needs authenticated access, and with which role.

We aim to acknowledge reports within **3 working days** and to publish a fix or mitigation within **14 days** for confirmed high-severity issues. Credit is given unless you ask to stay anonymous.

## Supported versions

Only the latest release on `main` receives security fixes. Self-hosters should upgrade promptly and take a database dump first.

## Scope

In scope:

- Authentication and session handling (session fixation, token prediction, privilege escalation)
- Authorisation bypasses (reading another member's private content, acting as staff without the role)
- Injection flaws (SQL through Prisma raw queries, XSS in rendered content, template injection)
- Insecure direct object references on private resources
- File upload handling (path traversal, unrestricted types, storage escapes)
- Secrets handling and rate limiting bypasses
- CSRF on state-changing actions

Out of scope:

- Reports that require physical access to a server you do not own
- Self-XSS with no path to affecting another member
- Missing DNS records, TLS configuration of a deployment you do not control
- Social engineering of maintainers or instance operators

## Design notes that reviewers should know

- Passwords are hashed with **scrypt** (`N=16384, r=8, p=1`) plus a per-password salt; the format is `scrypt$N$r$p$salt$hash` and verification is constant-time.
- Session tokens are stored **hashed** in the database and delivered in httpOnly cookies; changing a password invalidates other sessions.
- Every mutation goes through `runAction`, which validates input with Zod and never returns stack traces to the browser.
- Authorisation is enforced in the **service layer**, not only in the UI — a missing UI check cannot leak data.
- Moderation and administrative actions write to both `ModerationAction` and `AuditLog`.
- IP addresses are hashed before being written to logs; utility tools never persist their input.
- A Content-Security-Policy is sent with every response, and `X-Frame-Options: DENY` is sent unless `ALLOW_EMBED=true` is explicitly set.
- Rate limiting covers login, registration, messaging, commenting, content creation, reporting, uploads and search — in memory by default, in Redis when configured.

## Disclosure timeline

1. Report received → acknowledgement within 3 working days.
2. Triage → severity assigned (critical / high / medium / low).
3. Fix developed on a private branch, with a regression test.
4. Release published, advisory issued, self-hosters notified.
5. Reporter credited (unless they decline).

## Hardening checklist for instance operators

- Strong `AUTH_SECRET`, unique database password, and no `.env` in version control.
- HTTPS with HSTS once certificates are stable.
- Leave `ALLOW_EMBED` unset.
- Keep the database and Node.js patched; run behind a maintained reverse proxy.
- Restrict `/admin` to people you trust — moderators can suspend members and hide content.
- Back up the database and uploads, and test the restore.
