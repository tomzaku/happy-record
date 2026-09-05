import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockUserId: string | undefined = 'user-pro-test';
let mockReady = true;
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: mockUserId, ready: mockReady }),
}));

const mockFetchProStatus = jest.fn();
jest.mock('./proApi', () => ({
  fetchProStatus: (...args: unknown[]) => mockFetchProStatus(...args),
}));

import { useIsPro } from './useProStatus';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'user-pro-test';
  mockReady = true;
});

it('defaults to not-pro before the fetch resolves', () => {
  mockFetchProStatus.mockResolvedValue({ isPro: true, isTrial: false, proExpiresAt: null });
  const { result } = renderHook(() => useIsPro(), { wrapper: createWrapper() });

  expect(result.current).toEqual({ isPro: false, isTrial: false, proExpiresAt: null });
});

it('reflects a real, non-expired pro row once fetched', async () => {
  mockFetchProStatus.mockResolvedValue({ isPro: true, isTrial: true, proExpiresAt: null });
  const { result } = renderHook(() => useIsPro(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isPro).toBe(true));
  expect(result.current.isTrial).toBe(true);
});

it('treats an expired proExpiresAt as not-pro, even though the row itself says isPro', async () => {
  mockFetchProStatus.mockResolvedValue({
    isPro: true,
    isTrial: true,
    proExpiresAt: '2000-01-01T00:00:00.000Z',
  });
  const { result } = renderHook(() => useIsPro(), { wrapper: createWrapper() });

  await waitFor(() => expect(mockFetchProStatus).toHaveBeenCalled());
  expect(result.current.isPro).toBe(false);
  // isTrial is derived from isPro (see useProStatus.tsx) — an expired trial isn't "trial" either.
  expect(result.current.isTrial).toBe(false);
});

it('reflects a still-active proExpiresAt as pro', async () => {
  mockFetchProStatus.mockResolvedValue({
    isPro: true,
    isTrial: false,
    proExpiresAt: '2999-01-01T00:00:00.000Z',
  });
  const { result } = renderHook(() => useIsPro(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isPro).toBe(true));
});

it('never fetches before the session is ready', () => {
  mockReady = false;
  renderHook(() => useIsPro(), { wrapper: createWrapper() });

  expect(mockFetchProStatus).not.toHaveBeenCalled();
});
