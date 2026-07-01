import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Produto, MateriaPrima } from '../../../shared/models/lote.models.js';
import type { RespostaPaginada } from '../../../shared/models/pagination.models.js';

const API_URL = environment.apiUrl;

export interface ContagemProdutos {
  total: number;
  ativos: number;
  inativos: number;
  sem_insumos: number;
  mais_produzidos: number;
}

interface ReceitaItem {
  materia_prima_id: number;
  quantidade: number;
  unidade: string;
}

export interface CriarProdutoPayload {
  nome: string;
  categoria: string;
  linha_padrao: string;
  percentual_ressalva: number;
  ativo: boolean;
  receita: ReceitaItem[];
}

// === FUNÇÕES PRIVADAS ===

function montarParams(filtros?: Record<string, string | number>): HttpParams {
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

// === SERVIÇO ===

@Injectable({
  providedIn: 'root',
})
export class ProdutosService {
  private http = inject(HttpClient);

  public listar(
    filtros?: Record<string, string | number>,
  ): Observable<RespostaPaginada<Produto>> {
    return this.http.get<RespostaPaginada<Produto>>(`${API_URL}/produtos`, {
      params: montarParams(filtros),
    });
  }

  public obterContagem(): Observable<ContagemProdutos> {
    return this.http.get<ContagemProdutos>(`${API_URL}/produtos/contagem`);
  }

  public buscarPorId(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${API_URL}/produtos/${id}`);
  }

  public listarCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/produtos/categorias`);
  }

  public listarLinhas(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/produtos/linhas`);
  }

  public listarMateriasPrimas(): Observable<MateriaPrima[]> {
    const params = new HttpParams().set('limite', '1000');
    return this.http
      .get<RespostaPaginada<MateriaPrima>>(`${API_URL}/materias-primas`, { params })
      .pipe(map((res) => res.itens));
  }

  public criar(payload: CriarProdutoPayload): Observable<Produto> {
    return this.http.post<Produto>(`${API_URL}/produtos`, payload);
  }

  public atualizarReceita(id: number, receita: ReceitaItem[]): Observable<Produto> {
    return this.http.patch<Produto>(`${API_URL}/produtos/${id}/receita`, receita);
  }

  public alternarStatus(id: number, ativo: boolean): Observable<Produto> {
    return this.http.patch<Produto>(`${API_URL}/produtos/${id}/status`, { ativo });
  }
}
