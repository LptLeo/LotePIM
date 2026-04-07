import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/auth/login';

  login(credentials: { email: string, pass: string }) {
    return this.http.post<{ token: string }>(this.API_URL, credentials).pipe(tap(res => localStorage.setItem('token', res.token)))
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
  }
}
