import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import type { Produto, MateriaPrima } from '../../../shared/models/lote.models';

const API_URL = 'http://localhost:3000/api';

export interface RespostaPaginada<T> {
  itens: T[];
  meta: {
    totalItens: number;
    itensPorPagina: number;
    totalPaginas: number;
    paginaAtual: number;
  };
}

export interface CriarProdutoPayload {
  nome: string;
  categoria: string;
  linha_padrao: string;
  percentual_ressalva: number;
  ativo: boolean;
  receita: {
    materia_prima_id: number;
    quantidade: number;
    unidade: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class ProdutosService {
  private http = inject(HttpClient);

  getProdutos(filtros?: Record<string, string | number>): Observable<RespostaPaginada<Produto>> {
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<RespostaPaginada<Produto>>(`${API_URL}/produtos`, { params });
  }

  getProdutoById(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${API_URL}/produtos/${id}`);
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/produtos/categorias`);
  }

  getMateriasPrimas(): Observable<MateriaPrima[]> {
    // Para simplificar receitas, carregamos um limite alto para o catálogo.
    const params = new HttpParams().set('limite', '1000');
    return this.http.get<RespostaPaginada<MateriaPrima>>(`${API_URL}/materias-primas`, { params }).pipe(
      map(res => res.itens)
    );
  }

  criarProduto(payload: CriarProdutoPayload): Observable<Produto> {
    return this.http.post<Produto>(`${API_URL}/produtos`, payload);
  }

  atualizarReceita(id: number, receita: { materia_prima_id: number; quantidade: number; unidade: string }[]): Observable<Produto> {
    return this.http.patch<Produto>(`${API_URL}/produtos/${id}/receita`, receita);
  }
}
