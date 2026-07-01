import { Component, input } from '@angular/core';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-catalogo-table',
  standalone: true,
  templateUrl: './catalogo-table.component.html',
})
export class CatalogoTableComponent {
  // === INPUTS ===
  catalogo = input<MateriaPrima[]>([]);
  carregando = input<boolean>(false);
}
