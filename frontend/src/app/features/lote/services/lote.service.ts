import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoteDetalhe } from '../../../shared/models/lote.models';

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root',
})
export class LoteFeatureService {
  private http = inject(HttpClient);

  /** Busca os detalhes completos de um lote (insumos + inspeção). */
  getLoteById(id: number): Observable<LoteDetalhe> {
    return this.http.get<LoteDetalhe>(`${API_URL}/lotes/${id}`);
  }

  /** Busca a listagem de lotes com filtros opcionais. */
  getLotes(filtros?: any): Observable<LoteDetalhe[]> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.status && filtros.status !== 'todos') {
        params = params.set('status', filtros.status);
      }
      if (filtros.produto_id) {
        params = params.set('produto_id', filtros.produto_id);
      }
      // Adicionar outros filtros se necessário (datas, etc)
    }

    return this.http.get<LoteDetalhe[]>(`${API_URL}/lotes`, { params });
  }
}
