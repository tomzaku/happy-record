import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export const useTags = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = tagsKeys.list(userId);

  // Backed by React Query's own cache instead of useSessionStore — no more hand-rolled
  // "have I already fetched this identity" Set (see git history for the old shape): the query
  // key itself is that dedup, shared across every mounted consumer. `staleTime: Infinity` keeps
  // this "fetch once per identity" like the code it replaces, rather than React Query's default
  // refetch-on-refocus — a background refetch would otherwise race an optimistic `addTag`/
  // `updateTag` below and silently overwrite it with the pre-write server response.
  const { data: tags = {} } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchTags();
      if (!result) throw new Error('Failed to fetch tags');
      const map: Record<string, Tag> = {};
      for (const tag of result.tags) map[tag.id] = tag;
      return map;
    },
    enabled: ready && !!userId,
    staleTime: Infinity,
  });

  // Every write below is optimistic against the query cache directly (`setQueryData`) with no
  // rollback on failure — same "quiet call, local state is the fallback" rule as everywhere else
  // in this app (see CLAUDE.md's "online-first").
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

      queryClient.setQueryData<Record<string, Tag>>(queryKey, prev => ({
        ...prev,
        [newTag.id]: newTag,
      }));
      saveTag(newTag);

      return newTag;
    },
    [tags, queryClient, queryKey],
  );

  const removeTag = React.useCallback(
    (id: string) => {
      queryClient.setQueryData<Record<string, Tag>>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      removeTagApi(id);
    },
    [queryClient, queryKey],
  );

  const updateTag = React.useCallback(
    (id: string, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      let updated: Tag | null = null;
      queryClient.setQueryData<Record<string, Tag>>(queryKey, prev => {
        if (!prev?.[id]) return prev;
        updated = { ...prev[id], name: trimmedName, updatedAt: new Date().toISOString() };
        return { ...prev, [id]: updated };
      });
      if (updated) saveTag(updated);
    },
    [queryClient, queryKey],
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
