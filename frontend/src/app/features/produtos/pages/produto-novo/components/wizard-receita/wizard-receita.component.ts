import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import type { MateriaPrima } from '../../../../../../shared/models/lote.models';

@Component({
  selector: 'app-wizard-receita',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wizard-receita.component.html',
})
export class WizardReceitaComponent {
  @Input() produtoNome: string = '';
  @Input() produtoSku: string = '';
  @Input() produtoRessalva: number = 0;
  
  @Input() receitaArray!: FormArray;
  @Input() mpDisponiveis: MateriaPrima[] = [];
  @Input() salvando: boolean = false;

  @Output() back = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() addMp = new EventEmitter<number>();
  @Output() removeMp = new EventEmitter<number>();

  onBack() {
    this.back.emit();
  }

  onSave() {
    this.save.emit();
  }

  onAddMp(idStr: string) {
    const id = Number(idStr);
    if (id) {
      this.addMp.emit(id);
    }
  }

  onRemoveMp(index: number) {
    this.removeMp.emit(index);
  }
}
