import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { SugestaoItem } from '../../../models/lote.models.js';

const API_URL = 'http://localhost:3000/api';
const MIN_TERMO_LENGTH = 2;

@Injectable({
  providedIn: 'root',
})
export class HeaderService {
  private http = inject(HttpClient);

  /**
   * Busca sugestões de lotes e produtos para o autocomplete do header.
   * Retorna array vazio em caso de erro ou termo muito curto.
   */
  buscarSugestoes(q: string): Observable<SugestaoItem[]> {
    if (!q || q.trim().length < MIN_TERMO_LENGTH) {
      return of([]);
    }

    return this.http
      .get<SugestaoItem[]>(`${API_URL}/lotes/busca`, {
        params: { q: q.trim() },
      })
      .pipe(
        catchError(() => of([]))
      );
  }
}
