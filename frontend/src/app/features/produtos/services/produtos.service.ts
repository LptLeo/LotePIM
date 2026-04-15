import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Models temporários caso não existam globais ainda, o ideal seria no shared
export interface ProdutoMetrics {
  total: number;
  ativos: number;
  inativos: number;
  sem_insumos: number;
  mais_produzidos: number;
  mais_produzido: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProdutosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/produtos';

  getProdutos(filtros: { search?: string; ativo?: boolean; sem_insumos?: boolean; sort?: string } = {}): Observable<any[]> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const val = (filtros as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val);
      }
    });
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  getMetrics(): Observable<ProdutoMetrics> {
    return this.http.get<ProdutoMetrics>(`${this.apiUrl}/metrics`);
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categorias`);
  }

  sugerirSku(nome: string): Observable<{ sku: string }> {
    return this.http.post<{ sku: string }>(`${this.apiUrl}/sku-suggestion`, { nome });
  }

  criarProduto(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }
}
