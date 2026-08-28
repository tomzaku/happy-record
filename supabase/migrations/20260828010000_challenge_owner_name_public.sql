-- The shared "take the challenge" page greets a visitor with the creator's
-- real name ("Alice just challenged you!") instead of a generic "Someone" —
-- see checklist-template-shared-page-ui. That name is
-- `challenge_participants.display_name`, the same one already shown to
-- every joined participant on the group dashboard once share_records is on
-- (not a new exposure relative to that — anyone who joins already sees
-- every other participant's name there). What's new here is letting an
-- anonymous visitor who *hasn't joined yet* read the owner's own row
-- specifically, for a challenge whose template they could already read
-- (public, same rule `challenges`' own select policy already uses).
--
-- Scoped tight on purpose: only the row where `user_id` is that challenge's
-- own `owner_id` — a fellow participant's name still requires actually
-- joining (the existing "Participants can see their challenge's roster"
-- policy), unchanged.
create policy "Anyone can read the owner's name on a publicly shared challenge"
  on challenge_participants for select
  using (
    exists (
      select 1
      from challenges c
      join checklist_templates t on t.id = c.checklist_template_id
      where c.id = challenge_participants.challenge_id
        and c.owner_id = challenge_participants.user_id
        and t.visibility = 'public'
    )
  );
