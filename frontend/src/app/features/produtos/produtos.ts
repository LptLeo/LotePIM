import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProdutosService, ProdutoMetrics } from './services/produtos.service';
import { finalize, interval, Subscription, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './produtos.html',
})
export class Produtos implements OnInit, OnDestroy {
  private produtosService = inject(ProdutosService);
  private router = inject(Router);
  authService = inject(AuthService);

  private pollingSub?: Subscription;

  // States
  produtos = signal<any[]>([]);
  metrics = signal<ProdutoMetrics>({ total: 0, ativos: 0, inativos: 0, sem_insumos: 0, mais_produzidos: 0, mais_produzido: 'N/D' });
  carregando = signal(true);
  erro = signal<string | null>(null);

  // Filtros
  filtroAtivo = signal<string>('todos');
  termoPesquisa = signal('');
  ultimaAtualizacao = signal<string>('--:--:--');

  ngOnInit() {
    this.iniciarAutoAtualizacao();
  }

  ngOnDestroy() {
    this.pollingSub?.unsubscribe();
  }

  private iniciarAutoAtualizacao() {
    // Polling a cada 10 segundos para manter os dados "Real-Time" de forma fluída
    this.pollingSub = interval(10000)
      .pipe(startWith(0))
      .subscribe(() => {
        this.carregarMetricas();
        this.carregarProdutos(true);
        this.ultimaAtualizacao.set(new Date().toLocaleTimeString('pt-BR'));
      });
  }

  carregarMetricas() {
    this.produtosService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: (e) => console.error("Erro metricas", e)
    });
  }

  carregarProdutos(silencioso = false) {
    if (!silencioso) this.carregando.set(true);
    const apiFiltros: any = {
      search: this.termoPesquisa()
    };

    const tab = this.filtroAtivo();
    if (tab === 'ativos') apiFiltros.ativo = true;
    if (tab === 'inativos') apiFiltros.ativo = false;
    if (tab === 'sem_insumos') apiFiltros.sem_insumos = true;
    if (tab === 'mais_produzidos') apiFiltros.sort = tab;

    this.produtosService.getProdutos(apiFiltros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (dados) => this.produtos.set(dados),
        error: (e) => this.erro.set('Erro ao carregar produtos do servidor.')
      });
  }

  aplicarFiltroTab(aba: string) {
    this.filtroAtivo.set(aba);
    this.carregarProdutos();
  }

  onSearch(event: any) {
    this.termoPesquisa.set(event.target.value);
    this.carregarProdutos();
  }

  formatarData(data: string) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
