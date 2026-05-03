import { Component, Input, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { InsumoEstoque } from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-lote-insumo-item',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lote-insumo-item.html',
})
export class LoteInsumoItemComponent {
  /** O FormGroup que representa este item no FormArray */
  formGroup = input.required<FormGroup>();
  
  /** Lista de lotes de insumo disponíveis para esta matéria-prima */
  insumosDisponiveis = input<InsumoEstoque[]>([]);
}
