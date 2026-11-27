# ChargeSense Firestore Security Specification

## 1. Data Invariants
1. **PII Isolation**: `/users/{userId}` holds `email`, `name`, and `city` and may only be read or written by the authenticated owner (`request.auth.uid == userId`) or a verified admin.
2. **Ownership Integrity**: Every user resource (`/vehicles`, `/trips`, `/serviceBookings`, `/claims`, `/passportEvents`, `/batterySnapshots`) requires `ownerId == request.auth.uid` on create, `ownerId` immutable on update, and `list` queries restricted by `resource.data.ownerId == request.auth.uid`.
3. **Master Gate & Existence**: `/stations/{stationId}/checkIns/{checkInId}` requires the parent station document to exist via `exists()` and binds `userId == request.auth.uid` and `stationId == stationId`.
4. **Immutable Ledger**: `/passportEvents/{eventId}` is append-only for owners (no client updates/deletes after creation) to preserve SHA-256 hash chain integrity.
5. **Terminal Claim State**: Once a claim reaches `settled`, non-admin updates are rejected.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read of `/users/u1` -> Denied (`request.auth == null`).
2. Cross-user read of `/users/u2` by `u1` -> Denied (`userId != uid`).
3. Unverified email write (`email_verified == false`) to `/vehicles/v1` -> Denied.
4. Spoofed `ownerId` on vehicle create (`ownerId: "victim"` by `attacker`) -> Denied.
5. Ghost/shadow field injection (`isAdmin: true` or `extraField: 1`) on `/users/{uid}` -> Denied (`hasOnly`).
6. Oversized document ID (`1500` chars) on `/vehicles/{id}` -> Denied (`isValidId`).
7. Oversized description string (`> 600` chars) on `/claims/{id}` -> Denied.
8. Blanket list query on `/trips` without `ownerId == uid` filter -> Denied.
9. Client mutation of immutable `createdAt` or `ownerId` on `/vehicles/{id}` update -> Denied.
10. Updating a `settled` claim as non-admin -> Denied.
11. Posting a check-in to a non-existent `/stations/fake-id/checkIns/c1` -> Denied (`exists` check).
12. Deleting or tampering with a `/passportEvents/{id}` document -> Denied.
