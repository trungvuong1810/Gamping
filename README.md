# GAMPING

GAMPING is a planner for group camping trips. A host creates a trip and shares a password or an invite link. Campers join and get assigned to groups or sites, then coordinate gear and meals per group. Optional AI (Grok) suggests parks, packing lists and meal ideas, and the app can email weather alerts before departure.

**Stack:** React 19 + Vite + Tailwind (client), Express (server, `server.ts`), and optionally Supabase Postgres for permanent storage.

## Quick start

```bash
npm install
cp .env.example .env   # fill in what you need (see below)
npm run dev            # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Express + Vite dev server with hot reload |
| `npm run build` | Builds the client to `dist/` and bundles the server to `dist/server.cjs` |
| `npm start` | Runs the production build |
| `npm run lint` | Type-checks the whole project |

## Where data is saved (read this)

The server keeps everything in memory and writes it to **`data/storage.json`**. That works on your own computer, but **hosted platforms like AI Studio and Cloud Run throw that file away whenever the app restarts, sleeps or redeploys**. When that happens, your trips seem to "disappear".

To keep data permanently, connect Supabase (free tier is fine):

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run [`supabase-schema.sql`](./supabase-schema.sql).
3. From **Project Settings → API**, set these env vars or secrets on your host:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose it to the browser)
4. Restart the app. The server log should say `Supabase backend client connected successfully`, and `GET /api/auth/status` should return `"supabaseConfigured": true`.

At startup, the server loads all saved data from Supabase and then writes every change back to it. If Supabase isn't configured, the server prints a warning at startup.

> Everything the app shows (trips, members, groups, gear, meals) is stored in Supabase.

## Environment variables

See [`.env.example`](./.env.example). All of them are optional:

| Variable | Used for |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Permanent storage (strongly recommended when hosted) |
| `GROK_API_KEY` / `XAI_API_KEY`, `GROK_MODEL` | Live AI suggestions. Without a key, curated offline suggestions are used. |
| `RESEND_API_KEY` | Sending invitation and weather emails |
| `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | Address autocomplete and geocoding |
| `PORT` | Server port (default `3000`) |

## Project layout

```
server.ts               Entry point: sets up Express, mounts routes, serves the client
server/
  config.ts             Env loading, PORT, Maps keys
  storage.ts            Local JSON datastore (db, saveDb)
  supabase.ts           Supabase client, row mappers, load/autosave helpers
  email.ts              Resend email helpers (invites, weather reports)
  weather.ts            Forecast fetching and the hourly pre-trip alert job
  packingList.ts        Offline packing-list generator
  grok.ts               xAI Grok API client and offline fallbacks
  places.ts             Reference cities and curated regional parks
  routes/               One Express router per feature:
    ai, places, auth, trips, groups, equipment, food, weather, admin
src/                    React client (components/, api/client.ts, lib/, types.ts)
supabase-schema.sql     Database schema for Supabase
```
