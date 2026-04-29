import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { LoteDetalhe } from '../../../shared/models/lote.models';

const API_URL = 'http://localhost:3000/api';

export interface LoteConfig {
  tempo_producao_minutos: number;
}

export interface RespostaPaginada<T> {
  itens: T[];
  meta: {
    totalItens: number;
    itensPorPagina: number;
    totalPaginas: number;
    paginaAtual: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class LoteFeatureService {
  private http = inject(HttpClient);

  getLoteById(id: number): Observable<LoteDetalhe> {
    return this.http.get<LoteDetalhe>(`${API_URL}/lotes/${id}`);
  }

  getLotes(filtros?: Record<string, string | number>): Observable<RespostaPaginada<LoteDetalhe>> {
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<RespostaPaginada<LoteDetalhe>>(`${API_URL}/lotes`, { params });
  }

  getContagem(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${API_URL}/lotes/stats/contagem`);
  }

  getProdutos(): Observable<any[]> {
    return this.http.get<RespostaPaginada<any>>(`${API_URL}/produtos`, { params: { limite: 1000 } }).pipe(
      map(res => res.itens)
    );
  }

  /** Busca o tempo de produção configurado no backend para cálculo da barra de progresso */
  getConfig(): Observable<LoteConfig> {
    return this.http.get<LoteConfig>(`${API_URL}/lotes/config`);
  }

  /** Busca insumos em estoque filtrados por matérias-primas (IDs separados por vírgula) */
  getInsumosDisponiveis(materiaPrimaIds: number[]): Observable<any[]> {
    const params = new HttpParams().set('ids', materiaPrimaIds.join(','));
    return this.http.get<any[]>(`${API_URL}/insumos-estoque/disponiveis`, { params });
  }

  /** Cria um novo lote com consumos inline (transação atômica no backend) */
  createLote(loteDTO: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/lotes`, loteDTO);
  }

  /** Registra a inspeção do lote */
  registrarInspecao(loteId: number, inspecao: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/lotes/${loteId}/inspecao`, inspecao);
  }
}
