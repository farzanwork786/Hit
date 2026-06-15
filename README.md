# Hit 🎾

A tennis player matching app built with **Expo + React Native** and **Supabase**.
Find hitting partners near you by skill (NTRP / UTR), playing style and schedule.

## Features

- **Onboarding** — branded splash, 18+ age gate, account type (self / child) and a
  3‑step registration wizard (account → tennis profile → location).
- **Browse players** — rich player cards with a collapsible filter panel
  (distance, NTRP range, UTR range, playing style).
- **Player profile** — full‑screen profile with stats, availability, gallery and
  a sticky match/like action bar.
- **Court Board** — a location‑tagged feed of "looking to play" posts with a
  distance filter.
- **Messages** — Chats and Requests tabs, plus a chat detail screen with a
  composer and Supabase realtime support.
- **My Profile** — stats and an Instagram‑style matches grid.
- **Privacy settings** & **Notifications** screens.

## Tech stack

| Area        | Choice                                              |
| ----------- | --------------------------------------------------- |
| Framework   | Expo SDK 56 (React Native 0.85, React 19)           |
| Navigation  | React Navigation (native stack + bottom tabs)       |
| Backend     | Supabase (auth, Postgres, realtime)                 |
| Fonts       | DM Serif Display (headers), DM Sans (body)          |
| Icons       | `@expo/vector-icons` (Ionicons)                     |

### Design tokens

- Dark navy `#0F172A` · Blue accent `#2563EB` · Background `#F8F9FB`
- All tokens live in [`src/theme/index.js`](src/theme/index.js).

## Getting started

```bash
npm install
npm start          # then press i (iOS), a (Android) or scan with Expo Go
```

The app **boots without any backend** — when Supabase credentials are missing it
runs in demo mode using mock data in [`src/lib/mockData.js`](src/lib/mockData.js),
so every screen is fully navigable out of the box.

### Connecting Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in your project URL + anon key.
3. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) to
   create the tables, RLS policies and realtime publication.
4. Restart the dev server. Auth, profiles and realtime chat now use Supabase.

## Project structure

```
src/
  components/    Reusable UI (ui.js, PlayerCard.js)
  context/       AuthContext (auth + onboarding state)
  lib/           supabase.js (client) + mockData.js (offline seed)
  navigation/    RootNavigator + MainTabs
  screens/       All 12 screens
  theme/         Colors, fonts, spacing, radii, shadows
App.js           Font loading + providers
supabase/        Database schema
```

## Screens

Splash · Age gate · Account type · Registration (3 steps) · Browse · Player
profile · Court Board · Messages · Chat detail · My Profile · Privacy settings ·
Notifications.
