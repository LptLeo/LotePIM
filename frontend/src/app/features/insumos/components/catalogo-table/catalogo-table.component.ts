import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-catalogo-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo-table.component.html',
})
export class CatalogoTableComponent {
  @Input() catalogo: any[] = [];
  @Input() carregando: boolean = false;
}
