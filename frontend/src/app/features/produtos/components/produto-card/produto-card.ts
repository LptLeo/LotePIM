import { Component, input, output } from '@angular/core';
import type { Produto } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  templateUrl: './produto-card.html',
  host: {
    class: 'block h-full min-w-0',
  },
})
export class ProdutoCardComponent {
  // === INPUTS ===
  public produto = input.required<Produto>();

  // === OUTPUTS ===
  public cliqueCartao = output<number>();

  // === MÉTODOS ===
  public formatarData(data: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
