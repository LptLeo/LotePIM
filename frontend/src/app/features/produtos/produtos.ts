import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProdutosService, ContagemProdutos } from './services/produtos.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { ProdutoFilterButtonComponent } from './components/produto-filter-button/produto-filter-button.js';
import { ProdutoCardComponent } from './components/produto-card/produto-card.js';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.js';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { rxResource } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProdutoFilterButtonComponent,
    ProdutoCardComponent,
    StatCardComponent,
    PageHeaderComponent,
    PaginationComponent,
  ],
  templateUrl: './produtos.html',
})
export class Produtos {
  private produtosService = inject(ProdutosService);
  private router = inject(Router);
  authService = inject(AuthService);

  // States (Inputs reativos para o resource)
  termoPesquisa = signal('');
  filtroAtivo = signal('todos');
  ordenacao = signal('mais_recentes');
  linhaFiltro = signal('todas');
  categoriaFiltro = signal('todas');
  currentPage = signal(1);
  ultimaAtualizacao = signal(new Date().toLocaleTimeString('pt-BR'));

  categoriasResource = rxResource({
    stream: () => this.produtosService.listarCategorias(),
  });

  linhasResource = rxResource({
    stream: () => this.produtosService.listarLinhas(),
  });

  categoriasExistentes = computed(() => this.categoriasResource.value() || []);
  linhasPadrao = computed(() => this.linhasResource.value() || []);

  /**
   * Resource Reativo: Gerencia automaticamente o ciclo de vida da requisição.
   * Re-executa sempre que termoPesquisa, filtroAtivo ou currentPage mudarem.
   */
  produtosResource = rxResource({
    params: () => ({
      busca: this.termoPesquisa().trim(),
      status: this.filtroAtivo(),
      ordenacao: this.ordenacao(),
      linha: this.linhaFiltro(),
      categoria: this.categoriaFiltro(),
      pagina: this.currentPage(),
      limite: 10,
    }),
    stream: ({ params }) => this.produtosService.listar(params),
  });

  /** Resource para as contagens globais de filtros */
  contagemResource = rxResource({
    stream: () => this.produtosService.obterContagem(),
  });

  // Derivações reativas do resource para o template
  produtos = computed(() => this.produtosResource.value()?.itens || []);
  paginationMeta = computed(() => this.produtosResource.value()?.meta || null);
  carregando = computed(() => this.produtosResource.isLoading());
  erro = computed(() =>
    this.produtosResource.error() ? 'Erro ao carregar produtos do servidor.' : null,
  );

  totalProdutos = computed(() => this.paginationMeta()?.totalItens || 0);

  contagens = computed<ContagemProdutos>(
    () =>
      this.contagemResource.value() ?? {
        total: 0,
        ativos: 0,
        inativos: 0,
        semInsumos: 0,
        maisProduzidos: 0,
      },
  );

  metrics = computed(() => ({
    total: this.contagens().total,
    ativos: this.contagens().ativos,
    inativos: this.contagens().inativos,
    sem_insumos: this.contagens().semInsumos,
    mais_produzido: this.produtos().length > 0 ? this.produtos()[0].nome : '—',
  }));

  aplicarFiltroTab(tab: string): void {
    this.filtroAtivo.set(tab);
    this.currentPage.set(1);
  }

  onOrdenacaoChange(event: Event): void {
    this.ordenacao.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onLinhaChange(event: Event): void {
    this.linhaFiltro.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onCategoriaChange(event: Event): void {
    this.categoriaFiltro.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(valor);
    this.currentPage.set(1);
  }

  onPageChange(pagina: number): void {
    this.currentPage.set(pagina);
  }

  irParaNovo(): void {
    this.router.navigate(['/app/produtos/novo']);
  }

  irParaDetalhe(id: number): void {
    this.router.navigate(['/app/produtos', id]);
  }

  formatarData(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
