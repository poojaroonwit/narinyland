# Narinyland Security Hardening V2 Design

## Goal

Remove the verified P0/P1 security, authorization, economy, data-integrity, upload, and production-build failures found in the second-pass audit without rewriting unrelated gameplay/rendering systems.

## Security boundaries

1. Browser cookies are transport only, never identity proof. A soft Narinyland session must be an opaque random session id backed by Redis and bound to a user id. Raw `narinyland_sub` values and unsigned JWT payloads must not authorize API requests.
2. AppKit access tokens may be used only after server validation. Where local verification is unavailable, the server must validate the token through the trusted AppKit `/users/me` endpoint before accepting its subject.
3. Circle membership and circle administration are separate permissions. Normal members may use shared world data; only owner/admin roles may rename or delete a circle.
4. Joining a circle must require proof from AppKit that the signed-in user can see/is already invited to the circle. The server must not add arbitrary user-selected circle ids with the service token.
5. Remove the legacy fallback that attaches a user with no memberships to the first AppConfig in the database.

## Economy and data integrity

1. `PUT /api/config` must only update scalar/configuration settings and partner presentation fields. Coupons, memories/gallery, and timeline collections must use dedicated APIs and must not be bulk-deleted/upserted by generic config save.
2. Legacy purchased-item creation must use a server-owned catalog and perform point deduction plus item creation in one Serializable transaction. The client must not choose price.
3. Leaf purchases must reduce spendable points without increasing lifetime points/XP.
4. Letter rewards must be server-owned and rate-limited. A partner can earn the fixed letter reward at most once per configurable cooldown window (default 1 hour); sending remains available when reward is exhausted.
5. A letter's sender must resolve to the authenticated user's partner record, not an arbitrary caller-selected partner.
6. Locked letters must not expose content/media before `unlockDate`; sender-owned letters may retain their own content.

## Upload/media safety

1. Reject SVG/XML/HTML and unsupported model formats by both MIME and extension. Only raster images, common audio/video, `.glb`, and `.gltf` are accepted.
2. Generic upload errors must not return provider/internal error details to clients.
3. Instagram image proxy must enforce the 10 MB cap while streaming even when `Content-Length` is absent.

## Production build and dependency policy

1. Production Next.js TypeScript compilation must exclude Node test files from `tsconfig.json`; tests remain executed explicitly by CI.
2. CI must run `npm audit --omit=dev --audit-level=high` as a hard gate.
3. The known test type errors exposed by Next 16.3.x must be corrected so the repository also remains type-clean when tests are checked separately.

## Credential cleanup

Delete committed database scratch scripts containing credentials and add ignore rules for scratch DB scripts and TypeScript build artifacts. Add a CI secret-pattern regression test so a PostgreSQL credential literal cannot be reintroduced. Git-history purge and database credential rotation require provider/history operations outside normal source edits and must be separately verified.

## Verification

Required before merge: focused security regression tests, existing Hex/farm/AppKit suites, lint with zero errors, production build, runtime smoke, and zero high production dependency advisories.