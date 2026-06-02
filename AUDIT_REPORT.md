# Narinyland Codebase Audit Report

Date: 2026-06-02

Scope: architecture/code quality, missing features, UX/UI leaks, security, speed, and resource use across the current working tree.

## Executive Summary

Narinyland is now in a generally shippable technical state: TypeScript passes, production build passes, `npm audit` reports zero vulnerabilities, API auth/data-isolation work is already present, and this pass fixed several remaining security and accessibility issues.

The biggest remaining risks are not single-line bugs. They are systemic debt: 471 lint warnings, broad `any` typing in API/client contracts, no automated tests, raw image usage, heavy 3D/media surfaces, and a legacy default-world access path that keeps backward compatibility but weakens strict multi-tenant isolation.

## Audit Health Score

| Dimension | Score | Key finding |
|---|---:|---|
| Architecture / codebase | 3.0/4 | Build and TypeScript pass, but large components and broad `any` usage make changes risky. |
| Feature completeness | 2.7/4 | Core romantic garden features are broad, but tests, rate limits, observability, and robust media ownership are missing. |
| UX / UI | 2.8/4 | Strong personality, but dense modals, raw images, icon-only controls, decorative blur/glass patterns, and mobile pressure remain. |
| Security | 3.2/4 | Major API auth is present; this pass hardened CSRF, media proxying, generic S3 tools, and name-login exposure. |
| Speed / resource use | 2.8/4 | Build is healthy, but external font/icon CSS, remote hero video, raw images, and always-rich 3D scenes need deeper optimization. |
| Total | 15.5/20 | Good, with important P1/P2 hardening and maintainability work remaining. |

## Fixed In This Pass

- Added central same-origin protection for unsafe API methods in `proxy.ts`.
- Replaced the weaker logout origin check with shared exact-origin CSRF validation.
- Disabled `/api/auth/name-login` in production unless `ENABLE_NAME_LOGIN=true`.
- Restricted generic S3 delete, presign, and list endpoints to admin-token requests in production.
- Hardened `/api/instagram/image` to parse HTTPS URLs, allow only Instagram post/CDN hosts, reject non-image responses, cap declared response size, validate cached CDN URLs, and clear fetch timeout timers.
- Restored browser zoom by removing `maximumScale: 1` and `userScalable: false`.
- Added preconnect hints for external font/icon hosts.
- Replaced layout `any` casts with a narrow runtime config type.
- Added missing alt text and ARIA labels in the timeline spreadsheet media controls.
- Moved the whiteboard canvas context from React state to a ref, removing React compiler immutability warnings.

## Remaining Findings

### P1: Legacy default-world access weakens strict multi-tenant isolation

Location: `lib/config-access.ts`

Impact: If a request has no `X-Circle-Id`, the `default` config remains allowed for any authenticated legacy session. This preserves old data behavior, but it is not strict tenant isolation.

Action: Finish migrating all users into explicit circles, then remove the no-header default fallback. Treat all world-scoped routes as requiring membership.

### P1: Media ownership is not fully enforced at S3 key level

Location: `app/api/serve-image/route.ts`, `lib/s3.ts`, upload routes

Impact: Auth is required, and generic S3 tooling is now admin-restricted, but `/api/serve-image?key=...` still serves any safe key to an authenticated session. Image tags also cannot send `X-Circle-Id`, so route-level membership is hard to enforce with the current URL shape.

Action: Prefix uploaded keys with config/circle ID, store media ownership metadata, and serve media through signed opaque IDs or short-lived signed URLs rather than raw S3 keys.

### P1: No automated test framework

Location: project-wide

Impact: Security and data isolation changes rely on manual build/lint checks. This is risky for a multi-route app with auth, Redis, Prisma, and S3 behavior.

Action: Add focused route tests first: config access, circle membership, upload validation, CSRF rejection, and media proxy URL rejection.

### P2: Lint warning debt remains high

Location: project-wide, especially `services/api.ts`, `app/api/config/route.ts`, `app/garden/page.tsx`, large UI components

Impact: `npm run lint` passes but reports 471 warnings. The biggest groups are broad `any`, unused variables, raw `<img>`, and React hook/compiler warnings in procedural code.

Action: Type API response contracts in `services/api.ts`, extract large route payload types, and split large UI surfaces before tightening lint rules.

### P2: UX/UI accessibility still needs a complete pass

Location: `components/EditDrawer.tsx`, `components/Timeline.tsx`, `components/LoveLetter.tsx`, `app/page.tsx`

Impact: The interface has charm, but repeated modal/drawer surfaces, icon-heavy controls, dense mobile layouts, and raw images can hurt keyboard, screen-reader, and touch users.

Action: Add labels/tooltips to all icon-only controls, verify focus order, make touch targets consistently 44px+, and replace decorative text-heavy controls with familiar icon controls where appropriate.

### P2: Performance and resource use need profiling

Location: `app/page.tsx`, `components/LoveTree3D.tsx`, `components/World3D.tsx`, `components/3d/Environment.tsx`, image-heavy components

Impact: The app uses a remote hero video, external font/icon CSS, raw image tags, and rich 3D scenes. These can increase LCP, memory, bandwidth, and mobile battery cost.

Action: Use `next/image` or a vetted image component strategy, lazy-load non-critical 3D views, honor reduced motion, and replace Font Awesome CDN with bundled icons.

## Action Item Plan

1. P1 security: remove default-world fallback after data migration and add route tests for membership enforcement.
2. P1 security: redesign media serving around config-scoped keys or opaque media IDs.
3. P1 quality: add a minimal test framework and cover auth/config/upload/media proxy routes first.
4. P2 maintainability: type `services/api.ts` and the highest-traffic API route payloads.
5. P2 UX/accessibility: audit the large modal/drawer surfaces with keyboard and screen-reader checks.
6. P2 performance: replace raw images, bundle icons, lazy-load 3D, and add reduced-motion behavior.
7. P3 polish: normalize typography/color tokens and reduce decorative glass/blur/orb patterns where they do not carry product meaning.

## Verification

- `.\node_modules\.bin\tsc.cmd --noEmit`: passed.
- `cmd /c npm run lint`: passed with 471 warnings.
- `cmd /c npm audit --json`: 0 vulnerabilities.
- `cmd /c npm run build`: passed.
