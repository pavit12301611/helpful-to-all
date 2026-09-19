# Roadmap

What OpenHub deliberately does **not** do yet, why, and what would have to be true to add it.

## Not in v1, by design

| Item | Why it is out | What would change that |
| --- | --- | --- |
| **Payment processing** | Handling money brings PCI scope, dispute handling and fraud liability that a community platform should not carry by default. | A provider interface already exists (`src/server/services/payments.ts` with `PaymentProvider`, `isConfigured()`, `createCheckout()`). Implement it for Stripe/Razorpay behind an env flag, keep the "verify before sending money" warning, and never store card data. |
| **Auto-contacting emergency services** | Sending a false or wrong alert can cost lives and is illegal in many places. | Never. The safety hub stays an information directory with a permanent disclaimer. |
| **Push notifications** | Requires an external push service and per-device tokens. | Add Web Push with VAPID keys as an optional service; the notification service already has a single `notify()` entry point. |
| **Offline / native mobile apps** | A PWA covers most needs without an app store. | Ship a service worker and manifest; the API surface is already stable. |
| **Real-time presence and typing indicators** | Needs websockets and raises privacy questions (who is watching). | Optional Redis pub/sub; keep presence off by default behind a profile flag. |
| **Multi-tenancy** | One instance per community is simpler to moderate and easier to reason about for privacy. | Would require tenant scoping on every query — a large, risky change for little benefit. |
| **Machine translation** | Automated translation of medical, legal or safety content can be dangerously wrong. | Offer translation with an explicit "machine translated, may be wrong" label. |
| **Automatic content classification** | False positives hide legitimate help requests; false negatives create a false sense of safety. | Keep human review as the source of truth; a classifier may only *prioritise* the queue. |
| **Public API with tokens** | Not needed for the product, and a wider attack surface. | Add scoped tokens under `src/app/api` reusing the same services and permission checks. |

## Planned next

- **Email digests on a schedule** — the preference (`instant` / `daily` / `weekly` / `off`) already exists; the runner does not.
- **Notification centre polish** — grouping by target, mute-a-thread, per-conversation settings.
- **Accessibility audit pass** — a full screen-reader pass on the moderation console and the business invoice form.
- **More locales** — `messages/hi.json` exists alongside English; add languages with reviewer sign-off.
- **Import/export for other tools** — CSV import for expenses and tasks, iCal export for the calendar.
- **Storage quotas per member** — needed before opening uploads to the public.
- **Rate-limit dashboards** — expose bucket usage to administrators.

## Explicit non-goals

- Advertising or sponsored placement of any kind.
- Selling or sharing member data.
- Growth mechanics (streak shame, engagement prompts, public follower counts).
- Anything that requires a paid API for a core feature.

If you want to work on one of these, open an issue first — the "why it is out" column is usually the interesting part of the conversation.
