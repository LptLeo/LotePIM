import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoteFeatureService } from './services/lote.service';
import { LoteDetalhe, STATUS_CONFIG, LoteStatus } from '../../shared/models/lote.models';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card';
import { LoteCardComponent } from '../../shared/components/lote-card/lote-card';
import { FilterTabsComponent, FilterTab } from '../../shared/components/filter-tabs/filter-tabs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ConfiguracoesService } from '../../core/services/configuracoes.service';
import { PaginationComponent, PaginationMeta } from '../../shared/components/pagination/pagination';

/** Fallback caso o backend não responda — 2 minutos como padrão de demo */
const FALLBACK_DURACAO_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-lote',
  standalone: true,
  imports: [CommonModule, StatCardComponent, LoteCardComponent, FilterTabsComponent, PageHeaderComponent, DecimalPipe, PaginationComponent],
  templateUrl: './lote.html',
  styleUrl: './lote.css',
})
export class Lote implements OnInit, OnDestroy {
  /** Referência do setInterval para limpeza no OnDestroy */
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private loteService = inject(LoteFeatureService);
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

  // Estados reativos (Signals)
  lotes = signal<LoteDetalhe[]>([]);
  paginationMeta = signal<PaginationMeta | null>(null);
  carregando = signal<boolean>(false);
  erro = signal<string | null>(null);
  filtroAtivo = signal<string>('todos');
  currentPage = signal<number>(1);

  /**
   * Signal que incrementa a cada segundo.
   * Serve como "relógio" reativo: qualquer computed que o leia
   * será recalculado automaticamente a cada tick.
   */
  private tick = signal<number>(Date.now());

  // Estatísticas computadas
  /** Duração de produção em ms — carregada do backend, com fallback */
  protected duracaoMs = signal<number>(FALLBACK_DURACAO_MS);

  producaoTotalLabel = computed(() => {
    const p = this.configuracoesService.settings().lote.producaoTotalPeriodo;
    const map = {
      qualquer_momento: 'Produção Total Acumulada',
      mes: 'Produção (Mês Atual)',
      semana: 'Produção (Última Semana)',
      dia: 'Produção (Hoje)'
    };
    return map[p] || 'Produção Total';
  });

  producaoTotalAcumulada = computed(() => {
    // IMPORTANTE: Como a lista é paginada, a métrica deve usar o totalItens do meta global
    return this.paginationMeta()?.totalItens || 0;
  });

  statsCargaSistema = computed(() => {
    const baseValue = this.configuracoesService.settings().lote.atividadeTempoRealBase || 5;
    // IMPORTANTE: Usa a contagem global do servidor para a métrica, não apenas a página atual
    const emProducao = this.contagemPorStatus()['em_producao'] || 0;
    const val = (emProducao / baseValue) * 100;
    return parseFloat(val.toFixed(1));
  });

  contagemPorStatus = signal<Record<string, number>>({
    todos: 0,
    em_producao: 0,
    aguardando_inspecao: 0,
    aprovado: 0,
    reprovado: 0,
    aprovado_restricao: 0
  });

  ngOnInit(): void {
    // Escuta mudanças na URL para atualizar os sinais e carregar os dados
    this.route.queryParams.subscribe(params => {
      const busca = params['busca'] || '';
      const status = params['status'] || 'todos';
      const pagina = Number(params['pagina']) || 1;
      
      this.filtroAtivo.set(status);
      this.currentPage.set(pagina);
      
      this.carregarLotes(busca);
      this.carregarContagens();
    });

    /** Carrega o tempo de produção configurado no backend */
    this.loteService.getConfig().subscribe({
      next: (config) => {
        this.duracaoMs.set(config.tempo_producao_minutos * 60 * 1000);
      },
      error: () => {
        console.warn('[lote] Não foi possível carregar a config — usando fallback de 2 min.');
      },
    });

    let tickCount = 0;
    this.tickIntervalId = setInterval(() => {
      this.tick.set(Date.now());
      tickCount++;

      // Realtime Sync Polling: A cada 5 segundos re-valida silenciosamente caso haja lote em produção
      if (tickCount % 5 === 0) {
        const temLoteProduzindo = this.lotes().some(l => l.status === 'em_producao');
        if (temLoteProduzindo) {
          const buscaAtual = this.route.snapshot.queryParams['busca'];
          this.carregarLotes(buscaAtual, true);
          this.carregarContagens();
        }
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
    }
  }

  carregarLotes(busca?: string, sutil = false): void {
    if (!sutil) {
      this.carregando.set(true);
      this.erro.set(null);
    }

    const filtros = {
      pagina: this.currentPage(),
      limite: 9, // Layout em grid 3x3
      status: this.filtroAtivo(),
      busca: busca || ''
    };

    this.loteService.getLotes(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (res) => {
          // Só atualiza o sinal se houver mudança real nos dados (comparação simples de string)
          // Isso evita que o Angular re-renderize os componentes a cada polling silencioso.
          if (JSON.stringify(res.itens) !== JSON.stringify(this.lotes())) {
            this.lotes.set(res.itens);
          }
          this.paginationMeta.set(res.meta);
        },
        error: (err) => {
          console.error('Erro ao carregar lotes:', err);
          if (!sutil) this.erro.set('Não foi possível carregar a lista de lotes.');
        }
      });
  }

  carregarContagens(): void {
    this.loteService.getContagem().subscribe({
      next: (counts) => this.contagemPorStatus.set(counts),
      error: (err) => console.error('Erro ao carregar contagens:', err)
    });
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
