# Dreamer / Happy Record — Feature Overview

A habit/task-tracking app: create recurring or one-off checklist templates ("Tasks"), check them
off (optionally recording structured fields like numbers, notes, photos), see history/streaks/
charts, and optionally share a task as a group "challenge" that other people can join.

This documents user-facing behavior only. For the backend architecture, see `CLAUDE.md`.

## Sign-in, sync, and plans

- No signup wall — every device signs in **anonymously** on first load so the app works
  immediately.
- Settings → "Sign in with Google" links that anonymous identity to a real Google account, so
  the same data (checklists, notes, tags, etc.) is reachable from a second device. There's no
  separate account-creation flow; signing out and back in with Google is how a device recovers
  an existing account's data.
- **Pro / Free plan**: shown in Settings (Free / Pro trial with an expiry date / Pro). There is
  no in-app purchase flow yet — Pro is granted automatically as a 5-day trial on first use, or
  manually. Nothing in the base app is feature-gated by it except the AI features (AI checklist
  generation, AI note-writing assist).
- The app is **online-first**: screens fetch fresh from the backend rather than working from a
  local cache, and a write with no network connection simply won't save (no offline queue yet).

## Home screen (`/`)

The main landing screen, with four switchable view modes plus a lunar-calendar widget and the
Focus Zone FAB available everywhere:

- **Day view** — today's (or a chosen day's) checklist items, split into "pending" and
  "completed" groups. Each item shows its icon/color and title; tapping the checkbox marks it
  done/undone right there; tapping the row opens that task's detail page. A "Public" badge marks
  a template shared publicly. A quick "Add a new task…" inline input (Submit button appears once
  text is typed) creates a simple, always-on, no-schedule/no-field task instantly, without opening
  the full creation form.
  - A side panel toggles between:
    - **Calendar** — a weekly calendar strip (mobile: horizontal; desktop: vertical) for picking
      a different day.
    - **Recent History** — a cross-task feed of the last ~30 submissions across every task
      (roughly the last 30 days), each entry grouped by "submitted together" and showing the
      recorded field values (e.g. "Duration: 20 min") or "Marked done" for plain check-off tasks.
- **Week view** — a week-at-a-glance grid of the same tasks.
- **Month view** — a calendar grid; each day cell shows up to 3 colored task chips (checkmarked
  if completed) plus a "+N more" overflow label, with prev/next month navigation and a "Today"
  shortcut. Clicking a day jumps into Day view for that date.
- **Year view** — a GitHub-style contribution heatmap, each day shaded by completion level
  (nothing scheduled / scheduled-but-not-done / partially done / fully done), grouped by month.
- **Create Task modal** (reachable from the home screen) has three tabs:
  - **Create New Task** — opens the full creation form (see below).
  - **Use Template** — paste a template/invitation ID to jump straight to that shared template's
    page, as a manual alternative to opening a share link.
  - **Generate with AI** — opens the AI generator to produce a whole new task from a text prompt
    (Pro-gated; see "AI Checklist Generation" below).
- A small **lunar calendar** widget shows the current lunar day/month alongside the solar date.

## Checklist templates ("Tasks")

A **checklist template** is a recurring or one-off task. Created via the home screen's quick add,
the "Create Task" flow, or AI generation.

### Creating a task (`/create-checklist`)

Two tabs: **Create New Task** (the form below) and **Use Template** (paste a template ID to open
its shared page directly). The form itself sets:

- Title (free text), an icon, and an accent color (icon/color pickers; defaults to a checklist
  icon and blue-grey).
- **Schedule** — a toggle turns repetition on/off ("Forever, until done" when off). Turning it on
  opens an "Edit Schedule" modal with:
  - **Build Hobby** — pick which days of the week it repeats (multi-select Mon–Sun).
  - **Start Day** — a date picker for when the schedule begins.
  - **Time** — an optional due time, shown only while the task has no field groups yet; once
    field groups exist, each carries its own day/time schedule instead (edited as a per-group
    list in this same modal) and supersedes the template-level time.
  - A one-line summary ("Everyday", "Weekdays", "Mon, Wed, Fri • Start: … • Time: …") shows on the
    form without opening the modal. Edits inside the modal are a draft, discarded unless you hit
    its own Save.
- **Tags** — an autocomplete input against a shared personal tag registry: typing shows matching
  existing tags or an option to create a new one; Enter/comma or picking from the dropdown adds
  it as a removable chip. The same registry backs the home page's Filter-by-Tag.
- Fields/field groups are **not** set at creation time — a brand-new task starts with none; they're
  added afterward from the task's own detail page (see below). A field's type is one of: number
  (with a unit), note (rich text), text, date, date & time, single-select ("multiple choice"),
  multi-select, photo, or video. A field is a standalone concept reusable across multiple tasks,
  not owned by one template.
- Leaving out fields entirely is fine — a plain check/uncheck task.

### Editing a task (`/edit-checklist/:id`)

Same form, pre-filled. Adds **Delete**, which — after confirmation — deletes the template *and*
every day-instance ever generated from it (a real cascading delete, not just removing the
template). Saving also persists any per-field-group schedule changes made via the Schedule modal,
each saved individually since a schedule now lives on the field group once one exists.

### Task Management (`/checklist-template`)

A flat list of your own templates: icon, title, edit (pencil) and delete (trash) actions, a
checkbox to include/exclude the task from the home page's selected-templates set, and a row of
day abbreviations highlighting its scheduled days ("Every day" shown for daily repeats). Purely
list/manage/navigate — there's no creation entry point on this page itself.

## Task detail page (`/task/:id`)

The day-to-day tracking screen for one task, for the owner or a challenge participant (with
reduced permissions).

### Field groups

Content is organized into **field groups** (e.g., "Push Day", "Morning Routine") — collapsible
cards, each with a settings menu (⋮) to rename it, choose which tabs it shows and its default
tab, toggle "collapsed by default," pick/configure its fields (with per-group overrides: custom
title/icon, default value, placeholder), and delete (soft-archive, restorable later). Each group
shows a "Scheduled today" / "Next [day]" badge from its own repeat schedule.

Each field group can show up to four tabs:
- **Home** — the group's own rich-text note/instructions ("how to do it"); see "Field-group
  instructional notes" under Notes below.
- **History** — a feed of past submissions (grouped by timestamp, each deletable), plus a
  List/Calendar toggle showing a mini calendar of days this group was completed.
- **Metric** — a bar chart of a numeric field's values over the month/year, with Today/Peak/
  Total/Streak stat cards.
- **Add** — the submission form: fill in any of the group's fields (partial submissions allowed)
  and Submit; every field submitted together is grouped as one entry in history.

### Whole-task history & metrics

Below the field groups, a per-task calendar reuses the home page's week/month/year views
(checkmarks/heatmap) scoped to just this template, plus a List view of past days — clicking any
day navigates the whole page to that date.

### AI Checklist Generation

A magic-wand icon (owner only) opens a Pro-gated modal: describe in plain text what to add (e.g.,
"gym schedule to build muscle"); the AI proposes new field groups — fields, icon, schedule, and a
note each — individually toggleable on/off, refinable via follow-up feedback ("make Push Day
easier"), then appended to the task on Accept. A non-Pro user sees an upsell instead.

### Sharing

"Share" (in General Settings, owner only) generates a public link and always creates an
associated challenge, configurable via a modal:
- **Allow comments** toggle on the shared/group page.
- A visual **theme** — Classic, Ignite (bold/competitive), or Playful (fun/low-pressure) — plus
  an optional background photo.
- Optional numeric **targets** per number-type field (shared goals shown on the group dashboard).
Once shared, the row shows the link with copy/edit icons, and all of the above stays editable.
If a challenge exists, a mini leaderboard card (top 3, join-count pill, link to the full
`/challenge/:id` dashboard) appears at the top of the page; participants get a "⋮ → Leave
Challenge" option there, with confirmation. See "Sharing and Challenges" below for the recipient
side.

### General Settings

A collapsible card: Icon & Color, Schedule (whole-task, or per-group via the schedule editor once
field groups exist), Tags, Archived Groups (restore soft-deleted ones), and Delete Task (owner
only, permanent, confirmed). A non-owner participant can't edit these but gets their own **"My
Reminder"** override — a personal notification time distinct from the owner's schedule — with a
reset-to-group-default option.

### Mobile vs. desktop

Same components on both; mobile uses bottom-sheet modals (Share, AI-generate) where desktop uses
centered dialogs, and desktop shifts some sections (history/challenge info) into a side column.

## Notes

A separate, general-purpose notebook, independent of checklist fields — plus two other places
"notes" show up inside checklists.

### Standalone notebook (`/notes`, `/notes/add`)

- A **Folders** picker with five sections: **All Notes** (total count), **Unfiled** (quick notes
  with no folder), user-created **Folders** (add your own via "+" and a New Folder modal),
  **Fields** (each note-type field gets its own slot, marked with a filled dot if it has
  content), and **Tasks** (checklist templates that carry their own field-group note) — plus
  **Other** for notes whose source template no longer exists.
- A searchable **note list**, optionally grouped by field; selecting one opens it in a detail/
  editor pane. Mobile drills list → full-screen editor; desktop shows folders/list/editor as
  three panes side by side.
- **Creating a note**: a "+" quick note from the list, or the dedicated `/notes/add` screen — pick
  a note-type field, give it a title, and write the body.
- Notes support renaming, moving between folders, and deleting.
- The editor is block-based (Editor.js), supporting things like checklists-within-a-note and
  nested lists, plus an inline **"/ai"** AI-writing assist (Pro-gated) to draft or extend content.

### Note-type checklist fields

A field of type "note" inside a checklist is its own kind of journal entry (one per day/
submission, editable from that field group's History) — distinct from the standalone notebook,
though it shares the same rich-text editor component.

### Field-group instructional notes

A field group can also carry one canonical **instructional note** (its "how to do it"), editable
by the task owner directly. A challenge participant sees the owner's original read-only by
default; clicking Edit forks their own private copy before switching into edit mode, after which
"Original"/"Mine" tabs let them flip between the owner's version and their own. This forking is
specific to this one note — joining a challenge otherwise never forks the template or its fields.

## Sharing and Challenges

Any task can become a shareable link that others can accept and start doing themselves.

- **Accepting a shared link** (`/checklist-template/shared/:id`) — a public landing page (works
  for a signed-out/anonymous visitor) showing the task's icon/title, its repeat days, a preview of
  its fields ("Show more"), a preview of any field-group instructions, and a personalized greeting
  (from `?from=`/`?to=` query params if present, else the owner's real name).
  - **"Take it"** — forks a private, unpublished copy of the template for personal use; doesn't
    affect any leaderboard.
  - **Joining the challenge** — requires signing in with Google (an anonymous session can't
    meaningfully appear on a leaderboard); joining adds the visitor as a real participant under
    their Google name/photo. No copy is forked — everyone records against the exact same
    template/fields, so progress is directly comparable. A first-time joiner also gets their own
    copy of the owner's reminder schedule(s), editable independently afterward.
- **Challenge dashboard** (`/challenge/:id`) — the group view for a shared task:
  - Participant roster with avatars (real Google photo if available, else initials on a hashed
    color) and a ranking computed from check-ins, streaks, and target progress.
  - The current user's streak and the group's best streak, plus total check-ins.
  - A 30-day daily activity chart (check-ins per day, whole group).
  - A per-participant breakdown chart, tabbed between "Check-ins" and up to 3 numeric targets.
  - Animated progress bars toward each numeric target, with a legend of contributors.
  - A photo/video attachment feed from participants, grouped by date.
  - An optional comments thread (if the owner enabled it).
  - "Leave Challenge" for participants (not available to the owner); leaving removes it from
    your list but keeps whatever you already recorded.
- **My Challenges** (`/challenges`) — a card grid of every challenge you own or joined, each
  showing *your own* 30-day check-ins/streak (not the group's) and the total number of joiners;
  tapping a card opens the full dashboard.
- An older, separate share-link format (`/task/:id/share`) still exists alongside the newer
  challenge-based sharing, where the sharer manually types a recipient name/message into the link.

## Focus Zone / Pomodoro

A floating action button, visible on most screens (hidden on the public shared-challenge landing
page), opens a focus-timer modal:

- Switch between **Pomodoro** mode (work sessions with short breaks, then a long break —
  durations configurable) and a plain **Stopwatch**.
- Pomodoro shows an animated circular progress ring, time remaining, current phase label ("Work
  Session"/"Short Break"/"Long Break"), percent complete, and — if launched from a task — that
  task's title. Start/Pause and Reset controls.
- A **light/dark theme toggle** for the Focus Zone panel itself.
- Optional ambient/nature **background sounds** while focusing (bird, cricket, fireplace, café
  ambience, rain/thunder, waves, stream, plus lo-fi music tracks).
- A **browser notification** ("Break Time!") fires when a work phase ends and a break begins,
  after first requesting notification permission.
- **Picture-in-Picture** — the running timer can pop out into the browser's real PiP window
  (light/dark themed) so the countdown stays visible while switching tabs or apps.
- The FAB itself shows a live mini version of whichever timer is currently running, even with the
  full modal closed.

## Settings (`/setting`)

- Account: sign in/out with Google, current plan (Free / Pro trial / Pro).
- Theme: Light/Dark.
- Language: English or Vietnamese.
- Shortcut into Task Management.
- Pomodoro duration settings (desktop).
- App version footer, doubling as a hidden link to a raw local-storage debug/editor tool, plus a
  "Feature Request / Bug Report" link to the GitHub issue tracker.

## Other

- **Installable PWA** — works offline once installed/cached, with an "app ready to work offline"
  toast and silent auto-update of new versions in the background.
- **Story** (`/story`) — a static list of pregnancy-related short stories/lessons you can expand
  to read; read status is tracked locally per device.
- The **Audio** route (`/audio`) exists but is currently non-functional (disabled/commented-out
  player) — not a live feature.

## Not (yet) real features

A few concepts appear in code but aren't reachable or wired up, per this project's convention of
removing dead pages rather than leaving stale ones half-migrated:
- In-app purchase / self-serve Pro upgrade.
- Push notifications tied to a task's reminder time (reminders are just a stored schedule today,
  not something that actually alerts you in the background).
- The `/audio` guided-audio player.
- The drag-and-drop field-builder UI (`RecordTaskSetting`) and "Build Weekly Hobby" component in
  the create-task flow — superseded by adding/configuring fields directly on the task detail page.
