import { Component, inject, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoteFeatureService } from './services/lote.service.js';
import { STATUS_CONFIG } from '../../shared/models/lote.models.js';
import { AuthService } from '../../core/services/auth.service.js';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.js';
import { LoteCardComponent } from '../../shared/components/lote-card/lote-card.js';
import { FilterTabsComponent, FilterTab } from '../../shared/components/filter-tabs/filter-tabs.js';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { DashboardService } from '../dashboard/services/dashboard.service.js';
import { DashboardData } from '../dashboard/models/dashboard.interface.js';

/** Fallback caso o backend não responda — 2 minutos como padrão de demo */
const FALLBACK_DURACAO_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-lote',
  standalone: true,
  imports: [CommonModule, StatCardComponent, LoteCardComponent, FilterTabsComponent, PageHeaderComponent, DecimalPipe, PaginationComponent],
  templateUrl: './lote.html',
  styleUrl: './lote.css',
})
export class Lote implements OnDestroy {
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private loteService = inject(LoteFeatureService);
  private dashboardService = inject(DashboardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private configuracoesService = inject(ConfiguracoesService);
  authService = inject(AuthService);

  filtrosTabs: FilterTab[] = [
    { id: 'todos', label: 'Todos', hideBorder: true },
    { id: 'em_producao', label: 'Em Produção' },
    { id: 'aguardando_inspecao', label: 'Aguardando Inspeção' },
    { id: 'aprovado', label: 'Aprovado' },
    { id: 'aprovado_restricao', label: 'Aprovado com Restrição' },
    { id: 'reprovado', label: 'Reprovado' }
  ];

  // Inputs reativos via URL
  queryParams = toSignal(this.route.queryParams);
  filtroAtivo = computed(() => this.queryParams()?.['status'] || 'todos');
  termoPesquisa = computed(() => this.queryParams()?.['busca'] || '');
  currentPage = computed(() => Number(this.queryParams()?.['pagina']) || 1);

  /** Trigger para o Polling reativo */
  private pollingTrigger = signal<number>(0);

  /** Resource para a listagem principal de lotes */
  lotesResource = rxResource({
    params: () => ({
      pagina: this.currentPage(),
      limite: 9,
      status: this.filtroAtivo(),
      busca: this.termoPesquisa(),
      _poll: this.pollingTrigger() // Força recarregamento no polling
    }),
    stream: ({ params }) => this.loteService.getLotes(params)
  });

  /** Resource para a contagem de status */
  contagemResource = rxResource({
    params: () => ({ _poll: this.pollingTrigger() }),
    stream: () => this.loteService.getContagem()
  });

  /** Resource para o tempo de produção */
  configResource = rxResource({
    stream: () => this.loteService.getConfig()
  });

  /** Resource para o dashboard (produção total) */
  dashboardResource = rxResource<DashboardData, any>({
    stream: () => this.dashboardService.getDashboardData(
      'mes',
      this.configuracoesService.settings().lote.producaoTotalPeriodo
    ),
  });

  // Derivações reativas para o template
  lotes = computed(() => this.lotesResource.value()?.itens || []);
  paginationMeta = computed(() => this.lotesResource.value()?.meta || null);
  carregando = computed(() => this.lotesResource.isLoading());
  erro = computed(() => this.lotesResource.error() ? 'Não foi possível carregar a lista de lotes.' : null);
  contagemPorStatus = computed(() => this.contagemResource.value() || {
    todos: 0, em_producao: 0, aguardando_inspecao: 0, aprovado: 0, reprovado: 0, aprovado_restricao: 0
  });

  duracaoMs = computed(() => 
    (this.configResource.value()?.tempo_producao_minutos || 0) * 60 * 1000 || FALLBACK_DURACAO_MS
  );

  producaoTotalLabel = computed(() => {
    const p = this.configuracoesService.settings().lote.producaoTotalPeriodo;
    const map: Record<string, string> = {
      qualquer_momento: 'Produção Total Acumulada',
      mes: 'Produção (Mês Atual)',
      semana: 'Produção (Última Semana)',
      dia: 'Produção (Hoje)'
    };
    return map[p] || 'Produção Total';
  });

  producaoTotalAcumulada = computed(() => this.dashboardResource.value()?.unidades_mes || 0);

  statsCargaSistema = computed(() => {
    const baseValue = this.configuracoesService.settings().lote.atividadeTempoRealBase || 5;
    const emProducao = this.contagemPorStatus()['em_producao'] || 0;
    return parseFloat(((emProducao / baseValue) * 100).toFixed(1));
  });

  constructor() {
    /** Inicia o mecanismo de Polling Inteligente */
    let tickCount = 0;
    this.tickIntervalId = setInterval(() => {
      tickCount++;
      // A cada 5 segundos, se houver lote em produção, dispara o trigger
      if (tickCount % 5 === 0) {
        const temLoteProduzindo = this.lotes().some(l => l.status === 'em_producao');
        if (temLoteProduzindo) {
          this.pollingTrigger.update(v => v + 1);
        }
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.tickIntervalId !== null) clearInterval(this.tickIntervalId);
  }

  onPageChange(pagina: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina },
      queryParamsHandling: 'merge'
    });
  }

  alterarFiltro(status: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status, pagina: 1, busca: null },
      queryParamsHandling: 'merge'
    });
  }

  irParaDetalhe(id: number): void {
    this.router.navigate(['/app/lote', id]);
  }

  irParaNovoLote(): void {
    this.router.navigate(['/app/lote/novo']);
  }
}
