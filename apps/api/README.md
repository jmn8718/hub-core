## api

Next.js backend that powers the web dashboard. It now exposes a single RPC-style endpoint,
`/api/client/[action]`, which mirrors every operation supported by the shared `Client`
interface (activities, gears, providers, Inbody, etc).

### Authentication

- All requests must include a Supabase access token in the `Authorization: Bearer <token>` header.
- Requests are rejected with `401` if the token is missing or invalid.

### CORS

- Allowed origins are controlled via `NEXT_PUBLIC_DOMAIN` (falls back to `*` for development).

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `NEXT_PUBLIC_DOMAIN` (optional, used for CORS and Strava fallback redirect)
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`
- `STRAVA_REDIRECT_URI` (optional, falls back to `NEXT_PUBLIC_DOMAIN`)
- `STRAVA_VERIFY_TOKEN`
- `COROS_USERNAME` / `COROS_PASSWORD` (optional, used to auto-initialize the COROS client)
- `GARMIN_USERNAME` / `GARMIN_PASSWORD` (optional, used to auto-initialize the Garmin client)
