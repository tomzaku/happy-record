import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetMediaUrl = jest.fn();

jest.mock('./mediaApi', () => ({
  getMediaUrl: (...args: unknown[]) => mockGetMediaUrl(...args),
}));

import { useMediaUrl } from './useMediaUrl';

const createWrapper = () => {
  // No retries — useMediaUrl.ts itself sets `retry: false` for this query, but pin it here too
  // so a test failure clearly points at that setting if it ever regresses.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('returns null/not-loading/no-error when there is no id at all', () => {
  const { result } = renderHook(() => useMediaUrl(undefined), { wrapper: createWrapper() });

  expect(result.current).toEqual({ url: null, isLoading: false, error: false });
  expect(mockGetMediaUrl).not.toHaveBeenCalled();
});

it('resolves the url once the fetch lands', async () => {
  mockGetMediaUrl.mockResolvedValue({
    id: 'media-1',
    kind: 'photo',
    mimeType: 'image/png',
    sizeBytes: 100,
    createdAt: 'now',
    expiresAt: 'later',
    url: 'https://example.com/media-1.png',
  });

  const { result } = renderHook(() => useMediaUrl('media-1'), { wrapper: createWrapper() });

  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.url).toBe('https://example.com/media-1.png'));
  expect(result.current.error).toBe(false);
  expect(mockGetMediaUrl).toHaveBeenCalledWith('media-1');
});

it('reports error (not a broken loading state) when the fetch fails, with no retry', async () => {
  mockGetMediaUrl.mockResolvedValue(null);

  const { result } = renderHook(() => useMediaUrl('media-missing'), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.url).toBeNull();
  expect(result.current.isLoading).toBe(false);
  // Only the one call — no retry loop for what's usually a permanent failure
  // (expired/deleted/inaccessible), not a transient network blip.
  expect(mockGetMediaUrl).toHaveBeenCalledTimes(1);
});

it("doesn't refetch a still-fresh id across remounts (the TTL cache)", async () => {
  mockGetMediaUrl.mockResolvedValue({
    id: 'media-2',
    kind: 'photo',
    mimeType: 'image/png',
    sizeBytes: 100,
    createdAt: 'now',
    expiresAt: 'later',
    url: 'https://example.com/media-2.png',
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const first = renderHook(() => useMediaUrl('media-2'), { wrapper });
  await waitFor(() => expect(first.result.current.url).toBe('https://example.com/media-2.png'));
  first.unmount();

  const second = renderHook(() => useMediaUrl('media-2'), { wrapper });
  // Already cached from the first mount — no loading flash, no second fetch.
  expect(second.result.current.url).toBe('https://example.com/media-2.png');
  expect(second.result.current.isLoading).toBe(false);
  expect(mockGetMediaUrl).toHaveBeenCalledTimes(1);
});
