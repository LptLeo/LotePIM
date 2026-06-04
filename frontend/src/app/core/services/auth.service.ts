import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
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
  private http = inject(HttpClient);
  private router = inject(Router);
  private sseClientService = inject(SseClientService);
  private notificacaoService = inject(NotificacaoService);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;

  private _tokenAcesso = signal<string>('');
  tokenAcesso = this._tokenAcesso.asReadonly();
  usuario = signal<UsuarioInfo | null>(null);
  private _sessaoCarregada$ = new ReplaySubject<void>(1);
  readonly sessaoCarregada$ = this._sessaoCarregada$.asObservable();

  setSessao(token: string, usuario: UsuarioInfo | null) {
    this._tokenAcesso.set(token);
    this.usuario.set(usuario);
  }

  private processarSucessoAuth(tokenAcesso: string) {
    const usuario = this.decodificarUsuarioDoToken(tokenAcesso);
    this.setSessao(tokenAcesso, usuario);
    // Inicia conexões globais após autenticação bem-sucedida
    this.sseClientService.iniciar();
    this.notificacaoService.iniciarPolling();
  }

  silentRefresh() {
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

  login(credentials: { email: string; senha: string }) {
    return this.http
      .post<{ tokenAcesso: string }>(`${this.AUTH_URL}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(tap((res) => this.processarSucessoAuth(res.tokenAcesso)));
  }

  logout() {
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

  decodificarUsuarioDoToken(token: string): UsuarioInfo {
    // Primeiro separa o token pelo '.', depois pega a segunda parte ([1]), usa a função nativa atob que decodifica Base64
    // e por fim transformo em JSON com JSON.parse.
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

  logoutLocal() {
    // Desliga todos os serviços globais que dependem de sessão ativa
    this.sseClientService.fechar();
    this.notificacaoService.pararPolling();
    this.setSessao('', null);
  }

  isLoggedIn(): boolean {
    return !!this._tokenAcesso() && this.usuario() !== null;
  }

  inicializarSessao() {
    return this.silentRefresh().pipe(
      tap({
        next: () => {
          this._sessaoCarregada$.next();
          this._sessaoCarregada$.complete();
        },
      }),
      catchError((err) => {
        this._sessaoCarregada$.next();
        this._sessaoCarregada$.complete();

        return of(null);
      }),
    );
  }
}
