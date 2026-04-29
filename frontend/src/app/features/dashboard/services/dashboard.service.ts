import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardData } from '../models/dashboard.interface.js';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/metricas/dashboard`;

  getDashboardData(periodoLotes?: string, periodoUnidades?: string): Observable<DashboardData> {
    let params = new HttpParams();
    if (periodoLotes) params = params.set('periodoLotes', periodoLotes);
    if (periodoUnidades) params = params.set('periodoUnidades', periodoUnidades);

    return this.http.get<DashboardData>(this.API_URL, { params }).pipe(
      catchError((error) => {
        console.error('Erro ao buscar dados do dashboard:', error);
        return throwError(() => new Error('Falha ao carregar dados do dashboard'));
      })
    );
  }
}
