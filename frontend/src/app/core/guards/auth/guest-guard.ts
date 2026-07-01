import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../../services/auth.service.js';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.sessaoCarregada$.pipe(
    take(1),
    map(() => {
      if (authService.estaLogado()) {
        return router.parseUrl('/app/dashboard');
      }
      return true;
    }),
  );
};
