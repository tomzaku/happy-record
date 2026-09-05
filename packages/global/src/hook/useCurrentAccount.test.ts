import { renderHook } from '@testing-library/react';

const mockUseSession = jest.fn();
const mockUseIsPro = jest.fn();

jest.mock('./useSession', () => ({
  useSession: () => mockUseSession(),
}));
jest.mock('../store/pro/useProStatus', () => ({
  useIsPro: () => mockUseIsPro(),
}));

import { useCurrentAccount } from './useCurrentAccount';

const baseSession = {
  userId: 'user-1',
  ready: true,
  isAnonymous: false,
  email: 'me@example.com',
  displayName: undefined as string | undefined,
  avatarUrl: 'https://example.com/pic.png',
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  hasBackend: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSession.mockReturnValue(baseSession);
  mockUseIsPro.mockReturnValue({ isPro: false, isTrial: false, proExpiresAt: null });
});

it('splits a two-word display name into first/last', () => {
  mockUseSession.mockReturnValue({ ...baseSession, displayName: 'Jane Doe' });
  const { result } = renderHook(() => useCurrentAccount());

  expect(result.current.fullName).toBe('Jane Doe');
  expect(result.current.firstName).toBe('Jane');
  expect(result.current.lastName).toBe('Doe');
});

it('keeps every word after the first as the last name (not just the final token)', () => {
  mockUseSession.mockReturnValue({ ...baseSession, displayName: 'Mary Jane Smith' });
  const { result } = renderHook(() => useCurrentAccount());

  expect(result.current.firstName).toBe('Mary');
  expect(result.current.lastName).toBe('Jane Smith');
});

it('has no last name for a single-word display name', () => {
  mockUseSession.mockReturnValue({ ...baseSession, displayName: 'Madonna' });
  const { result } = renderHook(() => useCurrentAccount());

  expect(result.current.firstName).toBe('Madonna');
  expect(result.current.lastName).toBeUndefined();
});

it('has no name fields at all for an anonymous session (no displayName)', () => {
  const { result } = renderHook(() => useCurrentAccount());

  expect(result.current.fullName).toBeUndefined();
  expect(result.current.firstName).toBeUndefined();
  expect(result.current.lastName).toBeUndefined();
});

it('passes pro status and session fields through unchanged', () => {
  mockUseSession.mockReturnValue({ ...baseSession, displayName: 'Jane Doe' });
  mockUseIsPro.mockReturnValue({ isPro: true, isTrial: true, proExpiresAt: '2999-01-01T00:00:00.000Z' });

  const { result } = renderHook(() => useCurrentAccount());

  expect(result.current.isPro).toBe(true);
  expect(result.current.isTrial).toBe(true);
  expect(result.current.proExpiresAt).toBe('2999-01-01T00:00:00.000Z');
  expect(result.current.email).toBe('me@example.com');
  expect(result.current.avatarUrl).toBe('https://example.com/pic.png');
  expect(result.current.hasBackend).toBe(true);
});
