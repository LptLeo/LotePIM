import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { InsumoEstoque } from '../../../../shared/models/lote.models.js';
import { EstoqueCardComponent } from '../estoque-card/estoque-card.component.js';

@Component({
  selector: 'app-estoque-list',
  standalone: true,
  imports: [CommonModule, EstoqueCardComponent],
  templateUrl: './estoque-list.component.html',
})
export class EstoqueListComponent {
  @Input() insumos: InsumoEstoque[] = [];
  @Input() carregando: boolean = false;
}
