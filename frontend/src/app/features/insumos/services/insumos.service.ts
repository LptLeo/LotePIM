import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { InsumoEstoque } from '../../../shared/models/lote.models.js';

const API_URL = environment.apiUrl;

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
export class InsumosService {
  private http = inject(HttpClient);

  /** Lista lotes de insumo com paginação e filtros */
  getAll(filtros?: Record<string, string | number>): Observable<RespostaPaginada<InsumoEstoque>> {
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<RespostaPaginada<InsumoEstoque>>(`${API_URL}/insumos-estoque`, { params });
  }

  /** Busca um lote de insumo por ID */
  getById(id: number): Observable<InsumoEstoque> {
    return this.http.get<InsumoEstoque>(`${API_URL}/insumos-estoque/${id}`);
  }

  /** Registra entrada de novo lote de insumo no estoque */
  create(payload: any): Observable<InsumoEstoque> {
    return this.http.post<InsumoEstoque>(`${API_URL}/insumos-estoque`, payload);
  }

  /** Lista matérias-primas do catálogo com paginação e filtros */
  getMateriasPrimasPaginado(filtros?: Record<string, string | number>): Observable<RespostaPaginada<any>> {
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<RespostaPaginada<any>>(`${API_URL}/materias-primas`, { params });
  }

  /** Lista matérias-primas do catálogo (paginado mas carregando catálogo grande) */
  getMateriasPrimas(): Observable<any[]> {
    const params = new HttpParams().set('limite', '1000');
    return this.http.get<RespostaPaginada<any>>(`${API_URL}/materias-primas`, { params }).pipe(
      map(res => res.itens)
    );
  }

  /** Cria uma nova matéria-prima no catálogo */
  criarMateriaPrima(payload: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/materias-primas`, payload);
  }

  /** Lista categorias de matérias-primas */
  getCategoriasMateriasPrimas(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/materias-primas/categorias`);
  }
}
