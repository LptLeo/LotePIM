import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SseEvento {
  tipo:
    | 'insumo:criado'
    | 'insumo:status_alterado'
    | 'lote:criado'
    | 'lote:status_alterado';
  dados: { id: number; status?: string };
}

/**
 * Serviço singleton raiz que gerencia a conexão SSE com o backend.
 *
 * Ciclo de vida controlado pelo AuthService:
 *   - iniciar() → chamado após login bem-sucedido ou silentRefresh bem-sucedido
 *   - fechar()  → chamado em logoutLocal(), ANTES de limpar o token
 *
 * Não injeta AuthService para evitar dependência circular.
 * O POST /events/ticket passa pelo authInterceptor que adiciona o Bearer automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class SseClientService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  private _eventos$ = new Subject<SseEvento>();
  /** Stream público de eventos tipados. Componentes assinam com takeUntilDestroyed(). */
  readonly eventos$ = this._eventos$.asObservable();

  private eventSource: EventSource | null = null;

  /**
   * Flag que distingue desconexão intencional (logout) de falha de rede.
   * - true  → bloqueia reconexão automática
   * - false → permite reconexão automática em caso de falha de rede
   */
  private fechadoIntencionalmente = false;

  /**
   * Inicia ou reinicia a conexão SSE.
   * Idempotente: fecha conexão existente antes de abrir nova.
   * Seguro chamar em silentRefresh (reabre com novo ticket).
   */
  iniciar(): void {
    this.fechadoIntencionalmente = false;
    this._fecharConexao(); // Fecha sem alterar a flag — método privado

    // Obtém ticket temporário via HTTP normal (interceptor adiciona Bearer)
    this.http.post<{ ticket: string }>(`${this.API_URL}/events/ticket`, {}).subscribe({
      next: ({ ticket }) => this.abrirEventSource(ticket),
      error: (err) => {
        console.warn('[SSE] Falha ao obter ticket:', err);
        if (!this.fechadoIntencionalmente) {
          setTimeout(() => this.iniciar(), 5_000);
        }
      },
    });
  }

  /**
   * Fecha a conexão SSE e bloqueia reconexão automática.
   * Deve ser chamado pelo AuthService em logoutLocal().
   */
  fechar(): void {
    this.fechadoIntencionalmente = true;
    this._fecharConexao();
  }

  /** Fecha apenas o EventSource sem alterar a flag de intenção. */
  private _fecharConexao(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }

  /** Abre o EventSource com o ticket obtido e registra listeners por tipo de evento. */
  private abrirEventSource(ticket: string): void {
    const url = `${this.API_URL}/events/stream?ticket=${encodeURIComponent(ticket)}`;
    this.eventSource = new EventSource(url);

    // Listener por tipo de evento nomeado (mais eficiente que onmessage genérico)
    const tipos: SseEvento['tipo'][] = [
      'insumo:criado',
      'insumo:status_alterado',
      'lote:criado',
      'lote:status_alterado',
    ];

    for (const tipo of tipos) {
      this.eventSource.addEventListener(tipo, (e: MessageEvent) => {
        try {
          const dados = JSON.parse(e.data);
          this._eventos$.next({ tipo, dados });
        } catch {
          console.error(`[SSE] Erro ao parsear evento '${tipo}':`, e.data);
        }
      });
    }

    this.eventSource.onerror = () => {
      console.warn('[SSE] Conexão perdida. Tentando reconectar em 5s...');
      this._fecharConexao();
      if (!this.fechadoIntencionalmente) {
        setTimeout(() => this.iniciar(), 5_000);
      }
    };
  }
}
