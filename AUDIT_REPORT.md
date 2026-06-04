# Narinyland Codebase Audit Report

Date: 2026-06-04

Scope: architecture/code quality, missing features, UX/UI leaks, security, speed, and resource use across the current working tree.

## Executive Summary

Narinyland is in a shippable baseline state after this fix pass: production build passes, TypeScript passes, focused security helper tests pass, and the highest-risk media and default-world access issues are now hardened for new uploads and production traffic.

The remaining work is mostly systemic verification and refactor debt rather than a single blocking bug: legacy UniBox keys now have a migration path and production gate, but the local database needs pending schema updates before the dry-run can inspect live data, and there is still no full browser/a11y/E2E test suite.

## Audit Health Score

| Dimension | Score | Key finding |
|---|---:|---|
| Architecture / codebase | 3.4/4 | Build and TypeScript pass; API client and more route payloads are typed, but large components and a few broad payload types remain. |
| Feature completeness | 3.0/4 | Core app flows are broad; focused tests were added and a broken timeline media-add control was fixed. |
| UX / UI | 3.0/4 | Reduced-motion support, avatar fallbacks, media wrappers, and image labels improved; dense modal/drawer UX still needs a full pass. |
| Security | 3.7/4 | CSRF, upload tooling, config membership, scoped media serving, and legacy-media production gating are materially stronger. Live legacy data migration still needs the database schema brought current. |
| Speed / resource use | 3.3/4 | Build is clean, decorative paint was reduced, media loading is more consistent, layout DB reads are narrower, and more animation seeds are stable. 3D/font/icon optimization remains. |
| Total | 17.6/20 | Good baseline with clear remaining P1/P2 migration and refactor items. |

## Fixed In This Pass

- Added config-aware media serving: new S3 uploads are stored under `configs/{configId}/...`, `/api/serve-image` checks membership for scoped keys, and the active circle is mirrored into a same-site cookie for browser image requests.
- Tightened default config access: production no longer silently grants implicit `default` access unless `ALLOW_LEGACY_DEFAULT_CONFIG=true`; explicit circle/config membership is enforced.
- Added focused node tests for config ID parsing, active-circle cookie fallback, scoped media key parsing, exact same-origin checks, upload folder validation, and S3 key validation.
- Added a shared error helper and removed unsafe catch typing from upload, album, land, and selected client/server helpers.
- Added typed API client contracts in `services/api.ts` and removed `any` from that API wrapper.
- Fixed a broken timeline editor feature: the media add control now opens a real file picker and infers image/video/audio from MIME type.
- Hardened the custom image wrapper against server render `window` access and standardized more media thumbnails through it.
- Added reduced-motion CSS for users who prefer less animation.
- Replaced selected direct image tags with `next/image` or the local media wrapper where safe, and added avatar fallback handling for emoji avatars.
- Removed dead imports/state from the marketing page, garden page, timeline, and player.
- Fixed build-time Prisma schema drift in `app/layout.tsx` by selecting only the metadata field actually needed from `AppConfig`.
- Switched `World3D` from a runtime `require()` to an ES import.
- Typed and hardened circle/config cleanup, coupon update, memory create/update, and timeline create payloads; this also fixed a null URL write edge case in memory form updates.
- Replaced render-time `Math.random()` usage in `MemoryFrame`, `PetVisual`, and several `Environment` particle systems with deterministic seeded values, reducing React purity warning debt and improving render stability.
- Typed and hardened Instagram profile scraping, letter updates, partner sync, onboarding error handling, auth callback errors, and most timeline detail update/create payloads.
- Replaced render-time random cloud generation with deterministic seeded cloud and puff placement.
- Replaced more render-time randomness in god rays, flowers, garden grass/stone paths, the login background, and LoveTree grass placement with deterministic seeded values.
- Removed stale imports/unused props in marketing world, location picker, coupon cards, garden constants, and related small components.
- Removed the remaining explicit lint suppressions from auth callback handling, the auth provider, media/player effects, Prisma helper scripts, timeline detail updates, `EditDrawer`, `Tree`, and `Pet`; all now pass lint without inline exceptions.
- Added a production gate for unscoped legacy media keys. Production now denies them unless `ALLOW_LEGACY_UNSCOPED_MEDIA=true` is explicitly set.
- Added `npm run db:scope-legacy-media` for dry-run legacy UniBox key scoping and `npm run db:scope-legacy-media -- --write` to rewrite DB references after review.
- Added tests for legacy UniBox key scoping and the production legacy-media access gate.

## Remaining Findings

### P1: Live legacy media migration is ready but blocked by local DB drift

New uploads are config-scoped and membership-checked. Production denies unscoped legacy keys unless `ALLOW_LEGACY_UNSCOPED_MEDIA=true` is set. The migration script can scope legacy UniBox keys in DB records and reports older S3-style keys that require object copying.

Action: run the pending Prisma migration/deploy step so `Memory.configId` exists in the live DB, then run `npm run db:scope-legacy-media` and apply with `-- --write` after reviewing unsupported S3-style keys.

### P1: Test coverage is focused but still thin

The new tests cover important security helpers, but route-level auth, Prisma/Redis behavior, uploads, and browser UX are not covered.

Action: add route tests for circle membership, config mutation, upload create/delete, media serving, and CSRF rejection. Add one Playwright smoke test for login-gated app rendering.

### P2: Lint debt is cleared; component size debt remains

`npm run lint` passes with 0 warnings and no `eslint-disable` comments remain under `app`, `components`, `lib`, or `prisma`. The remaining maintainability debt is structural: `EditDrawer`, `app/page.tsx`, and rich 3D components are still large and should be split into smaller owned modules.

Action: extract settings panels, 3D scene helpers, and media controls into smaller typed components so future feature work stays low-risk.

### P2: UX/accessibility needs full browser verification

Several controls improved, but large drawer/modal flows still need keyboard, focus, touch target, and screen-reader checks.

Action: run a browser/a11y pass on `app/garden`, `EditDrawer`, `Timeline`, `LoveLetter`, and onboarding. Add tooltips/labels where icon-only controls remain.

### P2: Performance work remains for rich media and 3D

The app still relies on external font/icon CSS, remote hero video, and rich 3D scenes. Reduced motion exists, but 3D quality/lazy-loading needs deeper profiling.

Action: bundle icons, evaluate self-hosted fonts, lazy-load non-critical 3D views, and profile mobile memory/frame rate.

## Action Item Plan

1. Bring the live database schema current, run `npm run db:scope-legacy-media`, then apply `-- --write` for scoped UniBox keys after reviewing unsupported S3-style keys.
2. Add route-level auth/security tests around config, upload, media serving, and circle membership.
3. Split `EditDrawer`, `app/page.tsx`, and large 3D components into smaller typed modules.
4. Continue stabilizing random animation state in the remaining 3D/media components.
5. Run browser-based responsive, accessibility, and focus-order verification.
6. Profile and lazy-load 3D/media-heavy views, then replace external icon/font dependencies where practical.

## Verification

- `cmd /c npm test`: passed, 10 tests.
- `.\node_modules\.bin\tsc.cmd --noEmit`: passed after build regenerated `.next/types`.
- `cmd /c npm run lint`: passed with 0 warnings.
- `rg -n "eslint-disable" app components lib prisma`: no matches.
- `cmd /c npm run build`: passed cleanly.
- `cmd /c npm run db:scope-legacy-media`: blocked by local DB schema drift (`Memory.configId` missing); script now reports this as an actionable migration prerequisite.
