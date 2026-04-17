import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoteDetalhe, STATUS_CONFIG } from '../../models/lote.models';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lote-card.html',
})
export class LoteCardComponent {
  @Input({ required: true }) lote!: LoteDetalhe;
  @Output() cardClick = new EventEmitter<number>();

  onClick() {
    this.cardClick.emit(this.lote.id);
  }

  get config() {
    return STATUS_CONFIG[this.lote.status];
  }

  get progresso(): number {
    if (this.lote.status === 'em_producao') {
      return 10 + (this.lote.id % 80);
    }
    return 100;
  }

  get dataFormatada(): string {
    if (!this.lote.aberto_em) return '—';
    const date = new Date(this.lote.aberto_em);
    const d = date.toLocaleDateString('pt-BR').replace(/\//g, '.');
    const t = date.toLocaleTimeString('pt-BR');
    return `${d} | ${t}`;
  }
}
