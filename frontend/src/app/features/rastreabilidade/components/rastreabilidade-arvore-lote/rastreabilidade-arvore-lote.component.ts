import { Component, input } from '@angular/core';
import { STATUS_CONFIG } from '../../../../shared/models/lote.models.js';
import type { ResultadoLote } from '../../rastreabilidade.js';

@Component({
  selector: 'app-rastreabilidade-arvore-lote',
  standalone: true,
  templateUrl: './rastreabilidade-arvore-lote.component.html',
})
export class RastreabilidadeArvoreLoteComponent {
  // === INPUTS ===
  public resultadoLote = input.required<ResultadoLote['resultado']>();

  readonly STATUS_CONFIG = STATUS_CONFIG;

  // === MÉTODOS ===
  public formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
}
