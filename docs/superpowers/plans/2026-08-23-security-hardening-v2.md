# Narinyland Security Hardening V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the verified second-pass P0/P1 vulnerabilities and restore a deployable production build.

**Architecture:** Replace cookie-subject trust with a server-validated session boundary, separate circle membership from administrative authority, move economy decisions to server-owned transactional services, remove dangerous bulk entity sync from config, and make uploads/build gates fail closed. Preserve existing APIs where possible while making unsafe compatibility behavior non-mutating or forbidden.

**Tech Stack:** Next.js 16, TypeScript, Prisma/PostgreSQL, Redis, AlphaYard AppKit, GitHub Actions, Railway.

**Spec:** `docs/superpowers/specs/2026-08-23-security-hardening-v2-design.md`

## Global Constraints

- Never authorize from raw `narinyland_sub` or unsigned JWT payloads.
- Circle rename/delete requires owner/admin authority, not membership alone.
- Joining requires AppKit membership/invitation proof; no arbitrary service-token self-add.
- Generic config saves cannot mutate coupons, memories/gallery, or timeline collections.
- Economy prices/rewards are server-owned and transactional.
- Locked letters do not expose content/media before unlock.
- Production build excludes tests while CI still runs them explicitly.
- CI fails on high-severity production dependency advisories.

---

### Task 1: Add regression tests and prove RED

**Files:**
- Create: `tests/security-hardening-v2.test.ts`
- Modify: `.github/workflows/hex-homestead-ci.yml`

**Interfaces:**
- Consumes existing route/source files.
- Produces source/runtime assertions covering auth, circle authorization, economy, uploads, secret cleanup, and build config.

- [ ] Add tests asserting: no raw `narinyland_sub` authorization; no unverified JWT subject authorization; no orphan-config auto-claim; circle mutations require admin role; join verifies AppKit visibility; config route does not bulk-sync coupons/gallery/timeline; leaf purchase does not increment lifetimePoints; letter route redacts locked content and binds sender to session user; upload validation rejects SVG; purchased items use server-side catalog/deduction; secret-bearing scratch files are absent; tsconfig excludes tests.
- [ ] Open draft PR so CI runs.
- [ ] Confirm the focused suite fails for the expected current behaviors.

### Task 2: Replace soft-session identity trust

**Files:**
- Create: `lib/session-store.ts`
- Modify: `lib/auth-server.ts`
- Modify: `app/api/auth/token/route.ts`
- Modify: `app/api/auth/credentials/route.ts`
- Modify: `app/api/auth/name-login/route.ts`
- Modify: `app/api/auth/me/route.ts`
- Modify: `app/api/auth/logout/route.ts`
- Modify: `proxy.ts`

**Interfaces:**
- Produces `createSession(user)`, `getSession(sessionId)`, `deleteSession(sessionId)` and `narinyland_session` opaque HttpOnly cookie.
- `getAuthSession(request)` returns userId only from validated access token or Redis-backed opaque session.

- [ ] Write/adjust failing unit/source tests for forged-cookie rejection.
- [ ] Implement opaque random session ids using `randomBytes(32)` and Redis TTL.
- [ ] On AppKit login/credential flows, derive user only from trusted upstream response or validated `/users/me`, then create opaque session.
- [ ] Remove raw `narinyland_sub` authorization fallback.
- [ ] Keep `narinyland_is_auth` metadata cookie UI-only.
- [ ] Re-run focused tests.

### Task 3: Enforce circle membership and owner/admin authority

**Files:**
- Create: `lib/circle-access.ts`
- Modify: `app/api/circles/route.ts`
- Modify: `app/api/circles/join/route.ts`
- Modify: `app/api/circles/[circleId]/route.ts`
- Modify: `app/api/circles/[circleId]/members/route.ts`

**Interfaces:**
- Produces `requireCircleMembership` and `requireCircleAdmin` using AppKit member role plus local membership fallback only where safe.

- [ ] Remove first-global-config migration fallback.
- [ ] Join route validates circle is visible to the authenticated AppKit user before local provisioning; no service-token arbitrary self-add.
- [ ] Rename/delete require AppKit role `owner` or `admin`.
- [ ] Re-run circle authorization tests.

### Task 4: Close economy bypasses

**Files:**
- Modify: `app/api/config/route.ts`
- Create: `lib/purchased-item-catalog.ts`
- Modify: `app/api/purchased-items/route.ts`
- Modify: `components/Shop.tsx`
- Modify: `app/garden/_components/GardenAcceptedContent.tsx`
- Modify: `lib/stats-service.ts`

**Interfaces:**
- Server catalog maps item type to price/model policy.
- Purchased item creation performs `spendSharedPoints(tx, configId, price)` and insert in one Serializable transaction.

- [ ] Remove coupons/gallery/timeline collection sync from config PUT.
- [ ] Add server catalog and reject unknown/arbitrary model URLs except uploaded scoped model URLs.
- [ ] Deduct points transactionally on legacy shop purchase.
- [ ] Stop client-side balance mutation from being authoritative; refresh stats from server result.
- [ ] Remove lifetimePoints increment from leaf spending.
- [ ] Re-run economy tests.

### Task 5: Harden letters

**Files:**
- Modify: `app/api/letters/route.ts`
- Modify: `app/api/letters/[id]/route.ts`
- Modify: `services/api.ts` only if response shape requires it.

**Interfaces:**
- Sender is resolved from authenticated `access.userId` within config.
- Reward key `letter_reward:<configId>:<userId>` in Redis enforces one reward per 3600 seconds.

- [ ] GET redacts content/media for locked letters unless sender is current user.
- [ ] POST ignores caller-selected sender identity and binds to authenticated partner.
- [ ] Award 20 points only if reward cooldown key is absent; use atomic Redis `SET NX EX` or transaction-safe equivalent before award and roll back/release on DB failure.
- [ ] Validate folder/read state updates to allowed values.
- [ ] Re-run letter tests.

### Task 6: Harden uploads and proxying

**Files:**
- Modify: `lib/upload-validation.ts`
- Modify: `app/api/upload/route.ts`
- Modify: `app/api/instagram/image/route.ts`

**Interfaces:**
- `validateUploadFile` rejects SVG/XML/HTML and enforces extension/MIME consistency for models.
- Instagram proxy streams through a byte-counting transform and aborts above 10 MB.

- [ ] Add upload/proxy regression tests.
- [ ] Implement fail-closed MIME/extension policy.
- [ ] Remove internal provider error detail from upload response.
- [ ] Enforce streaming byte cap.
- [ ] Re-run focused tests.

### Task 7: Restore production build and clean credentials

**Files:**
- Modify: `tsconfig.json`
- Modify: `.gitignore`
- Delete: `scratch_db.js`
- Delete: `scratch_appkit_db.js`
- Delete: `check_apps.js`
- Delete: `update_appkit_secrets.js`
- Delete: `seed_narinyland_client.js`
- Modify affected test typings if separately typechecked.

**Interfaces:**
- Next production build excludes `tests/**`.
- CI remains responsible for executing tests.

- [ ] Exclude tests from production TypeScript compilation.
- [ ] Delete credential-bearing scratch scripts and ignore `scratch*_db.*`, `*_appkit_secrets.*`, and `*.tsbuildinfo`.
- [ ] Add secret-pattern regression assertion.
- [ ] Verify `npm run build` succeeds in CI.

### Task 8: Dependency gate and full verification

**Files:**
- Modify: `.github/workflows/hex-homestead-ci.yml`
- Modify: `package.json` / `package-lock.json` only as needed for advisories.

**Interfaces:**
- CI hard-fails on `npm audit --omit=dev --audit-level=high`.

- [ ] Turn audit report step into hard gate.
- [ ] Update direct/transitive dependencies until high production advisories are zero, without forcing unrelated major migrations unless required.
- [ ] Run focused security suite, existing Hex suite, farm suite, AppKit suite, lint, production build, runtime smoke, and production audit.
- [ ] Mark PR ready only after all required checks pass.
- [ ] Merge with expected head SHA.
- [ ] Verify Railway deployment and health after merge.
