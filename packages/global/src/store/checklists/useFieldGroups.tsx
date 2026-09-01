import React from 'react';
import { v4 } from 'uuid';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { normalizeFieldGroupFields, type FieldGroup, type FieldGroupField } from './useChecklistTemplates';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { fetchFieldGroups, patchFieldGroupRepeat, saveFieldGroup } from './fieldGroupsApi';

const FIELD_GROUP_KEY = 'field_group';

// Fetched by whatever scope is actually asked for — one template's own groups (detail-task-page,
// which already knows the exact checklistTemplateId from the URL) or "all mine" (the home page's
// own schedule-matching, which needs every selected template's own groups loaded at once — see
// useChecklistTemplates.tsx's getChecklistTemplateIdsByGivingDate) — never unconditionally on
// mount. Keyed so the same (identity, scope) tuple isn't re-fetched every call within a page load.
const fetchedScopes = new Set<string>();
const ALL_SCOPE = '__all__';

/**
 * A real table now (`field_groups`), not jsonb embedded in `checklist_templates.field_groups` —
 * see 20260829010000_notes_note_id_ownership.sql. Flat store keyed by group id, same shape
 * `checklist-record`'s own store uses — `useChecklistTemplates.tsx`'s own `getChecklistTemplate`/
 * `getRecommendChecklistTemplates` merge this store's `getFieldGroups(templateId)` onto the
 * returned template's `.fieldGroups` so every read-only consumer of that field keeps working
 * unchanged; only a write needs to reach for this hook directly.
 */
export const useFieldGroups = () => {
  const [fieldGroupList, setFieldGroupList] = useSessionStore<Record<string, FieldGroup>>(
    FIELD_GROUP_KEY,
    {},
  );
  const { userId, ready } = useSession();

  // A row saved before FieldGroupField existed still has `fields` as plain id strings — see
  // normalizeFieldGroupFields' own comment. Every fetch path (one template, all mine) funnels
  // through here, so this is the one place that needs to know that.
  const mergeFieldGroups = React.useCallback(
    (groups: FieldGroup[]) => {
      if (!groups.length) return;
      const normalized = groups.map(group => ({
        ...group,
        fields: normalizeFieldGroupFields(group.fields as unknown as (string | FieldGroupField)[]),
      }));
      setFieldGroupList(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const group of normalized) {
          const existing = merged[group.id];
          // Last-write-wins by `updatedAt` — cheap safety even though a direct scoped fetch
          // makes a real conflict rare. `>=`, not `>`: a group's own `repeat` comes from a
          // separate `repeats` row (see field-groups-dto.ts's own toFieldGroup) whose write
          // doesn't touch this row's `updated_at` at all — a challenge participant's schedule
          // seeded at join time (challenge-participants-service.ts's own seedReminderFromOwner)
          // or set via the group's own menu are exactly this: the *only* thing that changed is
          // `repeat`, so an incoming fetch can tie the cached `updatedAt` exactly while still
          // carrying materially different data. A strict `>` would keep discarding that forever.
          if (!existing || new Date(group.updatedAt) >= new Date(existing.updatedAt)) {
            merged[group.id] = group;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    },
    [setFieldGroupList],
  );

  /** One template's own groups (active + archived — callers filter via getActiveFieldGroups),
   * ordered by `position`. Skips its own fetch once "all mine" has already covered every
   * template (see ensureAllFieldGroupsFetched) — called in a loop over many templates
   * (getRecommendChecklistTemplates/getChecklistTemplateIdsByGivingDate), this would otherwise
   * fire one redundant per-template request on top of the single unscoped one. */
  const getFieldGroups = React.useCallback(
    (checklistTemplateId: string): FieldGroup[] => {
      const scopeKey = JSON.stringify({ userId, checklistTemplateId });
      const allScopeKey = JSON.stringify({ userId, scope: ALL_SCOPE });
      if (ready && checklistTemplateId && !fetchedScopes.has(scopeKey) && !fetchedScopes.has(allScopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchFieldGroups({ checklistTemplateId }).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
            return;
          }
          mergeFieldGroups(result.fieldGroups);
        });
      }
      return Object.values(fieldGroupList)
        .filter(group => group.checklistTemplateId === checklistTemplateId)
        .sort((a, b) => a.position - b.position);
    },
    [fieldGroupList, userId, ready, mergeFieldGroups],
  );

  /**
   * Same as getFieldGroups, but never short-circuited by "all mine" already being fetched — a
   * joined challenge's field groups are the *owner's* own rows, which "all mine"
   * (`listMyFieldGroups`, own templates only — see field-groups/api/list-field-groups-handler.ts)
   * never includes. Exactly the same "own + public only can't resolve a participant's template"
   * gap CLAUDE.md documents for `fields`' own `getRecordFieldsByTemplateId` — detail-task-page
   * calls this unconditionally for whatever template it's showing (a no-op re-fetch for the
   * caller's own template, already covered by "all mine") instead of relying on `getFieldGroups`
   * alone, which is what left a challenge participant seeing "No groups created" on the owner's
   * real template.
   */
  const getFieldGroupsByTemplateId = React.useCallback(
    (checklistTemplateId: string): FieldGroup[] => {
      const scopeKey = JSON.stringify({ userId, checklistTemplateId });
      if (ready && checklistTemplateId && !fetchedScopes.has(scopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchFieldGroups({ checklistTemplateId }).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
            return;
          }
          mergeFieldGroups(result.fieldGroups);
        });
      }
      return Object.values(fieldGroupList)
        .filter(group => group.checklistTemplateId === checklistTemplateId)
        .sort((a, b) => a.position - b.position);
    },
    [fieldGroupList, userId, ready, mergeFieldGroups],
  );

  /** Every group across every one of the caller's templates, unscoped — see
   * getChecklistTemplateIdsByGivingDate's own need for this in useChecklistTemplates.tsx. */
  const ensureAllFieldGroupsFetched = React.useCallback(() => {
    const scopeKey = JSON.stringify({ userId, scope: ALL_SCOPE });
    if (!ready || fetchedScopes.has(scopeKey)) return;
    fetchedScopes.add(scopeKey);
    fetchFieldGroups().then(result => {
      if (!result) {
        fetchedScopes.delete(scopeKey);
        return;
      }
      mergeFieldGroups(result.fieldGroups);
    });
  }, [userId, ready, mergeFieldGroups]);

  const addFieldGroup = (group: Omit<FieldGroup, 'id' | 'updatedAt'> & { id?: string }): FieldGroup => {
    const id = group.id ?? v4();
    const newGroup: FieldGroup = { ...group, id, updatedAt: new Date().toISOString() };
    setFieldGroupList(prev => ({ ...prev, [id]: newGroup }));
    saveFieldGroup(newGroup);
    return newGroup;
  };

  /** One row, no index bookkeeping — replaces the old whole-array splice
   * (`ChecklistFieldGroup.tsx`'s own `updateFieldGroupAt`). */
  const updateFieldGroup = (group: FieldGroup): FieldGroup => {
    const updated: FieldGroup = { ...group, updatedAt: new Date().toISOString() };
    setFieldGroupList(prev => ({ ...prev, [updated.id]: updated }));
    saveFieldGroup(updated);
    return updated;
  };

  const archiveFieldGroup = (group: FieldGroup): FieldGroup =>
    updateFieldGroup({ ...group, archivedAt: new Date().toISOString() });

  /** A challenge participant's own override of one group's schedule — PATCH `/field-groups/:id
   * { repeat }`, never the owner's full-row `updateFieldGroup` above (which they can't write
   * anyway — see the edge function's own doc comment). `repeat: null` clears it back to
   * following the owner's. Optimistic, same as every other write here: updates the local copy
   * immediately, fires the request, doesn't await it. */
  const updateMyFieldGroupRepeat = (fieldGroupId: string, repeat: FieldGroup['repeat'] | null) => {
    setFieldGroupList(prev => {
      const existing = prev[fieldGroupId];
      if (!existing) return prev;
      return {
        ...prev,
        [fieldGroupId]: { ...existing, repeat: repeat ?? undefined, updatedAt: new Date().toISOString() },
      };
    });
    patchFieldGroupRepeat(fieldGroupId, repeat);
  };

  return {
    fieldGroupList,
    getFieldGroups,
    getFieldGroupsByTemplateId,
    ensureAllFieldGroupsFetched,
    updateMyFieldGroupRepeat,
    addFieldGroup,
    updateFieldGroup,
    archiveFieldGroup,
    mergeFieldGroups,
  };
};
