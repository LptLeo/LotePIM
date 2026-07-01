import { Component, input } from '@angular/core';
import type { InsumoEstoque } from '../../../../shared/models/lote.models.js';
import { EstoqueCardComponent } from '../estoque-card/estoque-card.component.js';

@Component({
  selector: 'app-estoque-list',
  standalone: true,
  imports: [EstoqueCardComponent],
  templateUrl: './estoque-list.component.html',
})
export class EstoqueListComponent {
  // === INPUTS ===
  insumos = input<InsumoEstoque[]>([]);
  carregando = input<boolean>(false);
}
