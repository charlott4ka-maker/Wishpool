# Wishpool — full app (Telegram Mini App + multiplayer backend)

Two parts:
- **web/** — the React Mini App (front-end).
- **server/** — Node/Express API + JSON store + Telegram auth. Also serves the built front-end, so it deploys as ONE service.

The backend is complete and tested: rooms, invites/join, wishes, share-to-room,
surprise-safe reservations (hidden from the wish owner), and the secret-santa draw
(cyclic derangement). See "API" below.

## Run locally (dev mode, no bot needed)
    npm run build          # builds web -> web/dist
    cd server && npm install && node index.js
    # open http://localhost:3000  (auth runs in DEV MODE)

## Deploy (Render — one web service)
1. Push this folder to a GitHub repo.
2. Render → New → Web Service → pick the repo.
   - **Build command:** `npm run build && npm --prefix server install`
   - **Start command:** `node server/index.js`
   - **Environment:** add `BOT_TOKEN` = your BotFather token.
   - **Disk:** add a persistent disk mounted at `/data`, and set `DB_FILE=/data/data.json`
     (so data survives restarts). Railway/Fly work the same way.
3. Copy the service URL (https://…).

## Connect the bot
- @BotFather → `/newbot` → get the token (put it in `BOT_TOKEN` above).
- `/newapp` (or Bot Settings → Web App) → set **Web App URL** to your Render URL.
- Invite links use `https://t.me/<bot>/app?startapp=<roomId>` — the app reads
  `start_param` to auto-join that room.

## API (all under /api, auth via `X-Init-Data` header)
- `GET  /me` · `GET /state`
- `POST /wishes` · `DELETE /wishes/:id` · `POST /wishes/:id/room {roomId}`
- `POST /rooms` · `POST /rooms/:id/join` · `GET /rooms/:id`
- `POST /wishes/:id/reserve` · `DELETE /wishes/:id/reserve`
- `POST /rooms/:id/draw {budget}` · `GET /rooms/:id/draw`

Front-end client for all of the above is in `web/src/api.js`.

## Front-end wiring (final step)
The web app currently runs in **local-persistence mode** (single device).
`web/src/api.js` is the ready client. To switch to real multiplayer, load initial
data from `api.state()` when `api.online()`, fetch room detail via `api.room(id)`,
and route each action (create/delete wish, toggle room, create/join room, reserve,
draw) through the matching `api.*` call. Best done once the server URL is live so
it can be verified end-to-end.

## Scaling note
Storage is a JSON file (`server/db.js`) — perfect for an MVP. For heavier use, swap
that one module for Postgres; the API stays identical.
