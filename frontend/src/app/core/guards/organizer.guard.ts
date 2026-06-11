import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';

export const organizerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isOrganizador()) {
    return true;
  }
  return router.createUrlTree(['/']);
};
