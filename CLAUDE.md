# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

```bash
# Development
npm run dev
npm run build
npm run start
npm run lint
npm test

# Database
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:scope-legacy-media
npm run db:scope-legacy-media -- --write
npm run db:studio
```

Use `npm run lint`, `npm test`, and `npm run build` for quality checks.

## Architecture

Narinyland is a romantic web app for couples: AI virtual pet, shared memories, timeline, 3D world, gamification, love letters, and coupons.

### Stack

- Next.js 16 App Router, React 19, TypeScript
- Prisma 6 and PostgreSQL
- Redis for config, timeline, stats, and session cache paths
- UniBox media storage via `lib/storage.ts` and `lib/unibox-sdk.ts`
- Google Gemini for AI pet responses
- AlphaYard AppKit OAuth authentication
- React Three Fiber / Three.js for 3D scenes
- Tailwind CSS and Framer Motion

### Key Directories

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Marketing page |
| `app/garden/page.tsx` | Main app container and feature state |
| `app/api/` | Backend API routes |
| `components/` | React UI components |
| `components/3d/` | Three.js scene objects |
| `lib/` | Prisma, Redis, storage, auth, security, and service helpers |
| `services/api.ts` | Frontend API wrapper |
| `prisma/schema.prisma` | Database schema |
| `tests/` | Focused Node tests |
| `proxy.ts` | Bot/API auth guard for Next.js Proxy |

### File Uploads

All media uploads go through Narinyland API routes and `lib/storage.ts`. New uploads are stored in UniBox through `lib/unibox-sdk.ts`, then saved using existing `s3Key`/`mediaS3Key` columns as provider-neutral storage keys. Image serving uses `/api/serve-image` for access-controlled proxying. Legacy S3-compatible reads/deletes remain for old records.

### Notes

- `/api/config`, `/api/timeline`, `/api/stats`, and related mutations use Redis cache keys that must be invalidated after writes.
- Config and media access should go through `requireConfigAccess` and `requireStorageKeyAccess`.
- The largest maintainability targets are `components/EditDrawer.tsx`, `app/garden/page.tsx`, `components/LoveTree3D.tsx`, `components/3d/Environment.tsx`, and `components/Timeline.tsx`.
