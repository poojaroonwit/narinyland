# AppKit Headless Auth SDK Migration Design

## Goal
Keep Narinyland's existing custom login/signup experience while making the new AppKit SDK the authentication and policy authority.

## Approved Architecture

Narinyland owns all authentication screens. The browser never renders AppKit's hosted login UI for the normal login/signup journey. The browser sends user-entered auth actions to Narinyland's same-origin BFF. The BFF instantiates `@alphayard/appkit/headless-auth` and uses its typed methods to talk to AppKit.

The BFF remains responsible for Narinyland session persistence. AppKit access/refresh tokens returned by the SDK are never returned to browser JavaScript. On an `authenticated` SDK result, Narinyland validates the access token with AppKit, writes the AppKit tokens as HttpOnly cookies, and creates the opaque Redis-backed `narinyland_session` introduced by security hardening v2.

## SDK Version

Use `@alphayard/appkit` version `1.7.0`, matching the current AppKit repository package and release workflow on 2026-08-23. Remove the legacy `alphayard-appkit` dependency.

## Server Adapter

Create `lib/appkit-headless-server.ts` as the only server-side construction point for the headless SDK. It resolves:

- AppKit domain from `NEXT_PUBLIC_APPKIT_DOMAIN` / `APPKIT_DOMAIN`.
- OAuth client id from `NEXT_PUBLIC_APPKIT_CLIENT_ID` / `APPKIT_CLIENT_ID`.
- AppKit application id from the existing AppKit server integration.
- in-memory SDK token storage per request so no process-global authentication state is shared between users.

Expose focused wrappers for configuration and authentication actions rather than leaking the SDK object through the application.

## BFF Contract

`POST /api/auth/credentials` keeps the existing same-origin UI contract but routes supported actions through SDK methods:

- `login` -> `auth.loginWithCredentials`
- `register` -> `auth.signup`
- `mfa-request` -> `auth.requestMfa`
- `mfa-verify` -> `auth.verifyMfa`
- `email-verify` -> `auth.verifyEmail`
- `email-resend` -> `auth.resendEmailVerification`
- `forgot-password` -> `auth.forgotPassword`
- `reset-password` -> `auth.resetPassword`

`GET /api/auth/config` returns only the SDK's public application auth configuration needed to render Narinyland's UI.

The BFF serializes typed continuation results into a browser-safe shape and strips all AppKit access/refresh tokens before responding.

## UI

`components/auth/NarinylandAuthPage.tsx` keeps its current world background, card layout, typography, inputs, login/signup switching, and Narinyland copy.

The page loads `/api/auth/config` and uses AppKit policy/provider data for authentication behavior. It must support at minimum:

- credentials
- MFA challenge using configured email/SMS/TOTP channels
- email verification
- password-reset-required continuation
- forgot/reset password

If AppKit returns a supported continuation, Narinyland renders it locally. It must not treat a continuation response as a generic login failure.

MFA enrollment/passkey continuations that require a ceremony not yet represented in the current Narinyland screen may use an explicit local security-setup state or the SDK hosted fallback only for that specific ceremony; normal login/signup remains Narinyland-owned.

## Security Invariants

- No AppKit client secret in browser code.
- No AppKit access or refresh token in browser-readable storage.
- No unsigned JWT decoding for identity.
- No `narinyland_sub` identity fallback.
- Opaque Redis-backed Narinyland session remains the local authorization source.
- Same-origin/CSRF checks remain on BFF auth mutations.
- AppKit remains authoritative for signup availability, password policy, email verification, MFA and provider configuration.

## Compatibility

Existing authenticated application routes continue using `getAuthSession`, `/api/auth/me`, and opaque local sessions. OAuth callback support can remain for hosted/social fallback, but normal login/signup must not call the legacy hosted `buildAuthUrl` path.

## Verification

Required before merge:

1. Regression test proves Narinyland imports `@alphayard/appkit/headless-auth` and no longer depends on `alphayard-appkit`.
2. BFF unit/source contract tests prove each action uses SDK methods and strips tokens.
3. UI regression test proves the Narinyland-owned page remains and no normal credentials submit redirects to AppKit hosted UI.
4. Existing security hardening tests pass.
5. `npm audit --omit=dev --audit-level=high` passes.
6. `npm run lint` has no errors.
7. `npm run build` exits 0.
8. Railway production deployment reaches SUCCESS and Next.js reports Ready.