# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start Next.js dev server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint

# Database
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema changes (no migration history)
npm run db:migrate    # Create and run migration (dev only)
npm run db:seed       # Seed database
npm run db:scope-legacy-media # Dry-run scoped UniBox media key migration; add -- --write to apply
npm run db:studio     # Open Prisma Studio GUI
```

No test framework is configured. Use `npm run lint` for code quality checks.

## Architecture

**Narinyland** is a romantic web app for couples — AI virtual pet, shared memories, timeline, 3D world, gamification, love letters, and coupons.

### Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 5** → **PostgreSQL** (primary data store)
- **Redis** (ioredis) — caches config and timeline responses
- **UniBox** — media storage via the local UniBox SDK adapter
- **Google Gemini** — AI pet responses
- **AlphaYard AppKit** — OAuth authentication
- **React Three Fiber / Three.js** — 3D scenes
- **Tailwind CSS** + **Framer Motion** — styling and animation

### Key directories

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Main app container (~900 lines); root state, tab switching |
| `app/login/` | Login page with 3D rotating Earth background |
| `app/api/` | All backend API routes (Next.js serverless) |
| `components/` | All React UI components |
| `components/3d/` | Three.js scene objects (Environment, Tree, Flower, Pet) |
| `lib/` | Singletons/adapters: `prisma.ts`, `redis.ts`, `storage.ts`, `unibox-sdk.ts`, `auth.ts` |
| `services/api.ts` | Frontend wrapper for all API calls |
| `prisma/schema.prisma` | Database schema (10 models) |
| `types.ts` | Shared TypeScript types |
| `proxy.ts` | Bot/API auth guard for Next.js Proxy |

### Database models

- **AppConfig** — singleton record (`id: 'default'`); stores all app settings, tree/flower/pet config, PWA metadata, playlist, proposal state
- **Partner** — two user profiles linked to AppConfig; tracks points/gamification
- **TimelineEvent** — relationship milestones with location (lat/lng), media, and ordering
- **Memory** — individual photos/videos with storage key, caption, sort order, album assignment
- **Album** — named collection of Memories
- **Land** — a 3D world scene (active/inactive)
- **PurchasedItem** — 3D decoration object placed in a Land with position/rotation
- **LoveLetter** — scheduled message with unlockDate, folder (Inbox/Archive/Trash), read tracking
- **Coupon** — redeemable reward assigned to a specific partner
- **LoveStats** — global XP/level/leaves/points

### Authentication flow

1. Login redirects to AlphaYard AppKit OAuth domain
2. OAuth callback hits `/auth/callback`
3. Frontend exchanges code via `POST /api/auth/token`
4. Token stored in `localStorage`; sent as `Authorization: Bearer <token>` on API calls
5. AppKit client ID/domain fetched at runtime from `/api/config/appkit` (Railway workaround for missing build-time env vars)
6. Logout calls `POST /api/auth/revoke`

### Caching pattern

`/api/config` and `/api/timeline` responses are cached in Redis. Mutations invalidate the relevant cache keys. Check `lib/redis.ts` for the client and API route files for cache key constants.

### File uploads

All media uploads go through Narinyland API routes and the `lib/storage.ts` adapter. New uploads are stored in UniBox through `lib/unibox-sdk.ts`, then saved using the existing `s3Key`/`mediaS3Key` database columns as provider-neutral storage keys. Image serving uses `/api/serve-image` for access-controlled proxying. Legacy S3-compatible reads/deletes remain in the adapter for old records.

### 3D system

- `World3D.tsx` — main 3D world viewer with React Three Fiber canvas
- `LandingBackground.tsx` — 3D globe on the login page
- `components/3d/` — individual 3D scene objects
- `LoveTree3D.tsx` — interactive 3D love tree (separate from World3D)
- Custom GLB models can be uploaded and placed as `PurchasedItem` records
- Globe zoom-out triggers a fade transition to `World2DMap.tsx` (Leaflet)

### Large components to be aware of

- `components/EditDrawer.tsx` — settings modal (~104KB); vertical tabs with all configuration panels
- `app/page.tsx` — root app with all feature state and tab management
- `app/login/page.tsx` — login page (~776 lines) including 3D background

## Environment variables

Required in `.env.local`:

```
DATABASE_URL           # PostgreSQL connection string
REDIS_URL              # Redis connection string
UNIBOX_BASE_URL          # Defaults to https://unibox.up.railway.app
UNIBOX_APP_ID            # UniBox/AppKit application UUID
UNIBOX_SESSION_COOKIE    # UniBox next-auth session cookie or full Cookie header
UNIBOX_FOLDER_ID         # Optional target folder in UniBox
UNIBOX_FOLDER_IDS        # Optional folder-name mapping, e.g. gallery=folder_id
ALLOW_LEGACY_UNSCOPED_MEDIA # Optional production compatibility gate for old unscoped media keys
GEMINI_API_KEY         # Google Gemini for AI pet
APPKIT_CLIENT_ID       # AlphaYard OAuth
APPKIT_DOMAIN
```

## Deployment

Configured for Railway (recommended) or Vercel. `next.config.mjs` uses `output: 'standalone'` for containerization and has `bodySizeLimit: '50mb'` for large file uploads. Run `npm run db:migrate` (not `db:push`) for production schema changes.
