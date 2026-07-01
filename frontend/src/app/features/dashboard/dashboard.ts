import { Component, inject, computed } from '@angular/core';
import { DashboardService } from './services/dashboard.service.js';
import { DashboardPdfService } from './services/dashboard-pdf.service.js';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { rxResource } from '@angular/core/rxjs-interop';
import * as loteStatus from '../../shared/utils/lote-status.js';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, PageHeaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // === INJEÇÃO DE DEPENDÊNCIAS ===

  private dashboardService = inject(DashboardService);
  private pdfService = inject(DashboardPdfService);
  private router = inject(Router);
  private configuracoes = inject(ConfiguracoesService);
  private authService = inject(AuthService);

  // === CONFIGURAÇÕES ===

  public podeAbrirLote = this.authService.podeAbrirLote;
  private dashboardConfig = this.configuracoes.dashboardSettings;

  // === RECURSOS ===

  private dashboardResource = rxResource({
    params: () => ({
      lotesComparacao: this.dashboardConfig().lotesComparacao,
      unidadesComparacao: this.dashboardConfig().unidadesComparacao,
    }),
    stream: ({ params }) =>
      this.dashboardService.getDashboardData(
        params.lotesComparacao,
        params.unidadesComparacao,
      ),
  });

  private dadosDashboard = computed(() => this.dashboardResource.value() ?? null);
  public carregando = computed(() => this.dashboardResource.isLoading());

  // === MÉTRICAS DERIVADAS ===

  public lotesProduzidos = computed(() => this.dadosDashboard()?.lotes_mes ?? 0);
  public lotesTendencia = computed(() => this.dadosDashboard()?.lotes_tendencia ?? 0);
  public unidadesProduzidas = computed(() => this.dadosDashboard()?.unidades_mes ?? 0);
  public unidadesTendencia = computed(
    () => this.dadosDashboard()?.unidades_tendencia ?? 0,
  );
  public taxaDeAprovacaoMes = computed(
    () => this.dadosDashboard()?.taxa_aprovacao_mes ?? 0,
  );
  public aguardandoInspecao = computed(
    () => this.dadosDashboard()?.aguardando_inspecao ?? 0,
  );
  public ultimosLotes = computed(() => this.dadosDashboard()?.ultimos_lotes ?? []);
  public dataGeracao = new Date();

  // === LABELS ===

  public lotesLabel = computed(() => {
    const periodo = this.dashboardConfig().lotesComparacao;
    const map: Record<string, string> = {
      qualquer_momento: 'LOTES (HISTÓRICO)',
      mes: 'LOTES (MÊS ATUAL)',
      semana: 'LOTES (ESTA SEMANA)',
      dia: 'LOTES (HOJE)',
    };
    return map[periodo] || 'LOTES';
  });

  public lotesSublabel = computed(() => {
    const periodo = this.dashboardConfig().lotesComparacao;
    if (periodo === 'qualquer_momento') return 'Total desde o início';
    return `Comparado ao ${periodo === 'mes' ? 'mês anterior' : periodo === 'semana' ? 'período anterior' : 'dia anterior'}`;
  });

  public unidadesLabel = computed(() => {
    const periodo = this.dashboardConfig().unidadesComparacao;
    const map: Record<string, string> = {
      qualquer_momento: 'UNIDADES (HISTÓRICO)',
      mes: 'UNIDADES (MÊS ATUAL)',
      semana: 'UNIDADES (ESTA SEMANA)',
      dia: 'UNIDADES (HOJE)',
    };
    return map[periodo] || 'UNIDADES';
  });

  public unidadesSublabel = computed(() => {
    const periodo = this.dashboardConfig().unidadesComparacao;
    if (periodo === 'qualquer_momento') return 'Volume total acumulado';
    return periodo === 'mes'
      ? 'Volume total no período'
      : 'Volume no período selecionado';
  });

  public taxaAprovacaoAlvo = computed(() => this.dashboardConfig().taxaAprovacaoAlvo);

  // === AÇÕES ===

  public irParaDetalhe(id: number): void {
    this.router.navigate(['/app/lote', id]);
  }

  public irParaNovoLote(): void {
    this.router.navigate(['/app/lote/novo']);
  }

  public exportarPDF(): void {
    const dadosDashboard = this.dadosDashboard();
    if (dadosDashboard) this.pdfService.gerarRelatorio(dadosDashboard);
  }

  // === UTILITÁRIOS DE TEMPLATE ===

  public obterClasseStatus(status: string): string {
    return loteStatus.obterClasseStatus(status);
  }

  public formatarStatus(status: string): string {
    return loteStatus.formatarStatus(status);
  }
}
