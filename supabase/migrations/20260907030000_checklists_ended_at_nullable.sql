-- A "forever, no fixed schedule" one-off task (createTaskUtil.ts's own non-recurring branch,
-- useApplyAiChecklistTemplate.ts's "new template" entry point) had nothing real to put in this
-- NOT NULL column, so it wrote a `2099-12-31` sentinel instead — a fake far-future date nothing
-- ever actually reads (grep the client: `.endedAt` is written in exactly those two places and
-- never read back anywhere). Genuinely nullable now: "no defined end" is represented as no value,
-- not a magic date.
alter table checklists alter column ended_at drop not null;
