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

/** Fallback caso o backend não responda — 2 minutos como padrão de demo */
const FALLBACK_DURACAO_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-lote',
  standalone: true,
  imports: [CommonModule, StatCardComponent, LoteCardComponent, FilterTabsComponent, PageHeaderComponent, DecimalPipe],
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
  private lotesBase = signal<LoteDetalhe[]>([]); // Lista completa para contagens
  carregando = signal<boolean>(false);
  erro = signal<string | null>(null);
  filtroAtivo = signal<string>('todos');

  /**
   * Signal que incrementa a cada segundo.
   * Serve como "relógio" reativo: qualquer computed que o leia
   * será recalculado automaticamente a cada tick.
   */
  private tick = signal<number>(Date.now());

  // Sinal computado para exibir apenas os lotes que batem com o filtro selecionado
  lotes = computed(() => {
    const lista = this.lotesBase();
    const filtro = this.filtroAtivo();

    if (filtro === 'todos') return lista;
    return lista.filter(l => l.status === filtro);
  });

  // Estatísticas computadas
  /** Duração de produção em ms — carregada do backend, com fallback */
  private duracaoMs = signal<number>(FALLBACK_DURACAO_MS);

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
    const period = this.configuracoesService.settings().lote.producaoTotalPeriodo;
    const now = new Date();
    let filteredLotes = this.lotesBase();

    if (period === 'mes') {
      filteredLotes = filteredLotes.filter(l => {
        const d = new Date(l.aberto_em);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (period === 'semana') {
      // Simplificação de semana (últimos 7 dias)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredLotes = filteredLotes.filter(l => new Date(l.aberto_em) >= oneWeekAgo);
    } else if (period === 'dia') {
      filteredLotes = filteredLotes.filter(l => {
        const d = new Date(l.aberto_em);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    return filteredLotes.reduce((acc, curr) => acc + (curr.quantidade_planejada || 0), 0);
  });

  statsCargaSistema = computed(() => {
    const baseValue = this.configuracoesService.settings().lote.atividadeTempoRealBase || 1000;
    const emProducao = this.lotesBase().filter(l => l.status === 'em_producao').length;
    // Cálculo: (emProducao / baseValue) * 100
    const val = (emProducao / baseValue) * 100;
    return parseFloat(val.toFixed(1));
  });

  contagemPorStatus = computed(() => {
    const counts: Record<LoteStatus | 'todos', number> = {
      todos: this.lotesBase().length,
      em_producao: 0,
      aguardando_inspecao: 0,
      aprovado: 0,
      reprovado: 0,
      aprovado_restricao: 0
    };

    this.lotesBase().forEach(l => {
      if (counts[l.status] !== undefined) {
        counts[l.status]++;
      }
    });

    return counts;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const busca = params['busca'];
      this.carregarLotes(busca);
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

      // Realtime Sync Polling: A cada 5 segundos re-valida silenciosamente caso haja lote transicionando ou em produção
      if (tickCount % 5 === 0) {
        const precisaSincronizar = this.lotesBase().some(l => l.status === 'em_producao');
        if (precisaSincronizar) {
          const buscaAtual = this.route.snapshot.queryParams['busca'];
          this.carregarLotes(buscaAtual, true);
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

    // Buscamos SEMPRE todos os lotes para manter as contagens das abas precisas
    // O filtro de status agora é aplicado localmente via Signal Computed
    this.loteService.getLotes({})
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (data) => {
          if (busca) {
            const termo = busca.toLowerCase();
            const filtrados = data.filter(l =>
              l.numero_lote.toLowerCase().includes(termo) ||
              l.produto.nome.toLowerCase().includes(termo)
            );
            this.lotesBase.set(filtrados);
          } else {
            this.lotesBase.set(data);
          }
        },
        error: (err) => {
          console.error('Erro ao carregar lotes:', err);
          if (!sutil) this.erro.set('Não foi possível carregar a lista de lotes.');
        }
      });
  }

  alterarFiltro(status: string): void {
    this.filtroAtivo.set(status);
    // Não precisamos chamar carregarLotes() aqui pois o sinal computado 'lotes'
    // reagirá automaticamente à mudança de filtroAtivo()
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { busca: null },
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
