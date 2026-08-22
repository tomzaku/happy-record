import { useLocalStorage } from '../../hook/useLocalStorage';
import { useSyncOncePerIdentity, type SyncState } from '../../hook/useSyncOncePerIdentity';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own useLocalStorage state is the fallback, unchanged.
import { fetchProStatus } from './proApi';

const PRO_STATUS_KEY = 'pro_status';

export type ProStatus = {
  isPro: boolean;
  isTrial: boolean;
  proExpiresAt: string | null;
};

const DEFAULT_PRO_STATUS: ProStatus = {
  isPro: false,
  isTrial: false,
  proExpiresAt: null,
};

// Shared across every mounted instance of this store — see useSyncOncePerIdentity.
const proStatusSyncState: SyncState = { current: null };

/**
 * Pro entitlement — see CLAUDE.md and supabase/migrations/*_pro_users.sql.
 * There's no self-serve upgrade: a `pro_users` row is granted by hand (SQL
 * editor) or by the signup trial trigger, never by this app. This hook only
 * ever reads it, via `useSyncOncePerIdentity` directly (not
 * `useSyncedCollection` — this is one status object, not a keyed
 * collection), the same way `checklist-templates` does.
 *
 * `proExpiresAt` is re-checked against `Date.now()` on every call rather
 * than trusted as whatever the last sync fetched — a trial that was active
 * at last sync may have lapsed since, and this is the one place that
 * actually matters for it.
 */
export const useIsPro = () => {
  const [status, setStatus] = useLocalStorage<ProStatus>(PRO_STATUS_KEY, DEFAULT_PRO_STATUS);

  useSyncOncePerIdentity(proStatusSyncState, async () => {
    const result = await fetchProStatus();
    if (!result) return false;
    setStatus(result);
    return true;
  });

  const isPro =
    status.isPro && (!status.proExpiresAt || new Date(status.proExpiresAt) > new Date());

  return {
    isPro,
    isTrial: isPro && status.isTrial,
    proExpiresAt: status.proExpiresAt,
  };
};
