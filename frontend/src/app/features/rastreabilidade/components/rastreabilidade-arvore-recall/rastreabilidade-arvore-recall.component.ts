import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { STATUS_CONFIG, LoteStatus } from '../../../../shared/models/lote.models';
import type { ResultadoInsumo } from '../../rastreabilidade';

@Component({
  selector: 'app-rastreabilidade-arvore-recall',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rastreabilidade-arvore-recall.component.html',
  animations: [
    trigger('fadeScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.92)' }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('treeRoot', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('400ms 100ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('treeChildren', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
          stagger(80, [
            animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('lineGrow', [
      transition(':enter', [
        style({ transform: 'scaleY(0)', transformOrigin: 'top' }),
        animate('400ms 300ms ease-out', style({ transform: 'scaleY(1)' })),
      ]),
    ]),
  ]
})
export class RastreabilidadeArvoreRecallComponent {
  @Input() resultadoInsumos!: ResultadoInsumo['resultado']['itens'];
  @Input() termoBusca: string = '';

  readonly STATUS_CONFIG = STATUS_CONFIG;

  getStatusConfig(status: any) {
    const s = status as LoteStatus;
    return this.STATUS_CONFIG[s] || { label: status, cor: '#ADAAAA', corBg: 'transparent', corBorda: '#484847' };
  }

  formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
}
