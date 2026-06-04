import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../../environments/environment.js';

export interface ConfiguracoesPublicas {
  minLengthNome: number;
  minLengthEmailPrefix: number;
  minLengthSenha: number;
  maxLengthSenha: number;
  tamanhoSenhaGerada: number;
  alertaEstoqueBaixoPorcentagem: number;
  limiteMaximoLotesAtivos: number;
  itensPorPaginaPadrao: number;
  diasMaximosRastreabilidade: number;
}

// Fallback robusto caso a API falhe no carregamento inicial
const DEFAULT_CONFIG: ConfiguracoesPublicas = {
  minLengthNome: 1,
  minLengthEmailPrefix: 1,
  minLengthSenha: 8,
  maxLengthSenha: 32,
  tamanhoSenhaGerada: 12,
  alertaEstoqueBaixoPorcentagem: 20,
  limiteMaximoLotesAtivos: 100,
  itensPorPaginaPadrao: 10,
  diasMaximosRastreabilidade: 365,
};

@Injectable({
  providedIn: 'root',
})
export class ConfiguracoesGlobaisService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/configuracoes/publicas`;

  // Signal síncrono para os componentes lerem instantaneamente
  config = signal<ConfiguracoesPublicas>(DEFAULT_CONFIG);

  /**
   * Chamado durante o APP_INITIALIZER.
   * Busca as configurações da API e atualiza o Signal.
   */
  loadConfig() {
    return this.http.get<ConfiguracoesPublicas>(this.API_URL).pipe(
      tap({
        next: (configDaApi) => {
          this.config.set(configDaApi);
        },
        error: (err) => {
          console.error(
            'Falha ao carregar configurações públicas da API. Usando defaults.',
            err,
          );
        },
      }),
    );
  }
}
