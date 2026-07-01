import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './stat-card.html',
  host: {
    class: 'flex-1 flex flex-col min-w-0',
  },
})
export class StatCardComponent {
  title = input.required<string>();
  tooltip = input<string>();
  trackingClass = input('tracking-[1px]');
}
