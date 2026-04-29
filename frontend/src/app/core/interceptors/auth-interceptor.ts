import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service.js';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Clona a requisição para adicionar o token e as credenciais
  const token = authService.getTokenAcesso();
  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Caso a conta tenha sido desativada (Backend retorna 403 neste caso específico)
      if (error.status === 403 && error.error?.message?.toLowerCase().includes('desativada')) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { motivo: 'desativado' } });
        return throwError(() => error);
      }

      if (error.status !== 401) {
        // Não é erro de autenticação: propaga normalmente
        return throwError(() => error);
      }

      /**
       * Rotas de autenticação (refresh, login, logout) retornaram 401.
       *
       * IMPORTANTE: NÃO chamamos router.navigate(['/login']) aqui.
       * O authGuard é o único responsável por decidir navegação.
       *
       * Se for a rota de refresh chamada pelo carregarSessaoSilenciosa(),
       * o subscriber de erro no AuthService emite no sessaoCarregada$,
       * e o guard navega para /login de forma limpa — sem corrida.
       *
       * Se for a rota de refresh chamada pelo próprio interceptor (auto-refresh
       * mid-session, bloco abaixo), o erro sobe para o catchError externo
       * que trata a falha de renovação e navega para /login.
       */
      if (
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/logout')
      ) {
        return throwError(() => error);
      }

      /**
       * Token de acesso expirou durante o uso normal (mid-session).
       * Tenta renovar silenciosamente e retentar a requisição original.
       */
      return authService.renovarToken().pipe(
        switchMap((res) => {
          const retryReq = req.clone({
            withCredentials: true,
            setHeaders: { Authorization: `Bearer ${res.tokenAcesso}` }
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          // Renovação mid-session falhou: usuário precisa logar novamente
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
