# 🌿 Māngere Restoration Map

A premium, full-stack community environmental restoration mapping platform built for Māngere, Auckland, New Zealand.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · React · TypeScript |
| Styling | Tailwind CSS (dark-only, glassmorphism) |
| Database / Auth | Supabase (Postgres + RLS + Realtime) |
| Storage | Supabase Storage |
| Maps | Google Maps JavaScript API + MarkerClusterer |
| Calendar | FullCalendar v6 |
| Deployment | Vercel |

---

## Quick Start

### 1. Clone and install

```bash
cd mangere-restoration-map
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run the entire contents of `supabase/schema.sql`
3. In **Authentication → Providers**, enable:
   - **Email** (enabled by default)
   - **Google** → add Client ID & Secret from Google Cloud Console
4. In **Authentication → URL Configuration**, add:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
5. In **Storage**, verify the `project-images` bucket was created as public

### 4. Set up Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Places API**
4. Create an API key under **Credentials**
5. Restrict the key:
   - **Application restrictions**: HTTP referrers
   - Add `localhost:3000/*` for dev, and your production domain
   - **API restrictions**: restrict to the 3 APIs above

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

### Map
- Fullscreen dark Google Map centred on Māngere
- Click anywhere (signed in) to create a restoration site
- Custom SVG markers with status colours (green=active, blue=completed, amber=planned)
- Marker clustering for nearby sites
- Search bar with geocoding
- Filter by project type

### Stat Cards
- Real-time dashboard: Trees Planted · Volunteers · Area Restored
- Auto-updates via Supabase Realtime when any project changes

### Project Panel (side drawer)
- **Overview** — editable name, description, type, status, trees/area/contributors, coordinates, creator
- **Photos** — drag & drop multi-upload, image gallery with lightbox, delete
- **Story** — auto-saving textarea for restoration notes and history
- **Calendar** — project-specific FullCalendar with event create/edit/delete/drag

### Community Calendar
- Shared calendar for the whole community
- Month / week / list views
- Event types with distinct colours: planting, cleanup, meetup, gathering, monitoring

### Auth
- Google OAuth
- Email + password
- Guest browsing (read-only)

---

## Project Structure

```
src/
├── app/
│   ├── auth/callback/    OAuth callback route
│   ├── globals.css       Dark theme + FullCalendar overrides
│   ├── layout.tsx        Root layout + Toaster
│   └── page.tsx          Main page (map + calendar)
├── components/
│   ├── auth/             AuthButton, AuthModal
│   ├── calendar/         CommunityCalendar
│   ├── map/              MapComponent (Google Maps)
│   ├── project/          ProjectModal, PhotoUpload, StoryEditor,
│   │                     ProjectCalendar, ProjectMetadata
│   ├── stats/            StatCards
│   └── ui/               Button, Modal, LoadingSkeleton
├── hooks/
│   ├── useAuth.ts        Session management
│   ├── useProjects.ts    Project list state
│   ├── useRealtime.ts    Supabase Realtime subscriptions
│   └── useStatistics.ts  Stats with Realtime
├── lib/
│   ├── maps/mapStyles.ts  Google Maps dark style + config
│   └── supabase/          Browser + Server clients
├── services/             projectService, imageService,
│                         eventService, statisticsService
├── types/index.ts        All shared TypeScript types
└── utils/                cn(), formatters
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Set the same environment variables in your Vercel project settings. Update:
- Supabase Auth → Site URL → your Vercel URL
- Supabase Auth → Redirect URLs → `https://yourdomain.vercel.app/auth/callback`
- Google Maps API key → add your production domain to HTTP referrer restrictions

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `users` | Mirrors `auth.users`, stores profile data |
| `projects` | Map locations with stats |
| `project_images` | Photos linked to projects |
| `project_stories` | Free-text notes (one per project) |
| `project_events` | Project-specific calendar events |
| `community_events` | Global community calendar |
| `statistics` | Single-row aggregate (updated by trigger) |

All tables have Row Level Security:
- Public read on everything
- Authenticated write; creators can edit/delete their own records
# mangere-restoration-map
# mangere-restoration-map
