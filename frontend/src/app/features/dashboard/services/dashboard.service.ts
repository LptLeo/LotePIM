import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardData } from '../models/dashboard.interface.js';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/metricas/dashboard`;

  public getDashboardData(
    periodoLotes: string,
    periodoUnidades: string,
  ): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.API_URL, {
      params: {
        periodoLotes,
        periodoUnidades,
      },
    });
  }
}
