import { Component, effect, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type {
  MateriaPrima,
  InsumoEstoque,
} from '../../../../shared/models/lote.models.js';

/** Interface para o payload que sai do modal para o componente pai */
export interface PedidoInsumoItem {
  materia_prima_id: number;
  quantidade: number;
  nome: string;
}

/** Interface que define a estrutura de cada linha do formulário (Tipagem Forte e Não-Nula) */
interface ItemFormGroup {
  materia_prima_id: FormControl<number>;
  nome: FormControl<string>;
  unidade: FormControl<string>;
  saldo: FormControl<number>;
  selecionado: FormControl<boolean>;
  quantidade: FormControl<number>;
}

@Component({
  selector: 'app-pedir-insumos-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pedir-insumos-modal.component.html',
})
export class PedirInsumosModalComponent {
  private fb = inject(FormBuilder);

  // Inputs Reativos (Signals)
  isOpen = input<boolean>(false);
  catalogo = input<MateriaPrima[]>([]);
  estoqueMap = input<Map<number, InsumoEstoque[]>>(new Map());

  // Outputs (Events)
  close = output<void>();
  confirm = output<PedidoInsumoItem[]>();

  // Formulário Raiz (Não-Nulo)
  form = this.fb.nonNullable.group({
    itens: this.fb.array<FormGroup<ItemFormGroup>>([]),
  });

  constructor() {
    /**
     * Reage à abertura do modal.
     * Sempre que 'isOpen' mudar para true, reinicializamos os dados.
     */
    effect(() => {
      if (this.isOpen()) {
        this.initForm();
      }
    });
  }

  // Atalho para o FormArray (Propriedade Reativa com Tipagem Explícita)
  readonly itensArray: FormArray<FormGroup<ItemFormGroup>> = this.form.controls.itens;

  /**
   * Preenche o formulário baseado no catálogo e no estoque atual
   */
  initForm(): void {
    this.itensArray.clear();

    this.catalogo().forEach((mp) => {
      const lotes = this.estoqueMap().get(mp.id) || [];
      const saldoAtual = lotes.reduce(
        (acc, lote) => acc + Number(lote.quantidade_atual),
        0,
      );

      // Garantimos 3 casas decimais para evitar imprecisões de float
      const saldoArredondado = Math.round(saldoAtual * 1000) / 1000;

      this.itensArray.push(
        this.fb.group<ItemFormGroup>({
          materia_prima_id: this.fb.control(mp.id, { nonNullable: true }),
          nome: this.fb.control(mp.nome, { nonNullable: true }),
          unidade: this.fb.control(mp.unidade_medida, { nonNullable: true }),
          saldo: this.fb.control(saldoArredondado, { nonNullable: true }),
          selecionado: this.fb.control(false, { nonNullable: true }),
          quantidade: this.fb.control(100, {
            validators: [Validators.required, Validators.min(0.01)],
            nonNullable: true,
          }),
        }),
      );
    });
  }

  onClose(): void {
    this.close.emit();
  }

  /**
   * Coleta apenas os itens selecionados e emite para o componente pai
   */
  onConfirm(): void {
    const todosItens = this.itensArray.getRawValue();

    const selecionados: PedidoInsumoItem[] = todosItens
      .filter((item) => item.selecionado)
      .map((item) => ({
        materia_prima_id: item.materia_prima_id,
        quantidade: item.quantidade,
        nome: item.nome,
      }));

    if (selecionados.length === 0) return;

    this.confirm.emit(selecionados);
  }
}
