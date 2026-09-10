import React from 'react';
import { SnackbarProvider } from 'notistack';
import './ToastProvider.scss';

const AUTO_HIDE_MS = 5000;

/**
 * The one always-mounted piece behind `@moon-ui/toast`'s imperative `showToast()` (toastStore.ts)
 * — rendered once by MoonProvider itself, wrapping the whole app, same "one shared target, not
 * per-consumer setup" reasoning as MoonProvider's own `#moon-ui-portal-root`. Bottom-center,
 * matching the "toast at the bottom" request this was built for; `maxSnack` caps how many stack
 * at once so a burst of failures (several optimistic writes failing around the same time) can't
 * fill the screen.
 */
const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <SnackbarProvider maxSnack={3} autoHideDuration={AUTO_HIDE_MS} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
    {children}
  </SnackbarProvider>
);

export default ToastProvider;
