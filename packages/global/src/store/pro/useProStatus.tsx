import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own state is the fallback, unchanged.
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

// Fetched once per identity, in memory only — see CLAUDE.md's "online-first"
// data layer. A single small read-only row, so this doesn't need the
// scoped-fetch-by-query-key pattern the keyed-collection resources use.
const fetchedFor = new Set<string | undefined>();

/**
 * Pro entitlement — see CLAUDE.md and supabase/migrations/*_pro_users.sql.
 * There's no self-serve upgrade: a `pro_users` row is granted by hand (SQL
 * editor) or by the signup trial trigger, never by this app. This hook only
 * ever reads it.
 *
 * `proExpiresAt` is re-checked against `Date.now()` on every call rather
 * than trusted as whatever the last fetch returned — a trial that was
 * active at last fetch may have lapsed since, and this is the one place
 * that actually matters for it.
 */
export const useIsPro = () => {
  const [status, setStatus] = useSessionStore<ProStatus>(PRO_STATUS_KEY, DEFAULT_PRO_STATUS);
  const { userId, ready } = useSession();

  React.useEffect(() => {
    if (!ready || fetchedFor.has(userId)) return;
    fetchedFor.add(userId);
    fetchProStatus().then(result => {
      if (!result) {
        fetchedFor.delete(userId);
        return;
      }
      setStatus(result);
    });
  }, [ready, userId, setStatus]);

  const isPro =
    status.isPro && (!status.proExpiresAt || new Date(status.proExpiresAt) > new Date());

  return {
    isPro,
    isTrial: isPro && status.isTrial,
    proExpiresAt: status.proExpiresAt,
  };
};
