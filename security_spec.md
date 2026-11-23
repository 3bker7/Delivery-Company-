# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Strict Player Isolation (`/players/{userId}`)**:
   - Every player document ID `{userId}` MUST equal `request.auth.uid`.
   - No authenticated user can read, list, create, update, or delete another player's document (`request.auth.uid == userId`).
   - All writes require `request.auth.token.email_verified == true`.
   - `uid` and `createdAt` are immutable after document creation.
   - `createdAt` on create and `updatedAt` on create/update must equal `request.time` (Server Timestamp).

2. **One-Time Company Name Change Enforcement (`companyName` & `companyNameChangeUsed`)**:
   - On initial account creation (`create`), `companyNameChangeUsed` must be `false` (default initial name) or `true` (if custom name chosen at start).
   - On `update`, if `existing().companyNameChangeUsed == true`, then `incoming().companyName` MUST equal `existing().companyName` AND `incoming().companyNameChangeUsed == true`. Any attempt to change `companyName` a second time or reset `companyNameChangeUsed` to `false` is strictly rejected at the database rule level.
   - If `existing().companyNameChangeUsed == false` and the player changes `companyName`, `incoming().companyNameChangeUsed` MUST be set to `true`, and `incoming().companyName` must be a valid string between 3 and 60 characters.

3. **PII Isolation (`/players/{userId}/private/{docId}`)**:
   - Email PII is stored in a dedicated subcollection `/players/{userId}/private/info` and requires the parent `/players/$(userId)` document to exist (`get()` / `exists()` Master Gate).
   - Only the owner (`request.auth.uid == userId`) or verified admin can read it.

4. **Verified Admin & Release Control (`/release_control/{configId}`)**:
   - Admin privileges are granted ONLY when `request.auth != null && request.auth.token.email_verified == true && request.auth.token.email == 'a7med3bker@gmail.com'`.
   - Regular players can `get` `/release_control/global` to know the currently approved public version, but ONLY the verified admin can `create` or `update` `/release_control/{configId}`.

---

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: `auth = null` attempting to write `/players/user_1`.
2. **Unverified Email Write**: `auth = { uid: 'user_1', token: { email_verified: false } }` attempting to create `/players/user_1`.
3. **Cross-Player Read/Write (ID Spoofing)**: `auth = { uid: 'user_2' }` attempting to `get` or `update` `/players/user_1`.
4. **Shadow Field Injection**: Sending an undeclared key `isAdmin: true` in `/players/user_1`.
5. **Second Company Name Change Bypass**: Updating `/players/user_1` with a new `companyName` when `existing().companyNameChangeUsed == true`.
6. **Resetting `companyNameChangeUsed` Flag**: Updating `/players/user_1` with `companyNameChangeUsed: false` when `existing().companyNameChangeUsed == true`.
7. **Empty or Oversized Company Name**: Setting `companyName: ""` (< 3 chars) or a 500-char string (> 60 chars).
8. **Forged Client Timestamp**: Setting `updatedAt` to a past timestamp instead of `request.time`.
9. **Mutating Immutable `uid` or `createdAt`**: Changing `createdAt` or `uid` on update.
10. **Admin Email Spoofing (Unverified)**: `auth = { uid: 'attacker', token: { email: 'a7med3bker@gmail.com', email_verified: false } }` attempting to update `/release_control/global`.
11. **Non-Admin Release Publish**: Normal verified user (`player@example.com`) attempting to update `/release_control/global`.
12. **Resource Exhaustion / ID Poisoning**: Creating `/players/{invalid_200_char_id}` or `history` array > 20 items in `/release_control/global`.
