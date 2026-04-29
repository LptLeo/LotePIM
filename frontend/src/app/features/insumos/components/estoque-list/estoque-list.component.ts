import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { InsumoEstoque } from '../../../../shared/models/lote.models';
import { EstoqueCardComponent } from '../estoque-card/estoque-card.component';

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
