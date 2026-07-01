import { Component, inject, signal, computed } from '@angular/core';
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
  // === DEPENDÊNCIAS ===
  private produtosService = inject(ProdutosService);
  private router = inject(Router);
  authService = inject(AuthService);

  // === ESTADO ===
  public termoPesquisa = signal('');
  public filtroAtivo = signal('todos');
  public ordenacao = signal('mais_recentes');
  public linhaFiltro = signal('todas');
  public categoriaFiltro = signal('todas');
  public paginaAtual = signal(1);

  // === RECURSOS (rxResource) ===
  private categoriasResource = rxResource({
    stream: () => this.produtosService.listarCategorias(),
  });

  private linhasResource = rxResource({
    stream: () => this.produtosService.listarLinhas(),
  });

  public categoriasExistentes = computed(() =>
    (this.categoriasResource.value() || []).filter((v) => v !== ''),
  );
  public linhasPadrao = computed(() =>
    (this.linhasResource.value() || []).filter((v) => v !== ''),
  );

  private produtosResource = rxResource({
    params: () => ({
      busca: this.termoPesquisa().trim(),
      status: this.filtroAtivo(),
      ordenacao: this.ordenacao(),
      linha: this.linhaFiltro(),
      categoria: this.categoriaFiltro(),
      pagina: this.paginaAtual(),
      limite: 10,
    }),
    stream: ({ params }) => this.produtosService.listar(params),
  });

  private contagemResource = rxResource({
    stream: () => this.produtosService.obterContagem(),
  });

  // === DERIVAÇÕES ===
  public produtos = computed(() => this.produtosResource.value()?.itens || []);
  public metaPaginacao = computed(() => this.produtosResource.value()?.meta || null);
  public carregando = computed(() => this.produtosResource.isLoading());
  public erro = computed<string | null>(() =>
    this.produtosResource.error() ? 'Erro ao carregar produtos do servidor.' : null,
  );

  public totalProdutos = computed(() => this.metaPaginacao()?.totalItens || 0);

  public contagens = computed<ContagemProdutos>(
    () =>
      this.contagemResource.value() ?? {
        total: 0,
        ativos: 0,
        inativos: 0,
        sem_insumos: 0,
        mais_produzidos: 0,
      },
  );

  public metrics = computed(() => ({
    total: this.contagens().total,
    ativos: this.contagens().ativos,
    inativos: this.contagens().inativos,
    sem_insumos: this.contagens().sem_insumos,
    mais_produzido: this.produtos().length > 0 ? this.produtos()[0].nome : '—',
  }));

  // === MÉTODOS ===
  public aplicarFiltroTab(tab: string): void {
    this.filtroAtivo.set(tab);
    this.paginaAtual.set(1);
  }

  public aoMudarOrdenacao(event: Event): void {
    this.ordenacao.set((event.target as HTMLSelectElement).value);
    this.paginaAtual.set(1);
  }

  public aoMudarLinha(event: Event): void {
    this.linhaFiltro.set((event.target as HTMLSelectElement).value);
    this.paginaAtual.set(1);
  }

  public aoMudarCategoria(event: Event): void {
    this.categoriaFiltro.set((event.target as HTMLSelectElement).value);
    this.paginaAtual.set(1);
  }

  public aoPesquisar(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(valor);
    this.paginaAtual.set(1);
  }

  public aoMudarPagina(pagina: number): void {
    this.paginaAtual.set(pagina);
  }

  public irParaNovo(): void {
    this.router.navigate(['/app/produtos/novo']);
  }

  public irParaDetalhe(id: number): void {
    this.router.navigate(['/app/produtos', id]);
  }

  public formatarData(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
