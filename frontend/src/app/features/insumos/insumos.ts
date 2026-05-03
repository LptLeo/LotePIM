import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsumosService } from './services/insumos.service.js';
import { AuthService } from '../../core/services/auth.service.js';

import { MetricCardsComponent } from './components/metric-cards/metric-cards.component.js';
import { EstoqueListComponent } from './components/estoque-list/estoque-list.component.js';
import { CatalogoTableComponent } from './components/catalogo-table/catalogo-table.component.js';
import { NovaMpModalComponent } from './components/nova-mp-modal/nova-mp-modal.component.js';
import { RegistrarEntradaModalComponent } from './components/registrar-entrada-modal/registrar-entrada-modal.component.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { rxResource } from '@angular/core/rxjs-interop';

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
export class Insumos {
  private insumosService = inject(InsumosService);
  authService = inject(AuthService);

  abaAtiva = signal<'estoque' | 'catalogo'>('estoque');
  termoPesquisa = signal('');
  
  currentPageEstoque = signal(1);
  currentPageCatalogo = signal(1);

  /** Resource para o Estoque de Lotes */
  estoqueResource = rxResource({
    params: () => ({
      pagina: this.currentPageEstoque(),
      limite: 10,
      busca: this.abaAtiva() === 'estoque' ? this.termoPesquisa().trim() : ''
    }),
    stream: ({ params }) => this.insumosService.getAll(params)
  });

  /** Resource para o Catálogo de Matérias-Primas */
  catalogoResource = rxResource({
    params: () => ({
      pagina: this.currentPageCatalogo(),
      limite: 10,
      busca: this.abaAtiva() === 'catalogo' ? this.termoPesquisa().trim() : ''
    }),
    stream: ({ params }) => this.insumosService.getMateriasPrimasPaginado(params)
  });

  /** Resource para as Categorias */
  categoriasResource = rxResource({
    stream: () => this.insumosService.getCategoriasMateriasPrimas()
  });

  /** Resource para o Catálogo Completo (sem paginação, usado para selects) */
  catalogoCompletoResource = rxResource({
    stream: () => this.insumosService.getMateriasPrimas()
  });

  // Derivações reativas
  insumos = computed(() => this.estoqueResource.value()?.itens || []);
  catalogo = computed(() => this.catalogoResource.value()?.itens || []);
  catalogoCompleto = computed(() => this.catalogoCompletoResource.value() || []);
  categoriasMp = computed(() => this.categoriasResource.value() || []);
  
  paginationMetaEstoque = computed(() => this.estoqueResource.value()?.meta || null);
  paginationMetaCatalogo = computed(() => this.catalogoResource.value()?.meta || null);

  carregando = computed(() => this.estoqueResource.isLoading() || this.catalogoResource.isLoading());
  erro = computed(() => (this.estoqueResource.error() || this.catalogoResource.error()) ? 'Falha na comunicação com o servidor.' : null);

  // -- Modal Nova MP --
  modalAberto = signal(false);
  salvandoMp = signal(false);
  erroMp = signal<string | null>(null);

  // -- Modal Registrar Entrada de Estoque --
  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  /** Métricas Dinâmicas */
  totalRegistros = computed(() => this.paginationMetaEstoque()?.totalItens || 0);
  totalComSaldo = computed(() => this.insumos().filter(i => Number(i.quantidade_atual) > 0).length);
  totalEsgotados = computed(() => this.insumos().filter(i => Number(i.quantidade_atual) === 0).length);
  totalCatalogo = computed(() => this.paginationMetaCatalogo()?.totalItens || 0);

  onPageChange(pagina: number): void {
    if (this.abaAtiva() === 'estoque') {
      this.currentPageEstoque.set(pagina);
    } else {
      this.currentPageCatalogo.set(pagina);
    }
  }

  setAba(aba: 'estoque' | 'catalogo'): void {
    this.abaAtiva.set(aba);
    this.termoPesquisa.set('');
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(valor);
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
  }

  // --- Modal Logic (Mantido imperativo para ações de escrita) ---

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

    this.insumosService.criarMateriaPrima(payload).subscribe({
      next: () => {
        this.catalogoResource.reload();
        this.catalogoCompletoResource.reload();
        this.categoriasResource.reload();
        this.fecharModalNovaMp();
      },
      error: (err) => {
        console.error('Erro ao criar matéria-prima:', err);
        this.erroMp.set(err.error?.message || 'Erro ao salvar matéria-prima.');
        this.salvandoMp.set(false);
      },
      complete: () => this.salvandoMp.set(false)
    });
  }

  abrirModalEstoque(): void {
    this.erroEstoque.set(null);
    this.modalEstoqueAberto.set(true);
  }

  fecharModalEstoque(): void {
    this.modalEstoqueAberto.set(false);
    this.erroEstoque.set(null);
  }

  salvarEstoque(payload: any): void {
    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);
    
    const formattedPayload = {
      materia_prima_id: Number(payload.materia_prima_id),
      numero_lote_fornecedor: payload.numero_lote_fornecedor,
      fornecedor: payload.fornecedor,
      quantidade_inicial: Number(payload.quantidade_inicial),
      turno: payload.turno,
      data_validade: (!payload.naoAplicaValidade && payload.data_validade) ? payload.data_validade : null
    };

    this.insumosService.create(formattedPayload).subscribe({
      next: () => {
        this.estoqueResource.reload();
        this.fecharModalEstoque();
      },
      error: (err) => {
        console.error('Erro ao registrar estoque:', err);
        this.erroEstoque.set(err.error?.message || 'Erro ao registrar entrada.');
        this.salvandoEstoque.set(false);
      },
      complete: () => this.salvandoEstoque.set(false)
    });
  }
}
