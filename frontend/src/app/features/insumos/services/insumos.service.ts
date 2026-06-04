import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { InsumoEstoque, MateriaPrima } from '../../../shared/models/lote.models.js';

const API_URL = environment.apiUrl;

import type { RespostaPaginada } from '../../../shared/models/pagination.models.js';

export type StatusInsumo =
  | 'disponivel'
  | 'esgotado'
  | 'a_caminho'
  | 'pendente'
  | 'em_uso';

export type OrdenacaoEstoque =
  | 'menor_estoque'
  | 'maior_estoque'
  | 'mais_recente'
  | 'menos_recente'
  | '';

export interface FiltrosEstoque {
  pagina?: number;
  limite?: number;
  busca?: string;
  esgotado?: boolean;
  fornecedor?: string;
  ordenarPor?: OrdenacaoEstoque | '';
  status?: string;
  cache_buster?: string;
}

export interface FiltrosCatalogo {
  pagina: number;
  limite: number;
  busca?: string;
}

export interface CriarInsumoEstoquePayload {
  materia_prima_id: number;
  numero_lote_fornecedor?: string;
  fornecedor: string;
  quantidade_inicial: number;
  turno: 'manha' | 'tarde' | 'noite';
  data_validade: string | null;
}

export interface RegistrarEntradaForm {
  materia_prima_id: number;
  numero_lote_fornecedor: string;
  fornecedor: string;
  quantidade_inicial: number;
  turno: 'manha' | 'tarde' | 'noite';
  naoAplicaValidade?: boolean;
  data_validade?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class InsumosService {
  private http = inject(HttpClient);

  /** Lista lotes de insumo com paginação e filtros */
  getAll(filtros?: FiltrosEstoque): Observable<RespostaPaginada<InsumoEstoque>> {
    const params = this.montarHttpParams(filtros);
    return this.http.get<RespostaPaginada<InsumoEstoque>>(`${API_URL}/insumos-estoque`, {
      params,
    });
  }

  /** Busca um lote de insumo por ID */
  getById(id: number): Observable<InsumoEstoque> {
    return this.http.get<InsumoEstoque>(`${API_URL}/insumos-estoque/${id}`);
  }

  /** Retorna estatísticas rápidas do estoque */
  getContagem(): Observable<{ total: number; comSaldo: number; esgotados: number }> {
    return this.http.get<{ total: number; comSaldo: number; esgotados: number }>(
      `${API_URL}/insumos-estoque/stats/contagem`,
    );
  }

  /** Registra entrada de novo lote de insumo no estoque */
  create(payload: CriarInsumoEstoquePayload): Observable<InsumoEstoque> {
    return this.http.post<InsumoEstoque>(`${API_URL}/insumos-estoque`, payload);
  }

  /** Registra entrada de múltiplos lotes de insumo de uma vez */
  createBulk(itens: CriarInsumoEstoquePayload[]): Observable<InsumoEstoque[]> {
    return this.http.post<InsumoEstoque[]>(`${API_URL}/insumos-estoque/bulk`, { itens });
  }

  /** Altera o status de um lote (ex: de 'a_caminho' para 'disponivel') */
  atualizarStatus(id: number, status: StatusInsumo): Observable<InsumoEstoque> {
    return this.http.patch<InsumoEstoque>(`${API_URL}/insumos-estoque/${id}/status`, {
      status,
    });
  }

  /** Lista matérias-primas do catálogo com paginação e filtros */
  getMateriasPrimasPaginado(
    filtros?: FiltrosCatalogo,
  ): Observable<RespostaPaginada<MateriaPrima>> {
    const params = this.montarHttpParams(filtros);
    return this.http.get<RespostaPaginada<MateriaPrima>>(`${API_URL}/materias-primas`, {
      params,
    });
  }

  /** Lista matérias-primas do catálogo (sem paginação, mas com limite alto) */
  getMateriasPrimas(): Observable<MateriaPrima[]> {
    const params = new HttpParams().set('limite', '1000');
    return this.http
      .get<RespostaPaginada<MateriaPrima>>(`${API_URL}/materias-primas`, { params })
      .pipe(map((res) => res.itens));
  }

  /** Cria uma nova matéria-prima no catálogo */
  criarMateriaPrima(payload: Partial<MateriaPrima>): Observable<MateriaPrima> {
    return this.http.post<MateriaPrima>(`${API_URL}/materias-primas`, payload);
  }

  /** Lista categorias de matérias-primas cadastradas */
  getCategoriasMateriasPrimas(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/materias-primas/categorias`);
  }

  /**
   * Método privado auxiliar para converter objetos de filtro em HttpParams,
   * removendo automaticamente valores nulos ou vazios (Pattern DRY).
   */
  private montarHttpParams(filtros?: FiltrosEstoque | FiltrosCatalogo): HttpParams {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return params;
  }
}
