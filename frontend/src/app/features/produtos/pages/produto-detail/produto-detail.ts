import { Component, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdutosService } from '../../services/produtos.service.js';
import type {
  Produto,
  ReceitaItem,
  MateriaPrima,
} from '../../../../shared/models/lote.models.js';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service.js';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';

import { ProdutoInfoCardsComponent } from './components/produto-info-cards/produto-info-cards.component.js';
import { ProdutoReceitaComponent } from './components/produto-receita/produto-receita.component.js';

@Component({
  selector: 'app-produto-detail',
  standalone: true,
  imports: [ProdutoInfoCardsComponent, ProdutoReceitaComponent],
  templateUrl: './produto-detail.html',
})
export class ProdutoDetail {
  // === DEPENDÊNCIAS ===
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private produtosService = inject(ProdutosService);
  private authService = inject(AuthService);

  // === ROTA ===
  private params = toSignal(this.route.paramMap);
  private produtoId = computed(() => Number(this.params()?.get('id')));

  // === RECURSOS ===
  public produtoResource = rxResource<Produto, { id: number }>({
    params: () => ({ id: this.produtoId() }),
    stream: ({ params }) => this.produtosService.buscarPorId(params.id),
  });

  public materiasResource = rxResource<MateriaPrima[], void>({
    stream: () => this.produtosService.listarMateriasPrimas(),
  });

  // === DERIVAÇÕES ===
  public produto = computed(() => this.produtoResource.value() ?? null);
  public carregando = computed(() => this.produtoResource.isLoading());
  public erro = computed<string | null>(() =>
    this.produtoResource.error()
      ? 'Não foi possível carregar os detalhes do produto. Ele pode não existir ou o servidor está offline.'
      : null,
  );
  public materiasPrimas = computed(() => this.materiasResource.value() ?? []);

  // === ESTADO LOCAL ===
  public modoEdicaoReceita = signal(false);
  public receitaEditada = signal<ReceitaItem[]>([]);
  public salvandoReceita = signal(false);
  public alterandoStatus = signal(false);
  public erroReceita = signal<string | null>(null);
  public confirmacaoPendente = signal<'ativar' | 'desativar' | null>(null);

  public ehGestor = computed(() => this.authService.usuario()?.perfil === 'gestor');

  public mpDisponiveis = computed<MateriaPrima[]>(() => {
    const idsUsados = this.receitaEditada().map((r) => r.materiaPrima.id);
    return this.materiasPrimas().filter((mp) => !idsUsados.includes(mp.id));
  });

  constructor() {
    effect(() => {
      const prod = this.produto();
      if (prod && !this.modoEdicaoReceita()) {
        this.receitaEditada.set(structuredClone(prod.receita ?? []));
      }
    });
  }

  // === MÉTODOS DE EDIÇÃO ===
  public iniciarEdicaoReceita(): void {
    const prod = this.produto();
    if (prod) {
      this.receitaEditada.set(structuredClone(prod.receita ?? []));
    }
    this.erroReceita.set(null);
    this.modoEdicaoReceita.set(true);
  }

  public cancelarEdicaoReceita(): void {
    this.modoEdicaoReceita.set(false);
    this.erroReceita.set(null);
    const prod = this.produto();
    if (prod) {
      this.receitaEditada.set(structuredClone(prod.receita ?? []));
    }
  }

  public adicionarMateriaPrima(mpId: number): void {
    const mp = this.materiasPrimas().find((m) => m.id === mpId);
    if (!mp) return;

    this.receitaEditada.update((receita) => [
      ...receita,
      { id: 0, materiaPrima: mp, quantidade: 1, unidade: mp.unidade_medida },
    ]);
  }

  public removerItemReceita(index: number): void {
    this.receitaEditada.update((receita) => receita.filter((_, i) => i !== index));
  }

  public atualizarQuantidade(index: number, novaQtd: string): void {
    const qtd = Number(novaQtd);
    if (isNaN(qtd) || qtd <= 0) return;

    this.receitaEditada.update((receita) => {
      const nova = [...receita];
      nova[index] = { ...nova[index], quantidade: qtd };
      return nova;
    });
  }

  async salvarReceita(): Promise<void> {
    const prod = this.produto();
    if (!prod) return;

    this.salvandoReceita.set(true);
    this.erroReceita.set(null);

    const payload = this.receitaEditada().map((item) => ({
      materia_prima_id: item.materiaPrima.id,
      quantidade: item.quantidade,
      unidade: item.unidade,
    }));

    try {
      await lastValueFrom(this.produtosService.atualizarReceita(prod.id, payload));
      this.modoEdicaoReceita.set(false);
      this.produtoResource.reload();
    } catch (err) {
      this.erroReceita.set(this.formatarErroReceita(err));
    } finally {
      this.salvandoReceita.set(false);
    }
  }

  private formatarErroReceita(err: unknown): string {
    let msg =
      err instanceof HttpErrorResponse
        ? err.error?.message || 'Erro ao salvar a receita.'
        : 'Erro ao salvar a receita.';
    if (
      err instanceof HttpErrorResponse &&
      err.error?.details &&
      Array.isArray(err.error.details)
    ) {
      const detalhes = (err.error.details as { mensagem: string }[])
        .map((d) => d.mensagem)
        .join(' • ');
      if (detalhes) msg += ` — ${detalhes}`;
    }
    return msg;
  }

  public voltarParaLista(): void {
    this.router.navigate(['/app/produtos']);
  }

  public solicitarAlternanciaStatus(): void {
    const prod = this.produto();
    if (!prod) return;
    this.confirmacaoPendente.set(prod.ativo ? 'desativar' : 'ativar');
  }

  public cancelarAlternanciaStatus(): void {
    this.confirmacaoPendente.set(null);
  }

  async confirmarAlternanciaStatus(): Promise<void> {
    const prod = this.produto();
    if (!prod) return;

    this.confirmacaoPendente.set(null);
    this.alterandoStatus.set(true);

    try {
      await lastValueFrom(this.produtosService.alternarStatus(prod.id, !prod.ativo));
      this.produtoResource.reload();
    } catch (err) {
      this.erroReceita.set(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Erro ao alterar o status do produto.'
          : 'Erro ao alterar o status do produto.',
      );
    } finally {
      this.alterandoStatus.set(false);
    }
  }
}
