import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { InsumoEstoque } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-estoque-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './estoque-card.component.html',
})
export class EstoqueCardComponent {
  // === INPUTS ===
  insumo = input.required<InsumoEstoque>();

  // === MÉTODOS PÚBLICOS ===
  public estaVencendo(dataValidade: string | null): boolean {
    if (!dataValidade) return false;
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diasDiferenca = Math.ceil(
      (validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diasDiferenca >= 0 && diasDiferenca <= 15;
  }

  public estaVencido(dataValidade: string | null): boolean {
    if (!dataValidade) return false;
    return new Date(dataValidade) < new Date();
  }

  public formatarData(data?: string | null): string {
    if (!data) return '—';
    const dataObj = new Date(data);
    const dia = dataObj.getUTCDate().toString().padStart(2, '0');
    const mes = (dataObj.getUTCMonth() + 1).toString().padStart(2, '0');
    const ano = dataObj.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  }
}
