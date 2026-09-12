import { v4 as uuidv4 } from 'uuid';
import { endOfDay } from 'date-fns';
import { useChecklist, useChecklistTemplates, getClientTimezone, type Checklist } from '@dreamer/global';
import { calculateRepeat } from './calculateRepeat';
import { FormState } from './CoreChecklistForm';

/**
 * Utility function to handle task creation logic
 * Follows the desktop logic from create-task-modal
 */
export const createTask = async (
  formData: FormState,
  addChecklistTemplate: ReturnType<typeof useChecklistTemplates>['addChecklistTemplate'],
  addChecklist: ReturnType<typeof useChecklist>['addChecklist']
) => {
  const {
    startedAt,
    selectedTime,
    selectedRecords,
    selectedColor,
    selectedIcon,
    checklistText,
    shortDescription,
    weeklyHobbies,
    fieldGroups,
    tags,
    noEndDate,
  } = formData;

  // CreateChecklistForm's own initialValues already defaults this to today, but a cleared date
  // input (DatePicker's own onChange can hand back '') would otherwise reach here as an empty
  // string — Checklist.startedAt isn't optional, and calculateRepeat only defaults its own
  // startedAt on the *repeat* branch below, never on the one-off `addChecklist` branch further
  // down. Defaulting here, once, guarantees every write below always sends an explicit date
  // rather than leaning on a nested default that doesn't cover both branches.
  //
  // `startedAt` itself always arrives as a full ISO instant already — every producer of
  // `FormState.startedAt` (CreateChecklistForm/create-task-modal's "today" default,
  // AddInlineTask's own selected-date default, SchedulingGroup's DatePicker onChange) converts a
  // bare `yyyy-MM-dd` to ISO the moment it's picked (see @dreamer/global's
  // `localDateStringToISO`), so there's nothing left to convert here.
  const effectiveStartedAt = startedAt || new Date().toISOString();

  // "No weekly hobbies selected" is still what makes this a forever task (a one-off Checklist row
  // below, not a recurring template) — that decision stays on `weeklyHobbies.length`, not on
  // whether `repeat` itself is set.
  const isRecurring = !!weeklyHobbies && weeklyHobbies.length > 0;

  // Every new template gets a `repeats` row from the moment it's created now, even a forever one
  // — otherwise `checklist-templates` never saw a `startedAt` at all for that shape, only the
  // one-off `checklists` row below did (see ChecklistGenericInfo's own Start Date row, which
  // reads this same field). `byday: ''` here reads as "not scheduled" everywhere that already
  // checks it (getEffectiveDayOfWeek/getChecklistTemplateIdsByGivingDate), same as `repeat` being
  // `undefined` used to — so this still never counts as a recurring schedule.
  const repeat = isRecurring
    ? calculateRepeat({ weeklyHobbies, selectedTime, startedAt: effectiveStartedAt })
    : {
        startedAt: effectiveStartedAt,
        byhour: '',
        byminute: '',
        byday: '',
        timezone: getClientTimezone(),
        // Explicit, not just implied by the empty `byday` above — a forever/one-off task is
        // exactly the "one-time arrangement" case `recurring` exists for (see
        // rruleUtils.ts's `occursInRange`), not the default `true` an absent value would read as.
        //
        // Deliberately never `until`/`count` here for "Single day" — those are the *same* fields
        // ChecklistGenericInfo's Schedule dialog (Start/End Date and "how often" merged into one —
        // see that file's own comments) reads/writes and silently re-applies on every save. A `until`
        // set here at creation time would still be sitting on the template the next time the user
        // opens the Schedule dialog to actually turn this into a real weekly recurrence — and get
        // silently re-applied, capping the brand new pattern to zero real occurrences (reported:
        // "single day... but having schedule... does not repeat"). "Single day" vs. "No end date"
        // is expressed purely on the one-off Checklist row below (`endedDate` set or not)
        // instead — see useChecklists.tsx's `computeChecklistsForDate`, which reads that row,
        // never `repeat`, to decide whether this template keeps generating further days.
        recurring: false,
      };

  // A forever/one-off task's single Checklist instance is seeded in the *same* `POST
  // /checklist-templates` request as the template itself, not a separate follow-up call — see
  // useChecklistTemplateMutations.ts's `addChecklistTemplate` `seedChecklist` param and the edge
  // function's own comment. That means this id has to be picked up front (normally
  // addChecklistTemplate mints its own), so both the network payload and the local `addChecklist`
  // mirror call below agree on it.
  const templateId = uuidv4();
  const checklistSeed: Checklist | undefined = isRecurring
    ? undefined
    : {
        id: uuidv4(),
        title: checklistText,
        checklistTemplateId: templateId,
        startedAt: effectiveStartedAt,
        // `noEndDate` is a real three-way signal, not a plain boolean default: `false` (a caller
        // that offers the choice and defaults it to "Single day," e.g. AddInlineTask) means this
        // task runs for exactly 1 day from its own start — whatever day that is, not necessarily
        // today (see AddInlineTask's own `date` prop), so its last day is that same start day —
        // `endOfDay`, not the same instant as `startedAt` (already that day's own start-of-day —
        // see `localDateStringToISO`), so the two aren't identical timestamps for a same-day
        // range; `undefined` (every caller that doesn't offer this choice yet —
        // CreateChecklistForm, create-task-modal) keeps the old behavior of no defined end at
        // all, same as `true` (explicitly "no end date").
        endedDate: noEndDate === false ? endOfDay(new Date(effectiveStartedAt)).toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      };

  // addChecklistTemplate's own optimistic write (into the template query cache) happens
  // synchronously within this call, same as always — no `await saved` needed here any more (the
  // FK-ordering race that used to require it is now avoided server-side, sequential awaits inside
  // one request — see the edge function's own comment) or anywhere below, since a quiet write's
  // own promise never actually surfaces an error to catch either way.
  const { id } = addChecklistTemplate(
    {
      id: templateId,
      title: checklistText,
      shortDescription,
      repeat,
      avatar: {
        type: 'icon',
        name: selectedIcon,
        color: selectedColor,
      },
      records: selectedRecords || [], // Default empty array since RecordTaskSetting is commented out
      fieldGroups: fieldGroups || [], // Default empty array since RecordTaskSetting is commented out
      tags,
    },
    true, // keepId — the checklist seed above already committed to this exact template id
    checklistSeed,
  );

  // The network write already went out above (bundled into the template's own request) — this is
  // just mirroring the same row into this store's local optimistic state, same as
  // addChecklistTemplate's own write did for the template a few lines up.
  if (checklistSeed) {
    addChecklist(checklistSeed, { skipNetwork: true });
  }

  return { id };
};
