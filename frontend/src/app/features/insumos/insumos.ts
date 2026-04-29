import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InsumosService } from './services/insumos.service.js';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service.js';
import type { InsumoEstoque } from '../../shared/models/lote.models.js';

import { MetricCardsComponent } from './components/metric-cards/metric-cards.component.js';
import { EstoqueListComponent } from './components/estoque-list/estoque-list.component.js';
import { CatalogoTableComponent } from './components/catalogo-table/catalogo-table.component.js';
import { NovaMpModalComponent } from './components/nova-mp-modal/nova-mp-modal.component.js';
import { RegistrarEntradaModalComponent } from './components/registrar-entrada-modal/registrar-entrada-modal.component.js';
import { PaginationComponent, PaginationMeta } from '../../shared/components/pagination/pagination.js';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardsComponent,
    EstoqueListComponent,
    CatalogoTableComponent,
    NovaMpModalComponent,
    RegistrarEntradaModalComponent,
    PaginationComponent
  ],
  templateUrl: './insumos.html',
})
export class Insumos implements OnInit {
  private insumosService = inject(InsumosService);
  private router = inject(Router);
  authService = inject(AuthService);

  abaAtiva = signal<'estoque' | 'catalogo'>('estoque');

  insumos = signal<InsumoEstoque[]>([]);
  catalogo = signal<any[]>([]);
  categoriasMp = signal<string[]>([]);
  
  paginationMetaEstoque = signal<PaginationMeta | null>(null);
  paginationMetaCatalogo = signal<PaginationMeta | null>(null);
  
  currentPageEstoque = signal(1);
  currentPageCatalogo = signal(1);

  carregando = signal(true);
  erro = signal<string | null>(null);
  termoPesquisa = signal('');

  // -- Modal Nova MP --
  modalAberto = signal(false);
  salvandoMp = signal(false);
  erroMp = signal<string | null>(null);

  // -- Modal Registrar Entrada de Estoque --
  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  /** Métricas */
  totalRegistros = signal(0);
  totalComSaldo = signal(0);
  totalEsgotados = signal(0);
  totalCatalogo = signal(0);

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarEstoque();
    this.carregarCatalogo();
  }

  carregarEstoque(): void {
    this.carregando.set(true);
    const filtros = {
      pagina: this.currentPageEstoque(),
      limite: 10,
      busca: this.abaAtiva() === 'estoque' ? this.termoPesquisa().trim() : ''
    };

    this.insumosService.getAll(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (res) => {
          this.insumos.set(res.itens);
          this.paginationMetaEstoque.set(res.meta);
          this.totalRegistros.set(res.meta.totalItens);
          // Em um cenário real, o backend deveria retornar essas contagens de métricas
          this.totalComSaldo.set(res.itens.filter(i => Number(i.quantidade_atual) > 0).length);
          this.totalEsgotados.set(res.itens.filter(i => Number(i.quantidade_atual) === 0).length);
        },
        error: () => this.erro.set('Erro ao carregar insumos de estoque.')
      });
  }

  carregarCatalogo(): void {
    const filtros = {
      pagina: this.currentPageCatalogo(),
      limite: 10,
      busca: this.abaAtiva() === 'catalogo' ? this.termoPesquisa().trim() : ''
    };

    this.insumosService.getMateriasPrimasPaginado(filtros).subscribe({
      next: (res: any) => {
        this.catalogo.set(res.itens);
        this.paginationMetaCatalogo.set(res.meta);
        this.totalCatalogo.set(res.meta.totalItens);
      },
      error: () => console.error('Erro ao carregar catálogo.')
    });
  }

  carregarCategorias(): void {
    this.insumosService.getCategoriasMateriasPrimas().subscribe({
      next: (dados) => this.categoriasMp.set(dados),
      error: () => console.error('Erro ao carregar categorias.')
    });
  }

  onPageChange(pagina: number): void {
    if (this.abaAtiva() === 'estoque') {
      this.currentPageEstoque.set(pagina);
      this.carregarEstoque();
    } else {
      this.currentPageCatalogo.set(pagina);
      this.carregarCatalogo();
    }
  }

  setAba(aba: 'estoque' | 'catalogo'): void {
    this.abaAtiva.set(aba);
    this.termoPesquisa.set('');
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
    this.carregarEstoque();
    this.carregarCatalogo();
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(valor);
    
    // Reset de página para busca
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
    this.carregarEstoque();
    this.carregarCatalogo();
  }

  // --- Modal Logic ---

  abrirModalNovaMp(): void {
    this.erroMp.set(null);
    this.modalAberto.set(true);
  }

  fecharModalNovaMp(): void {
    this.modalAberto.set(false);
    this.erroMp.set(null);
  }

  salvarNovaMp(payload: any): void {
    this.salvandoMp.set(true);
    this.erroMp.set(null);

    this.insumosService.criarMateriaPrima(payload)
      .pipe(finalize(() => this.salvandoMp.set(false)))
      .subscribe({
        next: () => {
          this.carregarCatalogo();
          this.fecharModalNovaMp();
        },
        error: (err) => {
          console.error('Erro ao criar matéria-prima:', err);
          let msg = 'Erro ao salvar matéria-prima.';
          if (err.error?.details && Array.isArray(err.error.details)) {
            msg += '\n\n' + err.error.details.map((d: any) => d.mensagem).join('\n');
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          this.erroMp.set(msg);
        }
      });
  }

  // --- Modal Estoque Logic ---

  abrirModalEstoque(): void {
    this.erroEstoque.set(null);
    this.modalEstoqueAberto.set(true);
  }

  fecharModalEstoque(): void {
    this.modalEstoqueAberto.set(false);
    this.erroEstoque.set(null);
  }

  salvarEstoque(payload: any): void {
    const mpId = Number(payload.materia_prima_id);
    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);
    
    const formattedPayload = {
      materia_prima_id: mpId,
      numero_lote_fornecedor: payload.numero_lote_fornecedor,
      fornecedor: payload.fornecedor,
      quantidade_inicial: Number(payload.quantidade_inicial),
      turno: payload.turno,
      data_validade: (!payload.naoAplicaValidade && payload.data_validade) ? payload.data_validade : null
    };

    this.insumosService.create(formattedPayload)
      .pipe(finalize(() => this.salvandoEstoque.set(false)))
      .subscribe({
        next: () => {
          this.carregarEstoque();
          this.fecharModalEstoque();
        },
        error: (err) => {
          console.error('Erro ao registrar estoque:', err);
          let msg = 'Erro ao registrar entrada.';
          if (err.error?.details && Array.isArray(err.error.details)) {
            msg += '\n\n' + err.error.details.map((d: any) => d.mensagem).join('\n');
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          this.erroEstoque.set(msg);
        }
      });
  }
}
