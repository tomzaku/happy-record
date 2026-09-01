-- Uploaded photo/video attachments for a `photo`/`video`-type field's own checklist-record value
-- (see CLAUDE.md's "The current resources"). First binary-upload feature in this app — see
-- supabase/functions/media/ for the resource built on top of this table.
--
-- `storage_path` is a generic attachment key/name, never a URL — nothing downstream (this table, a
-- checklist record's own `value_text`, the client) ever persists a real URL, only this row's own
-- id. A URL is minted fresh, short-lived, on every read (`GET /media/:id`, see
-- media/services/media-storage.ts) — see CLAUDE.md's "Fetching from the backend" for the same
-- "the id is the only thing that's real, everything else is resolved on demand" shape this
-- follows. `storage_provider` exists so a future move to S3 is a storage-adapter change, not a
-- schema/API one: new uploads can start writing `'s3'` while existing `'supabase'` rows keep
-- resolving exactly as before (or simply expire via the 20-day TTL below) — no backfill migration
-- required either way.
create table if not exists media (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase', 's3')),
  storage_path text not null,
  mime_type text not null,
  -- 100MB — same ceiling the request-upload-handler validates before ever creating this row;
  -- this is defense in depth, not the primary check (a mapping bug should fail the write, not
  -- corrupt accounting later, same reasoning as every other CHECK in this app).
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '20 days'),
  unique (storage_provider, storage_path)
);

-- Inert from day one — this resource is built directly on the app-layer `compose(checkPermission,
-- core)` pattern (see media/services/media-access-service.ts), never RLS. Enabled anyway only for
-- consistency with every other table in this app (CLAUDE.md's "Authorization: app layer, not RLS").
alter table media enable row level security;

create index if not exists idx_media_expires_at on media (expires_at);
create index if not exists idx_media_user_id on media (user_id);

-- ─── cleanup cron ───────────────────────────────────────────────────────────────────────────
-- No cron/scheduled-job infrastructure existed anywhere in this app before this — see
-- media/cron/media-cleanup-handler.ts for the actual deletion logic (storage object removal +
-- row delete + nulling any checklist_records.value_text still pointing at a deleted id), kept in
-- TypeScript like every other resource here rather than raw SQL. This migration only wires the
-- schedule: pg_cron fires hourly, pg_net does the HTTP call, and the handler itself authorizes
-- the call via a shared secret (this is service-to-service, not a signed-in user, so it
-- deliberately bypasses requireUser).
--
-- Both the target URL and the secret are read from Supabase Vault rather than hardcoded here,
-- so this migration is portable across local dev and the hosted project without editing SQL per
-- environment. Neither exists yet after running this migration — that's a one-time manual step
-- per environment (local *and* hosted), since a real secret value must never live in a checked-in
-- migration file:
--
--   select vault.create_secret('http://127.0.0.1:54321/functions/v1/media/cron/cleanup', 'media_cleanup_function_url');
--   select vault.create_secret('<a random value>', 'media_cleanup_secret');
--
-- ...and the edge function itself needs the same secret value available as
-- `MEDIA_CLEANUP_SECRET` (`supabase secrets set MEDIA_CLEANUP_SECRET=<the same random value>`)
-- so `media/index.ts` can check the incoming `x-cron-secret` header against it. For the hosted
-- project, re-run both `vault.create_secret` calls (with the real function URL) against that
-- project's own database instead.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- `cron.schedule` with a job *name* (rather than a bare schedule) upserts by that name, so
-- re-running this migration (or `supabase db reset`) reschedules the same job instead of erroring
-- or duplicating it.
select cron.schedule(
  'media-cleanup',
  '0 * * * *', -- hourly; expiry itself is a 20-day window, so this doesn't need to be tighter
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'media_cleanup_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'media_cleanup_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
