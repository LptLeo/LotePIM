import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/auth/login';

  login(credentials: { email: string, senha: string }) {
    return this.http.post<{ token: string }>(this.API_URL, credentials).pipe(tap(res => localStorage.setItem('token', res.token)))
  }

  isLoggedIn() {
    try {
      const token = localStorage.getItem("token");

      if (!token) return false;

      // atob decodifica o base64
      // split('.') divide o token em 3 partes
      // [1] pega a segunda parte (payload)
      const partes = token.split('.');

      if (partes.length !== 3) return false;

      const payload = JSON.parse(atob(partes[1]));
      const tokenExpirado = payload.exp < Date.now() / 1000;

      if (tokenExpirado) {
        this.logout();
      }

      return !tokenExpirado;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  logout() {
    localStorage.removeItem('token');
  }
}
