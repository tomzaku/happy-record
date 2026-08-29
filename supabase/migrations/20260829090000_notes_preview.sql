-- A note list row's own one-line preview, computed and stored server-side now instead of the
-- client re-deriving it from `value` (real Editor.js OutputData) on every render — see
-- _shared/notes.ts's own comment. Same reasoning `search_text` already exists for: one place
-- computes plain text out of the blocks, everything else just reads the column.
--
-- This is also what makes the "list every note" read (notes/index.ts's own unscoped GET) cheap
-- to return without `value` at all — a note's raw content can be large (embeds, long documents);
-- a page rendering 200+ rows just to show a title and a short preview has no reason to pull all
-- of that over the wire, only to throw nearly all of it away.
alter table notes add column if not exists preview text not null default '';

-- Backfill from `search_text`, not a fresh Editor.js block walk — `search_text` already holds
-- the exact same underlying plain-text extraction (just longer, 2000 chars vs. preview's own
-- 200), so a real existing note doesn't have to sit with a blank preview until its next edit
-- recomputes one.
update notes set preview = left(search_text, 200) where preview = '';
