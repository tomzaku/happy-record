import { useSession } from './useSession';
import { useIsPro } from '../store/pro/useProStatus';

/**
 * Everything a component wants to know about who's currently signed in, in one call — identity
 * (from useSession) plus pro entitlement (from useIsPro), composed rather than merged: each stays
 * its own hook (useSession also owns signInWithGoogle/signOut/hasBackend; useIsPro owns the
 * pro-status query), this just saves every consumer that wants both from calling both.
 *
 * `firstName`/`lastName` are derived by splitting `fullName` on whitespace — Google's own OAuth
 * profile doesn't reliably expose separate given/family name fields through GoTrue's
 * `user_metadata` the way `full_name` itself is, so splitting the one name string this app
 * already reads is the more predictable source. `firstName` is the first token, `lastName` is
 * everything after it (so "Mary Jane Smith" splits to "Mary" / "Jane Smith", not "Mary" / "Smith")
 * — both `undefined` for a single-token or anonymous (no) name, same as `fullName` itself.
 */
export const useCurrentAccount = () => {
  const { userId, ready, isAnonymous, email, displayName, avatarUrl, signInWithGoogle, signOut, hasBackend } =
    useSession();
  const { isPro, isTrial, proExpiresAt } = useIsPro();

  const nameParts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const [firstName, ...rest] = nameParts;

  return {
    userId,
    ready,
    isAnonymous,
    email,
    fullName: displayName,
    firstName,
    lastName: rest.length ? rest.join(' ') : undefined,
    avatarUrl,
    isPro,
    isTrial,
    proExpiresAt,
    signInWithGoogle,
    signOut,
    hasBackend,
  };
};
