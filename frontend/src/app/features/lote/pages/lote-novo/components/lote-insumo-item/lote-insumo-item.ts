import { Component, input } from '@angular/core';
import { ReactiveFormsModule, type FormGroup } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import type { InsumoEstoque } from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-lote-insumo-item',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './lote-insumo-item.html',
})
export class LoteInsumoItemComponent {
  formGroup = input.required<FormGroup>();
  insumosDisponiveis = input<InsumoEstoque[]>([]);
}
