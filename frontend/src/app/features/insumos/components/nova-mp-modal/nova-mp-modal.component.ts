import { Component, input, output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ComboboxComponent } from '../../../../shared/components/form-controls/combobox/combobox.js';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-nova-mp-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ComboboxComponent],
  templateUrl: './nova-mp-modal.component.html',
})
export class NovaMpModalComponent {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);

  // === INPUTS ===
  estaAberto = input<boolean>(false);
  salvando = input<boolean>(false);
  erro = input<string | null>(null);
  categorias = input<string[]>([]);

  // === OUTPUTS ===
  fechar = output<void>();
  salvar = output<Partial<MateriaPrima>>();

  // === FORMULÁRIO ===
  formMp = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['', Validators.required],
    unidade_medida: ['UN' as 'UN' | 'G' | 'ML' | 'CM', Validators.required],
  });

  // === MÉTODOS PÚBLICOS ===
  public aoFechar(): void {
    this.formMp.reset({ unidade_medida: 'UN' });
    this.fechar.emit();
  }

  public aoSalvar(): void {
    if (this.formMp.invalid) return;
    this.salvar.emit(this.formMp.getRawValue());
    this.formMp.reset({ unidade_medida: 'UN' });
  }
}
