import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { Store } from '@ngxs/store';
import { AuthState } from '../state/auth.state';

/**
 * Auth Guard
 * Protects routes that require authentication
 * Uses selectSnapshot to avoid race conditions with observable subscriptions
 */
export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);

  // Use selectSnapshot for synchronous check - state is already restored from storage
  const isAuthenticated = store.selectSnapshot(AuthState.isAuthenticated);

  if (isAuthenticated) {
    return true;
  } else {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
