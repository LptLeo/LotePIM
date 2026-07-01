import { Component, input } from '@angular/core';
import { STATUS_CONFIG, type LoteStatus } from '../../../../shared/models/lote.models.js';
import type { ResultadoInsumo } from '../../rastreabilidade.js';

@Component({
  selector: 'app-rastreabilidade-arvore-recall',
  standalone: true,
  templateUrl: './rastreabilidade-arvore-recall.component.html',
})
export class RastreabilidadeArvoreRecallComponent {
  // === INPUTS ===
  public resultadoInsumos = input.required<ResultadoInsumo['resultado']['itens']>();
  public termoBusca = input('');

  readonly STATUS_CONFIG = STATUS_CONFIG;

  // === MÉTODOS ===
  public obterStatusConfig(status: LoteStatus) {
    return (
      this.STATUS_CONFIG[status] || {
        label: status,
        cor: '#ADAAAA',
        corBg: 'transparent',
        corBorda: '#484847',
      }
    );
  }

  public formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
}
