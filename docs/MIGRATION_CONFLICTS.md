# Migration & Conflict Resolution

## Problem: Dual Role Users
Historically, the system allowed users to possess both `SEEKER` and `PARTNER` roles simultaneously. They could navigate to `/s/home` or `/p/home` just by changing the URL in their browser, and the state would often leak or be improperly synced between the two views.

## New Policy: Exclusive Session Roles
Under the new strict RBAC architecture:
1. **Single Source of Truth**: The `activeMode` property on the `User` document acts as the definitive indicator of the user's *current active session role*.
2. **Access Snapshot**: The `AccessService` generates a read-only snapshot (`UserAccessData`) during authentication or on demand. It locks the `roles` array and checks the `activeMode`. 
3. **Frontend Isolation**: The frontend is explicitly split into `/s/*` (Seeker) and `/p/*` (Partner). The `RequireAccess` guard strictly prevents cross-navigation. If a user tries to access `/p/home` while their `activeMode` is `SEEKER`, they are redirected to `/s/home`.

## Resolving Conflicts
### 1. Existing Dual-Role Users
Users who already possess both `SEEKER` and `PARTNER` roles will default to the role defined by their `activeMode` in the database. 

### 2. Switching Roles
To switch roles, the user must explicitly call the `POST /api/v1/auth/me/mode` endpoint with their target mode (`SEEKER` or `PARTNER`).
- If they request `PARTNER` but do not have the `PARTNER` role, the server rejects with `403`.
- If successful, `user.activeMode` is updated, and an `accessVersion` bump is triggered via `AccessService.publishAccessChange`.
- The frontend receives the SSE event, invalidates the local access snapshot, refetches `/auth/me/access`, and routes the user to their new exclusive shell automatically.

### 3. Edge Cases
- **Simultaneous Tabs**: If a user has two tabs open and switches roles in Tab A, the SSE event immediately pushes to Tab B. Tab B's `AccessProvider` refetches the snapshot and forces navigation to the new mode's home page, preventing any stale data or illegal actions.
- **Lost SSE Connections**: The access token carries the `accessVersion` (`av`). If the SSE drops, the next API request they make will fail with `401 ACCESS_CHANGED`. The client will automatically refresh the token, get the new snapshot, and enforce the redirect.

## Conclusion
This guarantees 100% isolation between Seeker and Partner namespaces while allowing users to transition securely if they legitimately hold both entitlements.
