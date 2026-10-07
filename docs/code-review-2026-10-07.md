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
- [ ] 8. **Strava `original` flag inverted in `syncActivity`.** `packages/clients/src/providers/strava.ts:708` vs `:681`; lap backfill / regenerate flips Strava copy to original and overwrites manufacturer.
- [ ] 9. **Hook after early return crashes the Sync page.** `packages/app/src/components/settings/CloudSyncSection.tsx:171` returns before a `useEffect`.
- [ ] 10. **Home sync card never clears the local loading flag.** `packages/app/src/components/providers/CardSync.tsx:92`.
- [ ] 11. **Share week view off by a day west of UTC; prev/next go backwards.** `packages/app/src/pages/Share.tsx:144` mixes `Date.UTC` with local dayjs.

## Sync protocol

- [ ] Upserts have no last-writer-wins guard (`setWhere` on `updated_at`); older rows overwrite newer ones; desktop "pull" overwrites unpushed local edits. `packages/db/src/db.ts:2820` and siblings.
- [ ] Delta watermark taken after the sync ends → rows written during a sync are never synced. `apps/app/src/main/ipc/sync.ts:497`.
- [ ] Session state machine: completed → failed on retried push; failed → completed on finish; `pullSyncRows` ignores status. `packages/db/src/db.ts:2735-2803`.
- [ ] Mid-sync failure leaves the server session `started` forever; `requestJson` drops HTTP status. `apps/app/src/main/ipc/sync.ts:363-495`.
- [ ] Pull-only users always do a full pull (`lastPushCompletedAt` never set). `apps/app/src/main/ipc/sync.ts:503`.
- [ ] `limit`/`offset`/`tables` not type-validated (NaN reaches SQL; validate route can throw unhandled). `packages/db/src/db.ts:2514`, `apps/api/app/api/sync/validate/route.ts:51`.
- [ ] No mutual exclusion between provider sync and cloud sync.

## API & admin security

- [ ] Admin auth trusts unverified cookie session (`getSession`), keyed on `session.user.id`. `apps/admin/middleware.ts:10`, `apps/admin/lib/strava.ts:47`.
- [ ] Queue callback route reachable unauthenticated; runs full Strava + COROS sync on any POST. `apps/api/app/api/queue/strava-activity-sync/route.ts`.
- [ ] Strava webhook accepts any payload; no `subscription_id` check; each unique object_id triggers a full sync. `apps/api/app/api/webhook/strava/route.ts:30-78`.
- [ ] Webhook de-dup drops every update/delete after the first create. `apps/api/app/api/webhook/strava/route.ts:38-55`.
- [ ] 500 responses echo raw DB/provider error messages. `apps/api/app/api/client/[action]/route.ts:36`, sync routes, `strava/subscriptions`.
- [ ] Admin OAuth binds tokens to whichever profile has the athlete id; returns refresh token to the browser. `apps/admin/app/api/strava/oauth/route.ts:21-48`.
- [ ] Admin provider module fires unawaited `connect()` at import time. `apps/admin/lib/provider.ts:12-25`.
- [ ] No rate limiting; `requireUser` performs two writes per request. `apps/api/lib/auth.ts:41`, `packages/db/src/db.ts:497`.
- [ ] CORS `*` with credentials; `ignoreBuildErrors`; dead `apps/api/middleware.ts`.
- [ ] Follow-up to item 2: thread `authContext.internalUserId` into the Db methods used by client actions (filter reads by `user_id`, set `user_id` on writes) so the API becomes genuinely multi-tenant and the allow-list can be relaxed.

## Data integrity (packages/db)

- [ ] `insertGear` resurrects soft-deleted provider gears and relinks through deleted connections. `packages/db/src/db.ts:1807-1846`.
- [ ] `insertActivity` resolves provider activities through soft-deleted connections; returns provider id where an activity id is expected. `packages/db/src/db.ts:1579-1601`.
- [ ] `getGears` paginates with cursor + offset and no ORDER BY. `packages/db/src/db.ts:1225-1267`.
- [ ] Monthly overview buckets in UTC (SQLite) / server TZ (Postgres) unlike weekly/daily. `packages/db/src/db.ts:451`.
- [ ] `getActivities` cursor ignores `sort`, is emitted on the last page, no id tiebreaker. `packages/db/src/db.ts:1129-1164`.
- [ ] `deleteActivity` leaves laps active; `getProviderActivitiesWithoutLaps` / `getActivityByProviderActivityId` ignore deleted activities. `packages/db/src/db.ts:1473, 2049-2100`.
- [ ] SQLite JSON aggregations lack the null filter of the Postgres variants. `packages/db/src/db.ts:627-645`.
- [ ] `cache_records` has no `(provider, resource, resource_id)` index; `set` is a non-transactional delete+insert. `packages/db/src/cache.ts:52`.
- [ ] Tests cover only fresh DBs (no upgrade, no Postgres run, no multi-device sync); `_weekIdentifier` dead and dialect-inconsistent; `ensureActivityLapsTable` in test utils diverges from 0013.

## Providers (packages/clients)

- [ ] `ProviderManager.insertInDatabase` swallows every DB error → success reported on failure. `ProviderManager.ts:178`.
- [ ] Garmin upload resolves failure messages as activity ids; status read once after 1 s. `garmin.ts:645-654`.
- [ ] COROS pace fallback stores m/s in a s/km field; COROS bike speed unit differs from Garmin/Strava. `coros.ts:126-133`.
- [ ] Strava `_request` discards HTTP status → rate limits undetectable; `console.error(res)` dumps the Response. `strava.ts:549-571`.
- [ ] Strava race/subtype reads `sport_type` instead of `workout_type`; default rides become events. `strava.ts:133-142, 335`.
- [ ] Garmin incremental sync pages the whole history 3 at a time when `lastId` was deleted on Garmin. `garmin.ts:425-447`.
- [ ] Strava refresh logs the full token row. `strava.ts:533`.
- [ ] `persistActivityCache` costs three Strava calls and mutates the DB. `ProviderManager.ts:252`.
- [ ] `generateActivityFilePath` uses unsanitized ids and non-recursive `mkdirSync`. `Client.ts:17`.
- [ ] Garmin token restore logs the Axios error including the Authorization header. `garmin.ts:329, 370`.
- [ ] COROS full-sync paging relies on `dataList.length === size` instead of `totalPage`.

## Electron app (apps/app)

- [ ] Any safeStorage decrypt failure permanently deletes credentials. `src/main/storage.ts:14-23`.
- [ ] Preload exposes `process.env`; window runs with `sandbox: false`. `src/preload/index.ts:12`, `src/main/index.ts:171`.
- [ ] IPC handlers accept arbitrary paths/URLs (`OPEN_LINK`, window-open, Obsidian export, download path). `src/main/ipc/index.ts:64`, `src/main/ipc/activity.ts:18-79`.
- [ ] Three DB handles opened at startup and leaked. `src/main/db.ts:19-71`, `src/main/client.ts:11`.
- [ ] Debug "Export storage" dumps provider passwords in plaintext. `packages/app/src/pages/Debug.tsx`.
- [ ] `electron-builder.yml` placeholder values.

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

- [ ] Calendar and Share bucket by machine-local day instead of activity timezone. `pages/Calendar.tsx:343`, `pages/Share.tsx:340`.
- [ ] Compare "Max activity distance" includes all sport types while other metrics are run-only. `pages/Compare.tsx:291`.
- [ ] Loaders without cancellation → stale responses win (Calendar, Compare, DataList, Inbody, Analytics). 
- [ ] ActivityDetails retry loop not tied to the current route; not-found delayed 3 s. `pages/ActivityDetails.tsx:74-112`.
- [ ] Subtype cannot be cleared to None. `pages/ActivityDetails.tsx:958`.
- [ ] `StoreContext.getValue` recreated every render → effects re-run and revert unsaved credential input. `contexts/StoreContext.tsx:61`.
- [ ] Obsidian export path uses machine timezone while content uses activity timezone. `components/cards/ObsidianRow.tsx:228`.
- [ ] Activity filter leaks the "NONE" placeholder into the subtype filter. `components/filters/Activities.tsx:148`.
- [ ] Credential validation error state has no retry handler. `components/providers/ProviderCredentialsCard.tsx:240`.
- [ ] DailyActivitySummary refetches per keystroke with no ordering guard. `components/DailyActivitySummary.tsx:90`.
- [ ] `formatPace` one second low for exact paces (5:00 → 4:59). `utils/formatters.ts:28`.
- [ ] ProviderRow file-exists cache never invalidated on folder change. `components/cards/ProviderRow.tsx:18`.
- [ ] Gears refresh re-fetches from the stored cursor and replaces the list; no pagination beyond 50. `pages/Gears.tsx:63-77`.
- [ ] Share: year select rendered twice; URL `value` validation accepts impossible months. `pages/Share.tsx:165, 749`.
- [ ] InbodyEdit depends entirely on router state. `pages/InbodyEdit.tsx:43`.
- [ ] `LoadingContext` single boolean toggled by concurrent handlers.
