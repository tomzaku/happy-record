# Working on Dreamer / Happy Record

Project instructions for Claude Code. Keep this short — it's loaded into every session.

This app is **online-first**, by deliberate choice — see "Fetching from the backend
(online-first)" below for why and the full shape. It used to be offline-first (every screen
working with no backend, storing its state in `localStorage`); that model's sync/merge complexity
kept breaking in ways that were hard to debug, so the backend is the source of truth now: a
component fetches directly, scoped to what it needs, and a write is optimistic with no offline
retry queue. Real offline support (a write queue, working fully with no backend at all) is a
deliberate later effort, not the current state — don't assume a screen works with no network
today. `.cursor/rules/common-rules.mdc` has styling/i18n/component conventions; this file is about
the backend only.

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
| Edge function | `supabase/functions/<resource>/index.ts` | Thin deploy entrypoint (Supabase requires this exact file/path) — CORS, `requireUser` for identity, dispatch, error shape |
| Resource internals | `supabase/functions/<resource>/{api,services,repository}/` | Every resource gets all three, unconditionally — `api/` (one file per route plus a `<resource>-routes.ts` table, matching kakaonline core-server's own `features/<domain>/api` shape down to its smallest feature), `services/`, and `repository/<resource>-repository.ts` (plain DB queries only, no authorization or composition logic). `api/` must never call `repository/` directly, even for a single-route resource with no cross-user visibility rule (`me`) or a purely own-row resource (`flags`, `tags`, `checklists`, ...) — there's always a `services/` layer in between. What differs is what that layer actually is: a resource with a real permission decision names it `services/<resource>-access-service.ts` and gives it real `checkPermission` functions (see "Authorization: app layer, not RLS" below) plus, alongside it when there's other composition to do, a plain `services/<resource>-service.ts`; a resource with no cross-user visibility rule just gets the latter, a thin pass-through that forwards to the repository |
| Row↔wire mapping | `supabase/dto/<resource>/<resource>-dto.ts` | Every resource's `fromX`/`toX` row mapping and validation lives here, one folder per resource, regardless of whether only that resource uses it or several do (e.g. `checklist-records` building a note row through `dto/notes/notes-dto.ts`'s `fromNote`) — a real top-level sibling of `supabase/functions/`, not a resource-local `model/` folder, so there's one place for this regardless of consumer count. Matches kakaonline core-server's own `shared/dtos/<domain>` (folded into `shared/` there; a separate top-level `dto/` here, kept apart from `shared/`'s own infra/services) |
| Shared infra/services | `supabase/shared/<name>.ts` | Cross-cutting infra (`auth.ts`, `cors.ts`, `authorize.ts` — `admin`/`compose`/`ForbiddenError`, `router.ts` — `matchRoute`) and small DB-querying services genuinely shared across multiple resources' own `services/` layers, that aren't pure row mapping (`repeats.ts`, used by both `field-groups` and `checklist-templates`) — if it only maps a row's shape with no I/O, it belongs in `dto/` instead; if only one resource ever calls it, it belongs in that resource's own `repository/`+`services/`, not here (see `me`'s own `getProStatus`, moved out of a `shared/proUsers.ts` that had never had a second caller) |
| Client module | `packages/<owning-package>/src/<resource>Api.ts` | One exported function per route, built on `packages/global/src/lib/api.ts` |
| Caller | the domain's own hook (e.g. `useChecklist` in `checklists/useChecklists.tsx`) | Calls the API module, scoped to what's needed; falls back to whatever's already in the local store on `null` |

Deploy: `supabase functions deploy checklists`. `notes` and `challenges` are the fullest
references for the `api`/`services`/`repository` + `dto` split — `challenges` specifically for a
resource with real, multi-tier authorization logic (see below); `me` is the reference for the
minimal shape (one route each in `api/`/`services/`/`repository/`, no `dto` entry of its own).

## Authorization: app layer, not RLS

This app used to enforce every access rule with Postgres RLS — `using (auth.uid() = user_id)`
policies, `auth.uid()`-reading SQL functions, the works. That's gone now: every table still has
RLS *enabled* (harmless, since nothing queries through the caller's own JWT-scoped client
anymore), but the policies themselves are inert leftovers, not what actually protects a row. Why:
RLS policies and `auth.uid()` are Postgres/Supabase-specific — this app wants to be able to swap
the database later without rewriting an authorization model that only exists as SQL, and without
every new access rule requiring a migration.

The replacement, in `supabase/shared/authorize.ts`:

- **`admin()`** — a memoized service-role client. Bypasses RLS entirely. Every resource's route
  handlers read and write through this now, not `requireUser`'s RLS-scoped one (that client still
  exists, purely to verify the caller's identity via `auth.getUser()`).
- **`ForbiddenError`** — 403, distinct from `requireUser`'s 401 (not signed in at all).
- **`compose(checkPermission, core)`** — the actual pattern a route follows: `checkPermission`
  gets the same ctx the route would, decides whether this call is allowed at all, and returns
  whatever `core` actually needs once authorized (a loaded row, a filtered id list, an
  existing-row-or-null for a write) — threaded into `core` as a second argument so a check that
  already had to load something to decide access doesn't make `core` load it again.

`checkPermission` itself never queries the DB inline — it calls a `repository/<resource>-repository.ts`
function (plain `.select()`/`.eq()`, no decision-making) and makes the allow/deny call over what
comes back. Splitting "fetch" from "decide" this way means a repository read is trivially reused
(a batch check calling the same single-row fetch twice, say) and a permission bug is easy to spot
in a diff — the repository file should never grow an `if` that changes what it returns based on
who's asking. `notes/` is the reference: `repository/notes-repository.ts`'s `fetchNoteRow`/
`publicFieldGroupOwnerIds` vs. `services/notes-access-service.ts`'s `checkReadNote`/`checkWriteNote`/etc.

Three things to get right when writing or reviewing a `checkPermission`:

1. **A `checkPermission` that finds nothing to authorize because an id doesn't exist throws
   `ApiError(404, ...)`, not `ForbiddenError`** — same "unknown id and someone else's private id
   both look empty from the outside" convention every by-id lookup in this app already follows.
2. **A route that used to return an empty result when RLS silently filtered a row out (a
   shared-template lookup, a batch read) must keep doing that** — a `checkPermission` for that
   shape returns a "not visible" value (`null`, an empty array, a `visible: false` flag) for the
   core to turn into `{ resource: [] }` or `{ resource: null }`, not a thrown error. Throwing
   there would be a behavior change, not a faithful port. `field-groups`' scoped `list` and
   `checklist-templates`' `GET /:id` route are the reference for this.
3. **A batch read that used to rely on RLS to narrow a broader query needs that narrowing written
   out explicitly, not dropped.** `shared/repeats.ts`'s `fetchRepeats` is the cautionary example:
   it used to have zero `user_id` filter of its own, relying entirely on RLS to keep a personal
   reminder-time override private to the participant who set it. Moving its caller onto `admin()`
   without adding that filter back would have leaked every participant's override to anyone who
   could list the same template — caught and fixed while migrating `checklist-templates` (see
   that commit). When porting a query off RLS, ask "what was the policy actually restricting?",
   not just "does this query still return the same rows for the happy path?"

A resource with **no real cross-user visibility rule** — every query is already an explicit
`.eq('user_id', userId)`, own-row-only (`flags`, `tags`, `note-folders`, `checklists`,
`checklist-records`, `me`) — needs no `compose`/`checkPermission` at all: just swap the client to
`admin()`. Don't invent a permission check where the query was already self-scoped.

`challenges` is the fullest example of a real multi-tier rule: the challenge row itself is visible
to its owner or anyone if the underlying template is public, but the participant roster (and
everything downstream — completions, ranking, targets) needs actual participation, strictly
narrower than "the template happens to be public" — two separate `checkPermission`-shaped
decisions replicated from what used to be two separate RLS policies on two different tables.

## Write them as normal REST APIs

A function is a **resource**, routed on HTTP method + path — not a dispatcher on an `action`
field in the body, and not one function per operation.

```
GET    /checklists            ?checklistTemplateId=&from=&to=   list, filtered
GET    /checklists/:id                                          one resource, by its own id
POST   /checklists  { checklist }                                create/update (upsert)
PATCH  /checklists/:id  { ...changes }                           partial update
DELETE /checklists/:id                                           remove
```

Rules that follow from that:

- **The verb is the HTTP method.** `GET` reads and never changes anything; `POST` writes;
  `DELETE` removes and is idempotent (deleting what isn't there is a 200, not a 404).
- **`GET` takes query parameters, not a body.**
- **A single resource's own id is a path segment, `/resource/:id`, not `?id=`.** "List the
  collection" and "get one resource" are different routes, matched by `shared/router.ts`'s
  `matchRoute` (a tiny `:id`-segment matcher — this app never needs more than one dynamic segment
  per resource). PATCH and DELETE of one resource address it the same way. A filter that narrows a
  list without addressing one specific resource by its own id — `?checklistTemplateId=`,
  `?from=&to=`, `?ids=a,b` (a *batch* of ids, still a list operation) — stays a query param on the
  collection route; so does a foreign-key lookup like `challenges`' `?checklistTemplateId=`
  (finding *the* challenge for a template isn't addressing that challenge by its own id). ids in
  this app are client-generated (`uniqueId()` in `packages/global/src/util.ts`) and always
  URL-safe (plain base-36), so there's no encoding hazard in using them as path segments — still
  `encodeURIComponent` them on the client side and `decodeURIComponent` them in `matchRoute`
  (already handled) on principle, not because a real id needs it today.
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
get `null` instead — **use this for almost every call in this app**, because the local store
(`useSessionStore` or `useLocalStorage`, whichever backs that domain) is always right there as a
fallback. `null` means "use what's already in the store," never an error screen. Choose per call,
not per module.

This app is **online-first**: a write is optimistic (the local store updates immediately, the
request fires directly, no retry queue) and a read is fetched fresh, scoped to whatever the
caller actually asked for — see "Fetching from the backend" below. There's no offline queue today;
a write that fails because the device is offline just doesn't persist, silently, same as it always
has for a real rejection. Deliberate, not an oversight — rebuilding real offline resilience is a
separate, later effort on top of a codebase that isn't also fighting a merge-conflict model (see
that section's own note on what this doesn't solve).

### Identity comes from the session

Never take a `user_id` from a request body. It's read from the caller's session, server-side
(`requireUser` in `supabase/shared/auth.ts`) — otherwise a client could act as
someone else regardless of what the UI sends.

There's no signup screen: `packages/global/src/hook/useSession.ts` signs every device in
**anonymously** on first load, so every fetch has a session to authenticate through with zero
friction — no login wall before the app is usable. A user who wants their data on a second device links Google to that same
anonymous identity (`useSession().signInWithGoogle` → `supabase.auth.linkIdentity`, the
settings page's "Sign in with Google" row) rather than starting over signed out — the `user_id`
doesn't change, so their existing rows don't need migrating. Needs `[auth.external.google]` in `supabase/config.toml` and real credentials in
`supabase/.env` (see `supabase/.env.example`) — the settings row shows whenever a backend is
configured at all (`hasBackend`), but without those credentials clicking it just fails quietly
(a console warning, no error screen — same "degrade, don't break" rule as everything else here).

Session/sign-out/sync-on-identity-change details (`ensureSession`, `signOut`, the
`identity_already_exists` self-heal) live in "Syncing local storage with the backend" below,
alongside the equivalent guarantees for local domain data.

## Fetching from the backend (online-first)

This app used to be offline-first: every domain store synced everything into `useLocalStorage`
once per identity and merged in the background. That model kept breaking in ways that were hard to
reason about (a component rendering a stale merge, a sync that silently never landed), so it's
gone — see "What this still doesn't solve" below for what that tradeoff costs. **The backend is
the source of truth now.** A read fetches directly, scoped to exactly what the caller asked for; a
write is optimistic (the store updates immediately, the request fires immediately) and there's no
retry queue.

**`useSessionStore`** (`packages/global/src/hook/useSessionStore.ts`) is `useLocalStorage`'s exact
`[value, setValue]` shape and its same module-level, zustand-backed `storeCache` mechanism (one
reactive store shared across every component that asks for a key) — with no
`window.localStorage` read/write. Every one of the 8 backend-mirrored resources (`fields`, `notes`,
`note-folders`, `flags`, `checklists`, `checklist-templates`, `checklist-records`, `tags`) uses this
instead of `useLocalStorage` now: a fresh page load always starts empty and fetches fresh, never
renders a stale local copy. `tags` moved here from local-only for exactly the reason `flags` never
was local-only in the first place: the home page's Filter by Tag dropdown reads the registry, not
`checklist_templates.tags` (which was already synced) — a local-only registry could never list a
tag that arrived any other way (synced down from another device, an AI-generated template's own
proposed tags, a shared/public template), even though the template itself really had it. Genuinely
local-only state that was never backend-mirrored in the first place — `selected_checklist_templates`,
theme, pomodoro config — keeps using real `useLocalStorage`, unchanged; there's nothing to "go
stale" for those.

**The scoped-fetch-by-query-key pattern** is one shape, followed by every resource's own read
functions (`useChecklistRecord.ts`'s `getChecklistRecords` had this shape first — the others were
generalized from it): build a key from the query actually being asked for (an id, a date range, a
set of field ids, or `"all mine"` where that's genuinely the right scope — the management screen,
schedule-matching for the home view), check a module-level `Set<string>` for "have I already fetched
this exact scope," and if not, fire the request and merge the result into the shared
`useSessionStore` when it resolves — meanwhile returning whatever's in the store right now (empty
until the fetch lands, then reactive, same last-write-wins-by-`updatedAt` merge as before, now
mostly a cheap safety net rather than the load-bearing mechanism it used to be). `userId` is part of
every scope key, so a scope already fetched for one identity re-fetches once the signed-in identity
actually changes.

**A one-shot action handler needs the real data this tick, not a value that's fine to start empty
and fill in on a later render** — the scoped-fetch-and-return-a-snapshot shape above is for
*rendering*, where React re-rendering once the fetch resolves is exactly the point. A few read
functions are called from imperative click handlers instead ("generate a share link," "delete
every checklist instance of this template") and need to actually `await` the fetch and build their
return value from the response directly, not re-read the store afterward (that closure is stale by
the time the store's setter actually lands) — `useRecordField.tsx`'s `getRecordFieldsByIds` and
`useChecklists.tsx`'s `getAllChecklistWithTemplate` are async for exactly this reason; every other
read function here is deliberately not.

Per-resource scoping, since each backend route supports something different (verify against the
edge function before assuming a shape): `fields` supports `?ids=` for a specific set (the
share-flow consumers use this — `CardShare`, `tasks-shared-page-ui`,
`checklist-template-shared-page-ui`) alongside the unscoped "all mine + public" most consumers
genuinely need (field pickers, the manage-fields screen, AI-generate context). `notes` supports
`fieldIds`/`folderId`/`limit`. `checklist-templates` supports `GET /:id` (one, own or public)
alongside "all mine." `checklists` supports `GET /:id` (one — added for `detail-task-page`, which
already knows the exact id from the URL and has no reason to fetch a range and filter), `checklistTemplateId`,
and `from`/`to` (`getChecklistByGivingDate` fetches its one day directly — the shape a single-day
view like `ChecklistToday` wants. A multi-day view calls `ensureChecklistsFetched` instead, once
for its whole visible range, and reads each day via the non-fetching `getChecklistForDateWithoutFetching`
— `WeeklyCalendarVertical`/`WeeklyCalendarHorizontal` both do this, one request per visible week
rather than one per day. This used to be one request per day even for a multi-week view — cheap to
dedupe against re-fetching the same day twice, but not against the sheer number of days a growing
calendar shows at once).
`checklist-records` supports `checklistTemplateId`/`from`/`to`/`fieldIds`/`limit`, unchanged.
`note-folders`/`flags` have zero consumers today, so they just fetch "all mine" once, unscoped —
there's nothing to narrow yet.

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
`useEffect` with an incomplete dependency array — so a value fetched later, from another device or
even from an edit on this same device, never appears without an unrelated remount) recurred
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

**What this still doesn't solve**: there's no offline write queue — a write that fails because the
device is genuinely offline just doesn't persist, silently, the same way a real rejection always
has; rebuilding that resilience is a deliberate later effort, not an oversight (see "Never
hand-roll `fetch`" above). There's no live push either — a scope already fetched once this page
load stays whatever it was until something re-triggers a fresh fetch for that exact scope (a
reload, or navigating to a view that asks for a wider/different range); another device's edit
doesn't appear here until then. What *is* fixed relative to the old model: a delete now really
deletes server-side (`checklists` gained a `DELETE /checklists/:id` route specifically so
`EditChecklistForm`'s "delete every instance of this template" could stop reaching into
`useLocalStorage('checklist', ...)` directly and actually delete rows), and since nothing is a
merged-forever local copy anymore, a fresh fetch after a delete — on any device, including the one
that deleted it — correctly won't show the row again; the old model could never do that (merging
only ever added or replaced, never removed).

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
network on first-ever load): `ready` becomes `true` for a `null` session, and every resource's
scoped-fetch read functions gate on `ready && userId` (see above) — with `userId` permanently
`undefined`, they'd never actually fetch anything even once connectivity returns. `useSession.ts`
also listens for `online` and retries `ensureSession()` while `session` is still `null`, so that
device recovers the moment connectivity returns instead of staying stuck until a full reload.

Testing any of this by clearing `localStorage` and reloading doesn't simulate "this account's
cache is cold" the way it might seem to — Supabase persists its own session token in `localStorage`
too, so wiping everything also signs the device out to a *brand new* anonymous identity, not a
blank slate for the account that was signed in. To test a real account's data reloading: use the
settings page's own Sign Out (which reconnects to the same account through `signInWithGoogle`), or
open the app in a second browser/profile already signed into the same Google account.

`useSession().signOut` (settings page's "Sign Out" row, shown once linked) ends the device's
session, calls `resetSessionCache()` so the next request doesn't keep sending the revoked token,
clears every remaining genuinely-local-only `useLocalStorage` key (`SYNCED_DATA_KEYS` in
`useSession.ts` — `selected_checklist_templates`, `user`; the 8 backend-mirrored resources aren't
in this list anymore, since they're `useSessionStore`-backed and in-memory only), and
reloads the page — the reload is what actually clears those in-memory stores and each resource's
own "have I fetched this scope" `Set`, without which a next real sign-in would think it had
already fetched when it hadn't. **Adding a new genuinely local-only `useLocalStorage` key means
adding it to `SYNCED_DATA_KEYS` too** — nothing derives that list automatically.

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
Cleaning that error out of the URL after is a plain `history.replaceState` clearing both the query
string and the hash — this app is a `BrowserRouter` (`packages/route/src/index.tsx`, `basename`
tracking vite's `base` the same way `voca`'s `App.tsx` does), so neither one is part of routing and
there's no risk of landing on an unmatched path the way a `HashRouter` reading `#error=...` as a
route would. (This app used to be a `HashRouter`, specifically to dodge that — see git history on
`useSession.ts` if you need the old shape.)

`signInWithGoogle`'s `redirectTo` is deliberately pinned to `origin + import.meta.env.BASE_URL` —
the app's base URL, not wherever sign-in was triggered from. It was briefly `origin + pathname`
(returning to the exact page, since `pathname` *is* the in-app route now that this is a
`BrowserRouter`) but that broke Google sign-in in production: GoTrue's Redirect URL allow-list
(the hosted project's own Dashboard → Authentication → URL Configuration, not this repo's
`supabase/config.toml`) matches *exact* strings unless a wildcard entry is configured there, and a
redirect target that doesn't match falls back to the project's **Site URL** *silently* — no error,
just landing on whatever that's set to (which, misconfigured, sent production users to
`127.0.0.1:4001`, the local dev Site URL). A fixed target needs one exact allow-list entry; a
per-route target needs the allow-list widened to a wildcard and stays fragile against it ever being
tightened — not worth the "land back on the same page" UX. A page that wants to resume something
after the round trip can't rely on its own remount either way (the URL's query params, e.g. a
shared-challenge page's `?from=&to=` greeting text, don't survive the redirect) — save the intent
to `localStorage` first and resume it from a hook mounted once at the app root, the shape
`useResumePendingChallengeJoin.tsx` uses.

### `supabase` is for auth only, in one place

`packages/global/src/lib/supabase.ts` creates the client (or `null` when `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` aren't set — the app must still build and run with no backend configured,
degrading to empty data rather than crashing, per the "online-first" tradeoff above). Nothing
outside `useSession.ts` and `api.ts` should import it.

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
(`dto/checklist-records/checklist-records-dto.ts`) are exactly where that translation belongs —
the client never learns the columns changed shape.

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

`tags` (table `tags`, client: `packages/global/src/store/tags/useTags.tsx`) is the *registry* of
tag names behind the home page's Filter by Tag dropdown and `TagInput`'s autocomplete/create UI —
distinct from `checklist_templates.tags`, the free-text `text[]` actually attached to a template.
Same owner-only shape as `flags` (id, name, timestamps), no relation the way `flag_id` is a real
foreign key — a template's `tags` array stores names, not registry ids, so renaming or deleting a
registry row doesn't touch any template. Every `addTag` call (typing a new tag into `TagInput`, or
applying an AI-generated template's own proposed tags — `useApplyAiChecklistTemplate.ts`) both
updates a template's `tags` array *and* upserts the name into this table, deduped
case-insensitively; nothing today deletes unused entries once a template stops referencing a name.

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

A field-group's own note (its "how to do it" instructions, `ownerType: 'field_group'`) is the one
place a challenge participant's edit forks rather than writing in place — `notes.copied_from_id`
(`20260831000000_notes_copied_from_id.sql`, mirroring the `fields`/`checklist_templates` columns
of the same name) points back at the note a participant's own copy started from. The owner always
writes the group's one canonical note directly; a participant's first edit copies its
then-current content into a brand-new note they own instead (`GET /notes?fieldGroupId=` is how the
client tells "I already have my own copy" from "still reading the canonical one, read-only" —
`supabase/functions/notes/api/list-notes-handler.ts`'s own `getMyFieldGroupNote`), and every edit
after that goes to their own copy — see `packages/global/src/hook/useFieldGroupNote.ts`. This
doesn't contradict "joining a challenge never forks" above: that's about the *template* and its
*fields* (every participant records against the exact same field id, no copy made at join time at
all) — a field-group's note is a separate mechanism, forked only on an explicit edit, and only for
that one note, not the whole template. No switcher between "the owner's version" and "mine" once a
participant has their own copy yet — deliberately deferred, not an oversight; the `copied_from_id`
back-reference already makes that possible to add later without another schema change.

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
owner. The link is the template's own id (`GET /checklist-templates/:id`, `dto/checklist-templates/
checklist-templates-dto.ts`'s `toChecklistTemplate` and the "own or public" visibility check
already existed for exactly this before the route did — see checkCanReadTemplateById), not a
separate generated id — see
`useGetChecklistTemplateApi.tsx`. A recipient's fields come back already public, so accepting a
template merges them into local state as-is (`useRecordField`'s `mergeRecordFields`) rather than
re-saving them as this device's own — that would race the sharer's row on `fields.id`'s global
primary key, the exact bug the `duration`/`push-ups`/`note` system fields hit first (see below).
Accepting also strips `visibility`/`flagId` off the copy: the recipient didn't choose to publish
their own copy, and a flag id copied verbatim would point at a flag only the sharer can see.
`userName`/`targetName` (the "Hey, X — Y challenged you!" greeting) are carried as `?from=&to=`
query params on the share link itself, not stored server-side — there's no real per-link owner
data, just per-link display text. `from` isn't the only source of `userName` though: CardShare's
current share flow never fills in `?from=` at all (only the older tasks-shared-page-ui form ever
did), so `useChecklistTemplateSharedPage.ts` falls back to `challenge.ownerDisplayName` before
falling back further to a generic "Someone" — see the identity paragraph below for where that
comes from. `useFirebase.ts` is gone; `useStorageSync.ts` (a separate,
unrelated whole-`localStorage` backup/restore debug tool behind `local-storage-editor`) still
uses the `firebase` package directly and is out of scope here. `tags` is local-only.

**A challenge participant's name/photo come from Google, never typed in.** `useSession.ts`
exposes `displayName`/`avatarUrl` straight off the signed-in Google identity's own
`user_metadata` (`full_name`/`name`, `avatar_url`/`picture` — both `undefined` for an anonymous
session, since there's still no other profile concept in this app). Both the owner
(`CardShare`, when "Share everyone's check-ins" is on — `useSession().displayName`/`avatarUrl`,
sent as `ownerDisplayName`/`ownerAvatarUrl`) and a joiner (`useJoinChallenge.tsx`'s
`acceptChallenge`, called from `useChecklistTemplateSharedPage.ts` once already signed in, or
from `useResumePendingChallengeJoin.tsx` once the post-redirect session lands) use this same
pair — there used to be a manual "Your name, shown on the dashboard" `CardShare` input, and
joining used to write the shared link's own `?to=` text as the participant's name; both were
replaced with the real identity once it existed. Stored on `challenge_participants.display_name`/
`avatar_url` (the row written at join, or at share time for the owner's own auto-enrolled row —
see `challenges/index.ts`'s `save()`), which is where the group dashboard's `ParticipantAvatar`
(`challenge-dashboard-page-ui`) reads a real photo from, falling back to its original
initials-on-a-hashed-color badge for anyone with none (never signed in with Google, or joined
before this existed). `GET /challenges?checklistTemplateId=` also surfaces the owner's own
name/photo as `challenge.ownerDisplayName`/`ownerAvatarUrl` for the shared page's own greeting,
gated by `20260828010000_challenge_owner_name_public.sql`'s policy on `challenge_participants`
(readable for the owner's own row specifically, on a publicly-shared challenge, so an anonymous
visitor who hasn't joined yet can still see it — everyone else's row stays roster-only, same as
before).

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
- **Authorization is app code now, not RLS.** Every table still has RLS enabled from when it was
  the enforcement layer (`supabase/migrations/20260820010000_init_checklists.sql`'s
  `using (auth.uid() = user_id) with check (auth.uid() = user_id)` shape, etc.) — those policies
  are inert leftovers now, not load-bearing; see "Authorization: app layer, not RLS" below for why
  and the actual pattern a new resource follows.
- **Every table gets `updated_at timestamptz not null default now()`, and every write sets it
  explicitly** in the row-mapping function (`fromX`) — Postgres only fills a column default on
  insert, never on update, so an upsert that doesn't set it leaves a stale value. It's not
  enforced (no version check blocks a stale write), just makes one auditable — two devices editing
  the same row close together, or a scoped fetch racing a write on this same device, are real
  scenarios (see "Fetching from the backend"'s last-write-wins merge), not hypotheticals.
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
