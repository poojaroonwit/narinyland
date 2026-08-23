# Narinyland Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the production blockers found in the 2026-08-23 Narinyland audit while preserving Homestead v3 gameplay.

**Architecture:** Keep reward calculation and mutation on the server, centralize transient infrastructure recovery at shared adapters, make external integration writes follow provider contracts, and make destructive cleanup fail-safe. Prefer narrow pure helpers plus integration tests over route-specific retries and duplicated validation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6/PostgreSQL, Redis/ioredis, Node test runner, GitHub Actions, Railway.

**Spec:** `docs/superpowers/specs/2026-08-23-production-hardening.md`

## Global Constraints

- Preserve HexWorld spatial authority and Family Farm gameplay ownership.
- Do not introduce client-controlled reward amounts.
- Production mutations must remain config-scoped and authenticated.
- Destructive cleanup may delete only definitely invalid media, never transiently unreachable media.
- No major dependency upgrade without lockfile consistency and green CI.

---

### Task 1: Economy integrity

**Files:**
- Modify: `app/api/coupons/route.ts`
- Modify: `app/api/coupons/[id]/redeem/route.ts`
- Modify: `app/api/stats/add-points/route.ts`
- Modify: `app/api/stats/add-xp/route.ts`
- Modify: `lib/stats-service.ts`
- Modify: `services/api.ts`
- Modify: `app/garden/_components/useGardenActions.ts`
- Create: `tests/hex-economy-integrity.test.ts`

**Interfaces:**
- Produces: `redeemCouponReward(configId, couponId)` as the only coupon-reward mutation path.
- Produces: read-only stats refresh for the client after redemption.

- [ ] **Step 1: Write failing tests** proving coupon replay cannot award twice, invalid/oversized coupon point values are rejected, and direct arbitrary points/XP award routes are disabled for normal client usage.
- [ ] **Step 2: Run PR CI and verify RED** for the missing guards.
- [ ] **Step 3: Implement minimal server-authoritative reward mutation** in a Serializable transaction using a conditional `updateMany`/state transition before awarding points.
- [ ] **Step 4: Replace zero-XP refresh with a stats GET refresh** and remove client dependence on arbitrary award APIs.
- [ ] **Step 5: Run CI and verify GREEN.**

### Task 2: Railway Postgres cold-wake recovery

**Files:**
- Modify: `lib/database-read-retry.ts`
- Modify: `tests/production-startup.test.ts`

**Interfaces:**
- `isTransientDatabaseReadError(error)` recognizes Railway/Postgres startup and recovery states.
- `retryDatabaseRead(operation)` retries within a bounded cold-wake window.

- [ ] **Step 1: Add failing tests** for `database system is starting up` and connector-wrapped startup errors.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Extend transient classification and bounded retry schedule.**
- [ ] **Step 4: Verify GREEN with existing startup tests.**

### Task 3: AppKit SSO launch synchronization

**Files:**
- Modify: `lib/appkit-server.ts`
- Modify: `tests/appkit-circle-service-auth.test.ts`

**Interfaces:**
- `ensureSsoLaunchUrlConfigured(url)` uses the supported application-admin update contract and treats unsupported methods as a compatibility fallback, without repeated 405 spam.

- [ ] **Step 1: Add a failing request-contract test** for the application update method.
- [ ] **Step 2: Verify RED in AppKit Integration CI.**
- [ ] **Step 3: Implement the supported update method/fallback and cache only successful syncs.**
- [ ] **Step 4: Verify GREEN.**

### Task 4: Build-time DB independence

**Files:**
- Modify: `app/layout.tsx`
- Create/modify: `tests/hex-build-runtime-contract.test.ts`

**Interfaces:**
- Metadata generation uses static/env defaults during `next build`; runtime branding remains available through runtime APIs.

- [ ] **Step 1: Add a failing source/runtime contract test** proving root metadata does not call Prisma during static generation.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Remove the build-time DB read from metadata generation and retain safe defaults.**
- [ ] **Step 4: Verify GREEN and production build with no DB dependency from layout metadata.**

### Task 5: Redis graceful degradation

**Files:**
- Modify: `lib/redis.ts`
- Create/modify: `tests/hex-redis-resilience.test.ts`

**Interfaces:**
- Cache reads/writes/deletes become best-effort wrappers when Redis is unavailable; authoritative DB mutations do not fail because cache invalidation failed.

- [ ] **Step 1: Add failing resilience tests** for connection-reset/cache invalidation behavior.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement bounded no-op/fallback semantics around cache operations while preserving real Redis when healthy.**
- [ ] **Step 4: Verify GREEN.**

### Task 6: Safe media cleanup

**Files:**
- Modify: `app/api/cleanup/route.ts`
- Create: `lib/media-health.ts`
- Create: `tests/hex-media-cleanup-safety.test.ts`

**Interfaces:**
- `checkRemoteMediaHealth(url)` returns `healthy | broken | uncertain`.
- Cleanup deletes only `broken`; `uncertain` is reported and retained.

- [ ] **Step 1: Add failing tri-state tests** for 2xx, 404/410, timeout/network error, and 5xx.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement tri-state health classification and update cleanup analysis/deletion.**
- [ ] **Step 4: Verify GREEN.**

### Task 7: Garden action type boundary

**Files:**
- Modify: `app/garden/_components/useGardenActions.ts`
- Modify related garden context type files only if required.

**Interfaces:**
- Remove `@ts-nocheck` and replace `ctx: any` with the narrow context contract actually consumed by this hook.

- [ ] **Step 1: Use lint/build as the failing type signal after removing the suppression.**
- [ ] **Step 2: Add the minimum explicit context/callback types required for a clean TypeScript build.**
- [ ] **Step 3: Verify lint/build without behavior changes.**

### Task 8: CI and release verification

**Files:**
- Modify: `.github/workflows/hex-homestead-ci.yml`
- Modify: `.github/workflows/appkit-integration-ci.yml` if needed for the new regression files.

**Interfaces:**
- PR CI exercises new regression tests plus lint/build with Postgres and Redis services where needed.

- [ ] **Step 1: Ensure all new tests are included by PR path filters and test commands.**
- [ ] **Step 2: Run complete PR checks.**
- [ ] **Step 3: Review PR diff for unintended gameplay changes.**
- [ ] **Step 4: Merge with expected-head protection only after all checks pass.**
- [ ] **Step 5: Verify Railway deployment status and runtime logs after merge.**