import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  InsumosService,
  RegistrarEntradaForm,
  CriarInsumoEstoquePayload,
  OrdenacaoEstoque,
} from './services/insumos.service.js';
import { InsumosStateService } from './services/insumos-state.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { ToastService } from '../../core/services/toast.service.js';

import { MetricCardsComponent } from './components/metric-cards/metric-cards.component.js';
import { EstoqueListComponent } from './components/estoque-list/estoque-list.component.js';
import { CatalogoTableComponent } from './components/catalogo-table/catalogo-table.component.js';
import { NovaMpModalComponent } from './components/nova-mp-modal/nova-mp-modal.component.js';
import { RegistrarEntradaModalComponent } from './components/registrar-entrada-modal/registrar-entrada-modal.component.js';
import { PedirInsumosModalComponent } from './components/pedir-insumos-modal/pedir-insumos-modal.component.js';
import { LotesReceberComponent } from './components/lotes-receber/lotes-receber.component.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { finalize } from 'rxjs';

import type { MateriaPrima } from '../../shared/models/lote.models.js';
import type { PedidoInsumoItem } from './components/pedir-insumos-modal/pedir-insumos-modal.component.js';

@Component({
  selector: 'app-insumos',
  standalone: true,
  providers: [InsumosStateService],
  imports: [
    CommonModule,
    MetricCardsComponent,
    EstoqueListComponent,
    CatalogoTableComponent,
    NovaMpModalComponent,
    RegistrarEntradaModalComponent,
    PedirInsumosModalComponent,
    LotesReceberComponent,
    PaginationComponent,
  ],
  templateUrl: './insumos.html',
})
export class Insumos {
  // Injeção de dependências
  private insumosService = inject(InsumosService);
  private toastService = inject(ToastService);
  authService = inject(AuthService);
  state = inject(InsumosStateService);

  // Estados Locais de UI (Modais e Errors)
  modalAberto = signal(false);
  salvandoMp = signal(false);
  erroMp = signal<string | null>(null);

  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  modalPedidoAberto = signal(false);

  // Permissões
  isOperador = computed(() => this.authService.usuario()?.perfil === 'operador');

  // Orquestração de UI
  onPageChange(pagina: number): void {
    if (this.state.abaAtiva() === 'estoque') {
      this.state.currentPageEstoque.set(pagina);
    } else {
      this.state.currentPageCatalogo.set(pagina);
    }
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.state.termoPesquisa.set(valor);
    this.state.resetarPaginas();
  }

  setFornecedor(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.state.filtroFornecedor.set(valor);
    this.state.currentPageEstoque.set(1);
  }

  setOrdenacao(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value as OrdenacaoEstoque;
    this.state.ordenarPor.set(valor);
    this.state.currentPageEstoque.set(1);
  }

  toggleEsgotado(): void {
    this.state.filtroEsgotado.update((v) => !v);
    this.state.currentPageEstoque.set(1);
  }

  setAba(aba: 'estoque' | 'catalogo'): void {
    this.state.abaAtiva.set(aba);
    this.state.termoPesquisa.set('');
    this.state.resetarPaginas();
  }

  // Fluxos de Escrita (Ações Imperativas)
  salvarNovaMp(payload: Partial<MateriaPrima>): void {
    this.salvandoMp.set(true);
    this.erroMp.set(null);

    this.insumosService
      .criarMateriaPrima(payload)
      .pipe(finalize(() => this.salvandoMp.set(false)))
      .subscribe({
        next: () => {
          this.state.reloadAll();
          this.modalAberto.set(false);
        },
        error: (err) => {
          this.erroMp.set(err.error?.message || 'Erro ao salvar matéria-prima.');
        },
      });
  }

  salvarEstoque(payload: RegistrarEntradaForm): void {
    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);

    const formattedPayload = this.montarPayloadEntradaEstoque(payload);

    this.insumosService
      .create(formattedPayload)
      .pipe(finalize(() => this.salvandoEstoque.set(false)))
      .subscribe({
        next: () => {
          this.state.reloadAll();
          this.modalEstoqueAberto.set(false);
        },
        error: (err) => {
          this.erroEstoque.set(err.error?.message || 'Erro ao registrar entrada.');
        },
      });
  }

  processarPedido(itens: PedidoInsumoItem[]): void {
    this.modalPedidoAberto.set(false);

    const payload = itens.map((item) => ({
      ...this.montarPayloadPedido(item),
      status: 'a_caminho' as const,
    }));

    this.insumosService.createBulk(payload).subscribe({
      next: (lotes) => {
        this.state.lotesReceberResource.reload();
        this.toastService.success(
          `Pedido realizado! ${lotes.length} lotes estão a caminho.`,
        );
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Erro ao processar o pedido.');
      },
    });
  }

  receberLoteFisico(id: number): void {
    this.insumosService.atualizarStatus(id, 'disponivel').subscribe({
      next: () => {
        this.toastService.success('Insumo recebido no estoque!');
        this.state.reloadAll();
      },
      error: () => this.toastService.error('Erro ao confirmar recebimento.'),
    });
  }

  // Helpers de Mapeamento
  private montarPayloadPedido(item: PedidoInsumoItem): CriarInsumoEstoquePayload {
    return {
      materia_prima_id: item.materia_prima_id,
      numero_lote_fornecedor: 'PEDIDO-AUTO',
      fornecedor: 'Fornecedor Homologado',
      quantidade_inicial: Number(item.quantidade),
      turno: 'manha',
      data_validade: null,
    };
  }

  private montarPayloadEntradaEstoque(
    payload: RegistrarEntradaForm,
  ): CriarInsumoEstoquePayload {
    return {
      materia_prima_id: Number(payload.materia_prima_id),
      numero_lote_fornecedor: payload.numero_lote_fornecedor,
      fornecedor: payload.fornecedor,
      quantidade_inicial: Number(payload.quantidade_inicial),
      turno: payload.turno,
      data_validade: payload.naoAplicaValidade ? null : (payload.data_validade ?? null),
    };
  }
}
