import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { normalizeFieldGroupFields, type FieldGroup, type FieldGroupField } from './fieldGroupTypes';

export type FieldGroupsMap = Record<string, FieldGroup>;

// A row saved before FieldGroupField existed still has `fields` as plain id strings — every
// fetch path funnels through here.
export function toFieldGroupsMap(groups: FieldGroup[]): FieldGroupsMap {
  const map: FieldGroupsMap = {};
  for (const group of groups) {
    map[group.id] = {
      ...group,
      fields: normalizeFieldGroupFields(group.fields as unknown as (string | FieldGroupField)[]),
    };
  }
  return map;
}

// Writes unconditionally — creates the cache entry from nothing if it didn't exist. Used for the
// query most directly relevant to whoever's making the write (byTemplate).
export function writeGroup(queryClient: QueryClient, key: QueryKey, groupId: string, group: FieldGroup | undefined) {
  queryClient.setQueryData<FieldGroupsMap>(key, prev => {
    const next = { ...prev };
    if (group) next[groupId] = group;
    else delete next[groupId];
    return next;
  });
}

// Writes only if the cache already holds real data — a write shouldn't fabricate a "loaded" bulk
// cache if it was never fetched.
export function writeGroupIfPresent(queryClient: QueryClient, key: QueryKey, groupId: string, group: FieldGroup | undefined) {
  queryClient.setQueryData<FieldGroupsMap>(key, prev => {
    if (!prev) return prev;
    const next = { ...prev };
    if (group) next[groupId] = group;
    else delete next[groupId];
    return next;
  });
}
