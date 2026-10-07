# Code review — 2026-10-07

Full-codebase review (seven read-only passes by area, top findings verified by hand). Type-check, Biome and all test suites were green at the time, so every item below is a logic, security or data-integrity problem.

Status legend: `[ ]` open · `[x]` fixed · `[-]` won't fix / accepted.

## Fix first

- [x] 1. **Sync push lets any user overwrite other users' rows.** _Fixed: every sync upsert carries a `setWhere` ownership guard (unowned or same user only) and `pushSyncRows` rejects batches that target another user's rows or reference another user's parent rows (activities, gears, provider rows); covered by tests._ `_applySyncRows` sets `user_id` from the incoming row with no ownership check. `packages/db/src/db.ts` (`pushSyncRows`, `_applySyncRows`).
- [x] 2. **Client-action API is authenticated but not tenant-scoped.** _Mitigated: `/api/client/*`, `/api/provider-files/*` and `/api/strava/subscriptions` now require the Supabase user to be on `API_ALLOWED_EMAILS` / `API_ALLOWED_USER_IDS` (deny-all when unset). Proper per-user scoping of the Db methods remains a follow-up (see API section)._ `apps/api/lib/client-actions.ts` never passes the resolved user into Db calls; any Supabase account reads/writes everything, and provider routes use the server's env credentials for any caller.
- [x] 3. **Pre-0008 SQLite databases cannot migrate.** _Fixed: `migrateDb` applies migrations before 0010 first, backfills `updated_at` (all values normalised to ISO, including copied gear/inbody date strings), then applies the rest; the backfill no longer runs on every startup. Upgrade tests added in `migrations.test.ts`._ `migrateDb` runs the `updated_at` backfill before migrations; 0008 adds the column nullable, 0010 rebuilds NOT NULL → constraint failure. `packages/db/src/migrations.ts`.
- [x] 4. **Strava client secret + refresh token logged at startup.** `apps/app/src/main/client.ts:121`. _Fixed: logs client id and presence flags only._
- [x] 5. **Provider credentials copied to plaintext renderer localStorage.** `apps/app/src/renderer/src/libs/client.ts:464` (also web client `packages/clients/src/dataClient/web.ts:266`, not cleared on sign-out, not user-scoped). _Fixed: the Electron renderer no longer mirrors store values into localStorage and removes entries left by earlier versions at startup; the web client now removes provider credentials and validation flags on sign-out. Follow-up: namespace web store keys per Supabase user._
- [x] 6. **Packaged desktop build crashes at startup.** package.json read via `process.cwd()` (`apps/app/src/main/index.ts:23`); DB path baked at build time from `.env` (`apps/app/src/main/config.ts:2`). _Fixed: display name injected at build time via `MAIN_VITE_APP_DISPLAY_NAME` with `app.getName()` fallback; DB path resolved at runtime under `app.getPath("userData")`, with `MAIN_VITE_LOCAL_DB_FILE` honoured only in unpackaged (dev) runs._
- [x] 7. **COROS download resolves before the file is written.** Library `downloadFile` pipes without awaiting (`packages/clients/src/providers/coros.ts:516`); `downloadActivityFileAsBuffer` reads/deletes a file still streaming. _Fixed: COROS now fetches the body and writes it fully before resolving, rejecting non-OK or empty responses; test asserts the file content is on disk when the call returns. `generateActivityFilePath` also creates folders recursively._
- [x] 8. **Strava `original` flag inverted in `syncActivity`.** `packages/clients/src/providers/strava.ts:708` vs `:681`; lap backfill / regenerate flips Strava copy to original and overwrites manufacturer. _Fixed: one `isStravaOriginal` helper used by both paths; test covers a COROS-recorded and a Strava-app activity through both._
- [x] 9. **Hook after early return crashes the Sync page.** `packages/app/src/components/settings/CloudSyncSection.tsx:171` returns before a `useEffect`. _Fixed: early return moved below the auto-pull effect._
- [x] 10. **Home sync card never clears the local loading flag.** `packages/app/src/components/providers/CardSync.tsx:92`. _Fixed: try/catch/finally with `setLocalLoading(false)`; thrown errors are surfaced as toasts too._
- [x] 11. **Share week view off by a day west of UTC; prev/next go backwards.** `packages/app/src/pages/Share.tsx:144` mixes `Date.UTC` with local dayjs. _Fixed: ISO week helpers computed in local time; verified Mon–Sun bounds and prev/next in New York, Seoul, Madrid and Auckland._

## Sync protocol

- [x] Upserts have no last-writer-wins guard (`setWhere` on `updated_at`); older rows overwrite newer ones; desktop "pull" overwrites unpushed local edits. _Fixed: every sync upsert now applies only when `excluded.updated_at >= updated_at` (plus the ownership rule); tested._
- [x] Delta watermark taken after the sync ends → rows written during a sync are never synced. _Fixed: push watermark is the local time before the first export; pull watermark is the server session `startedAt` returned by `/api/sync/start`._
- [x] Session state machine: completed → failed on retried push; failed → completed on finish. _Fixed: push failures and client-reported aborts only affect `started` sessions; `finishSyncSession` refuses to complete a failed session and accepts an `error` to mark an abort; tested, including a late abort on a completed session._
- [x] Mid-sync failure leaves the server session `started` forever; `requestJson` drops HTTP status. _Fixed: the desktop reports the error via `/api/sync/finish { error }` and rethrows; errors now carry the HTTP status._
- [x] Pull-only users always do a full pull (`lastPushCompletedAt` never set). _Fixed: pull mode only requires a pull watermark for delta._
- [x] `limit`/`offset`/`tables` not type-validated. _Fixed: `pullSyncRows` validates ints/strings (400 from the route); validate route checks the payload shape._
- [x] No mutual exclusion between provider sync and cloud sync. _Fixed: `apps/app/src/main/syncLock.ts` serialises provider syncs and cloud sync/pull; a second request fails fast with a clear message._

## API & admin security

- [x] Admin auth trusts unverified cookie session (`getSession`), keyed on `session.user.id`. _Fixed: middleware, route handlers, layouts and pages use the server-verified `getUser()`._
- [x] Queue callback route reachable unauthenticated; runs full Strava + COROS sync on any POST. _Fixed: the handler only acts on events the webhook route recorded (owner, object, aspect, event time), syncs just that activity, ignores deletes, and runs the COROS follow-up only for creates._
- [x] Strava webhook accepts any payload; no `subscription_id` check; each unique object_id triggers a full sync. _Fixed: payload shape validated, `STRAVA_SUBSCRIPTION_ID` enforced when set, per-activity sync via the queue._
- [x] Webhook de-dup drops every update/delete after the first create. _Fixed: de-dup key is (object type, object id, aspect, event time)._
- [x] 500 responses echo raw DB/provider error messages. _Fixed: `apps/api/lib/http.ts` `publicErrorMessage` masks driver/infra errors in every route, walking the `cause` chain so Drizzle query errors (which embed SQL and parameters) and wrappers around Node network errors (`ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`, undici codes, SQLSTATEs, `SQLITE_*`) are masked too; application messages still pass through. Regression suite in `apps/api/lib/http.test.ts` (vitest added to the API package)._
- [x] Admin OAuth binds tokens to whichever profile has the athlete id; returns refresh token to the browser. _Fixed: `apps/admin/lib/strava-link.ts` links an athlete only to the signed-in user (409 if held by another account); responses carry athlete id and expiry only._
- [x] Admin provider module fires unawaited `connect()` at import time. _Fixed: lazy, memoised, awaited `getProvider()`._
- [x] No rate limiting; `requireUser` performs two writes per request. _Mitigated: `getOrCreateAppUser` writes only when email/display name changed; heavy provider-backed client actions are serialised per instance (`apps/api/lib/locks.ts`). A real per-user rate limit remains a follow-up._
- [x] CORS `*` with credentials; `ignoreBuildErrors`; dead `apps/api/middleware.ts`. _Fixed: origin from `NEXT_PUBLIC_DOMAIN` with credentials only for a concrete origin; build-time type/lint checks re-enabled; dead middleware removed._
- [ ] Follow-up to item 2: thread `authContext.internalUserId` into the Db methods used by client actions (filter reads by `user_id`, set `user_id` on writes) so the API becomes genuinely multi-tenant and the allow-list can be relaxed.

## Data integrity (packages/db)

- [x] `insertGear` resurrects soft-deleted provider gears and relinks through deleted connections. _Fixed: a soft-deleted provider gear is a tombstone: `insertGear` skips it (no revival, no replacement row, no re-link) and activity imports do not link through it; tested._
- [x] `insertActivity` resolves provider activities through soft-deleted connections; returns provider id where an activity id is expected. _Fixed: active-connection lookups; returns `undefined` when no activity is linked (`createActivity` throws in that case)._
- [x] `getGears` paginates with cursor + offset and no ORDER BY. _Fixed: ordered by id; offset ignored when a cursor is given._
- [x] Monthly overview buckets in UTC (SQLite) / server TZ (Postgres) unlike weekly/daily. _Fixed: bucketed in JS by the activity's timezone like the other overviews; dialect-specific SQL identifiers removed; tested._
- [x] `getActivities` cursor ignores `sort`, is emitted on the last page, no id tiebreaker. _Fixed: `<timestamp>:<id>` cursor honouring sort direction, emitted only on full pages; tested with shared timestamps._
- [x] `deleteActivity` leaves laps active; lap lookups ignore deleted activities. _Fixed: laps are soft-deleted with the activity; both lookups inner-join active activities; tested._
- [x] SQLite JSON aggregations lack the null filter of the Postgres variants. _Fixed: `FILTER (WHERE id IS NOT NULL)` on all four SQLite aggregations._
- [x] `cache_records` has no `(provider, resource, resource_id)` index; `set` is a non-transactional delete+insert. _Fixed: index added to both schema trees (migrations 0014 sqlite / 0006 postgres). `set` stays as two autocommit statements on purpose: the cache and main store use separate SQLite connections and a transaction here produced SQLITE_BUSY during provider syncs._
- [x] Tests cover only fresh DBs on SQLite (no Postgres run, no multi-device sync). _Fixed: `db.postgres.test.ts` runs the core scenarios against a real Postgres (`docker compose up -d db`, create `hub_test`, `pnpm --filter @repo/db test:postgres`; skipped when `POSTGRES_TEST_URL` is unset); `sync-multi-device.test.ts` simulates two devices syncing through a server (propagation, later edits, stale-copy rejection, rows written mid-sync, foreign-user push). Upgrade tests exist; dead SQL identifiers and the stale lap-table shim removed._
- [x] **Found by the Postgres run:** the Postgres migration chain could not be applied to a fresh database. 0000 already creates `user_id`/`updated_at`/`deleted_at` and 0001 added them again (`column "user_id" of relation "activities" already exists`). _Fixed by making the 27 `ADD COLUMN` statements in `drizzle-postgres/0001_light_earthquake.sql` `IF NOT EXISTS`. This is a deliberate hand edit of a generated migration, contrary to the AGENTS.md rule: regenerating would not repair history, and Drizzle applies migrations by timestamp, not hash, so already-migrated databases are unaffected._

## Providers (packages/clients)

- [x] `ProviderManager.insertInDatabase` swallows every DB error → success reported on failure. _Fixed: insert errors propagate; bulk `sync` tolerates per-activity failures, logs them, and throws a summary ("N of M activities failed to save") so the UI shows it._
- [x] Garmin upload resolves failure messages as activity ids; status read once after 1 s. _Fixed: polls the upload status with backoff (1–8 s, five checks); failures reject with Garmin's message, a duplicate resolves to the matched activity id._
- [x] COROS pace fallback stores m/s in a s/km field; COROS bike speed unit differs from Garmin/Strava. _Fixed from real payloads: runs keep COROS's s/km with a `duration/(distance/1000)` fallback; rides convert hundredths of km/h to m/s with a `distance/duration` fallback; zero speeds are omitted. Test updated._
- [x] Strava `_request` discards HTTP status → rate limits undetectable; `console.error(res)` dumps the Response. _Fixed: errors carry `status` and the URL; no Response dump. The download script's rate-limit halt now works._
- [x] Strava race/subtype reads `sport_type` instead of `workout_type`; default rides become events. _Fixed: races are `workout_type` 1 (run) or 11 (ride) → event + road subtype; `TrailRun` → trail, `VirtualRun`/trainer → indoor; tested._
- [x] Garmin incremental sync pages the whole history 3 at a time when `lastId` was deleted on Garmin. _Fixed: incremental pages are 20 and listing stops once activities older than the last known timestamp appear; tested._
- [x] Strava refresh logs the full token row. _Fixed: line removed._
- [x] `persistActivityCache` costs three Strava calls and mutates the DB. _Fixed: one forced detail fetch and a cache write, no DB mutation._
- [x] `generateActivityFilePath` uses unsanitized ids and non-recursive `mkdirSync`. _Fixed: ids must match `[A-Za-z0-9._-]+` and not start with a dot; folders are created recursively._
- [x] Garmin token restore logs the Axios error including the Authorization header. _Fixed: messages only._
- [x] COROS full-sync paging relies on `dataList.length === size` instead of `totalPage`. _Fixed: uses `pageNumber < totalPage` when the API provides them, falling back to the length check._

## Electron app (apps/app)

- [x] Any safeStorage decrypt failure permanently deletes credentials. _Fixed: a failed decrypt returns `undefined` and logs once per key; values are never deleted automatically; writes fail clearly when encryption is unavailable._
- [x] Preload exposes `process.env`; window runs with `sandbox: false`. _Fixed: the bridge exposes only `ipcRenderer.invoke` for allow-listed channels plus platform/versions. `sandbox: false` stays because the preload is an ES module, which Electron only loads unsandboxed; switching the preload to CJS would allow enabling it (follow-up)._
- [x] IPC handlers accept arbitrary paths/URLs (`OPEN_LINK`, window-open, Obsidian export, download path). _Fixed: `src/main/ipc/guards.ts`; only http(s) links open externally (awaited), download/upload use the configured downloads folder, Obsidian exports must resolve inside the configured vault (real paths, so symbolic links cannot redirect the write) with a validated file name and extension and are created exclusively (`wx`), and file-exists checks validate the activity id._
- [x] Three DB handles opened at startup and leaked. _Fixed: one shared libsql connection serves Db, CacheDb and migrations._
- [x] Debug "Export storage" dumps provider passwords in plaintext. _Fixed: the export skips every `*_CREDENTIALS` key and is labelled accordingly._
- [x] `electron-builder.yml` placeholder values. _Fixed: executable name set, placeholder auto-update URL removed, Linux maintainer set to the repository's commit identity (the .deb target requires one)._

## Web client & dates

- [ ] `formatDate` reinterprets string inputs as wall-clock in the target zone (admin dashboard shows UTC as Seoul). `packages/dates/src/format.ts:45`.
- [ ] Invalid timezone string throws during render; no ErrorBoundary anywhere. `packages/dates/src/format.ts:45, 83`.
- [ ] Expired Supabase token sent after the 1.5 s session timeout; 401 never retried. `packages/clients/src/supabase.ts:127`, `dataClient/web.ts:680`.
- [ ] `INITIAL_SESSION` overrides the offline-no-cache boot state. `apps/webapp/src/app.tsx:73`.
- [ ] Mutations don't invalidate cached reads; no TTL. `dataClient/web.ts:705-836`.
- [ ] `providerConnect` throws in the web client although the API implements it. `dataClient/web.ts:364`.
- [ ] `dateWithTimezoneToUTC` differs between IANA and `UTC±HH:MM` for Date inputs. `packages/dates/src/format.ts:80`.
- [ ] `@repo/clients` resolved via Node `types` entry in the webapp; `@repo/db` listed as a webapp dependency.

## UI (packages/app)

- [x] Calendar and Share bucket by machine-local day instead of activity timezone. _Fixed: both bucket with `formatDate(timestamp, { timezone })` like the analytics overviews; Calendar's month filter too. Queries fetch one extra day on each side (the server filters by its own calendar days) and Share keeps only activities whose local day is inside the period._
- [x] Compare "Max activity distance" includes all sport types while other metrics are run-only. _Fixed: activity lists are fetched with `type: RUN`._
- [x] Loaders without cancellation → stale responses win (Calendar, Compare, DataList, Inbody, InbodyHistory, Analytics, DailyActivitySummary). _Fixed: each loader tags requests with an incrementing ref and ignores responses that are no longer the latest; loading flags are released in `finally` by the request that set them, stale or not._
- [x] ActivityDetails retry loop not tied to the current route; not-found delayed 3 s. _Fixed: the loop bails when the route changes, and a definitive not-found surfaces immediately without retries._
- [x] Subtype cannot be cleared to None. _Fixed: "None" sends `subtype: null`; the `editActivity` contract accepts `null` in every client and the IPC handler._
- [x] `StoreContext.getValue` recreated every render → effects re-run and revert unsaved credential input. _Fixed: `getValue` reads the store through a ref and keeps a stable identity; the context value is memoised._
- [x] Obsidian export path uses machine timezone while content uses activity timezone. _Fixed: folder and file name use the activity timezone._
- [x] Activity filter leaks the "NONE" placeholder into the subtype filter. _Fixed: `SelectFilter` takes an `emptyLabel`; the option value stays empty._
- [x] Credential validation error state has no retry handler. _Fixed: the error button retries validation._
- [x] DailyActivitySummary refetches per keystroke with no ordering guard. _Fixed: 300 ms debounce plus a latest-request guard._
- [x] `formatPace` one second low for exact paces (5:00 → 4:59). _Fixed: `Math.floor`._
- [x] ProviderRow file-exists cache never invalidated on folder change. _Fixed: the downloads folder is part of the cache key; invalidation clears every folder's entry for the activity._
- [x] Gears refresh re-fetches from the stored cursor and replaces the list; no pagination beyond 50. _Fixed: refreshes start from the beginning with a 200-gear page; a load-more control remains a nice-to-have._
- [x] Share: year select rendered twice. _Fixed: the duplicate input is removed; URL `value` validation was fixed alongside item 11._
- [x] InbodyEdit depends entirely on router state. _Fixed: without router state the record is looked up by id across Inbody types before falling back to the list._
- [x] `LoadingContext` single boolean toggled by concurrent handlers. _Fixed: the local flag is a counter, so one handler finishing cannot hide another's spinner._
