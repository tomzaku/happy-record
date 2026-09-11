// A thin wrapper over notistack's own imperative API (`enqueueSnackbar`, exported directly from
// the package, not via its `useSnackbar()` hook) — notistack binds that export to whichever
// `SnackbarProvider` instance is currently mounted (see `ToastProvider.tsx`), so it works from
// anywhere with no component tree of its own, including `packages/global/src/lib/api.ts` (the
// one shared HTTP client every `<resource>Api.ts` module is built on).
import { enqueueSnackbar, type VariantType } from 'notistack';

export type ToastVariant = 'error' | 'info' | 'success';

/** Queues one toast. `variant: 'error'` (the default) is what `api.ts` reaches for on a real
 * server failure; `'info'`/`'success'` are available for a caller with something to report that
 * isn't one. */
export function showToast(message: string, opts: { variant?: ToastVariant } = {}): void {
  enqueueSnackbar(message, { variant: (opts.variant ?? 'error') as VariantType });
}
