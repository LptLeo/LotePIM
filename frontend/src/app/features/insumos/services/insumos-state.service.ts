import { Injectable, inject, signal, computed } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  InsumosService,
  type FiltrosEstoque,
  type FiltrosCatalogo,
  type OrdenacaoEstoque,
} from './insumos.service.js';
import {
  SseClientService,
  type SseEvento,
} from '../../../core/services/sse-client.service.js';
import type { InsumoEstoque } from '../../../shared/models/lote.models.js';

@Injectable()
export class InsumosStateService {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private insumosService = inject(InsumosService);
  private sseService = inject(SseClientService);

  // === ESTADOS DE UI (FILTROS E PAGINAÇÃO) ===
  abaAtiva = signal<'estoque' | 'catalogo'>('estoque');
  termoPesquisa = signal('');
  filtroEsgotado = signal(false);
  filtroFornecedor = signal('');
  ordenarPor = signal<OrdenacaoEstoque>('mais_recente');
  paginaAtualEstoque = signal(1);
  paginaAtualCatalogo = signal(1);

  constructor() {
    this.sseService.eventos$
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.tipo === 'insumo:criado' || e.tipo === 'insumo:status_alterado'),
      )
      .subscribe((evento) => this.tratarEventoSse(evento));
  }

  // === RESOURCES (ACESSO AO BACKEND) ===
  private estoqueResource = rxResource({
    params: (): FiltrosEstoque => ({
      pagina: this.paginaAtualEstoque(),
      limite: 10,
      busca: this.abaAtiva() === 'estoque' ? this.termoPesquisa().trim() : '',
      esgotado: this.abaAtiva() === 'estoque' ? this.filtroEsgotado() : false,
      fornecedor: this.abaAtiva() === 'estoque' ? this.filtroFornecedor().trim() : '',
      ordenarPor: this.abaAtiva() === 'estoque' ? this.ordenarPor() : '',
      status: 'disponivel',
    }),
    stream: ({ params }) => this.insumosService.listar(params),
  });

  private lotesReceberResource = rxResource({
    params: () => ({
      pagina: 1,
      limite: 100,
      fornecedor: this.abaAtiva() === 'estoque' ? this.filtroFornecedor().trim() : '',
      ordenarPor:
        this.abaAtiva() === 'estoque' ? this.ordenarPor() : ('' as OrdenacaoEstoque),
      status: 'a_caminho,pendente',
    }),
    stream: ({ params }) => this.insumosService.listar(params),
  });

  private catalogoResource = rxResource({
    params: (): FiltrosCatalogo => ({
      pagina: this.paginaAtualCatalogo(),
      limite: 10,
      busca: this.abaAtiva() === 'catalogo' ? this.termoPesquisa().trim() : '',
    }),
    stream: ({ params }) => this.insumosService.listarMateriasPrimasPaginado(params),
  });

  private categoriasResource = rxResource({
    stream: () => this.insumosService.obterCategorias(),
  });

  private contagemResource = rxResource({
    stream: () => this.insumosService.obterContagem(),
  });

  private catalogoCompletoResource = rxResource({
    stream: () => this.insumosService.obterMateriasPrimas(),
  });

  // === DERIVAÇÕES REATIVAS (COMPUTED) ===
  insumos = computed(() => this.estoqueResource.value()?.itens || []);
  lotesReceber = computed(() => this.lotesReceberResource.value()?.itens || []);
  catalogo = computed(() => this.catalogoResource.value()?.itens || []);
  catalogoCompleto = computed(() => this.catalogoCompletoResource.value() || []);
  categoriasMp = computed(() => this.categoriasResource.value() || []);

  insumosDisponiveis = computed(() => {
    const mapa = new Map<number, InsumoEstoque[]>();
    for (const insumo of this.insumos()) {
      const idMateriaPrima = insumo.materiaPrima.id;
      const listaLotes = mapa.get(idMateriaPrima) ?? [];
      listaLotes.push(insumo);
      mapa.set(idMateriaPrima, listaLotes);
    }
    return mapa;
  });

  metaPaginacaoEstoque = computed(() => this.estoqueResource.value()?.meta || null);
  metaPaginacaoCatalogo = computed(() => this.catalogoResource.value()?.meta || null);

  carregando = computed(
    () => this.estoqueResource.isLoading() || this.catalogoResource.isLoading(),
  );

  totalRegistros = computed(() => this.contagemResource.value()?.total || 0);
  totalComSaldo = computed(() => this.contagemResource.value()?.comSaldo || 0);
  totalEsgotados = computed(() => this.contagemResource.value()?.esgotados || 0);
  totalCatalogo = computed(() => this.metaPaginacaoCatalogo()?.totalItens || 0);

  // === MÉTODOS PÚBLICOS ===
  public resetarPaginas(): void {
    this.paginaAtualEstoque.set(1);
    this.paginaAtualCatalogo.set(1);
  }

  public limparFiltrosEstoque(): void {
    this.filtroEsgotado.set(false);
    this.filtroFornecedor.set('');
    this.ordenarPor.set('mais_recente');
    this.paginaAtualEstoque.set(1);
  }

  public recarregarTudo(): void {
    this.estoqueResource.reload();
    this.catalogoResource.reload();
    this.lotesReceberResource.reload();
    this.contagemResource.reload();
    this.catalogoCompletoResource.reload();
    this.categoriasResource.reload();
  }

  // === MÉTODOS PRIVADOS ===
  private tratarEventoSse(evento: SseEvento): void {
    const { tipo, dados } = evento;

    switch (tipo) {
      case 'insumo:criado':
        if (dados.status === 'a_caminho' || dados.status === 'pendente') {
          this.lotesReceberResource.reload();
        } else {
          this.estoqueResource.reload();
          this.contagemResource.reload();
        }
        break;

      case 'insumo:status_alterado':
        this.lotesReceberResource.reload();
        this.estoqueResource.reload();
        this.contagemResource.reload();
        break;
    }
  }
}
