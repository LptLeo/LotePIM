import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-metric-cards',
  standalone: true,
  templateUrl: './metric-cards.component.html',
})
export class MetricCardsComponent {
  @Input() totalRegistros!: number;
  @Input() totalComSaldo!: number;
  @Input() totalEsgotados!: number;
}
