import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { DashboardData } from '../models/dashboard.interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private API_URL = 'http://localhost:3000/api/metricas/dashboard';

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.API_URL).pipe(
      tap(res => console.log(res)),
      catchError((error) => {
        console.error('Erro ao buscar dados do dashboard:', error);
        return throwError(() => new Error('Falha ao carregar dados do dashboard'));
      })
    );
  }
}
