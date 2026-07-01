import { Component, input, output, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';
import type { RegistrarEntradaDTO, Turno } from '../../services/insumos.service.js';

@Component({
  selector: 'app-registrar-entrada-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registrar-entrada-modal.component.html',
})
export class RegistrarEntradaModalComponent {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);

  // === INPUTS ===
  estaAberto = input<boolean>(false);
  salvando = input<boolean>(false);
  erro = input<string | null>(null);
  catalogo = input<MateriaPrima[]>([]);

  // === OUTPUTS ===
  fechar = output<void>();
  salvar = output<RegistrarEntradaDTO>();

  // === FORMULÁRIO ===
  private obterTurnoAtual(): Turno {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  formularioEstoque = this.fb.group({
    materia_prima_id: [null as number | null, Validators.required],
    numero_lote_fornecedor: ['', Validators.required],
    fornecedor: ['', Validators.required],
    quantidade_inicial: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    data_validade: [null as string | null],
    naoAplicaValidade: [false],
    turno: [this.obterTurnoAtual() as Turno, Validators.required],
  });

  private idMateriaPrimaSelecionado = toSignal(
    this.formularioEstoque.controls.materia_prima_id.valueChanges.pipe(startWith(null)),
  );

  unidadeSelecionada = computed(() => {
    const idMateriaPrima = Number(this.idMateriaPrimaSelecionado());
    if (!idMateriaPrima) return '--';
    const materiaPrima = this.catalogo().find((item) => item.id === idMateriaPrima);
    return materiaPrima ? materiaPrima.unidade_medida : '--';
  });

  private dataValidadeValue = toSignal(
    this.formularioEstoque.controls.data_validade.valueChanges.pipe(startWith(null)),
  );

  dataValidadeExibicao = computed(() => {
    const valorData = this.dataValidadeValue();
    if (!valorData) return 'DD/MM/AAAA';
    const [ano, mes, dia] = valorData.split('-');
    return `${dia}/${mes}/${ano}`;
  });

  // === MÉTODOS PÚBLICOS ===
  public aoFechar(): void {
    this.formularioEstoque.reset({
      turno: this.obterTurnoAtual(),
      naoAplicaValidade: false,
      materia_prima_id: null,
      quantidade_inicial: null,
      data_validade: null,
    });
    this.fechar.emit();
  }

  public aoSalvar(): void {
    if (this.formularioEstoque.invalid) return;

    const valoresFormulario = this.formularioEstoque.getRawValue();
    const payload: RegistrarEntradaDTO = {
      materia_prima_id: valoresFormulario.materia_prima_id!,
      numero_lote_fornecedor: valoresFormulario.numero_lote_fornecedor ?? '',
      fornecedor: valoresFormulario.fornecedor ?? '',
      quantidade_inicial: valoresFormulario.quantidade_inicial!,
      turno: valoresFormulario.turno as Turno,
      naoAplicaValidade: valoresFormulario.naoAplicaValidade ?? false,
      data_validade: valoresFormulario.data_validade,
    };

    this.salvar.emit(payload);
    this.aoFechar();
  }

  public limparQuantidade(): void {
    this.formularioEstoque.controls.quantidade_inicial.setValue(null);
  }
}
