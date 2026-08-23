# Narinyland Production Hardening Design

## Goal

Make the current Homestead v3 release safe and reliable for production without changing the approved game loop or HexWorld ownership boundaries.

## Required outcomes

1. Game economy rewards are server-authoritative. Clients cannot mint arbitrary points/XP or replay a coupon reward.
2. Coupon redemption is atomic and idempotent under repeated or concurrent requests.
3. Read traffic survives Railway Postgres cold-start/recovery errors, including `database system is starting up`.
4. AppKit SSO launch URL synchronization uses the application-admin update contract and does not spam failing requests.
5. Next.js builds do not require a reachable production database for metadata/static generation.
6. Redis outages degrade cache/undo acceleration without creating unhandled request failures.
7. Coupon redemption refreshes stats without using an invalid zero-XP mutation.
8. Cleanup distinguishes definitely broken media from transient network/storage failures and will not delete uncertain records.
9. CI covers economy integrity, database retry classification, AppKit update behavior, production startup/build contracts, lint, and build.
10. Remove the highest-risk `@ts-nocheck`/`any` boundary in garden actions when it can be done without changing behavior.

## Non-goals

- Replacing the Family Farm JSON save format with a new relational game-state schema in this hardening pass. The current save is already serialized under a Serializable transaction and migrating it would add release risk without fixing a current correctness defect.
- Rewriting large HexWorld rendering components solely to reduce line count. Refactors must be behavior-preserving and justified by a concrete boundary.
- Major Prisma/Next upgrades without a regenerated lockfile and green CI.

## Acceptance

- Existing Homestead v3 regression suites remain green.
- New economy tests prove repeated redemption cannot award twice and arbitrary award endpoints are unavailable to normal clients.
- Database retry tests include Railway startup/recovery messages.
- AppKit tests assert the supported application update method/fallback behavior.
- Build and lint pass on the PR.
- Production deploy reaches a healthy Railway state after merge.