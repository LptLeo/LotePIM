import { Component, effect, input, output, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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

export interface PedidoInsumoItem {
  materia_prima_id: number;
  quantidade: number;
  nome: string;
}

interface ItemGrupoFormulario {
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
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './pedir-insumos-modal.component.html',
})
export class PedirInsumosModalComponent {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);

  // === INPUTS ===
  estaAberto = input<boolean>(false);
  catalogo = input<MateriaPrima[]>([]);
  estoqueMap = input<Map<number, InsumoEstoque[]>>(new Map());

  // === OUTPUTS ===
  fechar = output<void>();
  confirmar = output<PedidoInsumoItem[]>();

  // === FORMULÁRIO ===
  formulario = this.fb.nonNullable.group({
    itens: this.fb.array<FormGroup<ItemGrupoFormulario>>([]),
  });

  readonly controlesItens: FormArray<FormGroup<ItemGrupoFormulario>> =
    this.formulario.controls.itens;

  constructor() {
    effect(() => {
      if (this.estaAberto()) {
        this.inicializarFormulario();
      }
    });
  }

  // === MÉTODOS PÚBLICOS ===
  public inicializarFormulario(): void {
    this.controlesItens.clear();

    this.catalogo().forEach((mp) => {
      const lotes = this.estoqueMap().get(mp.id) || [];
      const saldoAtual = lotes.reduce(
        (acc, lote) => acc + Number(lote.quantidade_atual),
        0,
      );
      const saldoArredondado = Math.round(saldoAtual * 1000) / 1000;

      this.controlesItens.push(
        this.fb.group<ItemGrupoFormulario>({
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

  public aoFechar(): void {
    this.fechar.emit();
  }

  public aoConfirmar(): void {
    const todosItens = this.controlesItens.getRawValue();
    const selecionados: PedidoInsumoItem[] = todosItens
      .filter((item) => item.selecionado)
      .map((item) => ({
        materia_prima_id: item.materia_prima_id,
        quantidade: item.quantidade,
        nome: item.nome,
      }));

    if (selecionados.length === 0) return;

    this.confirmar.emit(selecionados);
  }
}
