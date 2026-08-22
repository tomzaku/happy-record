import { v4 } from 'uuid';
import React from 'react';
import { startOfDay } from 'date-fns';
import { useLocalStorage } from '../../hook/useLocalStorage';

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
};

const common = {
  repeat: {
    minute: '0',
    hour: '8',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
    startedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  records: [],
  fieldGroups: [],
  tags: [],
};

const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: v4(),
    title: 'Drink water',
    ...common,
    avatar: {
      type: 'icon',
      name: 'mdi:water',
      color: '#00aaff',
    },
  },
  {
    id: v4(),
    title: 'Drink Orange juice',
    ...common,
    avatar: {
      type: 'icon',
      name: 'noto-v1:tropical-drink',
      color: '#ff9900',
    },
  },
  {
    id: v4(),
    title: 'Take vitamin supplement',
    ...common,
    avatar: {
      type: 'icon',
      name: 'game-icons:medicines',
      color: '#00ff00',
    },
  },
  {
    id: v4(),
    title: 'Eat fruits(banana, seeds) and vegetables',
    ...common,
    avatar: {
      type: 'icon',
      name: 'twemoji:pot-of-food',
      color: '#00aaff',
    },
  },
  {
    id: v4(),
    title: 'Exercise',
    ...common,
    avatar: {
      type: 'icon',
      name: 'healthicons:exercise-yoga-outline',
    },
  },
  {
    id: v4(),
    title: 'Sleep early',
    ...common,
    avatar: {
      type: 'icon',
      name: 'fxemoji:sleeping',
    },
  },
  {
    id: v4(),
    title: 'Drink milk',
    ...common,
    avatar: {
      type: 'icon',
      name: 'icon-park-outline:milk',
      color: '#ff9900',
    },
  },
];
const CHECKLIST_OBJECT = CHECKLIST_TEMPLATES.reduce(
  (acc, checklist) => ({
    ...acc,
    [checklist.id]: checklist,
  }),
  {},
);
// One flag for the whole page load — see the same guard in useRecordField.tsx.
let checklistTemplatesSynced = false;

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
  >(CHECKLIST_TEMPLATE_KEY, CHECKLIST_OBJECT, {
    storeOnMount: true,
  });
  const [selectedChecklistTemplates, setSelectedChecklist] = useLocalStorage<
    string[]
  >(SELECTED_CHECKLISTS_TEMPLATE_KEY, []);

  React.useEffect(() => {
    if (checklistTemplatesSynced) return;
    checklistTemplatesSynced = true;
    fetchChecklistTemplates().then(result => {
      if (!result) {
        checklistTemplatesSynced = false;
        return;
      }
      setChecklistTemplate(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const template of result.templates) {
          if (!merged[template.id]) {
            merged[template.id] = template;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    });
  }, []);

  const addChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id' | 'createdAt'> & {
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
    currentChecklistTemplate: Omit<ChecklistTemplate, 'createdAt'>,
  ) => {
    const existing = checklistTemplate[currentChecklistTemplate.id];
    const template: ChecklistTemplate = {
      ...existing,
      ...currentChecklistTemplate,
      createdAt: existing?.createdAt || new Date().toISOString(),
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
