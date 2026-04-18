import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { InsumoEstoque } from '../../../shared/models/lote.models';

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root',
})
export class InsumosService {
  private http = inject(HttpClient);

  /** Lista todos os lotes de insumo em estoque */
  getAll(): Observable<InsumoEstoque[]> {
    return this.http.get<InsumoEstoque[]>(`${API_URL}/insumos-estoque`);
  }

  /** Busca um lote de insumo por ID */
  getById(id: number): Observable<InsumoEstoque> {
    return this.http.get<InsumoEstoque>(`${API_URL}/insumos-estoque/${id}`);
  }

  /** Registra entrada de novo lote de insumo no estoque */
  create(payload: any): Observable<InsumoEstoque> {
    return this.http.post<InsumoEstoque>(`${API_URL}/insumos-estoque`, payload);
  }

  /** Lista matérias-primas do catálogo */
  getMateriasPrimas(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/materias-primas`);
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
