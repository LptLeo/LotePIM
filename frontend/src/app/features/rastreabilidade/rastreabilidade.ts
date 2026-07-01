import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment.js';
import type { LoteStatus } from '../../shared/models/lote.models.js';
import {
  PaginationComponent,
  type PaginationMeta,
} from '../../shared/components/pagination/pagination.js';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { RastreabilidadeBuscaComponent } from './components/rastreabilidade-busca/rastreabilidade-busca.component.js';
import { RastreabilidadeArvoreLoteComponent } from './components/rastreabilidade-arvore-lote/rastreabilidade-arvore-lote.component.js';
import { RastreabilidadeArvoreRecallComponent } from './components/rastreabilidade-arvore-recall/rastreabilidade-arvore-recall.component.js';

// === INTERFACES ===

export interface AutocompleteSugestao {
  id: number;
  texto_exibicao: string;
  subtexto: string;
  tipo: 'LOTE_PRODUTO' | 'LOTE_INSUMO';
  status: LoteStatus | null;
}

export interface ResultadoLote {
  tipo: 'lote';
  resultado: {
    id: number;
    numero_lote: string;
    produto: { nome: string; sku: string; categoria: string };
    data_producao: string;
    turno: string;
    operador: { nome: string };
    quantidade_planejada: number;
    status: LoteStatus;
    observacoes: string;
    consumos: {
      id: number;
      quantidade_consumida: number;
      insumoEstoque: {
        numero_lote_interno: string;
        numero_lote_fornecedor: string;
        fornecedor: string;
        operador?: { nome: string };
        materiaPrima: { nome: string; sku_interno: string; unidade_medida: string };
      };
    }[];
    inspecao: {
      resultado_calculado: string;
      quantidade_reprovada: number;
      descricao_desvio: string;
      inspetor: { nome: string };
    } | null;
  };
}

export interface ResultadoInsumo {
  tipo: 'insumo';
  resultado: {
    itens: {
      numero_lote: string;
      produto: string;
      data_producao: string;
      status: LoteStatus;
      operador_nome: string;
      insumos_correspondentes: {
        nome: string;
        lote_interno: string;
        quantidade: number;
      }[];
    }[];
    meta: PaginationMeta;
  };
}

export type ResultadoRastreabilidade = ResultadoLote | ResultadoInsumo;

@Component({
  selector: 'app-rastreabilidade',
  standalone: true,
  imports: [
    FormsModule,
    RastreabilidadeBuscaComponent,
    RastreabilidadeArvoreLoteComponent,
    RastreabilidadeArvoreRecallComponent,
    PaginationComponent,
  ],
  templateUrl: './rastreabilidade.html',
  styleUrl: './rastreabilidade.css',
})
export class Rastreabilidade {
  // === DEPENDÊNCIAS ===
  private http = inject(HttpClient);

  // === ESTADO ===
  public termoPesquisa = signal('');
  private termoPesquisaEfetuado = signal('');
  public mostrarDropdown = signal(false);
  public paginaAtual = signal(1);

  // === RECURSOS (rxResource) ===
  private sugestoesResource = rxResource({
    params: () => ({ q: this.termoPesquisa() }),
    stream: ({ params: resourceParams }) => {
      if (resourceParams.q.length < 2) return of([]);
      return this.http.get<AutocompleteSugestao[]>(
        `${environment.apiUrl}/rastreabilidade/autocomplete?q=${encodeURIComponent(resourceParams.q)}`,
      );
    },
  });

  private rastreioResource = rxResource({
    params: () => ({
      termo: this.termoPesquisaEfetuado(),
      pagina: this.paginaAtual(),
    }),
    stream: ({ params: resourceParams }) => {
      if (!resourceParams.termo) return of(null);
      const params = new HttpParams()
        .set('termo', resourceParams.termo)
        .set('pagina', String(resourceParams.pagina))
        .set('limite', '10');

      return this.http.get<ResultadoRastreabilidade>(
        `${environment.apiUrl}/rastreabilidade`,
        { params },
      );
    },
  });

  // === DERIVAÇÕES ===
  public sugestoes = computed(() => this.sugestoesResource.value() || []);
  public buscandoSugestoes = computed(() => this.sugestoesResource.isLoading());

  public resultado = computed(() => {
    if (this.rastreioResource.error()) return null;
    return this.rastreioResource.value();
  });

  public buscando = computed(() => this.rastreioResource.isLoading());

  public erro = computed<string | null>(() => {
    const error = this.rastreioResource.error();
    if (!error) return null;
    if (error instanceof HttpErrorResponse) {
      return error.error?.message || 'Nenhum resultado encontrado ou falha no servidor.';
    }
    if (error instanceof Error) return error.message;
    return 'Nenhum resultado encontrado ou falha no servidor.';
  });

  public modoResultado = computed(() => !!this.termoPesquisaEfetuado());

  public resultadoLote = computed(() => {
    const r = this.resultado();
    return r?.tipo === 'lote' ? r.resultado : null;
  });

  public resultadoInsumos = computed(() => {
    const r = this.resultado();
    return r?.tipo === 'insumo' ? r.resultado.itens : null;
  });

  public metaPaginacao = computed(() => {
    const r = this.resultado();
    return r?.tipo === 'insumo' ? r.resultado.meta : null;
  });

  // === MÉTODOS ===
  public aoDigitar(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(v);
    this.mostrarDropdown.set(v.length >= 2);
  }

  public aoFocar(): void {
    if (this.termoPesquisa().length >= 2) {
      this.mostrarDropdown.set(true);
    }
  }

  public fecharDropdown(): void {
    setTimeout(() => {
      this.mostrarDropdown.set(false);
    }, 150);
  }

  public selecionarSugestao(s: AutocompleteSugestao): void {
    this.termoPesquisa.set(s.texto_exibicao);
    this.mostrarDropdown.set(false);
    this.buscar(s.texto_exibicao);
  }

  public buscar(termo?: string): void {
    const q = (termo ?? this.termoPesquisa()).trim();
    if (!q) return;

    this.paginaAtual.set(1);
    this.termoPesquisaEfetuado.set(q);
  }

  public aoMudarPagina(pagina: number): void {
    this.paginaAtual.set(pagina);
  }

  public novaBusca(): void {
    this.termoPesquisaEfetuado.set('');
    this.termoPesquisa.set('');
    this.paginaAtual.set(1);
  }
}
