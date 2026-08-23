# AppKit Headless Auth SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Narinyland's custom login/signup UI while replacing legacy/manual authentication transport with `@alphayard/appkit` v1.7.0 headless auth behind the existing BFF and opaque Redis session.

**Architecture:** Add a server-only SDK adapter that constructs a per-request `createHeadlessAppKit()` client, route all credential/MFA/email/password actions through it, persist authenticated SDK results to HttpOnly AppKit cookies plus the opaque Narinyland session, and make the existing Narinyland auth page consume only browser-safe continuation/config responses.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@alphayard/appkit` 1.7.0, Redis/ioredis, Prisma, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-23-appkit-headless-auth-sdk-design.md`

## Global Constraints

- Use `@alphayard/appkit` version `1.7.0`; remove `alphayard-appkit`.
- Narinyland owns normal login/signup UI; do not redirect credentials login to AppKit hosted UI.
- AppKit tokens remain server-side/HttpOnly and are never returned to browser JavaScript.
- Preserve opaque Redis-backed `narinyland_session` authorization.
- AppKit policy/continuation results remain authoritative.
- Build and deployment must be verified before merge.

---

### Task 1: Dependency and adapter boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/appkit-headless-server.ts`
- Test: `tests/appkit-headless-sdk-auth.test.ts`

**Interfaces:**
- Produces `getHeadlessAuthConfig()` and `runHeadlessAuthAction(action, payload)`.
- Produces a browser-safe discriminated result plus internal authenticated tokens/user for session persistence.

- [ ] Write a failing test asserting `package.json` contains `@alphayard/appkit: 1.7.0`, omits `alphayard-appkit`, and `lib/appkit-headless-server.ts` imports `createHeadlessAppKit` from `@alphayard/appkit/headless-auth`.
- [ ] Run the focused test and confirm RED.
- [ ] Implement a per-request SDK adapter with `storage: 'memory'`, configured client id/domain/application id, action mapping for login, signup, MFA request/verify, email verify/resend, forgot/reset password, and a timeout boundary.
- [ ] Regenerate `package-lock.json` with `npm install --package-lock-only` or `npm install` and confirm the exact package resolves.
- [ ] Run the focused test and SDK type-check through `npm run build` far enough to prove imports/types resolve.
- [ ] Commit.

### Task 2: SDK-backed BFF and session persistence

**Files:**
- Modify: `app/api/auth/credentials/route.ts`
- Create: `app/api/auth/config/route.ts`
- Test: `tests/appkit-headless-sdk-auth.test.ts`

**Interfaces:**
- Consumes `runHeadlessAuthAction` and `getHeadlessAuthConfig`.
- Produces existing same-origin JSON auth contract without raw tokens.

- [ ] Extend the failing test to assert the credential route no longer contains manual AppKit endpoint maps/fetch transport and instead calls the SDK adapter.
- [ ] Add assertions that access/refresh/id tokens are stripped from browser responses and authenticated results call the existing token validation/session creation path.
- [ ] Implement BFF action dispatch and preserve `rejectCrossOrigin`.
- [ ] On `authenticated`, validate the SDK access token, set HttpOnly AppKit token cookies, create opaque `narinyland_session`, set the non-sensitive metadata cookie, and delete legacy `narinyland_sub`.
- [ ] Add `GET /api/auth/config` returning only public AppKit config.
- [ ] Run focused tests and security-hardening tests.
- [ ] Commit.

### Task 3: Narinyland-owned continuation UI

**Files:**
- Modify: `components/auth/NarinylandAuthPage.tsx`
- Modify: `tests/hex-local-appkit-auth-ui.test.ts`
- Test: `tests/appkit-headless-sdk-auth.test.ts`

**Interfaces:**
- Consumes `/api/auth/config` and `/api/auth/credentials`.
- Renders credentials, MFA, email verification, password recovery/reset, and SDK continuation messages in Narinyland UI.

- [ ] Add failing UI source-contract tests proving credentials submit stays local and the page supports SDK continuation statuses/config loading.
- [ ] Replace hard-coded auth response booleans with a discriminated `status` continuation model while keeping the current visual structure.
- [ ] Replace email resend-by-email with SDK `email-resend` using the verification token.
- [ ] Add local forgot/reset-password state and render it inside the same auth card.
- [ ] Read public AppKit config to derive configured MFA/provider/password/signup messaging where available; retain safe client validation as UX only, never as policy authority.
- [ ] Keep hosted login helper only as a specific fallback for unsupported enrollment/passkey ceremony, not normal credentials login.
- [ ] Run focused UI/auth tests.
- [ ] Commit.

### Task 4: Remove legacy SDK client duplication

**Files:**
- Modify: `lib/auth.ts`
- Modify: auth callback/logout consumers only where required by the new package API.
- Test: `tests/appkit-headless-sdk-auth.test.ts`

**Interfaces:**
- Browser application helpers continue exposing `isAuthenticated`, `getUser`, `logout`, `getUserCircles`, `updateProfile` as required by callers, but normal credentials auth is no longer implemented here.

- [ ] Add a failing search/source assertion that no source imports `alphayard-appkit`.
- [ ] Migrate any still-required OAuth/profile helper usage to `@alphayard/appkit` or same-origin BFF calls.
- [ ] Delete obsolete hosted-login usage from the custom credential page.
- [ ] Run auth regressions.
- [ ] Commit.

### Task 5: Full verification and deployment

**Files:**
- Modify only if verification exposes a root-cause defect.

- [ ] Run `npm audit --omit=dev --audit-level=high` and require exit 0.
- [ ] Run `node --import tsx --test tests/appkit-headless-sdk-auth.test.ts tests/hex-local-appkit-auth-ui.test.ts tests/security-hardening-v2.test.ts tests/build-regression-fixes.test.ts` and require zero failures.
- [ ] Run `npm run lint` and require zero errors.
- [ ] Run `npm run build` and require exit 0.
- [ ] Open a PR from `codex/appkit-sdk-v1-headless-auth` to `main` and verify CI against the exact head SHA.
- [ ] Merge only after the exact head is green.
- [ ] Verify Railway production deployment reaches SUCCESS and runtime logs report database ready and Next.js Ready.