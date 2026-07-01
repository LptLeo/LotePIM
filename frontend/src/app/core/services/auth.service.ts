import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { catchError, of, ReplaySubject, tap } from 'rxjs';
import { SseClientService } from './sse-client.service.js';
import { NotificacaoService } from './notificacao/notificacao.service.js';

export interface UsuarioInfo {
  id: number;
  nome: string;
  perfil: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // === INJEÇÃO DE DEPENDÊNCIAS ===

  private http = inject(HttpClient);
  private router = inject(Router);
  private sseClientService = inject(SseClientService);
  private notificacaoService = inject(NotificacaoService);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;

  // === ESTADO DA SESSÃO ===

  private _tokenAcesso = signal<string>('');
  tokenAcesso = this._tokenAcesso.asReadonly();
  usuario = signal<UsuarioInfo | null>(null);

  public podeAbrirLote = computed(() => {
    const perfil = this.usuario()?.perfil;
    return perfil === 'operador' || perfil === 'gestor';
  });

  private _sessaoCarregada$ = new ReplaySubject<void>(1);
  readonly sessaoCarregada$ = this._sessaoCarregada$.asObservable();

  // === AUTENTICAÇÃO ===

  public silentRefresh() {
    return this.http
      .post<{
        tokenAcesso: string;
      }>(`${this.AUTH_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => this.processarSucessoAuth(res.tokenAcesso)),
        catchError((err) => {
          this.logoutLocal();
          throw err;
        }),
      );
  }

  public login(credentials: { email: string; senha: string }) {
    return this.http
      .post<{ tokenAcesso: string }>(`${this.AUTH_URL}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(tap((res) => this.processarSucessoAuth(res.tokenAcesso)));
  }

  public logout() {
    this.http
      .post<void>(`${this.AUTH_URL}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.logoutLocal();
          this.router.navigate(['/login']);
        }),
      )
      .subscribe();
  }

  public inicializarSessao() {
    return this.silentRefresh().pipe(
      tap({
        next: () => {
          this._sessaoCarregada$.next();
          this._sessaoCarregada$.complete();
        },
      }),
      catchError(() => {
        this._sessaoCarregada$.next();
        this._sessaoCarregada$.complete();

        return of(null);
      }),
    );
  }

  public estaLogado(): boolean {
    return !!this._tokenAcesso() && this.usuario() !== null;
  }

  // === MÉTODOS PRIVADOS ===

  private setSessao(token: string, usuario: UsuarioInfo | null) {
    this._tokenAcesso.set(token);
    this.usuario.set(usuario);
  }

  private processarSucessoAuth(tokenAcesso: string) {
    const usuario = this.decodificarUsuarioDoToken(tokenAcesso);
    this.setSessao(tokenAcesso, usuario);

    this.sseClientService.iniciar();
    this.notificacaoService.iniciarPolling();
  }

  private decodificarUsuarioDoToken(token: string): UsuarioInfo {
    try {
      const jwtParteUsuario = JSON.parse(atob(token.split('.')[1]));

      if (!jwtParteUsuario.id || !jwtParteUsuario.nome || !jwtParteUsuario.perfil) {
        throw new Error('Token válido, mas payload do usuário está incompleto');
      }

      return {
        id: jwtParteUsuario.id,
        nome: jwtParteUsuario.nome,
        perfil: jwtParteUsuario.perfil,
      };
    } catch (err) {
      this.logoutLocal();
      throw err;
    }
  }

  private logoutLocal() {
    this.sseClientService.fechar();
    this.notificacaoService.pararPolling();
    this.setSessao('', null);
  }
}
