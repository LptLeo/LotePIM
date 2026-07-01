import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoteFeatureService } from './services/lote.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.js';
import { LoteCardComponent } from '../../shared/components/lote-card/lote-card.js';
import {
  FilterTabsComponent,
  FilterTab,
} from '../../shared/components/filter-tabs/filter-tabs.js';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { rxResource, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../dashboard/services/dashboard.service.js';
import { DashboardData } from '../dashboard/models/dashboard.interface.js';
import { HttpErrorResponse } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { SseClientService } from '../../core/services/sse-client.service.js';

const FALLBACK_DURACAO_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-lote',
  standalone: true,
  imports: [
    StatCardComponent,
    LoteCardComponent,
    FilterTabsComponent,
    PageHeaderComponent,
    DecimalPipe,
    PaginationComponent,
  ],
  templateUrl: './lote.html',
  styleUrl: './lote.css',
})
export class Lote {
  // === DEPENDÊNCIAS ===
  private loteService = inject(LoteFeatureService);
  private dashboardService = inject(DashboardService);
  private sseService = inject(SseClientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private configuracoesService = inject(ConfiguracoesService);
  authService = inject(AuthService);

  // === FILTROS ===
  public filtrosTabs: FilterTab[] = [
    { id: 'todos', label: 'Todos', hideBorder: true },
    { id: 'em_producao', label: 'Em Produção' },
    { id: 'aguardando_inspecao', label: 'Aguardando Inspeção' },
    { id: 'aprovado', label: 'Aprovado' },
    { id: 'aprovado_restricao', label: 'Aprovado com Restrição' },
    { id: 'reprovado', label: 'Reprovado' },
  ];

  // === ESTADO (ROTA) ===
  private queryParams = toSignal(this.route.queryParams);
  public filtroAtivo = computed(() => this.queryParams()?.['status'] || 'todos');
  public termoPesquisa = computed(() => this.queryParams()?.['busca'] || '');
  public paginaAtual = computed(() => Number(this.queryParams()?.['pagina']) || 1);

  // === RECURSOS ===
  public lotesResource = rxResource({
    params: () => ({
      pagina: this.paginaAtual(),
      limite: 9,
      status: this.filtroAtivo(),
      busca: this.termoPesquisa(),
    }),
    stream: ({ params }) => this.loteService.listarLotes(params),
  });

  private contagemResource = rxResource({
    stream: () => this.loteService.obterContagem(),
  });

  private configResource = rxResource({
    stream: () => this.loteService.obterConfig(),
  });

  private dashboardResource = rxResource<DashboardData, HttpErrorResponse>({
    stream: () =>
      this.dashboardService.getDashboardData(
        'mes',
        this.configuracoesService.settings().lote.producaoTotalPeriodo,
      ),
  });

  // === DERIVAÇÕES ===
  public lotes = computed(() => this.lotesResource.value()?.itens || []);
  public metaPaginacao = computed(() => this.lotesResource.value()?.meta || null);
  public carregando = computed(() => this.lotesResource.isLoading());
  public erro = computed<string | null>(() =>
    this.lotesResource.error() ? 'Não foi possível carregar a lista de lotes.' : null,
  );
  public contagemPorStatus = computed<Record<string, number>>(
    () =>
      this.contagemResource.value() || {
        todos: 0,
        em_producao: 0,
        aguardando_inspecao: 0,
        aprovado: 0,
        reprovado: 0,
        aprovado_restricao: 0,
      },
  );

  public duracaoMs = computed(
    () =>
      (this.configResource.value()?.tempo_producao_minutos || 0) * 60 * 1000 ||
      FALLBACK_DURACAO_MS,
  );

  public producaoTotalLabel = computed(() => {
    const p = this.configuracoesService.settings().lote.producaoTotalPeriodo;
    const map: Record<string, string> = {
      qualquer_momento: 'Produção Total Acumulada',
      mes: 'Produção (Mês Atual)',
      semana: 'Produção (Última Semana)',
      dia: 'Produção (Hoje)',
    };
    return map[p] || 'Produção Total';
  });

  public producaoTotalAcumulada = computed(
    () => this.dashboardResource.value()?.unidades_mes || 0,
  );

  public statsCargaSistema = computed(() => {
    const baseValue =
      this.configuracoesService.settings().lote.atividadeTempoRealBase || 5;
    const emProducao = this.contagemPorStatus()['em_producao'] || 0;
    return parseFloat(((emProducao / baseValue) * 100).toFixed(1));
  });

  constructor() {
    this.sseService.eventos$
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.tipo === 'lote:criado' || e.tipo === 'lote:status_alterado'),
      )
      .subscribe(() => {
        this.lotesResource.reload();
        this.contagemResource.reload();
      });
  }

  // === MÉTODOS ===
  public aoMudarPagina(pagina: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina },
      queryParamsHandling: 'merge',
    });
  }

  public alterarFiltro(status: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status, pagina: 1, busca: null },
      queryParamsHandling: 'merge',
    });
  }

  public irParaDetalhe(id: number): void {
    this.router.navigate(['/app/lote', id]);
  }

  public irParaNovoLote(): void {
    this.router.navigate(['/app/lote/novo']);
  }
}
