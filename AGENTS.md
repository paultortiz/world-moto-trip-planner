# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

World Moto Trip Planner is a Next.js 14 application for planning and visualizing multi-day motorcycle trips. Users can plot routes on Google Maps, add waypoints (fuel, lodging, campgrounds, dining, POIs), manage fuel planning, and get AI-generated daily itineraries.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production (runs Prisma generate + migrate + Next.js build)
npm run build

# Start production server
npm run start

# Lint codebase
npm run lint

# Database migrations (development)
npm run prisma:migrate    # Create and apply new migration
npm run prisma:generate   # Regenerate Prisma client after schema changes
```

## Required Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps JavaScript API key
- `OPENAI_API_KEY` - OpenAI API key (optional, AI features disabled without it)

## Architecture

### Directory Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── domain/        # Core domain models and business logic (models.ts, tripMetrics.ts)
├── features/      # Feature modules (e.g., features/map/)
├── i18n/          # Internationalization (config, messages for en/es/de/fr/pt)
├── lib/           # Shared utilities (prisma.ts, openai.ts)
├── shared/        # Reusable UI components (LocaleSwitcher, MobileNav)
├── styles/        # Global CSS (Tailwind)
├── auth.ts        # NextAuth configuration
└── middleware.ts  # Locale detection middleware
```

### Key Patterns

**Path Aliases**: Use `@/*` to import from `src/*` (configured in tsconfig.json).

**Client Components**: Mark with `'use client'` directive. Server Components are default in App Router.

**API Routes**: Located in `src/app/api/`. Each route uses `route.ts` with exported HTTP method handlers (GET, POST, PUT, DELETE).

**Authentication**: Use `auth()` from `@/auth` in API routes to get session. User ID/role available via `(session.user as any).id` and `(session.user as any).role`.

**Database Access**: Import `prisma` from `@/lib/prisma`. The client is singleton-cached in development to prevent connection exhaustion.

**Internationalization**: All user-facing text should use `useTranslations()` hook (client) or `getTranslations()` (server). Add new keys to all files in `src/i18n/messages/`.

### Data Model (Prisma)

Core entities:
- `User` - Auth user with role (USER, ADMIN, SPONSOR) and locale preference
- `Trip` - A planned route with metadata, fuel settings, schedule settings, AI daily plan
- `Waypoint` - Ordered points on a trip (types: FUEL, LODGING, CAMPGROUND, DINING, POI, CHECKPOINT, OTHER)
- `RouteSegment` - Calculated route between waypoints (distance, duration, polyline)
- `Motorcycle` - User's bikes with specs used for fuel planning

### Styling

Uses Tailwind CSS with custom `adv-*` color tokens defined in `tailwind.config.js`:
- `adv-night` / `adv-panel` - Dark backgrounds
- `adv-border` - Border color
- `adv-accent` / `adv-accentMuted` - Orange highlight colors
- `shadow-adv-glow` - Subtle glow effect

### Map Integration

The `TripPlannerMap` component (`src/features/map/TripPlannerMap.tsx`) handles Google Maps rendering with:
- Route polylines
- Typed waypoint markers (custom SVG icons per type)
- Nearby places search (fuel, lodging, campgrounds, dining, POIs)
- Place search box integration
- Marker clustering for performance

### AI Features

OpenAI integration in `src/lib/openai.ts` is optional. The client is `null` if `OPENAI_API_KEY` is not set. AI endpoints:
- `/api/ai/daily-plan` - Generate structured daily itinerary for a trip
- `/api/ai/motorcycle-specs` - Fetch specs for a motorcycle model
