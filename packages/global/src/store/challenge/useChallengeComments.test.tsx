import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-comments-test', ready: true }),
}));

const mockFetchChallengeComments = jest.fn();
const mockPostChallengeCommentApi = jest.fn();

jest.mock('./challengeCommentsApi', () => ({
  fetchChallengeComments: (...args: unknown[]) => mockFetchChallengeComments(...args),
  postChallengeCommentApi: (...args: unknown[]) => mockPostChallengeCommentApi(...args),
}));

import { useChallengeComments } from './useChallengeComments';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchChallengeComments.mockResolvedValue({ comments: [] });
});

describe('getComments', () => {
  it('fetches at most once per challenge, merging the result in when it lands', async () => {
    mockFetchChallengeComments.mockResolvedValue({
      comments: [
        {
          id: 'c1',
          challengeId: 'challenge-1',
          userId: 'someone',
          displayName: 'Someone',
          body: 'hi',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    });

    const { result } = renderHook(() => useChallengeComments(), { wrapper: createWrapper() });

    act(() => {
      result.current.getComments('challenge-1');
    });
    act(() => {
      result.current.getComments('challenge-1');
    });

    await waitFor(() => expect(result.current.getComments('challenge-1')).toHaveLength(1));
    expect(mockFetchChallengeComments).toHaveBeenCalledTimes(1);
  });
});

describe('postComment', () => {
  // Not quiet: postChallengeCommentApi throws a real error on failure (unlike almost every other
  // write in this app — see its own comment), and this must propagate to the caller, not be
  // swallowed the way the "quiet" resources' writes are.
  it('rejects when the post fails, and never adds anything to the cache', async () => {
    mockPostChallengeCommentApi.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useChallengeComments(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.postComment('challenge-1', 'hello', 'Someone');
      }),
    ).rejects.toThrow('network down');

    expect(result.current.getComments('challenge-1')).toEqual([]);
  });

  it('appends the real posted comment once it succeeds', async () => {
    mockPostChallengeCommentApi.mockResolvedValue({
      comment: {
        id: 'c2',
        challengeId: 'challenge-2',
        userId: 'user-comments-test',
        displayName: 'Me',
        body: 'hello',
        createdAt: 'now',
        updatedAt: 'now',
      },
    });

    const { result } = renderHook(() => useChallengeComments(), { wrapper: createWrapper() });

    // Mirrors real usage: a thread is already open (and its own background fetch already
    // settled) before someone posts into it — otherwise posting a comment for a challenge
    // getComments has never been called for yet would race its own first background fetch,
    // which could overwrite the just-posted comment if that fetch resolves after (a real,
    // pre-existing edge case here, not something this migration changed).
    act(() => {
      result.current.getComments('challenge-2');
    });
    // Waits for the initial fetch's own cache write to actually land, not just for the mock to
    // have been called — otherwise that fetch's `.then()` can still be pending when `postComment`
    // appends below, and land afterward, wiping the just-posted comment back out with its own
    // (empty) result.
    await waitFor(() => expect(result.current.getComments('challenge-2')).toEqual([]));

    let posted;
    await act(async () => {
      posted = await result.current.postComment('challenge-2', 'hello', 'Me');
    });

    expect(posted).toEqual(expect.objectContaining({ id: 'c2', body: 'hello' }));
    await waitFor(() =>
      expect(result.current.getComments('challenge-2')).toEqual([expect.objectContaining({ id: 'c2' })]),
    );
  });
});
