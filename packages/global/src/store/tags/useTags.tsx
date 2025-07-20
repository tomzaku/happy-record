import React from 'react';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { v4 } from 'uuid';

const TAGS_KEY = 'tags';

export type Tag = {
  id: string;
  name: string;
  createdAt: string;
};

export const useTags = () => {
  const [tags, setTags] = useLocalStorage<Record<string, Tag>>(TAGS_KEY, {}, {
    storeOnMount: true,
  });

  const addTag = React.useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    // Check if tag already exists
    const existingTag = Object.values(tags).find(
      tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingTag) return existingTag;

    const newTag: Tag = {
      id: v4(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
    };

    setTags({
      ...tags,
      [newTag.id]: newTag,
    });

    return newTag;
  }, [tags, setTags]);

  const removeTag = React.useCallback((id: string) => {
    const newTags = { ...tags };
    delete newTags[id];
    setTags(newTags);
  }, [tags, setTags]);

  const updateTag = React.useCallback((id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setTags({
      ...tags,
      [id]: {
        ...tags[id],
        name: trimmedName,
      },
    });
  }, [tags, setTags]);

  const getAllTags = React.useCallback(() => {
    return Object.values(tags).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [tags]);

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