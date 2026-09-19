# Moderation guide

This is the handbook for people running the moderation console at `/admin`. It assumes you have read `/guidelines`, which is the rulebook members see.

## Principles

1. **Act on behaviour, not opinions.** Hide what breaks a rule; explain which rule.
2. **Hide, don't destroy.** Hiding is reversible and keeps the evidence for a repeat offender. Deletion is a last resort.
3. **Never act silently.** Every action writes a `ModerationAction` row and an `AuditLog` entry, and the affected member is notified.
4. **Proportionality.** Warning → temporary suspension → permanent suspension. Skip steps only for illegal content or clear danger.
5. **Two-person rule for serious calls.** Suspending an administrator, or removing large amounts of content, should involve a second moderator.

## The console

| Tab | What it is for |
| --- | --- |
| **Report queue** | Reports from members, filterable by status. Record an outcome, hide or restore content, lock a discussion. |
| **Members** | Search members, change roles, send warnings, suspend or reinstate. |
| **Verification** | Resources, opportunities and campaigns awaiting verification. |
| **Hidden content** | Everything currently hidden, with a restore button. |
| **Audit log** | Every privileged action, plus the moderation history with notes. |

## Handling a report

1. Open the reported item and read it in context — a quoted fragment often looks worse than it is.
2. Check the reporter's history only if you suspect abuse of the report tool.
3. Decide: **reviewed** (seen, no action), **actioned** (you did something), or **dismissed** (not a violation).
4. Write the outcome note. It is sent to the reporter, so say what you found, not just the label.
5. If the content breaks a rule, hide it. If it is a help request or group post attracting abuse, lock the discussion instead of hiding it.

### Severity guide

| Situation | Suggested action |
| --- | --- |
| Off-topic or low-effort post | Leave it; consider a gentle comment |
| Personal details published about someone else | Hide immediately, warn the author |
| Spam or advertising | Hide, warn; suspend on repeat |
| Harassment or hate speech | Hide, warn or suspend depending on severity |
| Medical, legal or financial advice stated as fact | Hide the specific claim and point to official sources |
| Suspected scam or fake fundraiser | Hide, warn, notify the community in the relevant group |
| Illegal content | Hide, suspend, follow your legal obligations |

## Verification

Verification means **you checked the organiser or listing**, not that you endorse it:

- **Local resources** — confirm the name, address, phone and opening hours from an independent source.
- **Volunteer opportunities** — confirm the organisation exists and the dates are real.
- **Donation campaigns** — confirm the organiser's identity and that the campaign is not a duplicate. Never verify a campaign you cannot attribute to a real person or organisation.

The campaign page always shows a "verify before sending money or goods" warning; verification does not remove it, and should not be described to members as a guarantee.

## Members

- **Roles**: `user`, `student`, `volunteer`, `organizer`, `business`, `moderator`, `admin`. Only an administrator can grant staff roles.
- **Warnings** are delivered as a notification and stored in the moderation history. Say which rule was broken and what to change.
- **Suspension** blocks sign-in until a moderator reinstates. Always give a reason — it is stored and shown to the member.
- You cannot suspend yourself or change your own role.

## Audit and accountability

Every entry in the audit log records the actor, action, target and timestamp, plus metadata such as the note or reason. Review it periodically:

- look for patterns (one moderator hiding everything from one member),
- confirm that suspensions have reasons,
- confirm that verifications correspond to real checks.

If your instance is run by an organisation, export the audit log on a schedule and keep it for the period your policy requires.

## Appeals

Tell members how to appeal — a reply to the notification, or a contact address on `/guidelines`. Reviewing your own decision is fine for small things; for suspensions, have a second moderator look at it.

## Self-care

Moderation is unpleasant work. Set a schedule rather than being always-on, rotate duties, and step away after heavy sessions. A tired moderator makes worse calls than a slow one.
