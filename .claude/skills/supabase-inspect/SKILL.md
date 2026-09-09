---
name: supabase-inspect
description: Read-only inspection of this project's remote Supabase database (schema, indexes, rows) and how to find edge function error logs, when debugging a live API error (a 500, unexpected data, "why did this write fail"). Use before asking the user to dig through the Dashboard, and instead of guessing further from a generic client error message.
---

# Supabase inspect (Dreamer / happy-record)

This project's Supabase CLI is already linked — project ref `afaikneohxiiyqioisua`, name "dreamer". Confirm anytime with:

```
supabase projects list
```

The row with `"linked":true` is the active one.

## Read-only DB queries — the main tool

Use `supabase db query --linked "<SQL>"` for any read-only inspection: schema, indexes, constraints,
spot-checking rows. `--linked` is required — without it, the CLI tries to connect to a *local* Docker
Postgres (`supabase start`) and fails with `ECONNREFUSED 127.0.0.1:54322`. `--linked` instead goes
through the Management API, so no DB password is needed.

```
# Table columns
supabase db query --linked "select column_name, data_type, is_nullable from information_schema.columns where table_name = 'checklists' order by ordinal_position;"

# Indexes / constraints — the usual source of a raw, uncaught 500 on a write is a unique index
# the application code didn't know to honor
supabase db query --linked "select indexname, indexdef from pg_indexes where tablename = 'checklists' order by indexname;"

# Spot-check rows (swap table/columns as needed)
supabase db query --linked "select id, user_id, checklist_template_id, started_at, ended_date from checklists order by created_at desc limit 5;"
```

**Writes are blocked, on purpose.** An INSERT/UPDATE/DELETE through `db query --linked` gets denied by
the harness's auto-mode classifier — mutating the remote DB directly, outside a real migration, isn't
something to do from here (see this repo's own CLAUDE.md memory on Supabase deploy gotchas). Use this
only to read and diagnose. If data actually needs fixing, that's either a migration or the user's own
one-off fix — not a query run from here.

## Migrations

`supabase migration list` shows local vs. remote applied migrations side by side — the fastest way to
confirm whether a given migration file actually landed on the remote DB, vs. a `db push` that silently
failed or was never re-run since.

```
supabase migration list
```

Migration filenames are `<timestamp>_<name>.sql` and must apply in ascending timestamp order. If
`db push` errors with "Found local migration files to be inserted before the last migration on remote
database," don't reach for `--include-all` — rename the new file to a timestamp *after* the latest one
already applied (`ls supabase/migrations | sort | tail`) and push again cleanly.

`db push` and `functions deploy` are blocked for Claude to run directly — that's the user's own step.
Only inspection commands (`db query --linked`, `migration list`, `projects list`) are fair game here.

## Edge function error logs

This CLI's `functions` subcommand has **no** `logs` action (`supabase functions --help` confirms —
only `list` / `delete` / `download` / `deploy` / `new` / `serve`). The real error text is also never in
the client's response: every function's `index.ts` catch-all deliberately returns a generic
`{"error": "Something went wrong."}` on a 500 and logs the real error server-side only
(`console.error('[<resource>]', err)`).

To see the actual error, ask the user to check:
- Supabase Dashboard → Edge Functions → `<function-name>` → Logs, searching for `[<function-name>]`

Don't keep asking the user to re-paste the client-side Network response for a 500 — it's the same
generic string every time and won't get more useful on a third paste.

## Preferred diagnosis order for a live API error

1. Get the exact request payload that failed (id, user-relevant fields, timestamps) from what the user
   already has open in DevTools.
2. Use `db query --linked` to inspect the real schema: columns (does the field the code just started
   sending actually exist yet?), indexes/constraints (is there a unique/check constraint the
   application code isn't accounting for?), and the actual rows around that id/slot.
3. Only fall back to asking for Dashboard function logs once the schema alone doesn't explain it.

This is exactly how the `checklists` "500 on selecting a future task" bug got diagnosed: the client
response was always the generic message, but `pg_indexes` on `checklists` revealed a real unique index
on `(user_id, checklist_template_id, started_at)` that the repository's blind upsert-by-`id` could
violate whenever a client-generated id drifted from what was already on file for that day.
