import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback. `tags` used to be a genuinely-local-only `useLocalStorage` key
// (per device), which is exactly why the home page's Filter by Tag dropdown
// couldn't list a tag that arrived any other way — synced down from another
// device, or off a shared/public template — even though the template itself
// really had it (`checklist_templates.tags`, a real synced column). Backing
// this by the same table fixes that: every device now sees the same
// registry, same as `flags`.
import { fetchTags, removeTag as removeTagApi, saveTag } from './tagsApi';
import { tagsKeys } from './tagsKeys';

export type Tag = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type TagsMap = Record<string, Tag>;
type RollbackContext = { previous: TagsMap | undefined };

export const useTags = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = tagsKeys.list(userId);

  // Backed by React Query's own cache instead of useSessionStore — no more hand-rolled
  // "have I already fetched this identity" Set (see git history for the old shape): the query
  // key itself is that dedup, shared across every mounted consumer. `staleTime: Infinity` keeps
  // this "fetch once per identity" like the code it replaces, rather than React Query's default
  // refetch-on-refocus — a background refetch would otherwise race an optimistic write below and
  // silently overwrite it with the pre-write server response before the mutation's own
  // `onSettled` refetch (which reconciles for real) gets a chance to run.
  const { data: tags = {} } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchTags();
      if (!result) throw new Error('Failed to fetch tags');
      const map: TagsMap = {};
      for (const tag of result.tags) map[tag.id] = tag;
      return map;
    },
    enabled: ready && !!userId,
    staleTime: Infinity,
  });

  // Canonical React Query optimistic-update shape (used by both `addTag` and `updateTag` below,
  // since the wire call for either is the same upsert): `onMutate` snapshots the cache before
  // writing so a failure has something to restore; `onError` rolls back to that snapshot instead
  // of leaving a write that never actually landed server-side sitting in the UI forever;
  // `onSettled` refetches regardless of outcome so the cache reconciles with the server's real
  // state. `saveTag` is "quiet" (resolves `null` instead of rejecting on failure) — `mutationFn`
  // turns that into a real rejection, since `onError` would otherwise never fire.
  const saveTagMutation = useMutation<{ ok: true }, Error, Tag, RollbackContext>({
    mutationFn: async tag => {
      const result = await saveTag(tag);
      if (!result) throw new Error('Failed to save tag');
      return result;
    },
    onMutate: async tag => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TagsMap>(queryKey);
      queryClient.setQueryData<TagsMap>(queryKey, prev => ({ ...prev, [tag.id]: tag }));
      return { previous };
    },
    onError: (_error, _tag, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeTagMutation = useMutation<{ ok: true }, Error, string, RollbackContext>({
    mutationFn: async id => {
      const result = await removeTagApi(id);
      if (!result) throw new Error('Failed to remove tag');
      return result;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TagsMap>(queryKey);
      queryClient.setQueryData<TagsMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addTag = React.useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const existingTag = Object.values(tags).find(
        tag => tag.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (existingTag) return existingTag;

      const now = new Date().toISOString();
      const newTag: Tag = {
        id: v4(),
        name: trimmedName,
        createdAt: now,
        updatedAt: now,
      };

      saveTagMutation.mutate(newTag);

      return newTag;
    },
    [tags, saveTagMutation],
  );

  const removeTag = React.useCallback(
    (id: string) => {
      removeTagMutation.mutate(id);
    },
    [removeTagMutation],
  );

  const updateTag = React.useCallback(
    (id: string, name: string) => {
      const trimmedName = name.trim();
      const existing = tags[id];
      if (!trimmedName || !existing) return;

      saveTagMutation.mutate({ ...existing, name: trimmedName, updatedAt: new Date().toISOString() });
    },
    [tags, saveTagMutation],
  );

  const getAllTags = React.useCallback(() => {
    return Object.values(tags).sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const getTagById = React.useCallback((id: string) => tags[id], [tags]);

  const searchTags = React.useCallback(
    (query: string) => {
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery) return getAllTags();

      return getAllTags().filter(tag => tag.name.toLowerCase().includes(trimmedQuery));
    },
    [getAllTags],
  );

  return {
    tags,
    addTag,
    removeTag,
    updateTag,
    getAllTags,
    getTagById,
    searchTags,
  };
};
