import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

import type { InsumoEstoque, MateriaPrima } from '../../../shared/models/lote.models.js';
import type { RespostaPaginada } from '../../../shared/models/pagination.models.js';

// === TIPOS DE DOMÍNIO ===
export type StatusInsumo =
  | 'disponivel'
  | 'esgotado'
  | 'a_caminho'
  | 'pendente'
  | 'em_uso';

export type Turno = 'manha' | 'tarde' | 'noite';

export interface ContagemEstoque {
  total: number;
  comSaldo: number;
  esgotados: number;
}

// === FILTROS ===
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

// === DTOS (TRANSFERÊNCIA DE DADOS) ===
export interface CriarInsumoEstoqueDTO {
  materiaPrimaId: number;
  numero_lote_fornecedor?: string;
  fornecedor: string;
  quantidade_inicial: number;
  turno: Turno;
  data_validade: string | null;
}

export interface RegistrarEntradaDTO {
  materia_prima_id: number;
  numero_lote_fornecedor: string;
  fornecedor: string;
  quantidade_inicial: number;
  turno: Turno;
  naoAplicaValidade?: boolean;
  data_validade?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class InsumosService {
  private http = inject(HttpClient);

  public listar(filtros?: FiltrosEstoque): Observable<RespostaPaginada<InsumoEstoque>> {
    const params = this.montarHttpParams(filtros);
    return this.http.get<RespostaPaginada<InsumoEstoque>>(`${API_URL}/insumos-estoque`, {
      params,
    });
  }

  public buscarPorId(id: number): Observable<InsumoEstoque> {
    return this.http.get<InsumoEstoque>(`${API_URL}/insumos-estoque/${id}`);
  }

  public obterContagem(): Observable<ContagemEstoque> {
    return this.http.get<ContagemEstoque>(`${API_URL}/insumos-estoque/stats/contagem`);
  }

  public registrarLote(payload: CriarInsumoEstoqueDTO): Observable<InsumoEstoque> {
    return this.http.post<InsumoEstoque>(`${API_URL}/insumos-estoque`, payload);
  }

  public criarLotes(itens: CriarInsumoEstoqueDTO[]): Observable<InsumoEstoque[]> {
    return this.http.post<InsumoEstoque[]>(`${API_URL}/insumos-estoque/bulk`, { itens });
  }

  public atualizarStatus(id: number, status: StatusInsumo): Observable<InsumoEstoque> {
    return this.http.patch<InsumoEstoque>(`${API_URL}/insumos-estoque/${id}/status`, {
      status,
    });
  }

  public listarMateriasPrimasPaginado(
    filtros?: FiltrosCatalogo,
  ): Observable<RespostaPaginada<MateriaPrima>> {
    const params = this.montarHttpParams(filtros);
    return this.http.get<RespostaPaginada<MateriaPrima>>(`${API_URL}/materias-primas`, {
      params,
    });
  }

  public obterMateriasPrimas(): Observable<MateriaPrima[]> {
    const params = new HttpParams().set('limite', '1000');
    return this.http
      .get<RespostaPaginada<MateriaPrima>>(`${API_URL}/materias-primas`, { params })
      .pipe(map((res) => res.itens));
  }

  public criarMateriaPrima(payload: Partial<MateriaPrima>): Observable<MateriaPrima> {
    return this.http.post<MateriaPrima>(`${API_URL}/materias-primas`, payload);
  }

  public obterCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/materias-primas/categorias`);
  }

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
