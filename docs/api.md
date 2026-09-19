# API reference

OpenHub is a single deployable. Mutations are **server actions**; the HTTP routes exist only for binary or proxied responses. Both are documented here because both are part of the contract.

## HTTP routes

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/business/[slug]/qr` | none | PNG QR code for a **published** business page. Encodes only the public URL. Cached for 24h. `404` for unknown or unpublished slugs. |
| `GET` | `/api/invoices/[id]/pdf` | owner only | Invoice as a PDF (`Content-Disposition: inline`). `404` when you do not own it, so existence is not leaked. |
| `GET` | `/api/tools/qr?text=&size=` | signed in | PNG QR code for arbitrary text. Nothing is stored; `no-store`. Rate limited (429), 400 on invalid input, max 1000 characters. |
| `GET` | `/api/tools/rate?from=&to=` | signed in | Optional live currency rate. `501` when `CURRENCY_API_KEY` is unset, `502` on provider failure, `429` when rate limited. |

All routes return JSON error bodies of the shape `{ "error": "message" }` except the image and PDF routes, which return the binary payload or a JSON error.

## Server actions

Actions accept `FormData` (or a plain object where noted) and always return:

```ts
type ActionResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
```

### Auth

`loginAction`, `registerAction`, `logoutAction`, `changePasswordAction`, `updateProfileAction`, `updatePrivacyAction`, `updatePreferencesAction`, `exportDataAction`, `deleteAccountAction`.

### Tasks, notes, habits, bookmarks, calendar, expenses

`createTaskAction`, `updateTaskAction`, `setTaskCompletedAction`, `addSubtaskAction`, `toggleSubtaskAction`, `deleteSubtaskAction`, `deleteTaskAction`, `createNoteAction`, `updateNoteAction`, `deleteNoteAction`, `createHabitAction`, `logHabitAction`, `deleteHabitAction`, `createBookmarkAction`, `deleteBookmarkAction`, `createEventAction`, `updateEventAction`, `deleteEventAction`, `createExpenseAction`, `updateExpenseAction`, `deleteExpenseAction`, `settleSplitAction`.

### Groups and social

`createGroupAction`, `updateGroupAction`, `inviteAction`, `acceptInviteAction`, `requestJoinAction`, `decideJoinRequestAction`, `setMemberRoleAction`, `removeMemberAction`, `leaveGroupAction`, `createPostAction`, `togglePinAction`, `createPollAction`, `votePollAction`, `createCommentAction`, `deleteCommentAction`, `voteAction`, `toggleSavedAction`, `reportAction`, `blockUserAction`, `unblockUserAction`.

### Help, resources, skills, students, volunteer, safety

`createHelpRequestAction`, `updateHelpRequestAction`, `answerAction`, `acceptAnswerAction`, `setSolvedAction`, `createResourceAction`, `suggestEditAction`, `reviewResourceAction`, `createSkillOfferAction`, `createSkillRequestAction`, `connectAction`, `reviewSkillAction`, `uploadStudentResourceAction`, `reviewFlashcardAction`, `signUpAction`, `cancelSignupAction`, `createOpportunityAction`, `createCampaignAction`, `addCampaignUpdateAction`, `createEmergencyNumberAction`, `createGuideAction`, `saveDonorProfileAction`, `reportMissingPersonAction`, `createEmergencyContactAction`.

### Business, trips, tools

`saveBusinessProfileAction`, `createServiceAction`, `createCustomerAction`, `createInventoryItemAction`, `adjustInventoryAction`, `createAppointmentAction`, `bookAppointmentAction`, `createInvoiceAction`, `setInvoiceStatusAction`, `deleteInvoiceAction`, `recordSaleAction`, `createTripAction`, `updateTripAction`, `deleteTripAction`, `addTripMemberAction`, `leaveTripAction`, `addItineraryItemAction`, `deleteItineraryItemAction`, `addPackingItemAction`, `togglePackedAction`, `deletePackingItemAction`, `addTripExpenseAction`, `settleTripSplitAction`, `createTripPollAction`, `voteTripPollAction`.

### Notifications, messages, admin

`markNotificationReadAction`, `markAllNotificationsReadAction`, `updateNotificationPreferencesAction`, `startConversationAction`, `sendMessageAction`, `hideConversationAction`, `deleteMessageAction`, `reviewReportAction`, `hideContentAction`, `restoreContentAction`, `warnUserAction`, `suspendUserAction`, `setMemberRoleAction`, `lockDiscussionAction`, `verifyAction`.

Admin actions additionally require a staff role; every one of them writes an `AuditLog` entry.

## Auth model

Sessions are stored in the database with a **hashed** token in an httpOnly cookie (`openhub_session`). Signing in elsewhere does not invalidate existing sessions; changing your password does. `SESSION_TTL_DAYS` controls expiry.

## Adding an endpoint

1. Put domain logic in a feature service with its own permission check.
2. Add an action that validates with Zod through `runAction` and calls the service.
3. Revalidate the paths the UI reads.
4. If it is moderation-relevant, call `audit()`.
5. Cover the permission path with a test.
