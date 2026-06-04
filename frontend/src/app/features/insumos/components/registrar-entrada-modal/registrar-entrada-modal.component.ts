import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';
import type { RegistrarEntradaForm } from '../../services/insumos.service.js';

/** Interface que define a estrutura rigorosa do formulário de entrada */
interface EstoqueFormGroup {
  materia_prima_id: FormControl<number | null>;
  numero_lote_fornecedor: FormControl<string>;
  fornecedor: FormControl<string>;
  quantidade_inicial: FormControl<number | null>;
  data_validade: FormControl<string | null>;
  naoAplicaValidade: FormControl<boolean>;
  turno: FormControl<'manha' | 'tarde' | 'noite'>;
}

@Component({
  selector: 'app-registrar-entrada-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registrar-entrada-modal.component.html',
})
export class RegistrarEntradaModalComponent {
  private fb = inject(FormBuilder);

  // Inputs Reativos
  isOpen = input<boolean>(false);
  salvando = input<boolean>(false);
  erro = input<string | null>(null);
  catalogo = input<MateriaPrima[]>([]);

  // Outputs
  close = output<void>();
  save = output<RegistrarEntradaForm>();

  /** Helper para definir o turno padrão baseado no horário do sistema */
  private getTurnoAtual(): 'manha' | 'tarde' | 'noite' {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  // Formulário Tipado e Seguro
  formEstoque = this.fb.group<EstoqueFormGroup>({
    materia_prima_id: this.fb.control(null, { validators: [Validators.required] }),
    numero_lote_fornecedor: this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    fornecedor: this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    quantidade_inicial: this.fb.control(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    data_validade: this.fb.control(null),
    naoAplicaValidade: this.fb.control(false, { nonNullable: true }),
    turno: this.fb.control(this.getTurnoAtual(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  // Signals para reatividade no template
  private mpIdSelecionado = toSignal(
    this.formEstoque.controls.materia_prima_id.valueChanges.pipe(startWith(null)),
  );

  unidadeSelecionada = computed(() => {
    const mpId = Number(this.mpIdSelecionado());
    if (!mpId) return '--';
    const mp = this.catalogo().find((item) => item.id === mpId);
    return mp ? mp.unidade_medida : '--';
  });

  private dataValidadeValue = toSignal(
    this.formEstoque.controls.data_validade.valueChanges.pipe(startWith(null)),
  );

  dataValidadeExibicao = computed(() => {
    const data = this.dataValidadeValue();
    if (!data) return 'DD/MM/AAAA';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  });

  onClose(): void {
    this.formEstoque.reset({
      turno: this.getTurnoAtual(),
      naoAplicaValidade: false,
      materia_prima_id: null,
      quantidade_inicial: null,
      data_validade: null,
    });
    this.close.emit();
  }

  onSave(): void {
    if (this.formEstoque.invalid) return;

    const rawValue = this.formEstoque.getRawValue();

    // Garantimos a tipagem antes de emitir, já que o formulário pode ter nulos
    // mas o validador 'required' garante que no 'onSave' eles existam.
    const payload: RegistrarEntradaForm = {
      materia_prima_id: rawValue.materia_prima_id!,
      numero_lote_fornecedor: rawValue.numero_lote_fornecedor,
      fornecedor: rawValue.fornecedor,
      quantidade_inicial: rawValue.quantidade_inicial!,
      turno: rawValue.turno,
      naoAplicaValidade: rawValue.naoAplicaValidade,
      data_validade: rawValue.data_validade,
    };

    this.save.emit(payload);
    this.onClose(); // Reset centralizado
  }

  resetQuantidade(): void {
    this.formEstoque.controls.quantidade_inicial.setValue(null);
  }
}
