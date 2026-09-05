import { act, renderHook, waitFor } from '@testing-library/react';

// Regression for "taking a challenge doesn't seem to call the participant
// API": confirmTakeIt() calls acceptChallenge (→ POST /challenge-participants)
// for any link that has a challenge row at all (isChallenge = !!challenge —
// every challenge shares everyone's check-ins now, there's no
// sharing/comments toggle left to gate joining on); only a link with no
// challenge row falls back to forking a private copy. These tests pin that
// branching down.

// `mock`-prefixed so jest.mock's hoisted factories are allowed to close
// over them — see useChecklists.test.tsx's own comment on this convention.
let mockChallenge: {
  id: string;
  shareRecords: boolean;
  commentsEnabled: boolean;
  theme: string;
  backgroundImageUrl: string | null;
} | null = null;
let mockIsAnonymous = false;
const mockNavigate = jest.fn();
const mockAcceptChallenge = jest.fn().mockResolvedValue({ id: 'joined-template-1' });
const mockAddChecklistTemplate = jest.fn();
let mockMyChecklistTemplates: Record<string, unknown> = {};
const mockSavePendingChallengeJoin = jest.fn();
const mockSignInWithGoogle = jest.fn().mockResolvedValue(undefined);
const mockGetRecordFieldsByIds = jest.fn().mockResolvedValue([]);
const mockMergeRecordFields = jest.fn();
const mockGetChecklistTemplateOnly = jest
  .fn()
  .mockResolvedValue({ id: 'template-1', title: 'Gym', fieldGroups: [], records: [], tags: [] });
const mockGetFieldsAndGroups = jest.fn().mockResolvedValue({ fields: [], fieldGroups: [] });

jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'template-1' }),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => mockNavigate,
}));

jest.mock('@dreamer/global', () => ({
  useChallenge: () => ({ getChallengeForTemplate: () => mockChallenge }),
  useChecklistTemplates: () => ({
    addChecklistTemplate: mockAddChecklistTemplate,
    checklistTemplate: mockMyChecklistTemplates,
  }),
  useJoinChallenge: () => ({ acceptChallenge: mockAcceptChallenge }),
  usePendingChallengeJoin: () => ({ savePendingChallengeJoin: mockSavePendingChallengeJoin }),
  useSession: () => ({
    isAnonymous: mockIsAnonymous,
    signInWithGoogle: mockSignInWithGoogle,
    displayName: 'Tri',
    avatarUrl: undefined,
  }),
}));

jest.mock('@dreamer/global/src/store/record-field', () => ({
  useRecordField: () => ({
    getRecordFieldsByIds: mockGetRecordFieldsByIds,
    mergeRecordFields: mockMergeRecordFields,
  }),
}));

jest.mock('@dreamer/global/src/hook/checklist-template/useGetChecklistTemplateApi', () => ({
  useGetChecklistTemplateApi: () => ({
    getChecklistTemplateOnly: mockGetChecklistTemplateOnly,
    getFieldsAndGroups: mockGetFieldsAndGroups,
  }),
}));

import { useChecklistTemplateSharedPage } from './useChecklistTemplateSharedPage';

beforeEach(() => {
  mockChallenge = null;
  mockIsAnonymous = false;
  mockNavigate.mockClear();
  mockAcceptChallenge.mockClear();
  mockAddChecklistTemplate.mockClear();
  mockMyChecklistTemplates = {};
  mockSavePendingChallengeJoin.mockClear();
  mockSignInWithGoogle.mockClear();
  mockGetRecordFieldsByIds.mockClear();
  mockGetChecklistTemplateOnly.mockClear();
  mockGetFieldsAndGroups.mockClear();
});

describe('confirmTakeIt — challenge join vs. plain fork', () => {
  it('calls acceptChallenge (the only call that hits POST /challenge-participants) whenever the link has a challenge row', async () => {
    mockChallenge = { id: 'challenge-1', shareRecords: true, commentsEnabled: false, theme: 'classic', backgroundImageUrl: null };

    const { result } = renderHook(() => useChecklistTemplateSharedPage());
    expect(result.current.isChallenge).toBe(true);

    await act(async () => {
      await result.current.confirmTakeIt();
    });

    expect(mockAcceptChallenge).toHaveBeenCalledWith('template-1', 'challenge-1', 'Tri', undefined);
    expect(mockAddChecklistTemplate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/task/joined-template-1?currentDay='));
  });

  it('still calls acceptChallenge even for a legacy challenge row with both flags off', async () => {
    // Old data from before every challenge shared everyone's check-ins by
    // default — joining must not silently degrade to a plain fork for these.
    mockChallenge = { id: 'challenge-2', shareRecords: false, commentsEnabled: false, theme: 'classic', backgroundImageUrl: null };

    const { result } = renderHook(() => useChecklistTemplateSharedPage());
    expect(result.current.isChallenge).toBe(true);

    await act(async () => {
      await result.current.confirmTakeIt();
    });

    expect(mockAcceptChallenge).toHaveBeenCalledWith('template-1', 'challenge-2', 'Tri', undefined);
    expect(mockAddChecklistTemplate).not.toHaveBeenCalled();
  });

  it('forks a private copy when the shared link has no associated challenge row at all', async () => {
    mockChallenge = null;

    const { result } = renderHook(() => useChecklistTemplateSharedPage());
    expect(result.current.isChallenge).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.confirmTakeIt();
    });

    expect(mockAcceptChallenge).not.toHaveBeenCalled();
    expect(mockAddChecklistTemplate).toHaveBeenCalledTimes(1);
  });

  it('an anonymous session defers through Google sign-in instead of calling acceptChallenge directly', async () => {
    mockChallenge = { id: 'challenge-4', shareRecords: true, commentsEnabled: false, theme: 'classic', backgroundImageUrl: null };
    mockIsAnonymous = true;

    const { result } = renderHook(() => useChecklistTemplateSharedPage());

    await act(async () => {
      await result.current.confirmTakeIt();
    });

    expect(mockSavePendingChallengeJoin).toHaveBeenCalledWith({
      challengeId: 'challenge-4',
      checklistTemplateId: 'template-1',
    });
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    expect(mockAcceptChallenge).not.toHaveBeenCalled();
  });
});
