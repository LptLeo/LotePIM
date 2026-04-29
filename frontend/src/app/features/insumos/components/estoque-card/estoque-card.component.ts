import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { InsumoEstoque } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-estoque-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estoque-card.component.html',
})
export class EstoqueCardComponent {
  @Input() item!: InsumoEstoque;

  isVencendo(dataValidade: string | null): boolean {
    if (!dataValidade) return false;
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diffDays = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  }

  isVencido(dataValidade: string | null): boolean {
    if (!dataValidade) return false;
    return new Date(dataValidade) < new Date();
  }

  formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
}
