import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-challenge-test', ready: true }),
}));

const mockFetchChallengeForTemplate = jest.fn();
const mockSaveChallenge = jest.fn();

jest.mock('./challengesApi', () => ({
  fetchChallengeForTemplate: (...args: unknown[]) => mockFetchChallengeForTemplate(...args),
  fetchChallengeDashboard: jest.fn(),
  fetchMyChallenges: jest.fn(),
  saveChallenge: (...args: unknown[]) => mockSaveChallenge(...args),
}));

import { useChallenge, type Challenge } from './useChallenge';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const baseOptions = {
  shareRecords: true,
  commentsEnabled: true,
  fieldTargets: {},
  theme: 'classic' as const,
  backgroundImageUrl: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchChallengeForTemplate.mockResolvedValue({ challenge: null });
  mockSaveChallenge.mockResolvedValue({ ok: true });
});

describe('setChallengeOptions', () => {
  it('shows the optimistic challenge immediately, then the server copy once it lands', async () => {
    const saved: Challenge = {
      id: 'server-id',
      checklistTemplateId: 'template-1',
      ownerId: 'user-challenge-test',
      shareRecords: true,
      commentsEnabled: true,
      fieldTargets: {},
      theme: 'classic',
      backgroundImageUrl: null,
      createdAt: 'now',
      updatedAt: 'now',
    };
    mockSaveChallenge.mockResolvedValue({ challenge: saved });

    const { result } = renderHook(() => useChallenge(), { wrapper: createWrapper() });

    let returned!: Challenge;
    await act(async () => {
      returned = await result.current.setChallengeOptions('template-1', baseOptions);
    });

    expect(returned).toEqual(saved);
    await waitFor(() => expect(result.current.getChallengeForTemplate('template-1')).toEqual(saved));
  });

  it('rolls back and still resolves (to the optimistic value) if the save fails', async () => {
    mockSaveChallenge.mockResolvedValue(null);

    const { result } = renderHook(() => useChallenge(), { wrapper: createWrapper() });

    let returned!: Challenge;
    await act(async () => {
      returned = await result.current.setChallengeOptions('template-2', baseOptions);
    });

    expect(returned.checklistTemplateId).toBe('template-2');
    await waitFor(() => expect(result.current.getChallengeForTemplate('template-2')).toBeUndefined());
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine).
  it('rolls back only the challenge that failed to save, not a sibling written afterward', async () => {
    const { result } = renderHook(() => useChallenge(), { wrapper: createWrapper() });

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ challenge: Challenge }>();
    mockSaveChallenge.mockImplementation((challenge: { checklistTemplateId: string }) =>
      challenge.checklistTemplateId === 'template-bad' ? badSave.promise : goodSave.promise,
    );

    act(() => {
      result.current.setChallengeOptions('template-bad', baseOptions);
    });
    await waitFor(() =>
      expect(mockSaveChallenge).toHaveBeenCalledWith(expect.objectContaining({ checklistTemplateId: 'template-bad' })),
    );

    act(() => {
      result.current.setChallengeOptions('template-good', baseOptions);
    });
    await waitFor(() => expect(result.current.getChallengeForTemplate('template-good')).toBeDefined());

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.getChallengeForTemplate('template-bad')).toBeUndefined());
    expect(result.current.getChallengeForTemplate('template-good')).toBeDefined();

    act(() => {
      goodSave.resolve({
        challenge: {
          id: 'good-id',
          checklistTemplateId: 'template-good',
          ownerId: 'user-challenge-test',
          ...baseOptions,
          createdAt: 'now',
          updatedAt: 'now',
        },
      });
    });
  });
});

describe('getChallengeForTemplate', () => {
  it('fetches at most once per template, merging the result in when it lands', async () => {
    mockFetchChallengeForTemplate.mockResolvedValue({
      challenge: {
        id: 'challenge-1',
        checklistTemplateId: 'template-fetch',
        ownerId: 'owner-1',
        shareRecords: true,
        commentsEnabled: true,
        fieldTargets: {},
        theme: 'classic',
        backgroundImageUrl: null,
        createdAt: 'now',
        updatedAt: 'now',
      },
    });

    const { result } = renderHook(() => useChallenge(), { wrapper: createWrapper() });

    act(() => {
      result.current.getChallengeForTemplate('template-fetch');
    });
    act(() => {
      result.current.getChallengeForTemplate('template-fetch');
    });

    await waitFor(() => expect(result.current.getChallengeForTemplate('template-fetch')?.id).toBe('challenge-1'));
    expect(mockFetchChallengeForTemplate).toHaveBeenCalledTimes(1);
  });
});
