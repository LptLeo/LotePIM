import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-cards',
  standalone: true,
  templateUrl: './metric-cards.component.html',
})
export class MetricCardsComponent {
  // === INPUTS ===
  totalRegistros = input.required<number>();
  totalComSaldo = input.required<number>();
  totalEsgotados = input.required<number>();
}
