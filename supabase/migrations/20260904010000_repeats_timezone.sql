-- The IANA zone (e.g. 'Asia/Ho_Chi_Minh') of whichever device most recently wrote this schedule.
-- `started_at`/`ended_at` are stored as real instants (timestamptz), and the client always
-- converts a picked calendar day to its local-midnight instant before sending it — but nothing
-- server-side knew *which* local day that instant was meant to represent, so a device reading it
-- back in a different zone than the one that wrote it could bucket it onto the wrong day. Nullable
-- — a schedule written before this column existed has none, same "no backfill" convention every
-- prior migration here already follows (see CLAUDE.md).
alter table repeats add column if not exists timezone text;
