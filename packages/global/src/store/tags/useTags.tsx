import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
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

const TAG_KEY = 'tag';

export type Tag = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// Fetched once per identity ("all mine" — no consumer narrows this today),
// not unconditionally on mount. Same shape as useFlag.tsx's `fetchedFor`.
const fetchedFor = new Set<string | undefined>();

export const useTags = () => {
  const [tags, setTags] = useSessionStore<Record<string, Tag>>(TAG_KEY, {});
  const { userId, ready } = useSession();

  const addTag = React.useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    // Check if tag already exists
    const existingTag = Object.values(tags).find(
      tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingTag) return existingTag;

    const now = new Date().toISOString();
    const newTag: Tag = {
      id: v4(),
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
    };

    setTags(prev => ({ ...prev, [newTag.id]: newTag }));
    saveTag(newTag);

    return newTag;
  }, [tags, setTags]);

  const removeTag = React.useCallback((id: string) => {
    setTags(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    removeTagApi(id);
  }, [setTags]);

  const updateTag = React.useCallback((id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    let updated: Tag | null = null;
    setTags(prev => {
      if (!prev[id]) return prev;
      updated = { ...prev[id], name: trimmedName, updatedAt: new Date().toISOString() };
      return { ...prev, [id]: updated };
    });
    if (updated) saveTag(updated);
  }, [setTags]);

  const getAllTags = React.useCallback(() => {
    if (ready && !fetchedFor.has(userId)) {
      fetchedFor.add(userId);
      fetchTags().then(result => {
        if (!result) {
          fetchedFor.delete(userId);
          return;
        }
        if (!result.tags.length) return;
        setTags(prev => {
          const merged = { ...prev };
          let changed = false;
          for (const tag of result.tags) {
            const existing = merged[tag.id];
            // Last-write-wins by `updatedAt` — cheap safety even though a
            // direct scoped fetch makes a real conflict rare.
            if (!existing || new Date(tag.updatedAt) > new Date(existing.updatedAt)) {
              merged[tag.id] = tag;
              changed = true;
            }
          }
          return changed ? merged : prev;
        });
      });
    }
    return Object.values(tags).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [tags, userId, ready, setTags]);

  const getTagById = React.useCallback((id: string) => {
    return tags[id];
  }, [tags]);

  const searchTags = React.useCallback((query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return getAllTags();

    return getAllTags().filter(tag =>
      tag.name.toLowerCase().includes(trimmedQuery)
    );
  }, [getAllTags]);

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
