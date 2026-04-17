import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoteFeatureService } from './services/lote.service';
import { LoteDetalhe, STATUS_CONFIG, LoteStatus } from '../../shared/models/lote.models';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card';
import { LoteCardComponent } from '../../shared/components/lote-card/lote-card';
import { FilterTabsComponent, FilterTab } from '../../shared/components/filter-tabs/filter-tabs';

@Component({
  selector: 'app-lote',
  standalone: true,
  imports: [CommonModule, StatCardComponent, LoteCardComponent, FilterTabsComponent],
  templateUrl: './lote.html',
  styleUrl: './lote.css',
})
export class Lote implements OnInit {
  private loteService = inject(LoteFeatureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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

  // Sinal computado para exibir apenas os lotes que batem com o filtro selecionado
  lotes = computed(() => {
    const lista = this.lotesBase();
    const filtro = this.filtroAtivo();

    if (filtro === 'todos') return lista;
    return lista.filter(l => l.status === filtro);
  });

  // Estatísticas computadas
  producaoTotalAcumulada = computed(() => {
    return this.lotesBase().reduce((acc, curr) => acc + (curr.quantidade_prod || 0), 0);
  });

  statsCargaSistema = computed(() => {
    // Lógica fictícia para "Carga do Sistema" baseada no % de lotes em produção
    const total = this.lotesBase().length;
    if (total === 0) return 0;
    const emProducao = this.lotesBase().filter(l => l.status === 'em_producao').length;
    return Math.round((emProducao / total) * 100);
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
    // Escuta mudanças nos parâmetros da URL (ex: ?busca=Produto X)
    this.route.queryParams.subscribe(params => {
      const busca = params['busca'];
      this.carregarLotes(busca);
    });
  }

  carregarLotes(busca?: string): void {
    this.carregando.set(true);
    this.erro.set(null);

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
          this.erro.set('Não foi possível carregar a lista de lotes.');
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
