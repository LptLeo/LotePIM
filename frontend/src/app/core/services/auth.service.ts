import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, of, ReplaySubject, tap } from 'rxjs';

export interface UserInfo {
  id: number;
  nome: string;
  perfil: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly AUTH_URL = 'http://localhost:3000/api/auth';

  // Armazena o Access Token apenas em memória (proteção XSS)
  private tokenAcesso = signal<string | null>(null);

  // Sinal reativo para o usuário logado
  usuario = signal<UserInfo | null>(null);

  /**
   * ReplaySubject(1) que emite exatamente uma vez quando a tentativa de
   * restaurar a sessão via silent refresh conclui (sucesso ou erro).
   */
  private _sessaoCarregada$ = new ReplaySubject<void>(1);
  readonly sessaoCarregada$ = this._sessaoCarregada$.asObservable();

  constructor() {}

  /** 
   * Método chamado pelo APP_INITIALIZER para garantir que a sessão
   * seja verificada ANTES do app carregar.
   */
  inicializarSessao() {
    return this.carregarSessaoSilenciosa();
  }

  login(credentials: { email: string; senha: string }) {
    return this.http
      .post<{ tokenAcesso: string; usuario: any }>(`${this.AUTH_URL}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this.setSessao(res.tokenAcesso, res.usuario);
        })
      );
  }

  /** Renova o token de acesso usando o token de atualização do cookie HttpOnly */
  renovarToken() {
    return this.http
      .post<{ tokenAcesso: string }>(`${this.AUTH_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.tokenAcesso.set(res.tokenAcesso);
          this.decodificarUsuarioDoToken(res.tokenAcesso);
        })
      );
  }

  getTokenAcesso() {
    return this.tokenAcesso();
  }

  private setSessao(token: string, usuario: any) {
    this.tokenAcesso.set(token);
    this.usuario.set(usuario);
  }

  private carregarSessaoSilenciosa() {
    return this.renovarToken().pipe(
      tap({
        next: () => {
          this._sessaoCarregada$.next();
          this._sessaoCarregada$.complete();
        },
        error: () => {
          this.logoutLocal();
          this._sessaoCarregada$.next();
          this._sessaoCarregada$.complete();
        }
      }),
      catchError(() => of(null))
    );
  }

  private decodificarUsuarioDoToken(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.usuario.set({
        id: payload.id,
        nome: payload.nome,
        perfil: payload.perfil,
      });
    } catch {
      this.logoutLocal();
    }
  }

  isLoggedIn() {
    return !!this.tokenAcesso() && this.usuario() !== null;
  }

  logout() {
    return this.http.post(`${this.AUTH_URL}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.logoutLocal())
    ).subscribe();
  }

  private logoutLocal() {
    this.tokenAcesso.set(null);
    this.usuario.set(null);
  }
}
