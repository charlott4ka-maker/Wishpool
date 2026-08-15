# Wishpool — full app (Telegram Mini App + multiplayer backend)

Two parts:
- **web/** — the React Mini App (front-end).
- **server/** — Node/Express API + Telegram auth. Storage is **Postgres**, so it runs on
  free hosting with **no paid disk**. The server also serves the built front-end, so it
  deploys as ONE service.

Backend is complete and tested (rooms, invite/join, wishes, share-to-room, surprise-safe
reservations hidden from the wish owner, secret-santa draw) against both the in-memory dev
store and real Postgres.

## Free hosting — $0 setup

**1. Free Postgres (no disk needed).** Create a free database and copy its connection string:
   - **Neon** — neon.tech → new project → copy the `postgres://…` URL. (Free tier persists.)
   - or **Supabase** — supabase.com → Project → Settings → Database → Connection string.

**2. Deploy on Render (free web service).**
   - Push this folder to a GitHub repo (Add file → Upload files, no terminal needed).
   - Render → New → Web Service → pick the repo:
     - **Build command:** `npm run build && npm --prefix server install`
     - **Start command:** `node server/index.js`
     - **Environment variables:**
       - `DATABASE_URL` = the Postgres URL from step 1
       - `BOT_TOKEN` = your BotFather token
   - No disk, no paid plan required. Note: the free web service **sleeps after 15 min idle**
     and wakes in ~1 min on the next open. Upgrade to the $7/mo instance later if you want it
     always-on.

**3. Connect the bot.** @BotFather → `/newapp` (or Bot Settings → Web App) → set **Web App URL**
   to your Render URL. Invite links are `https://t.me/<bot>/app?startapp=<roomId>` and the app
   reads `start_param` to auto-join that room.

## Run locally
    npm run build            # builds web -> web/dist
    cd server && npm install && node index.js
    # http://localhost:3000  — runs in DEV MODE (in-memory, ephemeral).
    # To use Postgres locally: DATABASE_URL=postgres://… node index.js

## Storage backends (auto-selected in server/store.js)
- `DATABASE_URL` set → **Postgres** (Neon/Supabase). Persistent, free.
- otherwise → in-memory (local dev; data is ephemeral).
The Postgres schema is created automatically on first boot.

## API (all under /api, auth via `X-Init-Data` header)
- `GET /me` · `GET /state`
- `POST /wishes` · `DELETE /wishes/:id` · `POST /wishes/:id/room {roomId}`
- `POST /rooms` · `POST /rooms/:id/join` · `GET /rooms/:id`
- `POST /wishes/:id/reserve` · `DELETE /wishes/:id/reserve`
- `POST /rooms/:id/draw {budget}` · `GET /rooms/:id/draw`

Front-end client for all of the above: `web/src/api.js`.

## Front-end wiring (final step)
The web app currently runs in local-persistence mode (single device). `web/src/api.js` is the
ready client. To switch to real multiplayer, load initial data from `api.state()` when
`api.online()`, fetch room detail via `api.room(id)`, and route each action through the matching
`api.*` call. Best done once the server URL is live so it can be verified end-to-end.

## Notes
- Photos are stored as base64 in the DB — fine for an MVP; free Postgres tiers give ~0.5 GB.
  For heavy image use, move photos to external storage later.
