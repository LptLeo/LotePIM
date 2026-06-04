import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service.js';
import { map, take } from 'rxjs';

/**
 * Guard que protege rotas baseadas no perfil do usuário.
 *
 * @param perfisPermitidos Lista de perfis que podem acessar a rota.
 * Nota: O perfil 'gestor' sempre tem acesso concedido.
 */
export const roleGuard = (perfisPermitidos: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.sessaoCarregada$.pipe(
      take(1),
      map(() => {
        const usuario = authService.usuario();

        if (!usuario) {
          return router.parseUrl('/login');
        }

        if (usuario.perfil === 'gestor' || perfisPermitidos.includes(usuario.perfil)) {
          return true;
        }

        // Caso não tenha permissão, redireciona para o dashboard
        return router.parseUrl('/app/dashboard');
      }),
    );
  };
};
