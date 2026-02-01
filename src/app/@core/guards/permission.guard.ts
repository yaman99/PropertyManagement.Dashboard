import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngxs/store';
import { AuthState } from '../state/auth.state';
import { Permission } from '../domain/models';

/**
 * Permission Guard Factory
 * Creates guards for specific permissions
 * Uses selectSnapshot for synchronous checks
 */
export function permissionGuard(requiredPermissions: Permission[]): CanActivateFn {
  return (route, state) => {
    const store = inject(Store);
    const router = inject(Router);

    const user = store.selectSnapshot(AuthState.user);

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    const hasPermission = requiredPermissions.every(p =>
      user.permissions.includes(p)
    );

    if (hasPermission) {
      return true;
    } else {
      router.navigate(['/app/dashboard']);
      return false;
    }
  };
}
