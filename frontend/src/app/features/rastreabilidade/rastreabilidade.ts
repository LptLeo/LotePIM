import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, tap } from 'rxjs';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { STATUS_CONFIG, type LoteStatus } from '../../shared/models/lote.models';

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
    numero_lote: string;
    produto: string;
    data_producao: string;
    status: LoteStatus;
    operador_nome: string;
    insumos_correspondentes: { nome: string; lote_interno: string; quantidade: number }[];
  }[];
}

export type ResultadoRastreabilidade = ResultadoLote | ResultadoInsumo;

import { RastreabilidadeBuscaComponent } from './components/rastreabilidade-busca/rastreabilidade-busca.component';
import { RastreabilidadeArvoreLoteComponent } from './components/rastreabilidade-arvore-lote/rastreabilidade-arvore-lote.component';
import { RastreabilidadeArvoreRecallComponent } from './components/rastreabilidade-arvore-recall/rastreabilidade-arvore-recall.component';

@Component({
  selector: 'app-rastreabilidade',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RastreabilidadeBuscaComponent,
    RastreabilidadeArvoreLoteComponent,
    RastreabilidadeArvoreRecallComponent
  ],
  templateUrl: './rastreabilidade.html',
  styleUrl: './rastreabilidade.css',
  animations: [],
})
export class Rastreabilidade implements OnInit {
  private http = inject(HttpClient);

  // Search state
  termoBusca = signal('');
  sugestoes = signal<AutocompleteSugestao[]>([]);
  mostrarDropdown = signal(false);
  buscandoSugestoes = signal(false);

  // Result state
  resultado = signal<ResultadoRastreabilidade | null>(null);
  buscando = signal(false);
  erro = signal<string | null>(null);
  modoResultado = signal(false);

  private busca$ = new Subject<string>();

  readonly STATUS_CONFIG = STATUS_CONFIG;

  ngOnInit(): void {
    this.busca$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 2) {
          this.sugestoes.set([]);
          this.buscandoSugestoes.set(false);
          return of([]);
        }
        this.buscandoSugestoes.set(true);
        return this.http.get<AutocompleteSugestao[]>(
          `http://localhost:3000/api/rastreabilidade/autocomplete?q=${encodeURIComponent(q)}`
        ).pipe(catchError(() => of([])));
      })
    ).subscribe(items => {
      this.sugestoes.set(items as AutocompleteSugestao[]);
      this.buscandoSugestoes.set(false);
      this.mostrarDropdown.set((items as any[]).length > 0);
    });
  }

  onInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.termoBusca.set(v);
    this.busca$.next(v);
    if (!v || v.length < 2) {
      this.mostrarDropdown.set(false);
    } else {
      this.mostrarDropdown.set(true);
    }
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
    const q = termo ?? this.termoBusca();
    if (!q.trim()) return;
    this.buscando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    
    this.http.get<ResultadoRastreabilidade>(
      `http://localhost:3000/api/rastreabilidade?termo=${encodeURIComponent(q)}`
    ).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.modoResultado.set(true);
        this.buscando.set(false);
      },
      error: (err) => {
        this.erro.set(err.error?.message ?? 'Nenhum resultado encontrado.');
        this.buscando.set(false);
      }
    });
  }

  novaBusca(): void {
    this.modoResultado.set(false);
    this.resultado.set(null);
    this.erro.set(null);
    this.termoBusca.set('');
    this.sugestoes.set([]);
  }

  fecharDropdown(): void {
    setTimeout(() => {
      this.mostrarDropdown.set(false);
    }, 150);
  }

  // Typed helpers
  get resultadoLote(): ResultadoLote['resultado'] | null {
    const r = this.resultado();
    return r?.tipo === 'lote' ? r.resultado : null;
  }

  get resultadoInsumos(): ResultadoInsumo['resultado'] | null {
    const r = this.resultado();
    return r?.tipo === 'insumo' ? r.resultado : null;
  }

  formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  }

  turnoLabel(turno: string): string {
    return { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }[turno] ?? turno;
  }
}
