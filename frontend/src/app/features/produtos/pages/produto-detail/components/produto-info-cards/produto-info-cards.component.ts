import { Component, input } from '@angular/core';
import type { Produto } from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-produto-info-cards',
  standalone: true,
  templateUrl: './produto-info-cards.component.html',
})
export class ProdutoInfoCardsComponent {
  // === INPUTS ===
  public produto = input.required<Produto>();
}
