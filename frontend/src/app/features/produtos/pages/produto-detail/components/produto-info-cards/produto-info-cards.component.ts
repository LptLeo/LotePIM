import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Produto } from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-produto-info-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto-info-cards.component.html',
})
export class ProdutoInfoCardsComponent {
  @Input() produto!: Produto;
}
