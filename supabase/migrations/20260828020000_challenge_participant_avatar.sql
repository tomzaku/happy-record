-- The dashboard's ParticipantAvatar has always been initials-only ("no
-- photo anywhere in this domain, no avatar_url, no Google metadata
-- captured" — its own old comment). Google gives us a real profile photo
-- on sign-in same as it gives a name (useSession.ts's `avatarUrl`,
-- `user_metadata.avatar_url`/`picture`) — this column is where that gets
-- stored per participant, same shape as `display_name`: free text (a URL,
-- here) supplied by the client, not fetched server-side.
alter table challenge_participants
  add column if not exists avatar_url text;

-- The owner-name policy (20260828010000_challenge_owner_name_public.sql)
-- already grants row-level access to the owner's own participant row on a
-- publicly shared challenge; RLS is row- not column-scoped, so no new
-- policy is needed for this column specifically — the edge function's own
-- `select('display_name, avatar_url')` is what actually narrows it.
