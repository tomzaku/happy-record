-- When a challenge actually starts/ends — needed to bound score calculation later (not
-- implemented yet, this migration only adds the columns). `start_date` is required client-side
-- (see challenges-dto.ts's fromChallenge), but every existing row needs a value the moment this
-- column exists, so it backfills to the migration's own now() as the best available default.
-- `end_date` stays null (open-ended) unless an owner sets one.
alter table challenges
  add column if not exists start_date timestamptz not null default now(),
  add column if not exists end_date timestamptz;
