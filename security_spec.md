# Security Specification

## 1. Data Invariants
- Admin Identity: Only authenticated user with verified email `ngadjoujerem@gmail.com` has administrator privileges.
- Public Read: Activities, confirmed schedule slots, and general settings are readable by anyone (guests/friends).
- Guest Writes: Unauthenticated or authenticated guests can create proposals (to suggest a date with their name), but cannot modify or delete them.
- Admin Writes: Only the admin can create, update, or delete activities, schedule slots, settings, and notifications, or update proposal statuses (accept/decline).
- String and Payload Boundaries: All string fields are constrained in size to prevent denial of wallet and resource poisoning attacks. Document IDs must match standard ID pattern `^[a-zA-Z0-9_\-]+$`.

## 2. Dirty Dozen Payloads (Rejected Cases)
1. Unauthenticated client attempting to create an activity (`/activities/{id}`).
2. Non-admin authenticated user trying to delete an activity.
3. Attacker attempting to inject a 10MB string into activity description.
4. Non-admin trying to update proposal status to 'accepted'.
5. Guest attempting to delete a notification.
6. Guest trying to modify global settings (`/settings/general`).
7. User with unverified email trying to act as admin.
8. Attacker injecting non-standard characters in document ID (e.g. `../../secret`).
9. Attacker attempting to create a proposal without a friendName.
10. Attacker modifying immutable scheduleSlot records without admin privileges.
11. Blanket read attempt bypassing document rules.
12. Attacker attempting to overwrite existing proposal with different content.
