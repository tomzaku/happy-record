-- Creates the `media` Storage bucket itself. `config.toml`'s own `[storage.buckets.media]` block
-- (added alongside 20260901000000_media.sql) only seeds a *local* `supabase start` stack —
-- `supabase config push` doesn't create/manage buckets on a linked hosted project (confirmed:
-- reports storage config "up to date" without creating anything). A bucket is just a row in
-- `storage.buckets`, so it's created the same way every other piece of schema here is — a plain
-- migration — rather than a manual Dashboard step or a broader `config push`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 104857600, array['image/*', 'video/*'])
on conflict (id) do nothing;
