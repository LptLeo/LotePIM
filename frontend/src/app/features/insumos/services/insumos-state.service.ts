import { Injectable, inject, signal, computed } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  InsumosService,
  FiltrosEstoque,
  FiltrosCatalogo,
  OrdenacaoEstoque,
} from './insumos.service.js';
import {
  SseClientService,
  type SseEvento,
} from '../../../core/services/sse-client.service.js';
import type { InsumoEstoque } from '../../../shared/models/lote.models.js';

@Injectable()
export class InsumosStateService {
  private insumosService = inject(InsumosService);
  private sseService = inject(SseClientService);

  // Estados de UI (Filtros e Paginação)
  abaAtiva = signal<'estoque' | 'catalogo'>('estoque');
  termoPesquisa = signal('');
  filtroEsgotado = signal(false);
  filtroFornecedor = signal('');
  ordenarPor = signal<OrdenacaoEstoque>('mais_recente');
  currentPageEstoque = signal(1);
  currentPageCatalogo = signal(1);

  constructor() {
    // Escuta eventos SSE para manter os resources atualizados em tempo real
    this.sseService.eventos$
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.tipo === 'insumo:criado' || e.tipo === 'insumo:status_alterado'),
      )
      .subscribe((evento) => this.tratarEventoSse(evento));
  }

  // Resources (Acesso ao Backend)

  // Resource para o Estoque de Lotes (Apenas Disponíveis)
  estoqueResource = rxResource({
    params: (): FiltrosEstoque => ({
      pagina: this.currentPageEstoque(),
      limite: 10,
      busca: this.abaAtiva() === 'estoque' ? this.termoPesquisa().trim() : '',
      esgotado: this.abaAtiva() === 'estoque' ? this.filtroEsgotado() : false,
      fornecedor: this.abaAtiva() === 'estoque' ? this.filtroFornecedor().trim() : '',
      ordenarPor: this.abaAtiva() === 'estoque' ? this.ordenarPor() : '',
      status: 'disponivel',
    }),
    stream: ({ params }) => this.insumosService.getAll(params),
  });

  // Resource para os Lotes a Receber (Logística)
  lotesReceberResource = rxResource({
    params: () => ({
      pagina: 1,
      limite: 100,
      fornecedor: this.abaAtiva() === 'estoque' ? this.filtroFornecedor().trim() : '',
      ordenarPor:
        this.abaAtiva() === 'estoque' ? this.ordenarPor() : ('' as OrdenacaoEstoque),
      status: 'a_caminho,pendente',
    }),
    stream: ({ params }) => this.insumosService.getAll(params),
  });

  // Resource para o Catálogo de Matérias-Primas
  catalogoResource = rxResource({
    params: (): FiltrosCatalogo => ({
      pagina: this.currentPageCatalogo(),
      limite: 10,
      busca: this.abaAtiva() === 'catalogo' ? this.termoPesquisa().trim() : '',
    }),
    stream: ({ params }) => this.insumosService.getMateriasPrimasPaginado(params),
  });

  // Resource para as Categorias
  categoriasResource = rxResource({
    stream: () => this.insumosService.getCategoriasMateriasPrimas(),
  });

  // Resource para as Métricas do Estoque (Total, Saldo, Esgotados)
  contagemResource = rxResource({
    stream: () => this.insumosService.getContagem(),
  });

  // Resource para o Catálogo Completo (usado para selects)
  catalogoCompletoResource = rxResource({
    stream: () => this.insumosService.getMateriasPrimas(),
  });

  // Derivações Reativas (Computed Signals)

  insumos = computed(() => this.estoqueResource.value()?.itens || []);
  lotesReceber = computed(() => this.lotesReceberResource.value()?.itens || []);
  catalogo = computed(() => this.catalogoResource.value()?.itens || []);
  catalogoCompleto = computed(() => this.catalogoCompletoResource.value() || []);
  categoriasMp = computed(() => this.categoriasResource.value() || []);

  insumosDisponiveis = computed(() => {
    const mapa = new Map<number, InsumoEstoque[]>();
    for (const insumo of this.insumos()) {
      const mpId = insumo.materiaPrima.id;
      const lista = mapa.get(mpId) ?? [];
      lista.push(insumo);
      mapa.set(mpId, lista);
    }
    return mapa;
  });

  paginationMetaEstoque = computed(() => this.estoqueResource.value()?.meta || null);
  paginationMetaCatalogo = computed(() => this.catalogoResource.value()?.meta || null);

  carregando = computed(
    () => this.estoqueResource.isLoading() || this.catalogoResource.isLoading(),
  );

  totalRegistros = computed(() => this.contagemResource.value()?.total || 0);
  totalComSaldo = computed(() => this.contagemResource.value()?.comSaldo || 0);
  totalEsgotados = computed(() => this.contagemResource.value()?.esgotados || 0);
  totalCatalogo = computed(() => this.paginationMetaCatalogo()?.totalItens || 0);

  // Ações (Mutadores de Estado)
  resetarPaginas(): void {
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
  }

  limparFiltrosEstoque(): void {
    this.filtroEsgotado.set(false);
    this.filtroFornecedor.set('');
    this.ordenarPor.set('mais_recente');
    this.currentPageEstoque.set(1);
  }

  private tratarEventoSse(evento: SseEvento): void {
    const { tipo, dados } = evento;

    switch (tipo) {
      case 'insumo:criado':
        // Se for um novo pedido (a_caminho/pendente), atualiza logística.
        // Se for entrada direta (disponível), atualiza estoque e métricas.
        if (dados.status === 'a_caminho' || dados.status === 'pendente') {
          this.lotesReceberResource.reload();
        } else {
          this.estoqueResource.reload();
          this.contagemResource.reload();
        }
        break;

      case 'insumo:status_alterado':
        // Recarrega APENAS o que mudou (KISS e Performance)
        this.lotesReceberResource.reload();
        this.estoqueResource.reload();
        this.contagemResource.reload();
        break;
    }
  }

  reloadAll(): void {
    this.estoqueResource.reload();
    this.catalogoResource.reload();
    this.lotesReceberResource.reload();
    this.contagemResource.reload();
    this.catalogoCompletoResource.reload();
    this.categoriasResource.reload();
  }
}
