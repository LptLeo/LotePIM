import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdutosService } from '../../services/produtos.service.js';
import type {
  Produto,
  ReceitaItem,
  MateriaPrima,
} from '../../../../shared/models/lote.models.js';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service.js';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';

import { ProdutoInfoCardsComponent } from './components/produto-info-cards/produto-info-cards.component.js';
import { ProdutoReceitaComponent } from './components/produto-receita/produto-receita.component.js';

@Component({
  selector: 'app-produto-detail',
  standalone: true,
  imports: [CommonModule, ProdutoInfoCardsComponent, ProdutoReceitaComponent],
  templateUrl: './produto-detail.html',
})
export class ProdutoDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private produtosService = inject(ProdutosService);
  private authService = inject(AuthService);

  //  Rota reativa
  private params = toSignal(this.route.paramMap);
  private produtoId = computed(() => Number(this.params()?.get('id')));

  //  Resources Declarativos
  /**
   * Resource do produto: recarrega automaticamente se o ID da rota mudar.
   * Elimina ngOnInit + subscribe manual.
   */
  produtoResource = rxResource<Produto, { id: number }>({
    params: () => ({ id: this.produtoId() }),
    stream: ({ params }) => this.produtosService.buscarPorId(params.id),
  });

  /**
   * Resource de matérias-primas: carregado uma única vez.
   * Fonte de verdade para o seletor de edição da receita.
   */
  materiasResource = rxResource<MateriaPrima[], void>({
    stream: () => this.produtosService.listarMateriasPrimas(),
  });

  //  Derivações reativas
  produto = computed(() => this.produtoResource.value() ?? null);
  carregando = computed(() => this.produtoResource.isLoading());
  erro = computed(() =>
    this.produtoResource.error()
      ? 'Não foi possível carregar os detalhes do produto. Ele pode não existir ou o servidor está offline.'
      : null,
  );
  materiasPrimas = computed(() => this.materiasResource.value() ?? []);

  //  Estado local de edição
  modoEdicaoReceita = signal<boolean>(false);
  /**
   * Cópia editável da receita — inicializada/resetada via effect
   * sempre que o produto carregar ou a edição for cancelada.
   */
  receitaEditada = signal<ReceitaItem[]>([]);
  salvandoReceita = signal<boolean>(false);
  alterandoStatus = signal<boolean>(false);

  //  Erros de ação (inline, sem alert())
  erroReceita = signal<string | null>(null);

  /**
   * Confirmação de alternância de status: null = nenhuma confirmação pendente.
   * Substitui window.confirm() por um dialog declarativo no template.
   */
  confirmacaoPendente = signal<'ativar' | 'desativar' | null>(null);

  isGestor = computed(() => this.authService.usuario()?.perfil === 'gestor');

  /** Matérias-primas disponíveis: exclui as que já estão na receita em edição */
  mpDisponiveis = computed<MateriaPrima[]>(() => {
    const idsUsados = this.receitaEditada().map((r) => r.materiaPrima.id);
    return this.materiasPrimas().filter((mp) => !idsUsados.includes(mp.id));
  });

  constructor() {
    /**
     * Sincroniza a cópia editável sempre que o produto for carregado.
     * Garante que ao navegar para outro produto, a receita não persiste.
     */
    effect(() => {
      const prod = this.produto();
      if (prod) {
        this.receitaEditada.set(structuredClone(prod.receita ?? []));
      }
    });
  }

  iniciarEdicaoReceita(): void {
    const prod = this.produto();
    if (prod) {
      this.receitaEditada.set(structuredClone(prod.receita ?? []));
    }
    this.erroReceita.set(null);
    this.modoEdicaoReceita.set(true);
  }

  cancelarEdicaoReceita(): void {
    this.modoEdicaoReceita.set(false);
    this.erroReceita.set(null);
    const prod = this.produto();
    if (prod) {
      this.receitaEditada.set(structuredClone(prod.receita ?? []));
    }
  }

  adicionarMateriaPrima(mpId: number): void {
    const mp = this.materiasPrimas().find((m) => m.id === mpId);
    if (!mp) return;

    this.receitaEditada.update((receita) => [
      ...receita,
      { id: 0, materiaPrima: mp, quantidade: 1, unidade: mp.unidade_medida },
    ]);
  }

  removerItemReceita(index: number): void {
    this.receitaEditada.update((receita) => receita.filter((_, i) => i !== index));
  }

  atualizarQuantidade(index: number, novaQtd: string): void {
    const qtd = Number(novaQtd);
    if (isNaN(qtd) || qtd <= 0) return;

    this.receitaEditada.update((receita) => {
      const nova = [...receita];
      nova[index] = { ...nova[index], quantidade: qtd };
      return nova;
    });
  }

  salvarReceita(): void {
    const prod = this.produto();
    if (!prod) return;

    this.salvandoReceita.set(true);
    this.erroReceita.set(null);

    const payload = this.receitaEditada().map((item) => ({
      materia_prima_id: item.materiaPrima.id,
      quantidade: item.quantidade,
      unidade: item.unidade,
    }));

    this.produtosService
      .atualizarReceita(prod.id, payload)
      .pipe(finalize(() => this.salvandoReceita.set(false)))
      .subscribe({
        next: () => {
          this.modoEdicaoReceita.set(false);
          this.produtoResource.reload();
        },
        error: (err) => {
          let msg = err.error?.message || 'Erro ao salvar a receita.';
          if (err.error?.details && Array.isArray(err.error.details)) {
            const detalhes = (err.error.details as { mensagem: string }[])
              .map((d) => d.mensagem)
              .join(' • ');
            if (detalhes) msg += ` — ${detalhes}`;
          }
          this.erroReceita.set(msg);
        },
      });
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/produtos']);
  }

  /** Abre o dialog de confirmação inline — substitui window.confirm() */
  solicitarAlternanciaStatus(): void {
    const prod = this.produto();
    if (!prod) return;
    this.confirmacaoPendente.set(prod.ativo ? 'desativar' : 'ativar');
  }

  cancelarAlternanciaStatus(): void {
    this.confirmacaoPendente.set(null);
  }

  confirmarAlternanciaStatus(): void {
    const prod = this.produto();
    if (!prod) return;

    this.confirmacaoPendente.set(null);
    this.alterandoStatus.set(true);

    this.produtosService
      .alternarStatus(prod.id, !prod.ativo)
      .pipe(finalize(() => this.alterandoStatus.set(false)))
      .subscribe({
        next: () => this.produtoResource.reload(),
        error: (err) =>
          this.erroReceita.set(
            err.error?.message || 'Erro ao alterar o status do produto.',
          ),
      });
  }
}
