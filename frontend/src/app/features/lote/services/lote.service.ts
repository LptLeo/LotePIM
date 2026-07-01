import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type {
  LoteDetalhe,
  CriarLoteDTO,
  RegistrarInspecaoDTO,
  Produto,
  InsumoEstoque,
} from '../../../shared/models/lote.models.js';
import type { RespostaPaginada } from '../../../shared/models/pagination.models.js';

const API_URL = environment.apiUrl;

export interface LoteConfig {
  tempo_producao_minutos: number;
}

@Injectable({
  providedIn: 'root',
})
export class LoteFeatureService {
  private http = inject(HttpClient);

  // === MÉTODOS PRIVADOS ===
  private montarHttpParams(
    filtros?: Record<string, string | number | boolean | null | undefined>,
  ): HttpParams {
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

  // === CONSULTAS ===
  public obterLotePorId(id: number): Observable<LoteDetalhe> {
    return this.http.get<LoteDetalhe>(`${API_URL}/lotes/${id}`);
  }

  public listarLotes(
    filtros?: Record<string, string | number | boolean | null | undefined>,
  ): Observable<RespostaPaginada<LoteDetalhe>> {
    const params = this.montarHttpParams(filtros);
    return this.http.get<RespostaPaginada<LoteDetalhe>>(`${API_URL}/lotes`, { params });
  }

  public obterContagem(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${API_URL}/lotes/stats/contagem`);
  }

  public listarProdutos(): Observable<Produto[]> {
    return this.http
      .get<RespostaPaginada<Produto>>(`${API_URL}/produtos`, {
        params: { limite: 1000, status: 'com_insumos' },
      })
      .pipe(map((res) => res.itens.filter((p) => p.ativo)));
  }

  public obterConfig(): Observable<LoteConfig> {
    return this.http.get<LoteConfig>(`${API_URL}/lotes/config`);
  }

  public obterInsumosDisponiveis(materiaPrimaIds: number[]): Observable<InsumoEstoque[]> {
    const params = new HttpParams().set('ids', materiaPrimaIds.join(','));
    return this.http.get<InsumoEstoque[]>(`${API_URL}/insumos-estoque/disponiveis`, {
      params,
    });
  }

  // === COMANDOS ===
  public criarLote(loteDTO: CriarLoteDTO): Observable<LoteDetalhe> {
    return this.http.post<LoteDetalhe>(`${API_URL}/lotes`, loteDTO);
  }

  public registrarInspecao(
    loteId: number,
    inspecao: RegistrarInspecaoDTO,
  ): Observable<LoteDetalhe> {
    return this.http.post<LoteDetalhe>(`${API_URL}/lotes/${loteId}/inspecao`, inspecao);
  }
}
