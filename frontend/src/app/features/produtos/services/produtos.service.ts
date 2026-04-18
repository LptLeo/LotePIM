import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Produto, MateriaPrima } from '../../../shared/models/lote.models';

const API_URL = 'http://localhost:3000/api';

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

  getProdutos(): Observable<Produto[]> {
    return this.http.get<Produto[]>(`${API_URL}/produtos`);
  }

  getProdutoById(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${API_URL}/produtos/${id}`);
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/produtos/categorias`);
  }

  getMateriasPrimas(): Observable<MateriaPrima[]> {
    return this.http.get<MateriaPrima[]>(`${API_URL}/materias-primas`);
  }

  criarProduto(payload: CriarProdutoPayload): Observable<Produto> {
    return this.http.post<Produto>(`${API_URL}/produtos`, payload);
  }

  atualizarReceita(id: number, receita: { materia_prima_id: number; quantidade: number; unidade: string }[]): Observable<Produto> {
    return this.http.patch<Produto>(`${API_URL}/produtos/${id}/receita`, receita);
  }
}
