# Working on Dreamer / Happy Record

Project instructions for Claude Code. Keep this short — it's loaded into every session.

This app is **offline-first by design**: every screen already works with no backend, storing
its state in `localStorage` via `useLocalStorage` (`packages/global/src/hook/useLocalStorage.ts`).
Supabase is an *enhancement* layered on top — sync when there's a connection, never a
requirement to use the app. See `.cursor/rules/common-rules.mdc` for styling/i18n/component
conventions; this file is about the backend only.

## Data access: go through an edge function, not the table

**Do not call `supabase.from(...)` or `supabase.rpc(...)` directly from a `packages/*` UI or
hook.** Both belong in an edge function under `supabase/functions/`, with a thin typed client
module — `<resource>Api.ts` — colocated in the package that owns that domain (not a shared
`src/lib`, since this is a package-per-domain monorepo: `checklistsApi.ts` lives in
`packages/global`'s `checklists` store, `checklistRecordApi.ts` in its `checklist-record`
store, and so on).

Why:

- **One place to change.** Filters, pagination, and column names live server-side. Renaming a
  column doesn't touch a component.
- **The schema stops leaking.** Functions return the client's shape (`projectId`,
  `eisenhowerMatrix`), not the table's (`project_id`). Components never learn column names.
- **Limits are enforced somewhere.** A function caps page/list sizes; a `.select()` in a
  component quietly hits the PostgREST row ceiling with no error.

The pattern, end to end (`checklists` is the reference; `checklist-records` is the reference for
a resource whose server schema *isn't* a 1:1 mirror of the client shape — see below):

| Layer | Where | Job |
| --- | --- | --- |
| Edge function | `supabase/functions/<resource>/index.ts` | One REST resource. Auth via `requireUser`, RLS-scoped client, returns client-shaped JSON |
| Shared pieces | `supabase/functions/_shared/<resource>.ts` | Row mapping + validation for that resource; `_shared/auth.ts` and `_shared/cors.ts` are common to all |
| Client module | `packages/<owning-package>/src/<resource>Api.ts` | One exported function per route, built on `packages/global/src/lib/api.ts` |
| Caller | the domain's own hook (e.g. `useChecklist` in `checklists/useChecklists.tsx`) | Calls the API module, falls back to local `useLocalStorage` state on `null` |

Deploy: `supabase functions deploy checklists`.

## Write them as normal REST APIs

A function is a **resource**, routed on HTTP method + path — not a dispatcher on an `action`
field in the body, and not one function per operation.

```
GET  /checklists  ?checklistTemplateId=&from=&to=   list, filtered
POST /checklists  { checklist }                     create/update (upsert)
```

Rules that follow from that:

- **The verb is the HTTP method.** `GET` reads and never changes anything; `POST` writes;
  `DELETE` removes and is idempotent (deleting what isn't there is a 200, not a 404).
- **`GET` takes query parameters, not a body.**
- **Identifiers that can contain spaces or slashes go in the query string**, not the path — ids
  in this app are client-generated (`uniqueId()` in `packages/global/src/util.ts`), not proper
  path segments.
- **Status codes are real.** 400 bad input, 401 signed out, 404 unknown route, 500 otherwise,
  and the body is always `{ error: string }`.
- **One shape per route, regardless of outcome.** Empty results return the same keys with
  empty values (`{ checklists: [] }`), never `{ checklists: null }` or a missing key.

### Never hand-roll `fetch`

`packages/global/src/lib/api.ts` is the HTTP client for every edge function — session token,
`apikey`, JSON in and out, timeout, and error unwrapping, in one place.

```ts
request.get<T>('/checklists')
request.post<T>('/checklists', { checklist })
request.get<T>('/checklists', { quiet: true }) // → T | null instead of throwing
```

A call throws `ApiError` by default, carrying the server's own message. Pass `quiet: true` to
get `null` instead — **use this for almost every call in this app**, because the local
`useLocalStorage` state is always right there as a fallback. `null` means "use what's already in
the store," never an error screen. Choose per call, not per module.

A `quiet` **write** (`POST`/`PATCH`/`PUT`/`DELETE`) that fails because the device is genuinely
offline — `ApiError(0, ...)`, `send`'s own catch for "nothing came back to read a status from,"
never a real 4xx/5xx the server actually saw and rejected — is also queued
(`packages/global/src/lib/writeQueue.ts`, `localStorage['write_queue']`) instead of just being
dropped. Nothing else needed at the call site: `run()` in `api.ts` detects this by method + status
alone, so every existing `quiet: true` write function gets queuing for free. The queue flushes on
the next `online` event (see `useConnectivityResync` below) — every write route here is already an
upsert or an idempotent delete, so replay needs no dedup, and `updatedAt` is already set
client-side at the moment of the original edit, so a write replayed hours later still merges
correctly under the last-write-wins rule below. A read failure was already "safe" this way (the
local store is the fallback); this is what makes a *write* safe the same way.

### Identity comes from the session

Never take a `user_id` from a request body. It's read from the caller's session, server-side
(`requireUser` in `supabase/functions/_shared/auth.ts`) — otherwise a client could act as
someone else regardless of what the UI sends.

There's no signup screen: `packages/global/src/hook/useSession.ts` signs every device in
**anonymously** on first load, so sync works with the same zero-friction feel the app has
offline today. A user who wants their data on a second device links Google to that same
anonymous identity (`useSession().signInWithGoogle` → `supabase.auth.linkIdentity`, the
settings page's "Sign in with Google" row) rather than starting over signed out — the `user_id`
doesn't change, so their existing rows don't need migrating. Needs `[auth.external.google]` in `supabase/config.toml` and real credentials in
`supabase/.env` (see `supabase/.env.example`) — the settings row shows whenever a backend is
configured at all (`hasBackend`), but without those credentials clicking it just fails quietly
(a console warning, no error screen — same "degrade, don't break" rule as everything else here).

Session/sign-out/sync-on-identity-change details (`ensureSession`, `signOut`, the
`identity_already_exists` self-heal) live in "Syncing local storage with the backend" below,
alongside the equivalent guarantees for local domain data.

## Syncing local storage with the backend

One pattern, implemented once — not re-derived per store, which is exactly how the last several
sync bugs got introduced (each store's own hand-rolled version of "fetch once and merge" had a
subtly different gap).

**`useSyncedCollection`** (`packages/global/src/hook/useSyncedCollection.ts`) is that pattern for
any store shaped like "one `Record<string, T>` keyed by id, fetched from one edge function route"
— `fields`, `notes`, `note-folders`, `flags`, and `checklists` all just call it with their own
storage key and fetch function (see `useRecordField.tsx` for the shape). The contract:

- **Local `useLocalStorage` state is the source of truth for rendering, always.** Every screen
  renders from it instantly, online or offline; nothing blocks on the network.
- **Sync happens once per signed-in identity, not once per page load** — plus once more on
  reconnect. The lower-level `useSyncOncePerIdentity` keys on `useSession()`'s `userId`, so signing
  in or out re-triggers a fresh sync instead of a store staying stuck on whatever the *first*
  identity's fetch returned — a plain `let xSynced = false` (every store's own copy of this,
  before) fires once ever, by whichever identity exists at that exact moment. It also re-syncs on
  a shared "resync tick" bumped by `useConnectivityResync` on the browser's `online` event (see
  below), so a tab left open catches up on another device's edit once this one reconnects, without
  needing a reload.
- **Waits for the session to be `ready`** before syncing at all, so the first fetch can't land
  against a transient session before the real one settles (see `ensureSession()` below for the
  matching guarantee on the request side).
- **Merges last-write-wins by `updatedAt`, per id**: an id this device has never seen is always
  added; an id it already has is only replaced by the fetched copy if the fetched copy's
  `updatedAt` is strictly newer. Every `addX`/`updateX` on the client sets `updatedAt` to the
  moment it happened, same as every server-side write already did (CLAUDE.md's "every table gets
  `updated_at`" convention) — comparing two real timestamps, not guessing. This is what makes an
  edit made on one device actually show up on another the next time that device syncs; a plain
  "fill in what's missing" merge (this hook's first version) never revisits an id once it has one,
  so an edit elsewhere would never arrive no matter how many times you reloaded. It still protects
  an in-flight local edit from being clobbered by a slightly-stale fetch landing around the same
  time, for the same reason — older loses, regardless of which side it's on.
- **Shares one fetch across every mounted instance** of a store via a module-level `SyncState`
  cell (not component state) — several components rendering the same store don't each start
  their own redundant fetch.
- **A quiet `null`** (offline, no backend, a failed request) **changes nothing and is retried on
  the next identity check** — never an error screen, never a wipe.

Two stores don't fit the shape and intentionally don't use it, though both still follow the same
last-write-wins-by-`updatedAt` merge rule by hand:

- **`checklist-templates`** calls `useSyncOncePerIdentity` directly rather than
  `useSyncedCollection`, to keep the separate, genuinely local-only `selectedChecklistTemplates`
  list (`selected_checklist_templates`, never itself synced) in sync: a template landing in
  `checklistTemplate` isn't the same as it showing up on the calendar
  (`getChecklistTemplateIdsByGivingDate` filters by this list, not by the templates themselves),
  so any id new to this device gets added to it the same way `addChecklistTemplate` already does
  for a locally-created one. There's no built-in starter set seeded anymore — a first-time
  account/device starts with zero templates.
- **`checklist-records`** has no single "fetch on mount" at all — `getChecklistRecords` syncs
  whatever date range it's asked for — so it folds `userId` into its own per-range cache key in
  `useChecklistRecord.ts` instead.

**A component consuming a store must depend on the store's own function, never hand-pick its own
dependency list.** `getChecklistByGivingDate`/`getChecklistTemplateIdsByGivingDate` are
`useCallback` chains that already recompute correctly when their underlying state changes —
`React.useMemo(() => getChecklistByGivingDate(...), [getChecklistByGivingDate, ...])`, passing the
function itself, is what makes a consumer track that automatically. Re-deriving "what should this
depend on" by hand is how a component ends up silently stale even once the store itself is
correct: `ChecklistToday.desktop.tsx` and its mobile twin used to snapshot the result into local
`useState` from a `useEffect` keyed on `[date, selectedTag, checklistTemplate]` — missing
`selectedChecklistTemplates` entirely — while `WeeklyCalendarVertical.tsx` right next to it,
already depending on the function itself, stayed correct on the exact same data. This turned out
not to be a one-off: the same bug (a store's read function snapshotted into `useState` from a
`useEffect` with an incomplete dependency array — so a value synced in later, from another device
or even from an edit on this same device, never appears without an unrelated remount) recurred
independently across `detail-task-page`'s own `/task/:id` page, its History/Add/Metric tabs, and
the `/notes` pages. **`useSyncedSelector`** (`packages/global/src/hook/useSyncedSelector.ts`) is
the fix spelled as a hook instead of a pattern to remember: `useSyncedSelector(storeFn, ...args)`
is exactly the `useMemo` line above, written so the store function can't be left out of the deps
array by hand. Reach for it whenever a component wants a store's derived value and has no other
side effect tied to computing it — an effect that also does something else (creating a row if one
doesn't exist yet, toggling other local state) still needs to stay a real `useEffect`, just with a
complete dependency list (see `ChecklistFieldGroupAdd`'s `reloadChecklistRecord` for that shape).
A selector not itself wrapped in `useCallback` by its owning hook (a plain closure, new identity
every render) still works here, it just recomputes every render instead of memoizing — correct,
not free; `useChecklistRecord.ts`'s `getChecklistRecords`, `useRecordField.tsx`'s
`getAllRecordFields`/`getRecordFields`, `useChecklistTemplates.tsx`'s
`getRecommendChecklistTemplates`, and `useNote.tsx`'s `getNotes` are all `useCallback`-wrapped
against their real store dependency for exactly this reason. `useNoteRecord.tsx`'s own
`getNotes`/`getAllNoteFields` (the `ChecklistRecord`-shaped wrapper the `/notes` pages actually
call — see "notes and note-folders" below) aren't wrapped yet, so those two still recompute every
render rather than memoizing.

**What this still doesn't solve**: a deletion on one device doesn't remove anything on another —
this merge only ever adds or replaces, never deletes, which needs a tombstone (a `deleted_at` the
sync can see) that no table has yet. The other historical gap here — a tab left open never
noticing another device's edit until something triggered a re-sync — is closed: `useConnectivityResync`
(`packages/global/src/hook/useConnectivityResync.ts`, mounted once in `web/src/App.tsx` next to
`useSession()`) listens for the browser's `online` event and, on it, (1) flushes the write queue
above, (2) clears `checklist-records`' own per-range sync cache
(`resetChecklistRecordSync` — see below), and (3) bumps a shared "resync tick"
(`packages/global/src/lib/resyncTick.ts`) that `useSyncOncePerIdentity` also watches, alongside its
existing identity check — so a store that already synced successfully for this identity still
re-syncs once connectivity returns, not just one whose last attempt failed. That tick is recorded
on the store's own shared `SyncState` cell (`lastResyncTick`), not per component instance, so
several components using the same store don't each fire their own redundant fetch on the same
reconnect — the same "one fetch, not one per mounted instance" property `SyncState` already gave
the identity-change case. Realtime (pushing a sync the instant another device writes, not just on
this device's own reconnect) is still not built.

On the auth/session side, the equivalent guarantee is `supabase.ts`'s **`ensureSession()`**:
`api.ts`'s `send()` and `useSession.ts` both await it instead of calling
`supabase.auth.getSession()` directly, so every request waits out the initial anonymous sign-in
on a cold load rather than racing it and seeing "no session yet." Only the anonymous-sign-in
*attempt* is memoized, never the resulting session — re-checking `getSession()` fresh on every
call means a request that happened to race ahead of a real session settling elsewhere (finishing
an OAuth redirect a beat later, say) self-corrects on its very next call instead of staying
authenticated as a throwaway anonymous user for the rest of the page's life.

`useSession.ts`'s own `ready` still has to come from somewhere on a cold load, though — it's set
once `ensureSession()` resolves, which happens even when the anonymous sign-in itself fails (no
network on first-ever load): `ready` becomes `true` for a `null` session, and
`useSyncOncePerIdentity` would otherwise mark that `undefined` identity "synced" and never try
again. `useSession.ts` also listens for `online` and retries `ensureSession()` while `session` is
still `null`, so that device recovers the moment connectivity returns instead of staying stuck
until a full reload.

Testing any of this by clearing `localStorage` and reloading doesn't simulate "this account's
cache is cold" the way it might seem to — Supabase persists its own session token in `localStorage`
too, so wiping everything also signs the device out to a *brand new* anonymous identity, not a
blank slate for the account that was signed in. To test a real account's data reloading: use the
settings page's own Sign Out (which reconnects to the same account through `signInWithGoogle`), or
open the app in a second browser/profile already signed into the same Google account.

`useSession().signOut` (settings page's "Sign Out" row, shown once linked) ends the device's
session, calls `resetSessionCache()` so the next request doesn't keep sending the revoked token,
clears every domain store's `useLocalStorage` key (`SYNCED_DATA_KEYS` in `useSession.ts`), and
reloads the page — the reload is what resets each store's `SyncState` cell back to "never synced,"
without which a next real sign-in would think it had already synced when it hadn't.
**Adding a new domain store's `useLocalStorage` key means adding it to `SYNCED_DATA_KEYS` too** —
nothing derives that list automatically.

Signing back into that same account afterward needs `signInWithGoogle` to call `signInWithOAuth`
(a real login) instead of `linkIdentity` (attach-to-this-anonymous-session) — but the *current*
session is anonymous in both the "first-ever cold load" and "just signed out" cases, so
`is_anonymous` alone can't tell them apart. `useSession.ts` tracks that separately in
`HAS_EXISTING_ACCOUNT_KEY` (a `localStorage` flag deliberately excluded from `SYNCED_DATA_KEYS`,
since `signOut` must not clear it): set the moment a session is ever seen non-anonymous, and — the
self-healing part — set just as well by *catching the failure itself*. A `linkIdentity` that fails
because the identity's already linked elsewhere doesn't throw; GoTrue redirects back with
`?error_code=identity_already_exists` (query and/or hash, depending on flow), which
`useSession.ts`'s mount effect watches for. So a device that hits this once self-corrects: the
failed attempt is itself proof this device belongs to an existing account, and `useSession.ts`
immediately retries with `signInWithOAuth` on the spot (a second, invisible redirect round-trip)
rather than leaving the device sitting anonymous until someone notices nothing happened and clicks
"Sign in with Google" again — nothing in the UI (`AccountStatus.tsx`/`setting-page-ui`) shows this
failure, so relying on a manual retry meant a second device syncing only what it created locally
itself, never the account's real data. If that immediate retry itself fails (offline,
misconfigured), it still falls through to the normal anonymous-session flow rather than leaving
`ready` stuck. Untested against real Google OAuth either way — this project has no credentials
configured to verify against (see above).
Cleaning that error out of the URL after has to treat the query string and the hash differently —
this app is a `HashRouter`, so the hash *is* the route, and GoTrue's redirect lands the raw error
params there with no leading `/` (`#error=...`, not `#/error=...`), which HashRouter reads as an
unmatched path and logs "No routes matched" for. The query half is fine to rewrite silently with
`history.replaceState`; the hash half needs a real hash change (`window.location.hash = '/'`)
because `replaceState` doesn't fire the `hashchange` event HashRouter listens for.

### `supabase` is for auth only, in one place

`packages/global/src/lib/supabase.ts` creates the client (or `null` when `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` aren't set — the app must still build and run fully offline with no
backend configured). Nothing outside `useSession.ts` and `api.ts` should import it.

## The server schema can differ from the client shape

`localStorage` shapes were designed for one device reading its own writes back — not for the
kind of range/aggregate query a history view or chart needs. Don't mirror a `useLocalStorage`
shape into a table column-for-column if that's not also the right shape to query.

`checklist_records` (`supabase/migrations/20260820010000_init_checklists.sql`) is the example:
the client's `ChecklistRecord.value` is `number | string`, one field holding both — server-side
that became two typed columns, `value_number` and `value_text`, so a chart summing a metric
field is a real indexed numeric aggregate instead of `(value->>'x')::numeric` on every row.
`checklist_records.checklist_template_id` is also denormalized onto the row (not only reachable
by joining through `checklists`), because every history/chart read in the app queries "this
template's records in this range" directly. The row-mapping functions
(`_shared/checklistRecords.ts`) are exactly where that translation belongs — the client never
learns the columns changed shape.

Config that's read whole and never filtered on (a template's `repeat` schedule, its
`fieldGroups`) stays as jsonb — normalizing something nobody queries by is wasted effort in the
other direction.

## The current resources

`fields` (table `fields` — the client still calls it `RecordField`/`useRecordField`, only the
table and the edge function dropped the "record" prefix), `checklist-templates`, `checklists`,
`checklist-records` — one connected domain (`packages/global/src/store/{record-field,checklists,checklist-record}`)
behind `/task/:id` (`detail-task-page`) — a template repeats on a schedule, each day gets a
`Checklist` instance, and "Submit" writes `ChecklistRecord`s against it. `Checklist.completedAt`
is also how a plain check/uncheck-style day gets recorded, with no fields involved.

A field can be `visibility: 'public'` (`supabase/migrations/20260820020000_fields_visibility.sql`)
— usable in *anyone's* checklist template, not just its owner's. That's what makes sharing a
public `checklist_templates` row actually work end to end: without it, a shared template's
`field_groups` could reference field ids that only resolve for the original owner.

`flags` (`packages/global/src/store/flag/useFlag.tsx`) is a real grouping entity for checklist
templates — one flag groups many templates (`checklist_templates.flag_id`, a real foreign key,
`on delete set null`), not the many free-text labels `checklist_templates.tags` already is. Same
shape as `note_folders`: name, description, timestamps, owner-only. Don't conflate the two —
`tags` stays as loose multi-label filtering, `flag_id` is the "these are the same category" one.

`pro_users` (client: `useIsPro`/`packages/global/src/store/pro/useProStatus.tsx`, edge function
`me` — `GET /me` only) is Pro entitlement, and it's read-only end to end: no payment integration
exists anywhere in this app, so a row is only ever inserted by hand from the SQL editor/service
role, or by a `security definer` trigger (`supabase/migrations/20260822010000_pro_trial.sql`)
that grants every newly created `auth.users` row a 5-day trial — including an anonymous sign-in,
since that's a real insert too, so every device gets one on its first load, not only a real
signup. `pro_users` has no insert/update/delete RLS policy on purpose, matching that there's no
client-writable path to it at all. Nothing in the app is actually gated on `isPro` yet — this is
just the entitlement plumbing, the same shape voca uses for the same thing.

`notes` and `note-folders` (client: `useNote`/`packages/global/src/store/note/useNote.tsx`,
`useNoteFolder`) are a separate domain from all of the above, despite `note-manager-page-ui` and
`add-note-page-ui` looking like they use `ChecklistRecord` — `useNoteRecords`
(`useNoteRecord.tsx`) is a thin adapter that talks to `useNote` and maps its `Note` rows into
`ChecklistRecord`-shaped objects so those two page packages didn't need to change.
**A note is not a checklist record and never was really** — the client used to fake it with
`checklistId: ''`/`checklistTemplateId: ''`, which only ever worked because it never synced
against real foreign keys. If you're tempted to route another "this doesn't quite fit an
existing table" case through an unrelated resource with placeholder ids, don't — that's exactly
what broke here; give it its own table once it needs to leave the device.

Every field written by one Submit click shares a `submissions` row (`checklist_records.submission_id`,
a real foreign key) — that's the actual "these were committed together" relationship, not
`created_at` matching. `submissions` has no resource/edge function of its own: `checklist-records`
creates the row on POST and bumps its `updated_at` on PATCH (a submission has no fields of its
own to edit — the only thing that changes it after creation is one of its records changing).
Add a `submissions` route only if something ever needs to read one on its own; nothing does yet.

`fields.id` for the three defaults every device seeds locally (`'duration'`, `'push-ups'`,
`'note'`) is the same fixed string on every device — by design, one canonical concept, not each
user's own copy. That only works because they're seeded as **unowned system rows**
(`fields.user_id` nullable, `20260821000000_seed_system_fields.sql`, `visibility: 'public'`) —
without an owner, RLS's own-row policy can't match `auth.uid() = user_id` for anyone, so the row
is read-only through the API and only a migration can write it. **A field a client creates for
itself must never reuse one of these three ids** — that's the mistake that shipped here the
first time: every device racing to claim the same global id the moment it synced its "own"
copy of a default field. If you add a fourth "default" concept, seed it the same way rather than
hardcoding another shared literal id client-side.

Despite the URL and the "Create Task" button, none of this is `packages/tasks-page-common`'s
`Task` type — that's a separate, unrelated concept (a simple todo/pomodoro item) that turned out
to not be wired into the app anywhere (no route ever rendered `tasks-page-ui`, so it — along with
`tasks-page-ui` itself — was removed rather than migrated). "Task" in this app's UI means
checklist template.

The `/checklist-template/shared/:id` flow (`checklist-template-shared-page-ui`, plus the two
write sides — `CardShare` on `detail-task-page` and `tasks-shared-page-ui`) is on this backend
now, not Firebase: sharing sets the template *and* every field its `fieldGroups` reference to
`visibility: 'public'` (`useCreateChecklistTemplateApi.tsx`) — a template alone being public
isn't enough, since a recipient can't resolve a field id that only resolves for the original
owner. The link is the template's own id (`GET /checklist-templates?id=`, `_shared.ts`'s
`toChecklistTemplate` and the "public checklist templates are readable by anyone" RLS policy
already existed for exactly this before the route did), not a separate generated id — see
`useGetChecklistTemplateApi.tsx`. A recipient's fields come back already public, so accepting a
template merges them into local state as-is (`useRecordField`'s `mergeRecordFields`) rather than
re-saving them as this device's own — that would race the sharer's row on `fields.id`'s global
primary key, the exact bug the `duration`/`push-ups`/`note` system fields hit first (see below).
Accepting also strips `visibility`/`flagId` off the copy: the recipient didn't choose to publish
their own copy, and a flag id copied verbatim would point at a flag only the sharer can see.
`userName`/`targetName` (the "Hey, X — Y challenged you!" greeting) are carried as `?from=&to=`
query params on the share link itself, not stored server-side — there's no real owner for that
data, just per-link display text. `useFirebase.ts` is gone; `useStorageSync.ts` (a separate,
unrelated whole-`localStorage` backup/restore debug tool behind `local-storage-editor`) still
uses the `firebase` package directly and is out of scope here. `tags` is local-only.

`baby`, `body-metric` (and the routes/packages built on them — `pregnant-intro` at `/intro`,
`pregnant-weight-record` at `/weight-record`, `baby-card`/`body-metric-card` on the home page)
were removed rather than migrated: nothing in the live app ever navigated to `/intro` or
`/weight-record` (no `<Link>`/`navigate()` anywhere reachable pointed at either), and the two
home-page cards were defined but never imported into `record-page-ui`'s actual rendered
`index.mobile.tsx`/`index.desktop.tsx`. Same "confirm it's actually reachable, not just that a
file imports it" bar as `tasks-page-ui`/`pomodoro-mobile`/`pregnant-page-ui` before them.

## Conventions

- **Validate and clamp every caller-supplied value** in an edge function — especially list
  sizes. An unbounded `limit` is a free full table scan.
- **RLS on every table.** `using (auth.uid() = user_id) with check (auth.uid() = user_id)`, no
  exceptions — see `supabase/migrations/20260820010000_init_checklists.sql`.
- **Every table gets `updated_at timestamptz not null default now()`, and every write sets it
  explicitly** in the row-mapping function (`fromX`) — Postgres only fills a column default on
  insert, never on update, so an upsert that doesn't set it leaves a stale value. It's not
  enforced (no version check blocks a stale write), just makes one auditable — this app is
  offline-first, so a delayed write from a device that was offline landing after a newer one is
  a real scenario, not a hypothetical.
- **A column that should only ever hold one of two values gets a CHECK saying so**, not just a
  row-mapping function that happens to only ever set one — see `checklist_records`' `value_number`
  / `value_text`. A mapping bug should fail the write, not corrupt a chart three reads later.
- **A client-generated id must be unique per its own scope, not assumed unique because one
  device's `localStorage` looked that way.** `fields.id` shipped broken the first time — three
  well-known ids (`'duration'`, `'push-ups'`, `'note'`) hardcoded identically on every device,
  fine in isolated local storage, a global collision the moment they synced to one shared table.
  Either generate a real per-instance id (`v4()`/`uniqueId()` — what everything else here does),
  or if the id is deliberately the same everywhere, make the row an owner-less system row instead
  of letting every client race to write it (see the `fields` note above).
- **A resource is a thing in the domain, not a table.** A single boolean or one-off field isn't
  a resource of its own.
- **Comments explain why, not what.** Match the density of the file you're in.
- **yarn**, not npm — this repo is a yarn workspaces + Lerna monorepo (voca's sibling project
  uses npm; don't carry that over).
- Don't run `tsc` / build after every edit unless asked — the harness reports type errors from
  the tools themselves.

## Local dev

```
supabase start                 # local Postgres + Auth + Edge Functions
supabase functions serve       # if you want function hot-reload separate from `start`
```

Then set `web/.env` (copy `web/.env.example`) to the local project's URL/anon key, printed by
`supabase start`.
