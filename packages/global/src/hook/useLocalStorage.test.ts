import { act, renderHook } from '@testing-library/react';

import { useLocalStorage } from './useLocalStorage';

// useLocalStorage caches one Zustand store per key for the life of the
// module (see storeCache in useLocalStorage.ts), so every test uses its own
// key — reusing one would leak state (and a stale `initialValue` read)
// across tests.
let key = 0;
const nextKey = () => `test-key-${++key}`;

beforeEach(() => {
  window.localStorage.clear();
});

it('starts from initialValue when nothing is stored yet', () => {
  const { result } = renderHook(() => useLocalStorage(nextKey(), 'default'));

  expect(result.current[0]).toBe('default');
});

it('reads a value already in localStorage instead of initialValue', () => {
  const storageKey = nextKey();
  window.localStorage.setItem(storageKey, JSON.stringify('stored'));

  const { result } = renderHook(() => useLocalStorage(storageKey, 'default'));

  expect(result.current[0]).toBe('stored');
});

it('persists writes to localStorage and updates the returned value', () => {
  const storageKey = nextKey();
  const { result } = renderHook(() => useLocalStorage(storageKey, 'default'));

  act(() => {
    result.current[1]('updated');
  });

  expect(result.current[0]).toBe('updated');
  expect(window.localStorage.getItem(storageKey)).toBe(JSON.stringify('updated'));
});

it('supports the functional updater form, seeing the latest value', () => {
  const storageKey = nextKey();
  const { result } = renderHook(() => useLocalStorage<number>(storageKey, 1));

  act(() => {
    result.current[1](prev => prev + 1);
  });

  expect(result.current[0]).toBe(2);
});

it('shares one store across every hook instance using the same key', () => {
  const storageKey = nextKey();
  const a = renderHook(() => useLocalStorage(storageKey, 'default'));
  const b = renderHook(() => useLocalStorage(storageKey, 'default'));

  act(() => {
    a.result.current[1]('from-a');
  });

  expect(b.result.current[0]).toBe('from-a');
});

it('storeOnMount seeds localStorage with initialValue on first read', () => {
  const storageKey = nextKey();

  renderHook(() => useLocalStorage(storageKey, 'seeded', { storeOnMount: true }));

  expect(window.localStorage.getItem(storageKey)).toBe(JSON.stringify('seeded'));
});
