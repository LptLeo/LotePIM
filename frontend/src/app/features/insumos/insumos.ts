import { Component, inject, signal, computed } from '@angular/core';
import {
  InsumosService,
  RegistrarEntradaDTO,
  CriarInsumoEstoqueDTO,
  type OrdenacaoEstoque,
} from './services/insumos.service.js';
import { InsumosStateService } from './services/insumos-state.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { ToastService } from '../../core/services/toast.service.js';

import { MetricCardsComponent } from './components/metric-cards/metric-cards.component.js';
import { EstoqueListComponent } from './components/estoque-list/estoque-list.component.js';
import { CatalogoTableComponent } from './components/catalogo-table/catalogo-table.component.js';
import { NovaMpModalComponent } from './components/nova-mp-modal/nova-mp-modal.component.js';
import { RegistrarEntradaModalComponent } from './components/registrar-entrada-modal/registrar-entrada-modal.component.js';
import {
  PedirInsumosModalComponent,
  type PedidoInsumoItem,
} from './components/pedir-insumos-modal/pedir-insumos-modal.component.js';
import { LotesReceberComponent } from './components/lotes-receber/lotes-receber.component.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import type { MateriaPrima } from '../../shared/models/lote.models.js';

@Component({
  selector: 'app-insumos',
  standalone: true,
  providers: [InsumosStateService],
  imports: [
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
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private insumosService = inject(InsumosService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);
  public state = inject(InsumosStateService);

  // === ESTADOS DE UI (MODAIS) ===
  modalAberto = signal(false);
  salvandoMp = signal(false);
  erroMp = signal<string | null>(null);

  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  modalPedidoAberto = signal(false);

  // === PERMISSÕES ===
  ehOperador = computed(() => this.authService.usuario()?.perfil === 'operador');

  // === MÉTODOS PÚBLICOS ===
  public definirAba(aba: 'estoque' | 'catalogo'): void {
    this.state.abaAtiva.set(aba);
    this.state.termoPesquisa.set('');
    this.state.resetarPaginas();
  }

  public aoPesquisar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.state.termoPesquisa.set(valor);
    this.state.resetarPaginas();
  }

  public definirFornecedor(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.state.filtroFornecedor.set(valor);
    this.state.paginaAtualEstoque.set(1);
  }

  public definirOrdenacao(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value as OrdenacaoEstoque;
    this.state.ordenarPor.set(valor);
    this.state.paginaAtualEstoque.set(1);
  }

  public alternarEsgotado(): void {
    this.state.filtroEsgotado.update((v) => !v);
    this.state.paginaAtualEstoque.set(1);
  }

  public aoMudarPagina(pagina: number): void {
    if (this.state.abaAtiva() === 'estoque') {
      this.state.paginaAtualEstoque.set(pagina);
    } else {
      this.state.paginaAtualCatalogo.set(pagina);
    }
  }

  public async salvarNovaMp(payload: Partial<MateriaPrima>): Promise<void> {
    this.salvandoMp.set(true);
    this.erroMp.set(null);
    try {
      await lastValueFrom(this.insumosService.criarMateriaPrima(payload));
      this.state.recarregarTudo();
      this.modalAberto.set(false);
    } catch (erro) {
      this.erroMp.set(
        erro instanceof HttpErrorResponse
          ? erro.error?.message || 'Erro ao salvar matéria-prima.'
          : 'Erro ao salvar matéria-prima.',
      );
    } finally {
      this.salvandoMp.set(false);
    }
  }

  public async salvarEstoque(payload: RegistrarEntradaDTO): Promise<void> {
    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);
    try {
      const dadosFormatados = this.montarPayloadEntrada(payload);
      await lastValueFrom(this.insumosService.registrarLote(dadosFormatados));
      this.state.recarregarTudo();
      this.modalEstoqueAberto.set(false);
    } catch (erro) {
      this.erroEstoque.set(
        erro instanceof HttpErrorResponse
          ? erro.error?.message || 'Erro ao registrar entrada.'
          : 'Erro ao registrar entrada.',
      );
    } finally {
      this.salvandoEstoque.set(false);
    }
  }

  public async processarPedido(itens: PedidoInsumoItem[]): Promise<void> {
    this.modalPedidoAberto.set(false);
    try {
      const dadosPedido = itens.map((itemPedido) => ({
        ...this.montarPayloadPedido(itemPedido),
        status: 'a_caminho' as const,
      }));
      const lotes = await lastValueFrom(this.insumosService.criarLotes(dadosPedido));
      this.state.recarregarTudo();
      this.toastService.success(
        `Pedido realizado! ${lotes.length} lotes estão a caminho.`,
      );
    } catch (erro) {
      this.toastService.error(
        erro instanceof HttpErrorResponse
          ? erro.error?.message || 'Erro ao processar o pedido.'
          : 'Erro ao processar o pedido.',
      );
    }
  }

  public async receberLoteFisico(id: number): Promise<void> {
    try {
      await lastValueFrom(this.insumosService.atualizarStatus(id, 'disponivel'));
      this.toastService.success('Insumo recebido no estoque!');
      this.state.recarregarTudo();
    } catch {
      this.toastService.error('Erro ao confirmar recebimento.');
    }
  }

  // === MÉTODOS PRIVADOS ===
  private montarPayloadPedido(item: PedidoInsumoItem): CriarInsumoEstoqueDTO {
    return {
      materiaPrimaId: item.materia_prima_id,
      numero_lote_fornecedor: 'PEDIDO-AUTO',
      fornecedor: 'Fornecedor Homologado',
      quantidade_inicial: Number(item.quantidade),
      turno: 'manha',
      data_validade: null,
    };
  }

  private montarPayloadEntrada(payload: RegistrarEntradaDTO): CriarInsumoEstoqueDTO {
    return {
      materiaPrimaId: Number(payload.materia_prima_id),
      numero_lote_fornecedor: payload.numero_lote_fornecedor,
      fornecedor: payload.fornecedor,
      quantidade_inicial: Number(payload.quantidade_inicial),
      turno: payload.turno,
      data_validade: payload.naoAplicaValidade ? null : (payload.data_validade ?? null),
    };
  }
}
