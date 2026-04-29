import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProdutosService } from './services/produtos.service';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProdutoFilterButtonComponent } from './components/produto-filter-button/produto-filter-button';
import { ProdutoCardComponent } from './components/produto-card/produto-card';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import type { Produto } from '../../shared/models/lote.models';
import { PaginationComponent, PaginationMeta } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, RouterLink, ProdutoFilterButtonComponent, ProdutoCardComponent, StatCardComponent, PageHeaderComponent, PaginationComponent],
  templateUrl: './produtos.html',
})
export class Produtos implements OnInit {
  private produtosService = inject(ProdutosService);
  private router = inject(Router);
  authService = inject(AuthService);

  // States
  produtos = signal<Produto[]>([]);
  paginationMeta = signal<PaginationMeta | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);
  termoPesquisa = signal('');
  filtroAtivo = signal('todos');
  currentPage = signal(1);
  ultimaAtualizacao = signal(new Date().toLocaleTimeString('pt-BR'));

  /** Métricas: Como agora é paginado, mantemos apenas estatísticas simples ou solicitamos ao back */
  totalProdutos = signal(0);
  totalAtivos = signal(0);
  totalComReceita = signal(0);

  metrics = computed(() => ({
    total: this.totalProdutos(),
    ativos: this.totalAtivos(),
    inativos: this.totalProdutos() - this.totalAtivos(),
    sem_insumos: 0,
    mais_produzidos: 0,
    mais_produzido: this.produtos().length > 0 ? this.produtos()[0].nome : '—'
  }));

  ngOnInit(): void {
    this.carregarProdutos();
  }

  aplicarFiltroTab(tab: string): void {
    this.filtroAtivo.set(tab);
    this.currentPage.set(1);
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.carregando.set(true);
    
    const filtros = {
      pagina: this.currentPage(),
      limite: 10,
      busca: this.termoPesquisa().trim()
      // Filtro de status (ativos/inativos) poderia ser enviado aqui se o back suportasse
    };

    this.produtosService.getProdutos(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (res) => {
          this.produtos.set(res.itens);
          this.paginationMeta.set(res.meta);
          this.totalProdutos.set(res.meta.totalItens);
        },
        error: () => this.erro.set('Erro ao carregar produtos do servidor.'),
      });
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(valor);
    this.currentPage.set(1);
    this.carregarProdutos();
  }

  onPageChange(pagina: number): void {
    this.currentPage.set(pagina);
    this.carregarProdutos();
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
