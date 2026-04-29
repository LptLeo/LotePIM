import { Component, EventEmitter, Input, OnInit, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-registrar-entrada-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registrar-entrada-modal.component.html',
})
export class RegistrarEntradaModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() salvando = false;
  @Input() erro: string | null = null;
  @Input() catalogo: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  private getTurnoAtual(): 'manha' | 'tarde' | 'noite' {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  formEstoque = this.fb.group({
    materia_prima_id: [null as number | null, Validators.required],
    numero_lote_fornecedor: ['', Validators.required],
    fornecedor: ['', Validators.required],
    quantidade_inicial: [null as number | null, [Validators.required, Validators.min(0.01)]],
    data_validade: [null as string | null],
    naoAplicaValidade: [false],
    turno: [this.getTurnoAtual(), Validators.required]
  });

  private mpIdSelecionado = toSignal(
    this.formEstoque.controls.materia_prima_id.valueChanges.pipe(startWith(null))
  );

  unidadeSelecionada = computed(() => {
    const mpId = Number(this.mpIdSelecionado());
    if (!mpId) return '--';
    const mp = this.catalogo.find(item => item.id === mpId);
    return mp ? mp.unidade_medida : '--';
  });

  ngOnInit() {
    this.formEstoque.reset({ turno: this.getTurnoAtual(), naoAplicaValidade: false });
  }

  dataValidadeFormatada(): string {
    const data = this.formEstoque.controls.data_validade.value;
    if (!data) return 'DD/MM/AAAA';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  onClose() {
    this.close.emit();
  }

  onSave() {
    if (this.formEstoque.invalid) return;
    this.save.emit(this.formEstoque.getRawValue());
  }

  resetQuantidade() {
    this.formEstoque.controls.quantidade_inicial.setValue(null);
  }
}
