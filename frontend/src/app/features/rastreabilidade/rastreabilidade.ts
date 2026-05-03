import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { STATUS_CONFIG, type LoteStatus } from '../../shared/models/lote.models.js';
import { PaginationComponent, PaginationMeta } from '../../shared/components/pagination/pagination.js';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

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
      insumos_correspondentes: { nome: string; lote_interno: string; quantidade: number }[];
    }[];
    meta: PaginationMeta;
  };
}

export type ResultadoRastreabilidade = ResultadoLote | ResultadoInsumo;

import { RastreabilidadeBuscaComponent } from './components/rastreabilidade-busca/rastreabilidade-busca.component.js';
import { RastreabilidadeArvoreLoteComponent } from './components/rastreabilidade-arvore-lote/rastreabilidade-arvore-lote.component.js';
import { RastreabilidadeArvoreRecallComponent } from './components/rastreabilidade-arvore-recall/rastreabilidade-arvore-recall.component.js';

@Component({
  selector: 'app-rastreabilidade',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RastreabilidadeBuscaComponent,
    RastreabilidadeArvoreLoteComponent,
    RastreabilidadeArvoreRecallComponent,
    PaginationComponent
  ],
  templateUrl: './rastreabilidade.html',
  styleUrl: './rastreabilidade.css',
})
export class Rastreabilidade {
  private http = inject(HttpClient);

  // Search input state
  termoBusca = signal('');
  termoBuscaEfetuada = signal(''); // Dispara o rastreio real
  mostrarDropdown = signal(false);
  currentPage = signal(1);

  readonly STATUS_CONFIG = STATUS_CONFIG;

  /** 
   * Resource para Autocomplete.
   * Reage a mudanças no termo de busca digitado.
   */
  sugestoesResource = rxResource({
    params: () => ({ q: this.termoBusca() }),
    stream: ({ params: resourceParams }) => {
      if (resourceParams.q.length < 2) return of([]);
      return this.http.get<AutocompleteSugestao[]>(
        `${environment.apiUrl}/rastreabilidade/autocomplete?q=${encodeURIComponent(resourceParams.q)}`
      );
    }
  });

  /**
   * Resource para o Rastreio Real.
   * Reage quando termoBuscaEfetuada ou currentPage mudam.
   */
  rastreioResource = rxResource({
    params: () => ({ 
      termo: this.termoBuscaEfetuada(),
      pagina: this.currentPage()
    }),
    stream: ({ params: resourceParams }) => {
      if (!resourceParams.termo) return of(null);
      const params = new HttpParams()
        .set('termo', resourceParams.termo)
        .set('pagina', String(resourceParams.pagina))
        .set('limite', '10');

      return this.http.get<ResultadoRastreabilidade>(
        `${environment.apiUrl}/rastreabilidade`,
        { params }
      );
    }
  });

  // Derivações reativas
  sugestoes = computed(() => this.sugestoesResource.value() || []);
  buscandoSugestoes = computed(() => this.sugestoesResource.isLoading());
  
  resultado = computed(() => this.rastreioResource.value());
  buscando = computed(() => this.rastreioResource.isLoading());
  erro = computed(() => this.rastreioResource.error() ? 'Nenhum resultado encontrado ou falha no servidor.' : null);
  modoResultado = computed(() => !!this.termoBuscaEfetuada());

  onInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.termoBusca.set(v);
    this.mostrarDropdown.set(v.length >= 2);
  }

  onFocus(): void {
    if (this.termoBusca().length >= 2) {
      this.mostrarDropdown.set(true);
    }
  }

  selecionarSugestao(s: AutocompleteSugestao): void {
    this.termoBusca.set(s.texto_exibicao);
    this.mostrarDropdown.set(false);
    this.buscar(s.texto_exibicao);
  }

  buscar(termo?: string): void {
    const q = (termo ?? this.termoBusca()).trim();
    if (!q) return;
    
    this.currentPage.set(1);
    this.termoBuscaEfetuada.set(q);
  }

  onPageChange(pagina: number): void {
    this.currentPage.set(pagina);
  }

  novaBusca(): void {
    this.termoBuscaEfetuada.set('');
    this.termoBusca.set('');
    this.currentPage.set(1);
  }

  fecharDropdown(): void {
    setTimeout(() => {
      this.mostrarDropdown.set(false);
    }, 150);
  }

  // Typed helpers (computed para máxima performance)
  resultadoLote = computed(() => {
    const r = this.resultado();
    return r?.tipo === 'lote' ? r.resultado : null;
  });

  resultadoInsumos = computed(() => {
    const r = this.resultado();
    return r?.tipo === 'insumo' ? r.resultado.itens : null;
  });

  paginationMeta = computed(() => {
    const r = this.resultado();
    return r?.tipo === 'insumo' ? r.resultado.meta : null;
  });

  formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  }

  turnoLabel(turno: string): string {
    return { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[turno] ?? turno;
  }
}
