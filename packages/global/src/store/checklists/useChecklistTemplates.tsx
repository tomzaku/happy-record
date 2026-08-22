import { v4 } from 'uuid';
import React from 'react';
import { startOfDay } from 'date-fns';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { useSyncOncePerIdentity, type SyncState } from '../../hook/useSyncOncePerIdentity';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own useLocalStorage state is the fallback, unchanged.
import {
  fetchChecklistTemplates,
  patchChecklistTemplate,
  removeChecklistTemplate as removeChecklistTemplateApi,
  saveChecklistTemplate,
} from './checklistTemplatesApi';

const CHECKLIST_TEMPLATE_KEY = 'checklist_template';
const SELECTED_CHECKLISTS_TEMPLATE_KEY = 'selected_checklist_templates';

export type FieldGroup = {
  id: string;
  title: string;
  fields: string[];
  note: unknown;
  defaultTab?: number;
  activeTabs?: number[];
  collapseDefault?: boolean;
  /**
   * Which day(s)/time this group is actually due, independent of the template's own `repeat` —
   * a "Gym" template can show a Push group Mon/Thu and a Pull group Tue/Fri. Day/time only (no
   * `dayOfMonth`/`month`/`startedAt` — those live at the template level, where they're actually
   * used). Absent, or `dayOfWeek: '*'`, means "every day" — see scheduleUtils.ts's
   * `isFieldGroupActiveOnDay`. `fieldGroups` is jsonb end to end (see
   * supabase/functions/_shared/checklistTemplates.ts), so this needed no migration.
   */
  repeat?: {
    hour: string;
    minute: string;
    dayOfWeek: string;
  };
};
export type ChecklistTemplate = {
  id: string;
  title: string;
  repeat?: {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
    startedAt: string;
    completedAt?: string;
  };
  avatar: {
    type: string;
    name: string;
    color?: string;
  };
  createdAt: string;
  // @deprecated use groups instead
  records: string[];
  fieldGroups: FieldGroup[];
  tags: string[];
  visibility?: 'public' | 'private';
  /** One flag groups many templates ("Gym" for Push-ups + Pull-ups) — see packages/global/src/store/flag. */
  flagId?: string;
  updatedAt: string;
};

// Shared across every mounted instance of this store — see useSyncOncePerIdentity.
const checklistTemplatesSyncState: SyncState = { current: null };

/**
 * `fieldGroups` is one jsonb column, so a plain top-level diff of it is
 * all-or-nothing — every call site rebuilds the whole array even to change
 * one group's note (see ChecklistFieldGroup's onUpdateNote). This finds the
 * actual per-group diff so `updateChecklistTemplate` can send just what
 * changed in each group instead of every group's full config.
 *
 * Returns `full` when the group list itself changed shape (added, removed,
 * reordered) — there's no per-id diff to take there, it's a real replace.
 * Returns `patches` — one partial group per id that actually changed — the
 * rest of the time.
 */
function diffFieldGroups(
  next: FieldGroup[],
  prev: FieldGroup[],
): { full: FieldGroup[] } | { patches: (Partial<FieldGroup> & Pick<FieldGroup, 'id'>)[] } | null {
  if (JSON.stringify(next) === JSON.stringify(prev)) return null;

  const sameShape =
    next.length === prev.length && next.every((group, i) => group.id === prev[i]?.id);
  if (!sameShape) return { full: next };

  const patches: (Partial<FieldGroup> & Pick<FieldGroup, 'id'>)[] = [];
  next.forEach((group, i) => {
    const prevGroup = prev[i];
    if (JSON.stringify(group) === JSON.stringify(prevGroup)) return;
    const patch: Partial<FieldGroup> & Pick<FieldGroup, 'id'> = { id: group.id };
    for (const key of Object.keys(group) as (keyof FieldGroup)[]) {
      if (key === 'id') continue;
      if (JSON.stringify(group[key]) !== JSON.stringify(prevGroup[key])) {
        (patch as Record<string, unknown>)[key] = group[key];
      }
    }
    patches.push(patch);
  });
  return { patches };
}

export const useChecklistTemplates = () => {
  const [checklistTemplate, setChecklistTemplate] = useLocalStorage<
    Record<string, ChecklistTemplate>
  >(CHECKLIST_TEMPLATE_KEY, {});
  const [selectedChecklistTemplates, setSelectedChecklist] = useLocalStorage<
    string[]
  >(SELECTED_CHECKLISTS_TEMPLATE_KEY, []);

  useSyncOncePerIdentity(checklistTemplatesSyncState, async () => {
    const result = await fetchChecklistTemplates();

    const newIds: string[] = [];
    setChecklistTemplate(prev => {
      const merged = { ...prev };
      let changed = false;
      for (const template of result?.templates ?? []) {
        const existing = merged[template.id];
        // Last-write-wins by `updatedAt`, not "add if this device has never
        // seen it" — see useSyncedCollection's comment for why the latter
        // means an edit made on another device would never arrive here.
        // (`checklist-templates` doesn't use useSyncedCollection itself, but
        // follows the exact same rule.) `newIds` tracks only the genuinely
        // new ones — an LWW update to an id this device already knows about
        // still needs `changed = true` to actually stick, but it's not a
        // "first time seen" for the selectedChecklistTemplates step below.
        if (!existing || new Date(template.updatedAt) > new Date(existing.updatedAt)) {
          merged[template.id] = template;
          changed = true;
          if (!existing) newIds.push(template.id);
        }
      }
      // No built-in starter templates are seeded here — a first-time
      // account/device just starts with zero templates and adds its own.
      return changed ? merged : prev;
    });

    // `selectedChecklistTemplates` is local-only and never itself synced
    // (see CLAUDE.md) — a template landing here for the first time on this
    // device has never had a chance to be selected or deselected, so it
    // defaults in the same way creating one locally already does
    // (addChecklistTemplate). Without this, a synced-down template exists
    // in `checklistTemplate` but never actually shows up on the calendar:
    // getChecklistTemplateIdsByGivingDate filters by this list, not by
    // `checklistTemplate` itself.
    if (newIds.length) {
      setSelectedChecklist(prev => {
        const additions = newIds.filter(id => !prev.includes(id));
        return additions.length ? [...prev, ...additions] : prev;
      });
    }

    // Only a genuine fetch failure asks useSyncOncePerIdentity for a retry
    // — an empty-but-successful response is a settled, correct state, not
    // something to keep retrying.
    return !!result;
  });

  const addChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    },
    keepId = false,
  ) => {
    const id =
      keepId && currentChecklistTemplate.id
        ? currentChecklistTemplate.id
        : v4();
    const template: ChecklistTemplate = {
      ...currentChecklistTemplate,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChecklistTemplate({
      ...checklistTemplate,
      [id]: template,
    });
    updateSelectedChecklistTemplate([...selectedChecklistTemplates, id]);
    saveChecklistTemplate(template);
    return {
      id,
    };
  };

  const updateChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'createdAt' | 'updatedAt'>,
  ) => {
    const existing = checklistTemplate[currentChecklistTemplate.id];
    const template: ChecklistTemplate = {
      ...existing,
      ...currentChecklistTemplate,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChecklistTemplate({
      ...checklistTemplate,
      [currentChecklistTemplate.id]: template,
    });

    if (!existing) {
      // Nothing on the server yet for this id — this is really a create,
      // so it needs the full row, not a diff against nothing.
      saveChecklistTemplate(template);
      return;
    }

    // Only send the keys that actually changed — a full upsert here would
    // let this device's possibly-stale copy of an untouched field (say,
    // fieldGroups, while only editing a note) overwrite a newer write to
    // that field from elsewhere. See checklistTemplatesApi.ts.
    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(currentChecklistTemplate) as (keyof ChecklistTemplate)[]) {
      if (key === 'id' || key === 'fieldGroups') continue;
      if (JSON.stringify(currentChecklistTemplate[key]) !== JSON.stringify(existing[key])) {
        changes[key] = currentChecklistTemplate[key];
      }
    }

    // fieldGroups gets its own diff one level down — see diffFieldGroups.
    if ('fieldGroups' in currentChecklistTemplate) {
      const diff = diffFieldGroups(
        currentChecklistTemplate.fieldGroups,
        existing.fieldGroups ?? [],
      );
      if (diff && 'full' in diff) {
        changes.fieldGroups = diff.full;
      } else if (diff && diff.patches.length > 0) {
        changes.fieldGroupPatches = diff.patches;
      }
    }

    if (Object.keys(changes).length > 0) {
      patchChecklistTemplate(currentChecklistTemplate.id, changes);
    }
  };

  const deleteChecklistTemplate = (id: string) => {
    const newChecklistTemplate = { ...checklistTemplate };
    delete newChecklistTemplate[id];
    setChecklistTemplate(newChecklistTemplate);
    removeChecklistTemplateApi(id);
    // Also remove from selected templates if it was selected
    console.log("selectedChecklistTemplates", {
      selectedChecklistTemplates,
      id,
      newChecklistTemplate,
    })
    if (selectedChecklistTemplates.includes(id)) {
      updateSelectedChecklistTemplate(
        selectedChecklistTemplates.filter(templateId => templateId !== id),
      );
    }
  };

  const updateSelectedChecklistTemplate = (checklistIds: string[] = []) => {
    setSelectedChecklist(checklistIds);
  };

  const getRecommendChecklistTemplates = (): ChecklistTemplate[] => {
    return Object.values(checklistTemplate);
  };

  const getChecklistTemplateIdsByGivingDate = React.useCallback(
    ({ date }: { date: Date } = { date: new Date() }) => {
      return selectedChecklistTemplates.filter(checklistTemplateId => {
        const currentChecklistTemplate = checklistTemplate[checklistTemplateId];

        // A schedule's startedAt is the day it takes effect from — a day-of-week
        // match before that date is the template's history, not a day it was
        // ever actually scheduled to appear on.
        const startedAt = currentChecklistTemplate?.repeat?.startedAt;
        if (startedAt && date < startOfDay(new Date(startedAt))) {
          return false;
        }

        return (
          currentChecklistTemplate?.repeat?.dayOfWeek
            .split(',')
            .includes(date.getDay().toString()) ||
          currentChecklistTemplate?.repeat?.dayOfWeek === '*'
        );
      });
    },
    [selectedChecklistTemplates, checklistTemplate],
  );

  const getChecklistTemplate = React.useCallback(
    (id: string) => {
      return checklistTemplate[id];
    },
    [checklistTemplate],
  );

  return {
    checklistTemplate,
    getChecklistTemplate,
    addChecklistTemplate,
    updateChecklistTemplate,
    deleteChecklistTemplate,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
  };
};
