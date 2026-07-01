import { Component, input, output, computed } from '@angular/core';
import { FormArray, ReactiveFormsModule, FormGroup } from '@angular/forms';
import type { MateriaPrima } from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-wizard-receita',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './wizard-receita.component.html',
})
export class WizardReceitaComponent {
  // === INPUTS ===
  public produtoNome = input('');
  public produtoSku = input('');
  public produtoRessalva = input(0);
  public receitaArray = input.required<FormArray>();
  public mpDisponiveis = input<MateriaPrima[]>([]);
  public salvando = input(false);

  // === OUTPUTS ===
  public voltar = output<void>();
  public salvar = output<void>();
  public adicionarMp = output<number>();
  public removerMp = output<number>();

  // === DERIVAÇÕES ===
  public controlesReceita = computed(() => this.receitaArray().controls as FormGroup[]);

  // === MÉTODOS ===
  public aoVoltar(): void {
    this.voltar.emit();
  }

  public aoSalvar(): void {
    this.salvar.emit();
  }

  public aoAdicionarMp(idStr: string): void {
    const id = Number(idStr);
    if (id) {
      this.adicionarMp.emit(id);
    }
  }

  public aoRemoverMp(index: number): void {
    this.removerMp.emit(index);
  }
}
