import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { fetchProStatus } from './proApi';
import { proStatusKeys } from './proStatusKeys';

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

/**
 * Pro entitlement — see supabase/migrations/*_pro_users.sql. There's no self-serve upgrade: a
 * `pro_users` row is granted by hand (SQL editor) or by the signup trial trigger, never by this
 * app. This hook only ever reads it.
 *
 * `proExpiresAt` is re-checked against `Date.now()` on every call rather than trusted as whatever
 * the last fetch returned — a trial that was active at last fetch may have lapsed since, and this
 * is the one place that actually matters for it. `staleTime: Infinity` still keeps this "fetch
 * once per identity, not on every focus/reconnect" — this row essentially never changes for a
 * signed-in session, and nothing here invalidates it.
 */
export const useIsPro = () => {
  const { userId, ready } = useSession();

  const { data: status = DEFAULT_PRO_STATUS } = useQuery({
    queryKey: proStatusKeys.status(userId),
    queryFn: async () => {
      const result = await fetchProStatus();
      if (!result) throw new Error('Failed to fetch pro status');
      return result;
    },
    enabled: ready && !!userId,
    staleTime: Infinity,
  });

  const isPro =
    status.isPro && (!status.proExpiresAt || new Date(status.proExpiresAt) > new Date());

  return {
    isPro,
    isTrial: isPro && status.isTrial,
    proExpiresAt: status.proExpiresAt,
  };
};
